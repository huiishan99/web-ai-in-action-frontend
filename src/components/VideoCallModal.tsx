// src/components/VideoCallModal.tsx - 独立的 WebRTC 组件
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Video, Phone, PhoneOff, Copy, CheckCircle, Users,
  Wifi, WifiOff, X
} from 'lucide-react';

// 类型定义
type ConnectionStatus = '未连接' | '正在连接WebSocket...' | '等待其他用户加入...' | '正在建立连接...' | '已连接' | '连接断开' | '连接失败' | '连接关闭' | string;

interface AnyWebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface RoomInfo {
  id: string;
  title: string;
  description: string;
  color: string;
  videoRoomId: string;
}

interface VideoCallModalProps {
  roomInfo: RoomInfo;
  onClose: () => void;
}

const WS_BASE = process.env.NODE_ENV === 'production'
  ? 'wss://your-backend-domain.com'
  : 'ws://localhost:8000';

/* 没用到所以先注释掉
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://your-backend-domain.com'
  : 'http://localhost:8000';
*/

export default function VideoCallModal({ roomInfo, onClose }: VideoCallModalProps) {
  // 视频通话状态
  const [userId, setUserId] = useState<string>('');
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('未连接');
  const [isWebSocketConnected, setIsWebSocketConnected] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  // const [isMinimized, setIsMinimized] = useState<boolean>(false); // 没用到
  const [isClient, setIsClient] = useState(false);

  // WebRTC refs - 使用 useRef 避免重渲染时重置
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC 配置 - 使用 useRef 避免重复创建
  const rtcConfigRef = useRef<RTCConfiguration>({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  });

  // 确保在客户端环境
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 初始化 WebRTC 连接 - 使用 useCallback 避免重复创建
  const initializePeerConnection = useCallback((): RTCPeerConnection => {
    console.log('🔄 初始化 WebRTC 连接...');
    const pc = new RTCPeerConnection(rtcConfigRef.current);

    pc.ontrack = (event) => {
      console.log('📺 收到远程视频流');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnectionStatus('已连接');
        setIsInCall(true);
        setIsWaiting(false);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 WebRTC 连接状态:', pc.connectionState);
      switch (pc.connectionState) {
        case 'connected':
          setConnectionStatus('已连接');
          setIsInCall(true);
          setIsWaiting(false);
          break;
        case 'connecting':
          setConnectionStatus('正在建立连接...');
          break;
        case 'disconnected':
          setConnectionStatus('连接断开');
          setIsInCall(false);
          break;
        case 'failed':
          setConnectionStatus('连接失败');
          setIsInCall(false);
          setIsWaiting(false);
          break;
        case 'closed':
          setConnectionStatus('连接关闭');
          setIsInCall(false);
          setIsWaiting(false);
          break;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
        console.log('🧊 发送 ICE candidate');
        websocketRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate.toJSON()
        }));
      }
    };

    pc.onicecandidateerror = (event) => {
      console.error('❌ ICE candidate 错误:', event);
    };

    return pc;
  }, []); // 空依赖数组，确保只创建一次

  // 获取本地媒体流
  const getLocalStream = useCallback(async (): Promise<MediaStream> => {
    if (!isClient) {
      throw new Error('不在客户端环境');
    }

    try {
      console.log('📷 请求访问摄像头和麦克风...');
      const constraints: MediaStreamConstraints = {
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      console.log('✅ 获取本地视频流成功');
      return stream;
    } catch (error) {
      console.error('❌ 获取媒体设备失败:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('请允许访问摄像头和麦克风权限');
        } else if (error.name === 'NotFoundError') {
          alert('未找到摄像头或麦克风设备');
        } else {
          alert(`获取媒体设备失败: ${error.message}`);
        }
      }
      throw error;
    }
  }, [isClient]);

  // 连接 WebSocket
  const connectWebSocket = useCallback(async (userId: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      console.log(`🔌 连接 WebSocket: ${userId}`);
      setConnectionStatus('正在连接WebSocket...');

      const ws = new WebSocket(`${WS_BASE}/ws/${userId}`);

      ws.onopen = () => {
        console.log('✅ WebSocket 连接成功');
        setIsWebSocketConnected(true);
        setConnectionStatus('未连接');
        resolve(ws);
      };

      ws.onmessage = async (event) => {
        try {
          const message: AnyWebSocketMessage = JSON.parse(event.data);
          console.log('📨 收到 WebSocket 消息:', message.type);
          await handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ 处理 WebSocket 消息失败:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket 连接关闭:', event.code, event.reason);
        setIsWebSocketConnected(false);
        if (!event.wasClean) {
          setConnectionStatus('连接断开');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (userId && !websocketRef.current) {
              connectWebSocket(userId).then(newWs => {
                websocketRef.current = newWs;
              }).catch(console.error);
            }
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket 错误:', error);
        setIsWebSocketConnected(false);
        setConnectionStatus('连接失败');
        reject(error);
      };
    });
  }, []);

  function isSessionDesc(o: unknown): o is RTCSessionDescriptionInit {
    return typeof o === 'object' && o !== null && 'type' in o && 'sdp' in o;
  }
  function isCandidate(o: unknown): o is RTCIceCandidateInit {
    return typeof o === 'object' && o !== null && 'candidate' in o;
  }
  // 处理 WebSocket 消息
  const handleWebSocketMessage = useCallback(async (message: AnyWebSocketMessage) => {
    switch (message.type) {
      case 'room-joined':
        if (message.success) {
          console.log('✅ 成功加入房间:', message.room_id);
          if (message.is_room_full) {
            setConnectionStatus('正在建立连接...');
            setIsWaiting(true);
            if (peerConnectionRef.current) {
              try {
                const offer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(offer);
                websocketRef.current?.send(JSON.stringify({
                  type: 'offer',
                  offer: offer
                }));
              } catch (error) {
                console.error('❌ 创建 offer 失败:', error);
                setConnectionStatus('连接失败');
              }
            }
          } else {
            setConnectionStatus('等待其他用户加入...');
            setIsWaiting(true);
          }
        }
        break;
      case 'offer':
        if (peerConnectionRef.current && isSessionDesc(message.offer)) {
          await peerConnectionRef.current.setRemoteDescription(message.offer);
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          websocketRef.current?.send(
            JSON.stringify({ type: 'answer', answer })
          );
        }
        break;
      case 'answer':
        if (peerConnectionRef.current && isSessionDesc(message.answer)) {
          await peerConnectionRef.current.setRemoteDescription(message.answer);
        }
        break;
      case 'ice-candidate':
        if (peerConnectionRef.current && isCandidate(message.candidate)) {
          const cand = new RTCIceCandidate(message.candidate);
          await peerConnectionRef.current.addIceCandidate(cand);
        }
        break;
      case 'user-left':
        setConnectionStatus('用户已离开');
        setIsInCall(false);
        setIsWaiting(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        break;
    }
  }, []);

  // 开始视频通话
  const startVideoCall = useCallback(async () => {
    if (isWaiting || isInCall || isWebSocketConnected) {
      return;
    }

    const finalUserId = userId.trim() || `用户_${Date.now()}`;
    setUserId(finalUserId);

    try {
      // 获取媒体流
      const stream = await getLocalStream();
      localStreamRef.current = stream;

      // 初始化 PeerConnection
      const pc = initializePeerConnection();
      peerConnectionRef.current = pc;

      // 添加本地流
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // 连接 WebSocket
      const ws = await connectWebSocket(finalUserId);
      websocketRef.current = ws;

      // 加入房间
      ws.send(JSON.stringify({
        type: 'join-room',
        room_id: roomInfo.videoRoomId
      }));

    } catch (error) {
      console.error('❌ 开始视频通话失败:', error);
      endVideoCall();
    }
  }, [roomInfo.videoRoomId, userId, getLocalStream, initializePeerConnection, connectWebSocket, isWaiting, isInCall, isWebSocketConnected, handleWebSocketMessage]);

  // 结束视频通话
  const endVideoCall = useCallback(() => {
    console.log('📞 结束通话');

    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: 'leave-room' }));
    }

    // 清理资源
    websocketRef.current?.close();
    websocketRef.current = null;

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setIsInCall(false);
    setIsWaiting(false);
    setIsWebSocketConnected(false);
    setConnectionStatus('未连接');

    // 关闭模态框
    onClose();
  }, [onClose]);

  // 复制房间号
  const copyRoomId = useCallback(async () => {
    if (!isClient || !roomInfo.videoRoomId) return;
    try {
      await navigator.clipboard.writeText(roomInfo.videoRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('❌ 复制失败:', error);
    }
  }, [roomInfo.videoRoomId, isClient]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      endVideoCall();
    };
  }, [endVideoCall]);

  // 如果不是客户端环境，显示加载状态
  if (!isClient) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载视频通话...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* 顶部控制栏 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {roomInfo.title} - 视频通话
          </h1>
          <p className="text-sm text-gray-600">
            房间号: {roomInfo.videoRoomId} · {connectionStatus}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            {isWebSocketConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-gray-500">
              {isWebSocketConnected ? 'WebSocket已连接' : 'WebSocket未连接'}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          {(isInCall || isWaiting) ? (
            <button
              onClick={endVideoCall}
              className="bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
              title="结束通话"
              type="button"
            >
              <PhoneOff size={20} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="bg-gray-500 text-white rounded-full p-2 hover:bg-gray-600 transition"
              title="关闭"
              type="button"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="p-6">
        {/* 如果还没开始通话，显示加入界面 */}
        {!isInCall && !isWaiting && (
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center mb-8">
              <Video className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                加入 {roomInfo.title} 视频通话
              </h2>
              <p className="text-gray-600">{roomInfo.description}</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="输入您的用户名（可选）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">💡 房间信息:</h4>
                <p className="text-sm text-blue-700">
                  房间号: <code className="bg-blue-100 px-2 py-1 rounded font-mono">{roomInfo.videoRoomId}</code>
                  <button
                    onClick={copyRoomId}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    type="button"
                  >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  </button>
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  让朋友在另一个设备上打开此页面，选择相同房间即可开始通话
                </p>
              </div>

              <button
                onClick={startVideoCall}
                disabled={isWaiting || isInCall || isWebSocketConnected}
                className="w-full px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center text-lg font-medium"
                type="button"
              >
                <Phone className="w-6 h-6 mr-2" />
                {isWebSocketConnected ? '连接中...' : '加入视频通话'}
              </button>
            </div>
          </div>
        )}

        {/* 视频区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* 本地视频 */}
          <div className="relative">
            <div className="bg-gray-900 rounded-xl overflow-hidden h-full">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                {userId || '我'}
              </div>
            </div>
          </div>

          {/* 远程视频 */}
          <div className="relative">
            <div className="bg-gray-900 rounded-xl overflow-hidden h-full">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!isInCall && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
                  <div className="text-center text-white">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-75">
                      {isWaiting ? connectionStatus : '等待开始通话'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 等待状态提示 */}
        {isWaiting && (
          <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
            <div className="text-center">
              <div className="animate-pulse text-yellow-600 mb-2">⏳</div>
              <h4 className="font-medium text-yellow-800 mb-2">{connectionStatus}</h4>
              <p className="text-sm text-yellow-700">
                房间号: <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{roomInfo.videoRoomId}</span>
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                {isWebSocketConnected ? '分享房间号给朋友，让他们加入开始通话' : '正在连接服务器...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}