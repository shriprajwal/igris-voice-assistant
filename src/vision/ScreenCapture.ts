export class ScreenCapture {
  private static instance: ScreenCapture | null = null;
  private mediaStream: MediaStream | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isActive: boolean = false;
  private listeners: ((isActive: boolean) => void)[] = [];

  private constructor() {
    if (typeof window !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.videoElement = document.createElement("video");
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
    }
  }

  public static getInstance(): ScreenCapture {
    if (!ScreenCapture.instance) {
      ScreenCapture.instance = new ScreenCapture();
    }
    return ScreenCapture.instance;
  }

  public async startCapture(): Promise<MediaStream> {
    if (this.mediaStream) {
      return this.mediaStream;
    }

    try {
      // Trigger simplified display capture prompt for maximum browser compatibility
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      this.isActive = true;
      if (this.videoElement) {
        this.videoElement.srcObject = this.mediaStream;
        await this.videoElement.play();
      }

      // Handle stream end by browser control UI
      this.mediaStream.getVideoTracks()[0].onended = () => {
        this.stopCapture();
      };

      this.notifyListeners();
      return this.mediaStream;
    } catch (error) {
      this.isActive = false;
      this.mediaStream = null;
      this.notifyListeners();
      throw error;
    }
  }

  public stopCapture(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isActive = false;
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.notifyListeners();
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public captureFrame(): string | null {
    if (!this.isActive || !this.videoElement || !this.canvas) {
      return null;
    }

    const video = this.videoElement;
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    // Set resolution bounds to prevent huge memory spikes
    const maxDimension = 1024;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.75); // compressed base64 JPEG
  }

  public subscribe(listener: (isActive: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Returns the current MediaStream of screen capture
   */
  public getVideoStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Continuous loop to capture video frames at a specified interval
   * and emit them via a callback.
   */
  public captureVideoFrames(
    callback: (frameBase64: string) => void,
    intervalMs: number = 1000
  ): () => void {
    let intervalId: any = null;

    const runLoop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (!this.isActive) {
          clearInterval(intervalId);
          return;
        }
        const frame = this.captureFrame();
        if (frame) {
          callback(frame);
        }
      }, intervalMs);
    };

    if (this.isActive) {
      runLoop();
    }

    // Also restart if stream becomes active later
    const unsubscribe = this.subscribe((active) => {
      if (active) {
        runLoop();
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.isActive));
  }
}
