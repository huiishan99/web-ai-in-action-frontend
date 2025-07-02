// webrtc-utils.ts - WebRTC 相关的工具函数

/** 轨道信息结构 */
interface TrackInfo {
  id: string;
  kind: string;
  label: string;
  enabled: boolean;
  muted: boolean;
  readyState: MediaStreamTrackState;
  constraints?: MediaTrackConstraints;
  settings?: MediaTrackSettings;
}

/** PeerConnection 网络质量统计 */
interface NetworkQualityStats {
  rtt?: number;
  packetsLost?: number;
  jitter?: number;
  bandwidth?: number;
}

/** PeerConnection 统计打印用（无需额外字段） */
type RTCStatsAny =
  | RTCIceCandidatePairStats
  | RTCInboundRtpStreamStats
  | RTCOutboundRtpStreamStats
  | RTCStats;



// 内联类型定义，避免导入 ./types
export interface WebRTCConfig extends RTCConfiguration { }

/**
 * 默认的 WebRTC 配置
 */
export const DEFAULT_RTC_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

/**
 * 默认的媒体约束
 */
export const DEFAULT_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30, min: 15 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
  },
};

/**
 * 检查浏览器是否支持 WebRTC
 */
export function checkWebRTCSupport(): { supported: boolean; message: string } {
  if (typeof window === "undefined") {
    return { supported: false, message: "不在浏览器环境中" };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, message: "浏览器不支持 getUserMedia" };
  }

  if (!window.RTCPeerConnection) {
    return { supported: false, message: "浏览器不支持 RTCPeerConnection" };
  }

  if (!window.RTCSessionDescription) {
    return { supported: false, message: "浏览器不支持 RTCSessionDescription" };
  }

  if (!window.RTCIceCandidate) {
    return { supported: false, message: "浏览器不支持 RTCIceCandidate" };
  }

  return { supported: true, message: "浏览器支持 WebRTC" };
}

/**
 * 获取用户媒体流
 */
export async function getUserMediaStream(
  constraints: MediaStreamConstraints = DEFAULT_MEDIA_CONSTRAINTS
): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("✅ 获取媒体流成功:", {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
    });
    return stream;
  } catch (error) {
    console.error("❌ 获取媒体流失败:", error);

    if (error instanceof Error) {
      switch (error.name) {
        case "NotAllowedError":
          throw new Error("用户拒绝了摄像头和麦克风权限");
        case "NotFoundError":
          throw new Error("未找到摄像头或麦克风设备");
        case "NotReadableError":
          throw new Error("设备正在被其他应用程序使用");
        case "OverconstrainedError":
          throw new Error("设备不支持指定的媒体约束");
        case "SecurityError":
          throw new Error("安全错误，请确保使用 HTTPS");
        default:
          throw new Error(`获取媒体流失败: ${error.message}`);
      }
    }

    throw error;
  }
}

/**
 * 创建 RTCPeerConnection
 */
export function createPeerConnection(
  config: RTCConfiguration = DEFAULT_RTC_CONFIG,
  callbacks?: {
    onTrack?: (event: RTCTrackEvent) => void;
    onIceCandidate?: (event: RTCPeerConnectionIceEvent) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  }
): RTCPeerConnection {
  const pc = new RTCPeerConnection(config);

  // 设置事件处理器
  if (callbacks?.onTrack) {
    pc.ontrack = callbacks.onTrack;
  }

  if (callbacks?.onIceCandidate) {
    pc.onicecandidate = callbacks.onIceCandidate;
  }

  if (callbacks?.onConnectionStateChange) {
    pc.onconnectionstatechange = () => {
      callbacks.onConnectionStateChange!(pc.connectionState);
    };
  }

  // 修复：使用正确的事件名称
  if (callbacks?.onIceConnectionStateChange) {
    pc.oniceconnectionstatechange = () => {
      callbacks.onIceConnectionStateChange!(pc.iceConnectionState);
    };
  }

  // 默认错误处理
  pc.onicecandidateerror = (event) => {
    console.error("❌ ICE candidate 错误:", event);
  };

  console.log("🔄 创建 PeerConnection 成功");
  return pc;
}

/**
 * 清理媒体流
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
      console.log(`🛑 停止 ${track.kind} 轨道`);
    });
  }
}

/**
 * 清理 PeerConnection
 */
export function closePeerConnection(pc: RTCPeerConnection | null): void {
  if (pc) {
    pc.close();
    console.log("🔌 关闭 PeerConnection");
  }
}

/**
 * 检查设备权限
 */
export async function checkMediaPermissions(): Promise<{
  camera: PermissionState;
  microphone: PermissionState;
}> {
  try {
    const cameraPermission = await navigator.permissions.query({
      name: "camera" as PermissionName,
    });
    const microphonePermission = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });

    return {
      camera: cameraPermission.state,
      microphone: microphonePermission.state,
    };
  } catch (error) {
    console.warn("⚠️ 无法检查媒体权限:", error);
    return {
      camera: "prompt",
      microphone: "prompt",
    };
  }
}

/**
 * 获取可用的媒体设备
 */
export async function getAvailableDevices(): Promise<{
  videoInputs: MediaDeviceInfo[];
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return {
      videoInputs: devices.filter((device) => device.kind === "videoinput"),
      audioInputs: devices.filter((device) => device.kind === "audioinput"),
      audioOutputs: devices.filter((device) => device.kind === "audiooutput"),
    };
  } catch (error) {
    console.error("❌ 获取设备列表失败:", error);
    return {
      videoInputs: [],
      audioInputs: [],
      audioOutputs: [],
    };
  }
}

/**
 * 生成随机房间号
 */
export function generateRoomId(length: number = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成用户ID
 */
export function generateUserId(prefix: string = "用户"): string {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}

/**
 * 连接状态转换为中文
 */
export function translateConnectionState(
  state: RTCPeerConnectionState
): string {
  switch (state) {
    case "new":
      return "新建连接";
    case "connecting":
      return "正在连接";
    case "connected":
      return "已连接";
    case "disconnected":
      return "连接断开";
    case "failed":
      return "连接失败";
    case "closed":
      return "连接关闭";
    default:
      return state;
  }
}

/**
 * ICE 连接状态转换为中文
 */
export function translateIceConnectionState(
  state: RTCIceConnectionState
): string {
  switch (state) {
    case "new":
      return "ICE新建";
    case "checking":
      return "ICE检查中";
    case "connected":
      return "ICE已连接";
    case "completed":
      return "ICE连接完成";
    case "failed":
      return "ICE连接失败";
    case "disconnected":
      return "ICE连接断开";
    case "closed":
      return "ICE连接关闭";
    default:
      return state;
  }
}

/**
 * 检查 WebSocket 连接状态
 */
export function getWebSocketStateText(readyState: number): string {
  switch (readyState) {
    case WebSocket.CONNECTING:
      return "正在连接";
    case WebSocket.OPEN:
      return "已连接";
    case WebSocket.CLOSING:
      return "正在关闭";
    case WebSocket.CLOSED:
      return "已关闭";
    default:
      return "未知状态";
  }
}

/**
 * 创建 WebSocket 连接（带重试机制）
 */
export function createWebSocketWithRetry(
  url: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let retryCount = 0;

    function connect() {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`✅ WebSocket 连接成功: ${url}`);
        resolve(ws);
      };

      ws.onerror = (error) => {
        console.error(
          `❌ WebSocket 连接错误 (尝试 ${retryCount + 1}/${maxRetries + 1}):`,
          error
        );

        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(connect, retryDelay * retryCount);
        } else {
          reject(new Error(`WebSocket 连接失败，已重试 ${maxRetries} 次`));
        }
      };

      ws.onclose = (event) => {
        if (!event.wasClean && retryCount < maxRetries) {
          console.log(
            `🔄 WebSocket 连接意外关闭，${retryDelay * (retryCount + 1)
            }ms 后重试...`
          );
          retryCount++;
          setTimeout(connect, retryDelay * retryCount);
        }
      };
    }

    connect();
  });
}

/**
 * 格式化媒体流信息
 */
export function getStreamInfo(stream: MediaStream): {
  id: string;
  videoTracks: number;
  audioTracks: number;
  active: boolean;
} {
  return {
    id: stream.id,
    videoTracks: stream.getVideoTracks().length,
    audioTracks: stream.getAudioTracks().length,
    active: stream.active,
  };
}

/**
 * 获取媒体轨道详细信息
 */
export function getTrackInfo(track: MediaStreamTrack): TrackInfo {
  const info: TrackInfo = {
    id: track.id,
    kind: track.kind,
    label: track.label,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
  };

  // 约束
  if ('getConstraints' in track) {
    try {
      info.constraints = track.getConstraints();
    } catch (e) {
      console.warn('无法获取轨道约束:', e);
    }
  }

  // 设置
  if ('getSettings' in track) {
    try {
      info.settings = track.getSettings();
    } catch (e) {
      console.warn('无法获取轨道设置:', e);
    }
  }

  return info;
}

/**
 * 调试：打印 PeerConnection 统计信息
 */
export async function logPeerConnectionStats(
  pc: RTCPeerConnection
): Promise<void> {
  try {
    const stats = await pc.getStats();
    console.group("📊 PeerConnection 统计信息");

    stats.forEach((report) => {
      console.log(`${report.type}:`, report);
    });

    console.groupEnd();
  } catch (error) {
    console.error("❌ 获取统计信息失败:", error);
  }
}

/**
 * 检查网络质量
 */
export async function checkNetworkQuality(
  pc: RTCPeerConnection,
): Promise<NetworkQualityStats> {
  const result: NetworkQualityStats = {};

  try {
    const stats = await pc.getStats();
    stats.forEach((report: RTCStatsAny) => {
      // Candidate-pair RTT
      if (report.type === 'candidate-pair') {
        const pair = report as RTCIceCandidatePairStats;
        if (pair.state === 'succeeded' && pair.currentRoundTripTime != null) {
          result.rtt = pair.currentRoundTripTime;
        }
      }

      // inbound-rtp（视频）
      if (
        report.type === 'inbound-rtp' &&
        'mediaType' in report &&
        report.mediaType === 'video'
      ) {
        const inbound = report as RTCInboundRtpStreamStats;
        result.packetsLost = inbound.packetsLost;
        result.jitter = inbound.jitter;
      }

      // outbound-rtp（视频带宽估算）
      if (
        report.type === 'outbound-rtp' &&
        'mediaType' in report &&
        report.mediaType === 'video'
      ) {
        const outbound = report as RTCOutboundRtpStreamStats;
        if (outbound.bytesSent && outbound.timestamp) {
          result.bandwidth = (outbound.bytesSent * 8) / (outbound.timestamp / 1000);
        }
      }

    });

    return result;
  } catch (err) {
    console.error('❌ 检查网络质量失败:', err);
    return {};
  }
}


/**
 * 复制文本到剪贴板（兼容方案）
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error("❌ 复制到剪贴板失败:", error);
    return false;
  }
}
