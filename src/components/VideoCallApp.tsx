import React, { useState, useRef, useEffect } from 'react';
import { Video, Phone, PhoneOff, Users, Copy, CheckCircle } from 'lucide-react';

/* 这里没用到所以注释
interface SDPData {
  sdp: string;
  type: RTCSdpType;
  roomId?: string;
  from?: string;
  to?: string;
}
*/

interface User {
  id: string;
  name: string;
  isOnline: boolean;
}

const VideoCallApp: React.FC = () => {
  const [roomId, setRoomId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [targetUser, setTargetUser] = useState<string>('');
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('未连接');
  const [callMode, setCallMode] = useState<'room' | 'direct'>('room');
  const [copied, setCopied] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // 模拟在线用户列表
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // 初始化 WebRTC 连接
  const initializePeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // 监听远程视频流
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnectionStatus('已连接');
      }
    };

    // 监听连接状态
    pc.onconnectionstatechange = () => {
      setConnectionStatus(pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        endCall();
      }
    };

    // 监听 ICE 候选
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice_candidate',
          candidate: event.candidate,
          target: targetUser || 'room_peer' // 根据模式决定目标
        }));
      }
    };

    return pc;
  };

  // WebSocket 连接
  useEffect(() => {
    if (userId) {
      const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket 连接已建立');
        // 获取在线用户列表
        fetchOnlineUsers();
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onclose = () => {
        console.log('WebSocket 连接已关闭');
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);


  // 放到组件上方、initializePeerConnection 之后
  const getLocalStream = React.useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error('获取媒体设备失败:', err);
      throw err;
    }
  }, []);


  // 处理 WebSocket 消息
  const handleWebSocketMessage = React.useCallback(async (message: unknown) => {
    if (typeof message !== 'object' || message === null) return;
    const msg = message as { type: string; [k: string]: unknown };
    switch (msg.type) {
      /* 将原来所有 message.xxx 改为 msg.xxx */
        case 'room_matched': {
          // 房间匹配成功
          if (peerConnectionRef.current && msg.peer_offer) {
            await peerConnectionRef.current.setRemoteDescription(
              msg.peer_offer as RTCSessionDescriptionInit
            );
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            wsRef.current?.send(
              JSON.stringify({ type: 'answer', answer, target: msg.peer_id })
            );
          }
          setIsInCall(true);
          setIsWaiting(false);
          break;
      }
      case 'incoming_call': {
        // 收到呼叫
        const accept = window.confirm(`${msg.from as string} 正在呼叫您，是否接受？`);
        
        // 类型判断
        const incomingCall = msg as {
          from?: unknown;
          offer?: unknown;
          call_id?: unknown;
        };

        if (
          accept &&
          typeof incomingCall.from === 'string' &&
          typeof incomingCall.call_id === 'string' &&
          typeof incomingCall.offer === 'object' &&
          incomingCall.offer !== null &&
          'type' in incomingCall.offer &&
          'sdp' in incomingCall.offer
        ) {
          await handleIncomingCall({
            from: incomingCall.from,
            offer: incomingCall.offer as RTCSessionDescriptionInit,
            call_id: incomingCall.call_id
          });
        } else if (!accept && typeof incomingCall.call_id === 'string') {
          // 拒绝呼叫
          await fetch('/api/answer-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              call_id: incomingCall.call_id,
              accept: false
            })
          });
        }
        break;
      }
      case 'call_accepted': {
        // 呼叫被接受
        if (peerConnectionRef.current && msg.answer) {
          const answer = msg.answer as RTCSessionDescriptionInit;
          await peerConnectionRef.current.setRemoteDescription(answer);
          setIsInCall(true);
          setConnectionStatus('已连接');
        }
        break;
      }
      case 'call_rejected':
        // 呼叫被拒绝
        alert('对方拒绝了您的呼叫');
        endCall();
        break;

      case 'ice_candidate': {
        // 收到 ICE 候选
        if (peerConnectionRef.current && msg.candidate) {
          const cand = msg.candidate as RTCIceCandidateInit;
          await peerConnectionRef.current.addIceCandidate(cand);
        }
        break;
      }

      case 'user_status':
        // 用户状态更新
        fetchOnlineUsers();
        break;

      case 'peer_left':
        // 对方离开
        alert('对方已离开通话');
        endCall();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getLocalStream, initializePeerConnection]);

  // 处理来电
  const handleIncomingCall = async (message: {
    from: string;
    offer: RTCSessionDescriptionInit;
    call_id: string;
  }) => {
    try {
      const stream = await getLocalStream();
      localStreamRef.current = stream;

      const pc = initializePeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // 设置远程 offer
      await pc.setRemoteDescription(message.offer);

      // 创建 answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 发送 answer
      await fetch('/api/answer-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: message.call_id,
          accept: true,
          answer: {
            sdp: answer.sdp,
            type: answer.type
          }
        })
      });

      setIsInCall(true);
      setTargetUser(message.from);
    } catch (error) {
      console.error('处理来电失败:', error);
    }
  };

  // 获取在线用户列表
  const fetchOnlineUsers = React.useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(`/api/online-users/${userId}`);
      const data = await response.json();
      setOnlineUsers(data.users.map((user: { id: string; status: string }) => ({
        id: user.id,
        name: user.id,
        isOnline: user.status === 'online'
      })));
    } catch (error) {
      console.error('获取在线用户失败:', error);
    }
  }, [userId]);
  

  // 房间模式：加入房间
  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert('请输入房间号');
      return;
    }

    try {
      setIsWaiting(true);
      setConnectionStatus('正在加入房间...');

      const stream = await getLocalStream();
      localStreamRef.current = stream;

      const pc = initializePeerConnection();
      peerConnectionRef.current = pc;

      // 添加本地流到连接
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // 创建 offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 发送到服务器
      const response = await fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: userId || `user_${Date.now()}`,
          offer: {
            sdp: offer.sdp,
            type: offer.type
          }
        })
      });

      const result = await response.json();

      if (result.matched) {
        setIsInCall(true);
        setConnectionStatus('正在连接...');
        // 处理对方的 answer
        if (result.answer) {
          await pc.setRemoteDescription(result.answer);
        }
      } else {
        setConnectionStatus('等待其他用户加入...');
      }

    } catch (error) {
      console.error('加入房间失败:', error);
      setConnectionStatus('连接失败');
      setIsWaiting(false);
    }
  };

  // 直接呼叫模式
  const callUser = async (targetId: string) => {
    if (!targetId.trim()) {
      alert('请选择要呼叫的用户');
      return;
    }

    try {
      setConnectionStatus('正在呼叫...');

      const stream = await getLocalStream();
      localStreamRef.current = stream;

      const pc = initializePeerConnection();
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch('/api/call-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: userId || `user_${Date.now()}`,
          to: targetId,
          offer: {
            sdp: offer.sdp,
            type: offer.type
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setIsInCall(true);
        setTargetUser(targetId);
      } else {
        alert(result.message || '呼叫失败');
        setConnectionStatus('呼叫失败');
      }

    } catch (error) {
      console.error('呼叫失败:', error);
      setConnectionStatus('呼叫失败');
    }
  };

  // 结束通话
  const endCall = () => {
    // 关闭 peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // 停止本地流
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // 清空视频元素
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setIsInCall(false);
    setIsWaiting(false);
    setConnectionStatus('未连接');
    setRoomId('');
    setTargetUser('');
  };

  // 复制房间号
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 生成随机房间号
  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(randomId);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          <Video className="inline mr-2" />
          WebRTC 视频通话
        </h1>

        {!isInCall && !isWaiting && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            {/* 模式选择 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">选择通话模式</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => setCallMode('room')}
                  className={`px-4 py-2 rounded-lg ${
                    callMode === 'room' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <Users className="inline mr-2 w-4 h-4" />
                  房间模式
                </button>
                <button
                  onClick={() => setCallMode('direct')}
                  className={`px-4 py-2 rounded-lg ${
                    callMode === 'direct' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <Phone className="inline mr-2 w-4 h-4" />
                  直接呼叫
                </button>
              </div>
            </div>

            {/* 用户ID设置 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                您的用户名（可选）
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="输入您的用户名"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 房间模式 */}
            {callMode === 'room' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    房间号
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="输入或生成房间号"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={generateRoomId}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                    >
                      生成
                    </button>
                    {roomId && (
                      <button
                        onClick={copyRoomId}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
                      >
                        {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={joinRoom}
                  disabled={!roomId.trim()}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  加入房间
                </button>
              </div>
            )}

            {/* 直接呼叫模式 */}
            {callMode === 'direct' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    在线用户
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {onlineUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => callUser(user.id)}
                        disabled={!user.isOnline}
                        className={`p-3 rounded-lg text-left ${
                          user.isOnline 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{user.name}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="text-xs">
                          {user.isOnline ? '在线' : '离线'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    或输入用户ID
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={targetUser}
                      onChange={(e) => setTargetUser(e.target.value)}
                      placeholder="输入要呼叫的用户ID"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => callUser(targetUser)}
                      disabled={!targetUser.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      呼叫
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 视频区域 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">视频通话</h3>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                connectionStatus === '已连接' 
                  ? 'bg-green-100 text-green-800' 
                  : connectionStatus === '未连接'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {connectionStatus}
              </span>
              {(isInCall || isWaiting) && (
                <button
                  onClick={endCall}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  结束通话
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 本地视频 */}
            <div className="relative">
              <h4 className="text-sm font-medium text-gray-700 mb-2">本地视频</h4>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-64 bg-gray-900 rounded-lg object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                {userId || '我'}
              </div>
            </div>

            {/* 远程视频 */}
            <div className="relative">
              <h4 className="text-sm font-medium text-gray-700 mb-2">远程视频</h4>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-gray-900 rounded-lg object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                {callMode === 'room' ? `房间: ${roomId}` : targetUser || '对方'}
              </div>
              {!isInCall && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-lg">
                  <span className="text-white text-sm">等待连接...</span>
                </div>
              )}
            </div>
          </div>

          {isWaiting && callMode === 'room' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">
                分享房间号 <strong>{roomId}</strong> 给朋友，让他们加入同一个房间开始通话
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCallApp;