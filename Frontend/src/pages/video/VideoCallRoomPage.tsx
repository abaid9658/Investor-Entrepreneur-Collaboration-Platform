import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  MessageSquare, X, Send, Copy, Users
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface RemotePeer {
  socketId: string;
  userId: string;
  stream?: MediaStream;
}

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const VideoCallRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remotePeer, setRemotePeer] = useState<RemotePeer | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [callDuration, setCallDuration] = useState(0);

  // Start duration timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
      toast.error('Could not access camera/microphone. Please check permissions.');
      return null;
    }
  }, []);

  // Create RTCPeerConnection
  const createPeerConnection = useCallback((targetSocketId: string, targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });

    // On remote track
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setIsConnected(true);
    };

    // ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setIsConnected(false);
      }
    };

    peerConnectionRef.current = pc;
    setRemotePeer({ socketId: targetSocketId, userId: targetUserId });
    return pc;
  }, [socket]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    const joinAndSetup = async () => {
      await initLocalStream();
      socket.emit('join-video-room', { roomId });
    };

    joinAndSetup();

    // Another user joined — initiate offer
    socket.on('user-joined-video', async ({ userId: remoteUserId, socketId: remoteSocketId }) => {
      const pc = createPeerConnection(remoteSocketId, remoteUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { targetSocketId: remoteSocketId, offer });
      toast(`${remoteUserId} joined the room`, { icon: '👋' });
    });

    // Received offer from peer
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
        } catch (e) { /* silently ignore */ }
      }
    });

    // Remote user left
    socket.on('user-left-video', ({ userId: leftUserId }) => {
      toast(`${leftUserId} left the call`, { icon: '📵' });
      setRemotePeer(null);
      setIsConnected(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    });

    // In-call chat
    socket.on('call-chat-message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('user-joined-video');
      socket.off('webrtc-offer-received');
      socket.off('webrtc-answer-received');
      socket.off('ice-candidate-received');
      socket.off('user-left-video');
      socket.off('call-chat-message');
    };
  }, [socket, roomId, initLocalStream, createPeerConnection]);

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
          const sender = peerConnectionRef.current.getSenders()
            .find(s => s.track?.kind === 'video');
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
      const sender = peerConnectionRef.current.getSenders()
        .find(s => s.track?.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerConnectionRef.current?.close();
    if (socket) socket.emit('leave-video-room', { roomId });
    navigate(-1);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !socket) return;
    const msg: ChatMessage = {
      sender: user?.name || 'You',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    socket.emit('call-chat-message', { roomId, ...msg });
    setChatMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    toast.success('Room ID copied!');
  };

  return (
    <div className="h-screen bg-gray-950 flex flex-col text-white overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-semibold">Nexus Video Call</span>
          <span className="text-gray-400 text-sm">· {formatDuration(callDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomId}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Copy size={12} /> Room: {roomId?.slice(0, 8)}...
          </button>
          {remotePeer && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg">
              <Users size={12} /> Connected
            </span>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote Video (Large) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-gray-900"
        />
        {!remotePeer && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
              <Users size={40} className="text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold">Waiting for others...</h3>
            <p className="text-gray-400 mt-2 text-sm">Share the room ID to invite participants</p>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-6 right-6 w-48 h-36 rounded-xl overflow-hidden border-2 border-gray-700 shadow-2xl bg-gray-900">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <VideoOff size={24} className="text-gray-600" />
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded">
            You
          </span>
        </div>

        {/* In-call Chat Panel */}
        {showChat && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900/95 backdrop-blur border-l border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="font-semibold text-sm">In-call Chat</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-gray-500 text-center text-sm mt-8">No messages yet</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-purple-400 text-xs font-semibold">{msg.sender}</span>
                    <span className="text-gray-600 text-xs">{msg.time}</span>
                  </div>
                  <p className="text-gray-200 text-sm bg-gray-800 rounded-lg px-3 py-2">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Message..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={sendChatMessage}
                className="bg-purple-600 hover:bg-purple-700 p-2 rounded-lg transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          <button
            id="toggle-audio-btn"
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all ${isAudioOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            title={isAudioOn ? 'Mute' : 'Unmute'}
          >
            {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            id="toggle-video-btn"
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${isScreenSharing ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
            title="Share Screen"
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-4 rounded-full transition-all ${showChat ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <MessageSquare size={20} />
          </button>
          <button
            id="end-call-btn"
            onClick={endCall}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all shadow-lg shadow-red-500/30"
            title="End Call"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
