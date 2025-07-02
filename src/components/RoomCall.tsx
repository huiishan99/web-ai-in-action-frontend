// src/components/RoomCall.tsx - 主题化重构版
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Phone, PhoneOff, Copy, CheckCircle, Users,
  Wifi, WifiOff, Settings, Music, Heart, Zap
} from 'lucide-react';
import { RoomTheme } from '@/types/room';

// 简化的类型定义
type ConnectionStatus = '未连接' | '正在连接WebSocket...' | '等待其他用户加入...' | '正在建立连接...' | '已连接' | '连接断开' | '连接失败' | '连接关闭' | string;

interface AnyWebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface RoomCallProps {
  roomTheme: RoomTheme;
}

const WS_BASE = process.env.NODE_ENV === 'production'
  ? 'wss://your-backend-domain.com'
  : 'ws://localhost:8000';

const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://your-backend-domain.com'
  : 'http://localhost:8000';

// 主题工具函数
const getThemeBackground = (theme: RoomTheme) => {
  const { background } = theme;
  if (background.type === 'gradient') {
    return `bg-gradient-to-br ${background.value}`;
  }
  return 'bg-gray-100';
};

const getThemeDecorations = (theme: RoomTheme) => {
  if (!theme.decorations?.icons) return [];
  return theme.decorations.icons;
};

const getThemeFeatureIcon = (theme: RoomTheme) => {
  if (theme.features?.musicPlayer) return Music;
  if (theme.features?.breathingGuide) return Heart;
  return Zap;
};

export default function RoomCall({ roomTheme }: RoomCallProps) {
  // 视频通话状态
  const [userId, setUserId] = useState<string>('');
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('未连接');
  const [isWebSocketConnected, setIsWebSocketConnected] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC 配置
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

  // 初始化 WebRTC 连接
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
  }, []);

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

// 处理 WebSocket 消息 - 移到{连接 WebSocket}功能之上
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
      case 'offer': {
        if (peerConnectionRef.current && 'offer' in message) {
          // message.offer 由 unknown → RTCSessionDescriptionInit
          const offer = message.offer as RTCSessionDescriptionInit;
          await peerConnectionRef.current.setRemoteDescription(offer);

          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          websocketRef.current?.send(JSON.stringify({ type: 'answer', answer }));
        }
        break;
      }
      case 'answer': {
        if (peerConnectionRef.current && 'answer' in message) {
          const answer = message.answer as RTCSessionDescriptionInit;
          await peerConnectionRef.current.setRemoteDescription(answer);
        }
        break;
      }
      case 'ice-candidate': {
        if (peerConnectionRef.current && 'candidate' in message) {
          const candidateInit = message.candidate as RTCIceCandidateInit;
          const candidate = new RTCIceCandidate(candidateInit);
          await peerConnectionRef.current.addIceCandidate(candidate);
        }
        break;
      }
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
  }, [handleWebSocketMessage]);


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
        room_id: roomTheme.videoRoomId
      }));

    } catch (error) {
      console.error('❌ 开始视频通话失败:', error);
      endVideoCall();
    }
  }, [roomTheme.videoRoomId, userId, getLocalStream, initializePeerConnection, connectWebSocket, isWaiting, isInCall, isWebSocketConnected]);

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
  }, []);

  // 复制房间号
  const copyRoomId = useCallback(async () => {
    if (!isClient || !roomTheme.videoRoomId) return;
    try {
      await navigator.clipboard.writeText(roomTheme.videoRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('❌ 复制失败:', error);
    }
  }, [roomTheme.videoRoomId, isClient]);

  // 测试连接
  const testConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE}/`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        alert(`✅ 服务器连接正常: ${result.message}\n在线用户: ${result.connected_users}\n活跃房间: ${result.active_rooms}`);
      } else {
        alert(`❌ 服务器响应错误: ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        alert('❌ 连接超时，请检查服务器是否运行');
      } else {
        alert('❌ 无法连接到服务器，请确保后端服务运行在 http://localhost:8000');
      }
    }
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      endVideoCall();
    };
  }, [endVideoCall]);

  // 如果不是客户端环境，显示加载状态
  if (!isClient) {
    return (
      <div className={`min-h-screen ${getThemeBackground(roomTheme)} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current mx-auto mb-4" style={{ color: roomTheme.colors.primary }}></div>
          <p className="text-gray-600">正在加载 {roomTheme.title}...</p>
        </div>
      </div>
    );
  }

  // 动态样式
  const themeStyles = {
    '--primary-color': roomTheme.colors.primary,
    '--secondary-color': roomTheme.colors.secondary,
    '--accent-color': roomTheme.colors.accent,
    '--text-color': roomTheme.colors.text,
  } as React.CSSProperties;

  const FeatureIcon = getThemeFeatureIcon(roomTheme);
  const decorationIcons = getThemeDecorations(roomTheme);

  return (
    <div className={`min-h-screen ${getThemeBackground(roomTheme)} p-4 relative overflow-hidden`} style={themeStyles}>

      {/* 主题装饰背景 */}
      {roomTheme.decorations?.particles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* 粒子效果 */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full opacity-30 animate-pulse"
              style={{
                backgroundColor: roomTheme.colors.accent,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* 装饰图标 */}
      {decorationIcons.length > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {decorationIcons.slice(0, 5).map((icon, i) => (
            <div
              key={i}
              className="absolute text-6xl opacity-10 animate-float"
              style={{
                left: `${10 + i * 20}%`,
                top: `${15 + i * 15}%`,
                animationDelay: `${i * 0.5}s`
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 顶部状态栏 */}
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-sm p-4 mb-6" style={{ borderColor: roomTheme.colors.primary, borderWidth: '1px' }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <FeatureIcon className="w-8 h-8" style={{ color: roomTheme.colors.primary }} />
              <div>
                <h1 className="text-xl font-bold" style={{ color: roomTheme.colors.text }}>
                  {roomTheme.title}
                </h1>
                <p className="text-sm text-gray-600">{roomTheme.description}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === '已连接' ? 'bg-green-500' : 
                  connectionStatus === '未连接' ? 'bg-gray-400' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">
                  状态: {connectionStatus}
                </span>
                <div className="flex items-center space-x-2">
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

              <button
                onClick={testConnection}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md transition"
                type="button"
              >
                <Settings className="inline w-4 h-4 mr-1" />
                测试连接
              </button>
            </div>
          </div>
        </div>

        {/* 加入房间界面 */}
        {!isInCall && !isWaiting && (
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center mb-8">
              <FeatureIcon className="w-16 h-16 mx-auto mb-4" style={{ color: roomTheme.colors.primary }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: roomTheme.colors.text }}>
                加入 {roomTheme.title}
              </h2>
              <p className="text-gray-600">{roomTheme.description}</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="输入您的用户名（可选）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': roomTheme.colors.primary } as React.CSSProperties}
                />
              </div>

              {/* 房间信息 */}
              <div className="p-4 rounded-lg border" style={{
                backgroundColor: `${roomTheme.colors.primary}10`,
                borderColor: `${roomTheme.colors.primary}30`
              }}>
                <h4 className="font-medium mb-2" style={{ color: roomTheme.colors.primary }}>
                  💡 房间信息:
                </h4>
                <p className="text-sm" style={{ color: roomTheme.colors.text }}>
                  房间号: <code className="px-2 py-1 rounded font-mono" style={{
                    backgroundColor: `${roomTheme.colors.primary}20`,
                    color: roomTheme.colors.primary
                  }}>{roomTheme.videoRoomId}</code>
                  <button
                    onClick={copyRoomId}
                    className="ml-2 hover:opacity-70 transition"
                    style={{ color: roomTheme.colors.primary }}
                    type="button"
                  >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  </button>
                </p>
                <p className="text-xs mt-2" style={{ color: roomTheme.colors.text }}>
                  让朋友选择相同房间即可开始通话
                </p>
              </div>

              {/* 特殊功能提示 */}
              {roomTheme.features && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: `${roomTheme.colors.accent}10` }}>
                  <h5 className="text-sm font-medium mb-1" style={{ color: roomTheme.colors.accent }}>
                    🎯 房间特色:
                  </h5>
                  <div className="text-xs space-y-1" style={{ color: roomTheme.colors.text }}>
                    {roomTheme.features.ambientSounds && <p>🎵 环境音效</p>}
                    {roomTheme.features.musicPlayer && <p>🎤 音乐播放</p>}
                    {roomTheme.features.breathingGuide && <p>🧘‍♀️ 呼吸引导</p>}
                    {roomTheme.features.filters && <p>✨ 专属滤镜</p>}
                  </div>
                </div>
              )}

              <button
                onClick={startVideoCall}
                disabled={isWaiting || isInCall || isWebSocketConnected}
                className="w-full px-6 py-4 rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center text-lg font-medium text-white"
                style={{ backgroundColor: roomTheme.colors.primary }}
                type="button"
              >
                <Phone className="w-6 h-6 mr-2" />
                {isWebSocketConnected ? '连接中...' : '开始视频通话'}
              </button>
            </div>
          </div>
        )}

        {/* 视频区域 */}
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold" style={{ color: roomTheme.colors.text }}>
              视频通话区域
            </h3>
            {(isInCall || isWaiting) && (
              <button
                onClick={endVideoCall}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center"
                type="button"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                结束通话
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 本地视频 */}
            <div className="relative">
              <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video" style={{
                borderColor: roomTheme.colors.primary,
                borderWidth: '2px'
              }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full text-sm text-white" style={{
                  backgroundColor: `${roomTheme.colors.primary}90`
                }}>
                  {userId || '我'}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">本地视频</p>
            </div>

            {/* 远程视频 */}
            <div className="relative">
              <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video" style={{
                borderColor: roomTheme.colors.secondary,
                borderWidth: '2px'
              }}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full text-sm text-white" style={{
                  backgroundColor: `${roomTheme.colors.secondary}90`
                }}>
                  房间: {roomTheme.videoRoomId}
                </div>
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
              <p className="text-sm text-gray-600 mt-2 text-center">远程视频</p>
            </div>
          </div>

          {/* 等待状态提示 */}
          {isWaiting && (
            <div className="mt-6 p-6 rounded-xl border" style={{
              background: `linear-gradient(135deg, ${roomTheme.colors.primary}10, ${roomTheme.colors.accent}10)`,
              borderColor: `${roomTheme.colors.primary}30`
            }}>
              <div className="text-center">
                <div className="animate-pulse text-2xl mb-2">
                  {decorationIcons[0] || '⏳'}
                </div>
                <h4 className="font-medium mb-2" style={{ color: roomTheme.colors.primary }}>
                  {connectionStatus}
                </h4>
                <p className="text-sm" style={{ color: roomTheme.colors.text }}>
                  房间号: <span className="font-mono px-2 py-1 rounded" style={{
                    backgroundColor: `${roomTheme.colors.primary}20`,
                    color: roomTheme.colors.primary
                  }}>{roomTheme.videoRoomId}</span>
                </p>
                <p className="text-xs mt-2" style={{ color: roomTheme.colors.text }}>
                  {isWebSocketConnected ? '分享房间号给朋友，让他们加入开始通话' : '正在连接服务器...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}