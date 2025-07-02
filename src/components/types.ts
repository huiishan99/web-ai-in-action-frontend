// types.ts - WebRTC 相关的类型定义

// WebSocket 消息类型
export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

// 加入房间消息
export interface JoinRoomMessage extends WebSocketMessage {
  type: 'join-room';
  room_id: string;
}

// 房间加入成功响应
export interface RoomJoinedMessage extends WebSocketMessage {
  type: 'room-joined';
  success: boolean;
  room_id: string;
  user_count: number;
  other_users: string[];
  is_room_full: boolean;
  message?: string;
}

// SDP Offer 消息
export interface OfferMessage extends WebSocketMessage {
  type: 'offer';
  from?: string;
  offer: RTCSessionDescriptionInit;
}

// SDP Answer 消息
export interface AnswerMessage extends WebSocketMessage {
  type: 'answer';
  from?: string;
  answer: RTCSessionDescriptionInit;
}

// ICE Candidate 消息
export interface IceCandidateMessage extends WebSocketMessage {
  type: 'ice-candidate';
  from?: string;
  candidate: RTCIceCandidateInit;
}

// 用户加入通知
export interface UserJoinedMessage extends WebSocketMessage {
  type: 'user-joined';
  user_id: string;
  message: string;
}

// 用户离开通知
export interface UserLeftMessage extends WebSocketMessage {
  type: 'user-left';
  user_id: string;
  message: string;
}

// 错误消息
export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  message: string;
}

// 房间重置消息
export interface RoomResetMessage extends WebSocketMessage {
  type: 'room-reset' | 'rooms-reset';
  message: string;
}

// 离开房间消息
export interface LeaveRoomMessage extends WebSocketMessage {
  type: 'leave-room';
}

// 联合类型：所有可能的 WebSocket 消息
export type AnyWebSocketMessage =
  | JoinRoomMessage
  | RoomJoinedMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | UserJoinedMessage
  | UserLeftMessage
  | ErrorMessage
  | RoomResetMessage
  | LeaveRoomMessage;

// WebRTC 连接状态
export type ConnectionStatus =
  | '未连接'
  | '正在连接WebSocket...'
  | '正在加入房间...'
  | '等待其他用户加入...'
  | '正在建立连接...'
  | '已连接'
  | '连接断开'
  | '连接失败'
  | '房间已满';

// 组件状态接口
export interface RoomCallState {
  roomId: string;
  userId: string;
  isInCall: boolean;
  isWaiting: boolean;
  connectionStatus: ConnectionStatus;
  isWebSocketConnected: boolean;
  copied: boolean;
  isClient: boolean;
}

// WebRTC 配置
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

// 房间信息
export interface RoomInfo {
  room_id: string;
  users: string[];
  user_count: number;
  created_at?: string;
}

// AR 模块配置接口
export interface ARConfig {
  enabled: boolean;
  maxFaces: number;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  targetWidth: number;
  targetHeight: number;
  maxProcessingFPS: number;
  fallbackEnabled: boolean;
}

// AR 运行时状态
export interface ARStats {
  isInitialized: boolean;
  faceDetected: boolean;
  processingFPS: number;
  lastError: string | null;
  memoryUsage: number;
  processingTime: number;
}
