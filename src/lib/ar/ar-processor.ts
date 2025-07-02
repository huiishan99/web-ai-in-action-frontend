// lib/ar/ar-processor.ts - 可运行的简化版本
import type { ARConfig, ARStats } from '../../types';

export class ARProcessor {
  private faceMesh: any = null;
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
  private maxErrors = 5;

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
      ...config
    };

    this.stats = {
      isInitialized: false,
      faceDetected: false,
      processingFPS: 0,
      lastError: null,
      memoryUsage: 0,
      processingTime: 0
    };
  }

  // 检查浏览器兼容性
  private checkCompatibility(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      issues.push('浏览器不支持getUserMedia');
    }

    try {
      const testCanvas = document.createElement('canvas');
      const ctx = testCanvas.getContext('2d');
      if (!ctx) {
        issues.push('Canvas 2D context不可用');
      }
    } catch (error) {
      issues.push('Canvas创建失败');
    }

    // 简化WebGL检查
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        issues.push('WebGL不支持，AR功能受限');
      }
    } catch (error) {
      console.warn('WebGL检测失败，使用降级模式');
    }

    return {
      supported: issues.length === 0,
      issues
    };
  }

  // 简化的初始化方法
  async initialize(): Promise<boolean> {
    console.log('🔄 开始初始化AR处理器...');

    try {
      // 兼容性检查
      const compatibility = this.checkCompatibility();
      if (!compatibility.supported) {
        throw new Error(`浏览器兼容性检查失败: ${compatibility.issues.join(', ')}`);
      }

      // 尝试加载 MediaPipe (使用动态脚本加载)
      const success = await this.loadMediaPipe();
      if (!success) {
        throw new Error('MediaPipe加载失败，使用模拟模式');
      }

      // 创建输出Canvas
      this.outputCanvas = document.createElement('canvas');
      this.outputCanvas.width = this.config.targetWidth;
      this.outputCanvas.height = this.config.targetHeight;
      this.outputContext = this.outputCanvas.getContext('2d');

      if (!this.outputContext) {
        throw new Error('无法创建Canvas 2D context');
      }

      this.stats.isInitialized = true;
      this.stats.lastError = null;
      console.log('✅ AR处理器初始化成功');
      return true;

    } catch (error) {
      console.error('❌ AR处理器初始化失败:', error);
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';

      // 降级到模拟模式
      return this.initializeMockMode();
    }
  }

  // 降级：模拟模式初始化
  private async initializeMockMode(): Promise<boolean> {
    console.log('⚠️ 初始化模拟AR模式（用于开发测试）');

    try {
      this.outputCanvas = document.createElement('canvas');
      this.outputCanvas.width = this.config.targetWidth;
      this.outputCanvas.height = this.config.targetHeight;
      this.outputContext = this.outputCanvas.getContext('2d');

      if (!this.outputContext) {
        return false;
      }

      this.stats.isInitialized = true;
      this.stats.lastError = 'Running in mock mode - MediaPipe not available';
      return true;
    } catch (error) {
      console.error('❌ 模拟模式初始化失败:', error);
      return false;
    }
  }

  // 动态加载 MediaPipe
  private async loadMediaPipe(): Promise<boolean> {
    try {
      // 检查是否已经加载
      if ((window as any).FaceMesh) {
        console.log('✅ MediaPipe already loaded');
        await this.initializeFaceMesh();
        return true;
      }

      // 动态加载脚本
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');

      // 等待一下确保脚本加载完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!(window as any).FaceMesh) {
        throw new Error('MediaPipe FaceMesh not found after loading');
      }

      await this.initializeFaceMesh();
      return true;

    } catch (error) {
      console.error('❌ MediaPipe加载失败:', error);
      return false;
    }
  }

  // 加载外部脚本
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  // 初始化FaceMesh
  private async initializeFaceMesh(): Promise<void> {
    const FaceMesh = (window as any).FaceMesh;

    this.faceMesh = new FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    this.faceMesh.setOptions({
      maxNumFaces: this.config.maxFaces,
      refineLandmarks: false,
      minDetectionConfidence: this.config.minDetectionConfidence,
      minTrackingConfidence: this.config.minTrackingConfidence,
    });

    this.faceMesh.onResults((results: any) => {
      this.handleFaceMeshResults(results);
    });
  }

  // 处理MediaPipe结果或模拟结果
  private handleFaceMeshResults(results: any): void {
    if (!this.outputContext || !this.outputCanvas) return;

    try {
      const processStart = performance.now();

      // 清空Canvas
      this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);

      // 绘制原始视频帧
      if (this.sourceVideo) {
        this.outputContext.drawImage(
          this.sourceVideo,
          0, 0,
          this.outputCanvas.width,
          this.outputCanvas.height
        );
      }

      // 检测到人脸时的处理
      if (results && results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        this.stats.faceDetected = true;
        this.drawSimpleFaceIndicator(results.multiFaceLandmarks[0]);
      } else {
        this.stats.faceDetected = false;
        // 模拟模式：随机显示人脸检测
        if (!this.faceMesh && Math.random() > 0.7) {
          this.stats.faceDetected = true;
          this.drawMockFaceIndicator();
        }
      }

      this.stats.processingTime = performance.now() - processStart;
      this.updateFPSStats();

    } catch (error) {
      console.error('❌ 处理结果失败:', error);
      this.handleError(error);
    }
  }

  // 绘制简单的人脸指示器
  private drawSimpleFaceIndicator(landmarks: any[]): void {
    if (!this.outputContext || !this.outputCanvas) return;

    try {
      this.outputContext.strokeStyle = '#00FF00';
      this.outputContext.lineWidth = 2;
      this.outputContext.fillStyle = '#00FF00';

      // 绘制关键点
      const keyPoints = [
        landmarks[33],  // 左眼
        landmarks[263], // 右眼
        landmarks[1],   // 鼻尖
        landmarks[61],  // 嘴巴左
        landmarks[291], // 嘴巴右
      ];

      keyPoints.forEach(point => {
        if (point) {
          const x = point.x * this.outputCanvas!.width;
          const y = point.y * this.outputCanvas!.height;

          this.outputContext!.beginPath();
          this.outputContext!.arc(x, y, 3, 0, 2 * Math.PI);
          this.outputContext!.fill();
        }
      });

    } catch (error) {
      console.error('❌ 绘制人脸指示器失败:', error);
    }
  }

  // 模拟模式：绘制假的人脸指示器
  private drawMockFaceIndicator(): void {
    if (!this.outputContext || !this.outputCanvas) return;

    this.outputContext.strokeStyle = '#FF6600';
    this.outputContext.lineWidth = 2;
    this.outputContext.fillStyle = '#FF6600';

    // 在画面中心绘制几个模拟的关键点
    const centerX = this.outputCanvas.width / 2;
    const centerY = this.outputCanvas.height / 2;

    const mockPoints = [
      { x: centerX - 40, y: centerY - 20 }, // 左眼
      { x: centerX + 40, y: centerY - 20 }, // 右眼
      { x: centerX, y: centerY },           // 鼻尖
      { x: centerX - 20, y: centerY + 30 }, // 嘴巴左
      { x: centerX + 20, y: centerY + 30 }, // 嘴巴右
    ];

    mockPoints.forEach(point => {
      this.outputContext!.beginPath();
      this.outputContext!.arc(point.x, point.y, 3, 0, 2 * Math.PI);
      this.outputContext!.fill();
    });

    // 添加"MOCK"标识
    this.outputContext.font = '12px Arial';
    this.outputContext.fillText('MOCK AR', 10, 20);
  }

  // 开始处理视频流
  async processVideoStream(video: HTMLVideoElement): Promise<MediaStream | null> {
    if (!this.stats.isInitialized) {
      console.warn('⚠️ AR处理器未初始化，返回原始流');
      return null;
    }

    if (this.isProcessing) {
      console.warn('⚠️ AR处理器已在运行中');
      return null;
    }

    try {
      this.sourceVideo = video;
      this.isProcessing = true;
      this.errorCount = 0;

      // 等待视频准备就绪
      await this.waitForVideoReady(video);

      // 同步尺寸
      this.syncDimensions(video);

      // 开始处理循环
      this.startProcessingLoop();

      // 从Canvas创建MediaStream
      const stream = this.outputCanvas?.captureStream(this.config.maxProcessingFPS);
      if (!stream) {
        throw new Error('无法从Canvas创建MediaStream');
      }

      console.log('✅ AR视频流处理开始');
      return stream;

    } catch (error) {
      console.error('❌ 开始视频流处理失败:', error);
      this.handleError(error);
      return null;
    }
  }

  // 等待视频准备就绪
  private waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('视频准备超时'));
      }, 5000);

      const checkReady = () => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  // 同步Canvas和Video尺寸
  private syncDimensions(video: HTMLVideoElement): void {
    if (!this.outputCanvas) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    console.log(`📐 视频尺寸: ${videoWidth}x${videoHeight}`);

    // 保持宽高比
    const aspectRatio = videoWidth / videoHeight;
    const targetAspectRatio = this.config.targetWidth / this.config.targetHeight;

    let canvasWidth = this.config.targetWidth;
    let canvasHeight = this.config.targetHeight;

    if (Math.abs(aspectRatio - targetAspectRatio) > 0.1) {
      if (aspectRatio > targetAspectRatio) {
        canvasHeight = canvasWidth / aspectRatio;
      } else {
        canvasWidth = canvasHeight * aspectRatio;
      }
    }

    this.outputCanvas.width = Math.round(canvasWidth);
    this.outputCanvas.height = Math.round(canvasHeight);

    console.log(`📐 Canvas尺寸: ${this.outputCanvas.width}x${this.outputCanvas.height}`);
  }

  // 开始处理循环
  private startProcessingLoop(): void {
    const processFrame = async () => {
      if (!this.isProcessing || !this.sourceVideo) {
        return;
      }

      try {
        const now = performance.now();
        const timeSinceLastFrame = now - this.lastFrameTime;
        const targetFrameTime = 1000 / this.config.maxProcessingFPS;

        if (timeSinceLastFrame >= targetFrameTime) {
          this.lastFrameTime = now;

          // 发送给MediaPipe或模拟处理
          if (this.faceMesh) {
            await this.faceMesh.send({ image: this.sourceVideo });
          } else {
            // 模拟处理
            this.handleFaceMeshResults(null);
          }
        }

        this.animationFrameId = requestAnimationFrame(processFrame);

      } catch (error) {
        console.error('❌ 处理帧失败:', error);
        this.handleError(error);
      }
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  // 更新FPS统计
  private updateFPSStats(): void {
    this.frameCount++;
    const now = performance.now();

    if (this.fpsStartTime === 0) {
      this.fpsStartTime = now;
      return;
    }

    const elapsed = now - this.fpsStartTime;
    if (elapsed >= 1000) {
      const currentFPS = (this.frameCount * 1000) / elapsed;
      this.stats.processingFPS = Math.round(currentFPS * 10) / 10;

      this.frameCount = 0;
      this.fpsStartTime = now;

      // 更新内存使用情况
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        this.stats.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024);
      }
    }
  }

  // 错误处理
  private handleError(error: any): void {
    this.errorCount++;
    this.stats.lastError = error instanceof Error ? error.message : String(error);

    console.error(`❌ AR处理错误 (${this.errorCount}/${this.maxErrors}):`, error);

    if (this.errorCount >= this.maxErrors) {
      console.error('💥 错误次数过多，自动禁用AR功能');
      this.stop();
    }
  }

  // 停止处理
  stop(): void {
    console.log('🛑 停止AR处理');

    this.isProcessing = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.sourceVideo = null;
  }

  // 清理资源
  cleanup(): void {
    console.log('🧹 清理AR处理器资源');

    this.stop();

    if (this.faceMesh) {
      try {
        this.faceMesh.close();
      } catch (error) {
        console.warn('⚠️ 清理MediaPipe失败:', error);
      }
      this.faceMesh = null;
    }

    this.outputCanvas = null;
    this.outputContext = null;
    this.stats.isInitialized = false;
  }

  // 获取统计信息
  getStats(): ARStats {
    return { ...this.stats };
  }

  // 更新配置
  updateConfig(newConfig: Partial<ARConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ AR配置已更新:', this.config);
  }

  // 获取输出Canvas
  getOutputCanvas(): HTMLCanvasElement | null {
    return this.outputCanvas;
  }

  // 检查是否正在处理
  isActive(): boolean {
    return this.isProcessing && this.stats.isInitialized;
  }
}