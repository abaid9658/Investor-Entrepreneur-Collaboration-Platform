import Message from '../models/Message.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get message history between logged-in user and target recipient
// @route   GET /api/chat/messages/:receiverId
// @access  Private
export const getMessages = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;
  const senderId = req.user._id;

  const conversationId = [senderId.toString(), receiverId].sort().join('_');

  const messages = await Message.find({ conversationId, deletedAt: null })
    .sort({ createdAt: 1 });

  // Bulk mark all unread messages received by this user in the thread as read
  await Message.updateMany(
    { conversationId, receiver: senderId, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    success: true,
    message: 'Chat history loaded',
    data: messages,
    errors: null
  });
});

// @desc    Get active conversations list for logged-in user
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Retrieve latest message grouped by distinct conversationIds
  const groupedMessages = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: userId }, { receiver: userId }],
        deletedAt: null
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' }
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    }
  ]);

  // Fetch profiles of other participants
  const conversations = await Promise.all(
    groupedMessages.map(async (group) => {
      const otherParticipantId = 
        group.lastMessage.sender.toString() === userId.toString()
          ? group.lastMessage.receiver
          : group.lastMessage.sender;

      const otherUser = await User.findById(otherParticipantId).select(
        'name email role avatarUrl isOnline'
      );

      return {
        conversationId: group._id,
        lastMessage: group.lastMessage,
        otherParticipant: otherUser
      };
    })
  );

  res.status(200).json({
    success: true,
    message: 'Conversations loaded',
    data: conversations,
    errors: null
  });
});
