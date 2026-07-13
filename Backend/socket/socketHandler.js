import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import logger from '../utils/logger.js';
import { createNotification } from '../services/notificationService.js';

// Map storing connected users: userId (string) -> socketId (string)
export const onlineUsers = new Map();

let ioInstance = null;

export const socketHandler = (io) => {
  ioInstance = io;
  
  // Middleware to verify JWT during Socket.io handshake
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.headers?.token;
      if (!token) {
        return next(new Error('Authentication failure: JWT token missing'));
      }

      // If token starts with Bearer, strip it
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication failure: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.error(`Socket JWT Handshake Error: ${err.message}`);
      next(new Error('Authentication failure: Token validation failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    // Broadcast online status to all peers
    socket.broadcast.emit('user-status', { userId, status: 'online' });
    
    // Join personal direct-messaging channel matching userId
    socket.join(userId);

    logger.info(`Socket connection established: ${socket.user.name} (${userId})`);

    // 1. CHAT MODULE REAL-TIME EVENTS
    
    // Direct messaging listener
    socket.on('send-message', async (data, callback) => {
      const { receiverId, content } = data;
      if (!receiverId || !content) {
        if (callback) callback({ success: false, error: 'Recipient and content are required' });
        return;
      }

      const conversationId = [userId, receiverId].sort().join('_');

      try {
        const message = await Message.create({
          conversationId,
          sender: userId,
          receiver: receiverId,
          content
        });

        // Emit message to receiver's personal room
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message-received', {
            ...message.toObject(),
            senderName: socket.user.name,
            senderAvatar: socket.user.avatarUrl
          });
        }

        // Persist a new_message notification for the receiver
        await createNotification({
          recipient: receiverId,
          sender: userId,
          type: 'new_message',
          title: 'New Message',
          message: `${socket.user.name}: ${content.length > 60 ? content.slice(0, 57) + '...' : content}`,
          metadata: { conversationId, senderId: userId }
        });

        // Reply success confirmation callback
        if (callback) callback({ success: true, message });
      } catch (error) {
        logger.error(`Socket Message Save Error: ${error.message}`);
        if (callback) callback({ success: false, error: 'Failed to deliver message' });
      }
    });

    // Chat typing status
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing-received', {
          senderId: userId,
          isTyping
        });
      }
    });

    // 2. WEBRTC SIGNALING MODULE
    
    // Join a video room call
    socket.on('join-video-room', (data) => {
      const { roomId } = data;
      socket.join(roomId);
      logger.info(`Socket User ${userId} joined Video Room ${roomId}`);
      
      // Notify other participants in the same video room
      socket.to(roomId).emit('user-joined-video', {
        userId,
        socketId: socket.id
      });
    });

    // Forward RTC Offer SDP to peer
    socket.on('webrtc-offer', (data) => {
      const { targetSocketId, offer } = data;
      io.to(targetSocketId).emit('webrtc-offer-received', {
        senderSocketId: socket.id,
        senderUserId: userId,
        offer
      });
    });

    // Forward RTC Answer SDP to peer
    socket.on('webrtc-answer', (data) => {
      const { targetSocketId, answer } = data;
      io.to(targetSocketId).emit('webrtc-answer-received', {
        senderSocketId: socket.id,
        answer
      });
    });

    // Forward ICE Candidate packet to peer
    socket.on('ice-candidate', (data) => {
      const { targetSocketId, candidate } = data;
      io.to(targetSocketId).emit('ice-candidate-received', {
        senderSocketId: socket.id,
        candidate
      });
    });

    // Exit video call room
    socket.on('leave-video-room', (data) => {
      const { roomId } = data;
      socket.leave(roomId);
      
      socket.to(roomId).emit('user-left-video', {
        userId,
        socketId: socket.id
      });
      logger.info(`Socket User ${userId} left Video Room ${roomId}`);
    });

    // 3. CALL INVITE / REAL-TIME NOTIFICATIONS
    
    // Caller initiates a call to another user
    socket.on('call-invite', (data) => {
      const { calleeId, roomId, callType = 'video', callerName, callerAvatar } = data;
      const calleeSocketId = onlineUsers.get(calleeId);
      if (calleeSocketId) {
        io.to(calleeSocketId).emit('incoming-call', {
          callerId: userId,
          callerName: callerName || socket.user.name,
          callerAvatar: callerAvatar || '',
          roomId,
          callType
        });
        logger.info(`Call invite sent from ${userId} to ${calleeId}, room ${roomId}`);
      } else {
        // Callee offline — notify caller
        socket.emit('call-response', { accepted: false, reason: 'User is offline' });
      }
    });

    // Callee responds to the call invite
    socket.on('call-response', (data) => {
      const { callerId, roomId, accepted } = data;
      const callerSocketId = onlineUsers.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit(accepted ? 'call-accepted' : 'call-rejected', {
          calleeId: userId,
          calleeName: socket.user.name,
          roomId,
          accepted
        });
      }
    });

    // Real-time meeting invite notification
    socket.on('meeting-invite', (data) => {
      const { attendeeId, meetingTitle, meetingId, startTime } = data;
      const attendeeSocketId = onlineUsers.get(attendeeId);
      if (attendeeSocketId) {
        io.to(attendeeSocketId).emit('meeting-notification', {
          type: 'new_meeting',
          message: `${socket.user.name} invited you to: ${meetingTitle}`,
          meetingId,
          startTime,
          hostId: userId,
          hostName: socket.user.name
        });
      }
    });

    // Meeting status update notification (accept/reject broadcast to host)
    socket.on('meeting-status-update', (data) => {
      const { hostId, meetingId, status, meetingTitle } = data;
      const hostSocketId = onlineUsers.get(hostId);
      if (hostSocketId) {
        io.to(hostSocketId).emit('meeting-notification', {
          type: 'status_update',
          message: `${socket.user.name} ${status} your meeting: ${meetingTitle}`,
          meetingId,
          status,
          attendeeId: userId
        });
      }
    });

    // In-call chat message (broadcast to all in room)
    socket.on('call-chat-message', (data) => {
      const { roomId, sender, text, time } = data;
      socket.to(roomId).emit('call-chat-message', { sender, text, time });
    });

    // In-call emoji reaction (broadcast to all in room)
    socket.on('call-reaction', (data) => {
      const { roomId, emoji } = data;
      socket.to(roomId).emit('call-reaction-received', {
        senderId: userId,
        senderName: socket.user.name,
        emoji
      });
    });

    // 4. DISCONNECT CLEANUP
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user-status', { userId, status: 'offline' });
      logger.info(`Socket disconnected: ${socket.user.name} (${userId})`);
    });
  });
};

// Global helper to trigger real-time notifications to connected clients
export const emitNotification = (recipientId, notification) => {
  if (!ioInstance) return;
  const socketId = onlineUsers.get(recipientId.toString());
  if (socketId) {
    ioInstance.to(socketId).emit('notification-received', notification);
  }
};
