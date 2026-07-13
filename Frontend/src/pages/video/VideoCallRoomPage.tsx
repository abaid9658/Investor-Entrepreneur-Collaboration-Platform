import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  MessageSquare, X, Send, Copy, Users, Wifi, WifiOff, RefreshCw,
  Hand, ThumbsUp, Heart, Smile, MoreVertical
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface RemotePeer {
  socketId: string;
  userId: string;
  name?: string;
}

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
}

interface Reaction {
  emoji: string;
  senderName: string;
  id: number;
}

type ConnectionQuality = 'connecting' | 'connected' | 'poor' | 'disconnected';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const REACTIONS = [
  { emoji: '👋', label: 'Wave' },
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'LOL' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '🤔', label: 'Thinking' },
];

export const VideoCallRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const reactionIdRef = useRef(0);

  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remotePeer, setRemotePeer] = useState<RemotePeer | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('connecting');
  const [showChat, setShowChat] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [remotePeerName, setRemotePeerName] = useState<string>('');

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Track unread when chat panel is closed
  useEffect(() => {
    if (!showChat) return;
    setUnreadChat(0);
  }, [showChat]);

  // Stop all media tracks — guaranteed cleanup
  const stopAllTracks = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => {
        t.stop();
        t.enabled = false;
      });
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  // Initialize local media stream
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      toast.error('Could not access camera/microphone. Check permissions.');
      return null;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((targetSocketId: string, targetUserId: string, peerName?: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current?.getTracks().forEach(track => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setConnectionQuality('connected');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { targetSocketId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') setConnectionQuality('connected');
      else if (state === 'connecting' || state === 'new') setConnectionQuality('connecting');
      else if (state === 'failed' || state === 'disconnected') setConnectionQuality('poor');
      else if (state === 'closed') setConnectionQuality('disconnected');
    };

    peerConnectionRef.current = pc;
    setRemotePeer({ socketId: targetSocketId, userId: targetUserId, name: peerName });
    if (peerName) setRemotePeerName(peerName);
    return pc;
  }, [socket]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !roomId) return;

    const joinAndSetup = async () => {
      await initLocalStream();
      socket.emit('join-video-room', { roomId });
      setConnectionQuality('connecting');
    };

    joinAndSetup();

    // Another user joined — initiate offer
    socket.on('user-joined-video', async ({ userId: remoteUserId, socketId: remoteSocketId }) => {
      const pc = createPeerConnection(remoteSocketId, remoteUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { targetSocketId: remoteSocketId, offer });
      toast(`Someone joined the room`, { icon: '👋' });
    });

    // Received offer
    socket.on('webrtc-offer-received', async ({ senderSocketId, senderUserId, offer }) => {
      const pc = createPeerConnection(senderSocketId, senderUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer });
    });

    // Received answer
    socket.on('webrtc-answer-received', async ({ answer }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // ICE candidate
    socket.on('ice-candidate-received', async ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch { /* silently ignore */ }
      }
    });

    // Remote user left — stop remote video, stop LOCAL camera too
    socket.on('user-left-video', () => {
      toast('The other participant left the call', { icon: '📵' });
      setRemotePeer(null);
      setConnectionQuality('disconnected');
      setRemotePeerName('');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
    });

    // In-call chat
    socket.on('call-chat-message', (msg: { sender: string; text: string; time: string }) => {
      setChatMessages(prev => [...prev, { ...msg, isMe: false }]);
      if (!showChat) setUnreadChat(c => c + 1);
    });

    // Emoji reactions
    socket.on('call-reaction-received', (data: { senderName: string; emoji: string }) => {
      const id = ++reactionIdRef.current;
      setReactions(prev => [...prev, { emoji: data.emoji, senderName: data.senderName, id }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3500);
    });

    return () => {
      socket.off('user-joined-video');
      socket.off('webrtc-offer-received');
      socket.off('webrtc-answer-received');
      socket.off('ice-candidate-received');
      socket.off('user-left-video');
      socket.off('call-chat-message');
      socket.off('call-reaction-received');
    };
  }, [socket, roomId, initLocalStream, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      peerConnectionRef.current?.close();
    };
  }, [stopAllTracks]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsAudioOn(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsVideoOn(prev => !prev);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getTracks()[0];
        if (peerConnectionRef.current && localStreamRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        screenTrack.onended = () => stopScreenShare();
        setIsScreenSharing(true);
      } catch { toast.error('Screen share cancelled'); }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (localStreamRef.current && peerConnectionRef.current) {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  const endCall = () => {
    stopAllTracks();
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    if (socket) socket.emit('leave-video-room', { roomId });
    navigate(-1);
  };

  const handleReconnect = async () => {
    setConnectionQuality('connecting');
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    if (remotePeer) {
      const pc = createPeerConnection(remotePeer.socketId, remotePeer.userId, remotePeer.name);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit('webrtc-offer', { targetSocketId: remotePeer.socketId, offer });
      toast('Reconnecting...');
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !socket) return;
    const msg: ChatMessage = {
      sender: user?.name || 'You',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };
    socket.emit('call-chat-message', { roomId, sender: msg.sender, text: msg.text, time: msg.time });
    setChatMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  const sendReaction = (emoji: string) => {
    if (!socket) return;
    socket.emit('call-reaction', { roomId, emoji });
    // Show own reaction locally too
    const id = ++reactionIdRef.current;
    setReactions(prev => [...prev, { emoji, senderName: 'You', id }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3500);
    setShowReactions(false);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    toast.success('Room ID copied!');
  };

  const qualityConfig: Record<ConnectionQuality, { icon: React.ReactNode; label: string; color: string }> = {
    connecting: { icon: <Wifi size={12} className="animate-pulse" />, label: 'Connecting', color: 'text-yellow-400' },
    connected:  { icon: <Wifi size={12} />, label: 'Connected', color: 'text-green-400' },
    poor:       { icon: <WifiOff size={12} />, label: 'Poor', color: 'text-orange-400' },
    disconnected: { icon: <WifiOff size={12} />, label: 'Disconnected', color: 'text-red-400' },
  };
  const qc = qualityConfig[connectionQuality];

  return (
    <div className="h-screen bg-gray-950 flex flex-col text-white overflow-hidden select-none">

      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900/90 backdrop-blur border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-semibold text-white">Nexus Video Call</span>
          <span className="text-gray-400 text-sm">· {formatDuration(callDuration)}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Quality indicator */}
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800 ${qc.color}`}>
            {qc.icon} {qc.label}
          </span>

          {/* Room ID copy */}
          <button
            onClick={copyRoomId}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-all"
          >
            <Copy size={12} /> Room: {roomId?.slice(0, 8)}...
          </button>

          {/* Participant count */}
          {remotePeer && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-lg">
              <Users size={12} /> {remotePeerName || 'Participant'} joined
            </span>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-950">

        {/* Remote Video (Full) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Waiting overlay */}
        {!remotePeer && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-gray-950">
            <div className="w-28 h-28 bg-purple-600/10 border border-purple-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Users size={44} className="text-purple-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white">Waiting for others...</h3>
            <p className="text-gray-400 mt-2 text-sm">Share the room ID to invite participants</p>
            <button
              onClick={copyRoomId}
              className="mt-4 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-400/50 px-4 py-2 rounded-lg transition-all"
            >
              <Copy size={14} /> Copy Room ID
            </button>
          </div>
        )}

        {/* Remote participant name overlay */}
        {remotePeer && remotePeerName && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg">
            {remotePeerName}
          </div>
        )}

        {/* Reconnect button when poor/disconnected */}
        {(connectionQuality === 'poor' || connectionQuality === 'disconnected') && remotePeer && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-gray-900/90 backdrop-blur rounded-2xl p-6 text-center border border-gray-700">
              <WifiOff size={32} className="text-orange-400 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">Connection {connectionQuality}</p>
              <p className="text-gray-400 text-sm mb-4">The call quality has degraded</p>
              <button
                onClick={handleReconnect}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors mx-auto"
              >
                <RefreshCw size={14} /> Reconnect
              </button>
            </div>
          </div>
        )}

        {/* Local Video PiP */}
        <div className="absolute bottom-6 right-6 w-52 h-40 rounded-2xl overflow-hidden border-2 border-gray-700/80 shadow-2xl bg-gray-900 group">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {!isVideoOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <VideoOff size={24} className="text-gray-500" />
              <span className="text-xs text-gray-500 mt-1">Camera off</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="text-xs text-white/80 bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
              {user?.name || 'You'}
            </span>
            {!isAudioOn && <MicOff size={10} className="text-red-400" />}
          </div>
        </div>

        {/* Floating Reactions */}
        <div className="absolute bottom-48 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none">
          {reactions.map(r => (
            <div
              key={r.id}
              className="flex flex-col items-center animate-bounce"
              style={{ animationDuration: '0.6s' }}
            >
              <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
              <span className="text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded-full mt-1 backdrop-blur-sm">
                {r.senderName}
              </span>
            </div>
          ))}
        </div>

        {/* In-call Chat Panel */}
        {showChat && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900/98 backdrop-blur-xl border-l border-gray-800 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="font-semibold text-sm text-white">In-call Chat</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-gray-500 text-center text-sm mt-8">No messages yet — say something!</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-xs font-semibold ${msg.isMe ? 'text-purple-400' : 'text-blue-400'}`}>{msg.sender}</span>
                    <span className="text-gray-600 text-xs">{msg.time}</span>
                  </div>
                  <p className={`text-sm px-3 py-2 rounded-2xl max-w-[90%] break-words ${
                    msg.isMe
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </p>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Message..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 p-2 rounded-xl transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Reactions picker */}
        {showReactions && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl px-4 py-3 flex gap-3 shadow-2xl">
            {REACTIONS.map(r => (
              <button
                key={r.emoji}
                onClick={() => sendReaction(r.emoji)}
                title={r.label}
                className="text-2xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-gray-800"
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-gray-900/90 backdrop-blur border-t border-gray-800 px-6 py-4">
        <div className="flex items-center justify-center gap-3">

          {/* Mic */}
          <button
            id="toggle-audio-btn"
            onClick={toggleAudio}
            title={isAudioOn ? 'Mute' : 'Unmute'}
            className={`group relative p-4 rounded-full transition-all duration-200 ${
              isAudioOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500/90 hover:bg-red-500'
            }`}
          >
            {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isAudioOn ? 'Mute' : 'Unmute'}
            </span>
          </button>

          {/* Camera */}
          <button
            id="toggle-video-btn"
            onClick={toggleVideo}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            className={`group relative p-4 rounded-full transition-all duration-200 ${
              isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500/90 hover:bg-red-500'
            }`}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isVideoOn ? 'Camera Off' : 'Camera On'}
            </span>
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            title="Share Screen"
            className={`group relative p-4 rounded-full transition-all duration-200 ${
              isScreenSharing ? 'bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-400/40' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </span>
          </button>

          {/* Reactions */}
          <button
            onClick={() => setShowReactions(r => !r)}
            title="Reactions"
            className={`group relative p-4 rounded-full transition-all duration-200 ${
              showReactions ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Smile size={20} />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Reactions
            </span>
          </button>

          {/* Chat */}
          <button
            onClick={() => { setShowChat(c => !c); setUnreadChat(0); }}
            title="Chat"
            className={`group relative p-4 rounded-full transition-all duration-200 ${
              showChat ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <MessageSquare size={20} />
            {unreadChat > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadChat}
              </span>
            )}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Chat
            </span>
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-700 mx-1" />

          {/* End Call */}
          <button
            id="end-call-btn"
            onClick={endCall}
            title="End Call"
            className="group relative p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all duration-200 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105"
          >
            <PhoneOff size={20} />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              End Call
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
