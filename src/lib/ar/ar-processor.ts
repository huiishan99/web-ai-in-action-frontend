// lib/ar/ar-processor.ts
import type { ARConfig, ARStats } from '../../components/types';

/* ------------------------------------------------------------------ */
/*               MediaPipe FaceMesh 最小运行时类型描述                 */
/* ------------------------------------------------------------------ */
interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

interface FaceMeshResults {
  /* MediaPipe 会返回 multiFaceLandmarks */
  multiFaceLandmarks?: FaceLandmark[][];
}

interface FaceMeshOptions {
  maxNumFaces: number;
  refineLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}

interface FaceMesh {
  setOptions(opts: FaceMeshOptions): void;
  onResults(cb: (res: FaceMeshResults) => void): void;
  send(data: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

/* ------------------------------------------------------------------ */
/*                           ARProcessor                              */
/* ------------------------------------------------------------------ */
export class ARProcessor {
  private faceMesh: FaceMesh | null = null;

  private sourceVideo: HTMLVideoElement | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputContext: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  private isProcessing = false;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsStartTime = 0;

  private config: ARConfig;
  private stats: ARStats;

  private errorCount = 0;
  private readonly maxErrors = 5;

  constructor(config: Partial<ARConfig> = {}) {
    this.config = {
      enabled: true,
      maxFaces: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
      targetWidth: 640,
      targetHeight: 480,
      maxProcessingFPS: 15,
      fallbackEnabled: true,
      ...config,
    };

    this.stats = {
      isInitialized: false,
      faceDetected: false,
      processingFPS: 0,
      lastError: null,
      memoryUsage: 0,
      processingTime: 0,
    };
  }

  /* ------------------------ 兼容性检查 ------------------------ */
  private checkCompatibility(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push('浏览器不支持 getUserMedia');
    }

    try {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) issues.push('Canvas 2D context 不可用');
    } catch {
      issues.push('Canvas 创建失败');
    }

    try {
      const glCanvas = document.createElement('canvas');
      const gl = glCanvas.getContext('webgl')
        || glCanvas.getContext('experimental-webgl');
      if (!gl) issues.push('WebGL 不支持，AR 功能受限');
    } catch {
      // WebGL 检测失败仅告警
      console.warn('WebGL 检测失败，使用降级模式');
    }

    return { supported: issues.length === 0, issues };
  }

  /* ------------------------- 初始化 --------------------------- */
  async initialize(): Promise<boolean> {
    console.log('🔄 开始初始化 AR 处理器 …');

    try {
      const { supported, issues } = this.checkCompatibility();
      if (!supported) {
        throw new Error(`浏览器兼容性检查失败: ${issues.join(', ')}`);
      }

      if (!(await this.loadMediaPipe())) {
        throw new Error('MediaPipe 加载失败，使用模拟模式');
      }

      // 创建输出 Canvas
      this.outputCanvas = document.createElement('canvas');
      this.outputCanvas.width = this.config.targetWidth;
      this.outputCanvas.height = this.config.targetHeight;
      this.outputContext = this.outputCanvas.getContext('2d');

      if (!this.outputContext) {
        throw new Error('无法创建 Canvas 2D context');
      }

      this.stats.isInitialized = true;
      this.stats.lastError = null;
      console.log('✅ AR 处理器初始化成功');
      return true;
    } catch (err) {
      console.error('❌ AR 处理器初始化失败:', err);
      this.stats.lastError =
        err instanceof Error ? err.message : 'Unknown error';
      return this.initializeMockMode();
    }
  }

  /* --------------------- 模拟（降级）模式 --------------------- */
  private async initializeMockMode(): Promise<boolean> {
    console.log('⚠️ 初始化模拟 AR 模式（用于开发测试）');
    try {
      this.outputCanvas = document.createElement('canvas');
      this.outputCanvas.width = this.config.targetWidth;
      this.outputCanvas.height = this.config.targetHeight;
      this.outputContext = this.outputCanvas.getContext('2d');
      if (!this.outputContext) return false;

      this.stats.isInitialized = true;
      this.stats.lastError = 'Running in mock mode – MediaPipe not available';
      return true;
    } catch (err) {
      console.error('❌ 模拟模式初始化失败:', err);
      return false;
    }
  }

  /* ---------------------- 动态加载脚本 ----------------------- */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  private async loadMediaPipe(): Promise<boolean> {
    try {
      if ((window as unknown as { FaceMesh?: FaceMesh }).FaceMesh) {
        console.log('✅ MediaPipe 已经加载');
        await this.initializeFaceMesh();
        return true;
      }

      await this.loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      );
      await this.loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
      );
      await this.loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      );
      await this.loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
      );

      await new Promise((r) => setTimeout(r, 1000));

      if (!(window as unknown as { FaceMesh?: FaceMesh }).FaceMesh) {
        throw new Error('MediaPipe FaceMesh 未找到');
      }

      await this.initializeFaceMesh();
      return true;
    } catch (err) {
      console.error('❌ MediaPipe 加载失败:', err);
      return false;
    }
  }

  /* ---------------------- 初始化 FaceMesh --------------------- */
  private async initializeFaceMesh(): Promise<void> {
    const FaceMeshCtor =
      (window as unknown as { FaceMesh: new (cfg: unknown) => FaceMesh })
        .FaceMesh;

    this.faceMesh = new FaceMeshCtor({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this.faceMesh.setOptions({
      maxNumFaces: this.config.maxFaces,
      refineLandmarks: false,
      minDetectionConfidence: this.config.minDetectionConfidence,
      minTrackingConfidence: this.config.minTrackingConfidence,
    });

    this.faceMesh.onResults((results) => this.handleFaceMeshResults(results));
  }

  /* ---------------- 处理 FaceMesh / 模拟 结果 ---------------- */
  private handleFaceMeshResults(results: FaceMeshResults | null): void {
    if (!this.outputContext || !this.outputCanvas) return;

    try {
      const t0 = performance.now();

      // 清空画布并绘制原始帧
      this.outputContext.clearRect(
        0,
        0,
        this.outputCanvas.width,
        this.outputCanvas.height,
      );

      if (this.sourceVideo) {
        this.outputContext.drawImage(
          this.sourceVideo,
          0,
          0,
          this.outputCanvas.width,
          this.outputCanvas.height,
        );
      }

      // 是否检测到人脸
      const landmarks =
        results?.multiFaceLandmarks?.[0] ?? (this.faceMesh ? null : undefined);

      if (landmarks) {
        this.stats.faceDetected = true;
        if (landmarks !== undefined) this.drawSimpleFaceIndicator(landmarks);
      } else {
        this.stats.faceDetected = false;
        // 模拟模式下随机展示
        if (!this.faceMesh && Math.random() > 0.7) {
          this.stats.faceDetected = true;
          this.drawMockFaceIndicator();
        }
      }

      this.stats.processingTime = performance.now() - t0;
      this.updateFPSStats();
    } catch (err) {
      console.error('❌ 处理结果失败:', err);
      this.handleError(err);
    }
  }

  private drawSimpleFaceIndicator(
    landmarks: FaceLandmark[],
  ): void {
    if (!this.outputContext || !this.outputCanvas) return;

    this.outputContext.strokeStyle = '#00FF00';
    this.outputContext.lineWidth = 2;
    this.outputContext.fillStyle = '#00FF00';

    const keyPoints = [33, 263, 1, 61, 291]
      .map((idx) => landmarks[idx])
      .filter(Boolean);

    keyPoints.forEach((pt) => {
      const x = pt.x * this.outputCanvas!.width;
      const y = pt.y * this.outputCanvas!.height;
      this.outputContext!.beginPath();
      this.outputContext!.arc(x, y, 3, 0, 2 * Math.PI);
      this.outputContext!.fill();
    });
  }

  private drawMockFaceIndicator(): void {
    if (!this.outputContext || !this.outputCanvas) return;
    const ctx = this.outputContext;
    ctx.strokeStyle = '#FF6600';
    ctx.fillStyle = '#FF6600';
    ctx.lineWidth = 2;

    const { width, height } = this.outputCanvas;
    const cx = width / 2;
    const cy = height / 2;

    const pts = [
      { x: cx - 40, y: cy - 20 },
      { x: cx + 40, y: cy - 20 },
      { x: cx, y: cy },
      { x: cx - 20, y: cy + 30 },
      { x: cx + 20, y: cy + 30 },
    ];

    pts.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.font = '12px Arial';
    ctx.fillText('MOCK AR', 10, 20);
  }

  /* ---------------------- 视频流处理主流程 -------------------- */
  async processVideoStream(
    video: HTMLVideoElement,
  ): Promise<MediaStream | null> {
    if (!this.stats.isInitialized) {
      console.warn('⚠️ AR 处理器未初始化，返回原始流');
      return null;
    }
    if (this.isProcessing) {
      console.warn('⚠️ AR 处理器已在运行中');
      return null;
    }

    try {
      this.sourceVideo = video;
      this.isProcessing = true;
      this.errorCount = 0;

      await this.waitForVideoReady(video);
      this.syncDimensions(video);
      this.startProcessingLoop();

      const stream = this.outputCanvas?.captureStream(
        this.config.maxProcessingFPS,
      );
      if (!stream) throw new Error('无法从 Canvas 创建 MediaStream');

      console.log('✅ AR 视频流处理开始');
      return stream;
    } catch (err) {
      console.error('❌ 开始视频流处理失败:', err);
      this.handleError(err);
      return null;
    }
  }

  private waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('视频准备超时')),
        5000,
      );

      const check = () => {
        if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  private syncDimensions(video: HTMLVideoElement): void {
    if (!this.outputCanvas) return;

    const { videoWidth: w, videoHeight: h } = video;
    const ratio = w / h;
    const targetRatio = this.config.targetWidth / this.config.targetHeight;

    let cw = this.config.targetWidth;
    let ch = this.config.targetHeight;

    if (Math.abs(ratio - targetRatio) > 0.1) {
      ratio > targetRatio ? (ch = cw / ratio) : (cw = ch * ratio);
    }

    this.outputCanvas.width = Math.round(cw);
    this.outputCanvas.height = Math.round(ch);
  }

  private startProcessingLoop(): void {
    const loop = async () => {
      if (!this.isProcessing || !this.sourceVideo) return;
      try {
        const now = performance.now();
        if (
          now - this.lastFrameTime >=
          1000 / this.config.maxProcessingFPS
        ) {
          this.lastFrameTime = now;
          if (this.faceMesh) {
            await this.faceMesh.send({ image: this.sourceVideo });
          } else {
            this.handleFaceMeshResults(null);
          }
        }
        this.animationFrameId = requestAnimationFrame(loop);
      } catch (err) {
        console.error('❌ 处理帧失败:', err);
        this.handleError(err);
      }
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /* ------------------------ 性能统计 ------------------------- */
  private updateFPSStats(): void {
    this.frameCount += 1;
    const now = performance.now();

    if (!this.fpsStartTime) {
      this.fpsStartTime = now;
      return;
    }

    const elapsed = now - this.fpsStartTime;
    if (elapsed >= 1000) {
      this.stats.processingFPS = Math.round(
        ((this.frameCount * 1000) / elapsed) * 10,
      ) / 10;

      this.frameCount = 0;
      this.fpsStartTime = now;

      if ('memory' in performance) {
        const mem = (performance as Performance & {
          memory: { usedJSHeapSize: number };
        }).memory;
        this.stats.memoryUsage = mem.usedJSHeapSize / (1024 * 1024);
      }
    }
  }

  /* -------------------------- 错误处理 ------------------------ */
  private handleError(err: unknown): void {
    this.errorCount += 1;
    this.stats.lastError =
      err instanceof Error ? err.message : String(err);

    console.error(`❌ AR 处理错误 (${this.errorCount}/${this.maxErrors})`, err);

    if (this.errorCount >= this.maxErrors) {
      console.error('💥 错误过多，自动禁用 AR 功能');
      this.stop();
    }
  }

  /* ---------------------- 停止 / 清理 ------------------------ */
  stop(): void {
    this.isProcessing = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.sourceVideo = null;
  }

  cleanup(): void {
    this.stop();
    if (this.faceMesh) {
      try {
        this.faceMesh.close();
      } catch (e) {
        console.warn('⚠️ 清理 MediaPipe 失败:', e);
      }
      this.faceMesh = null;
    }
    this.outputCanvas = null;
    this.outputContext = null;
    this.stats.isInitialized = false;
  }

  /* --------------------- 对外公开的工具 ---------------------- */
  getStats(): ARStats {
    return { ...this.stats };
  }

  updateConfig(cfg: Partial<ARConfig>): void {
    this.config = { ...this.config, ...cfg };
    console.log('⚙️ AR 配置已更新:', this.config);
  }

  getOutputCanvas(): HTMLCanvasElement | null {
    return this.outputCanvas;
  }

  isActive(): boolean {
    return this.isProcessing && this.stats.isInitialized;
  }
}
