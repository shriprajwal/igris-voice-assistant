/**
 * IGRIS Native Windows Screen Capture — WebSocket Live Stream
 *
 * Python captures the desktop at 30 FPS via QScreen.grabWindow and pushes
 * binary JPEG frames over WebSocket (/api/screen/ws).  The browser draws
 * each frame onto a canvas element — giving a smooth, continuous video-like
 * experience identical to what Chrome's getDisplayMedia used to provide.
 *
 * Key design:
 *  • One persistent WebSocket connection — no per-frame HTTP round-trips
 *  • Auto-starts on first call to getInstance().connect() — no auth modal
 *  • Canvas element updated in requestAnimationFrame loop for butter-smooth rendering
 *  • rawBase64 of latest frame available for Gemini Live / vision analysis
 */

export interface MonitorInfo {
  id: number;
  name: string;
  width: number;
  height: number;
  physicalWidth: number;
  physicalHeight: number;
  left: number;
  top: number;
  dpr: number;
  isPrimary: boolean;
}

export interface ScreenObservationStatus {
  isAuthorized: boolean;
  isCapturing: boolean;
  selectedMonitorId: number;
  lastCaptureTime: number;
  frameCount: number;
  hasFrame: boolean;
  frameWidth: number;
  frameHeight: number;
  screenWidth: number;
  screenHeight: number;
  dpr: number;
  lastError: string | null;
}

export class ScreenCapture {
  private static instance: ScreenCapture | null = null;

  // WebSocket live stream state
  private ws: WebSocket | null = null;
  private wsReady: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isActive: boolean = false;
  private stopRequested: boolean = false;

  // Canvas for drawing live frames
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private canvasStream: MediaStream | null = null;

  // Latest frame data
  private latestFrame: string | null = null;      // data:image/jpeg;base64,...
  private latestRawB64: string | null = null;      // raw base64 without prefix
  private latestJpegBlob: Blob | null = null;
  private prevBlobUrl: string | null = null;

  // Metadata
  private frameWidth: number = 0;
  private frameHeight: number = 0;
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private dpr: number = 1.0;
  private selectedMonitorId: number = 0;
  private frameCount: number = 0;
  private lastCaptureTime: number = 0;
  private lastError: string | null = null;

  // Listeners
  private listeners: ((isActive: boolean) => void)[] = [];
  private frameListeners: ((frameUrl: string) => void)[] = [];
  private blobListeners: ((blob: Blob) => void)[] = [];

  private constructor() {
    if (typeof window !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.canvas.width = 1280;
      this.canvas.height = 720;
      this.ctx = this.canvas.getContext("2d");
    }
  }

  public static getInstance(): ScreenCapture {
    if (!ScreenCapture.instance) {
      ScreenCapture.instance = new ScreenCapture();
    }
    return ScreenCapture.instance;
  }

  // ─── Monitor enumeration ──────────────────────────────────────────────────

  public async listMonitors(): Promise<MonitorInfo[]> {
    try {
      const resp = await fetch("/api/screen/monitors");
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Array.isArray(data.monitors)) return data.monitors;
      }
    } catch {}
    return [{
      id: 0, name: "Primary Display",
      width: window?.screen?.width || 1920, height: window?.screen?.height || 1080,
      physicalWidth: window?.screen?.width || 1920, physicalHeight: window?.screen?.height || 1080,
      left: 0, top: 0, dpr: window?.devicePixelRatio || 1.0, isPrimary: true
    }];
  }

  public async checkStatus(): Promise<ScreenObservationStatus | null> {
    try {
      const resp = await fetch("/api/screen/status");
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.status) {
          const st: ScreenObservationStatus = data.status;
          if (st.isCapturing) {
            this.isActive = true;
            this.selectedMonitorId = st.selectedMonitorId;
            this.screenWidth = st.screenWidth;
            this.screenHeight = st.screenHeight;
            this.dpr = st.dpr;
          }
          return st;
        }
      }
    } catch {}
    return null;
  }

  // ─── WebSocket live stream ────────────────────────────────────────────────

  /**
   * Connect the WebSocket live stream.  Replaces startCapture().
   * Auto-starts capture on the Python side; no auth modal.
   */
  public connect(monitorId: number = 0): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // already connected
    }
    this.stopRequested = false;
    this.selectedMonitorId = monitorId;
    this._openWs(monitorId);
  }

  private _openWs(monitorId: number): void {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/api/screen/ws?m=${monitorId}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";
    } catch (e) {
      this._scheduleReconnect(monitorId, 2000);
      return;
    }

    this.ws.onopen = () => {
      this.wsReady = true;
      this.isActive = true;
      this.lastError = null;
      console.log("[ScreenCapture] WebSocket stream connected");
      this.notifyListeners();
    };

    this.ws.onmessage = (ev) => {
      if (!(ev.data instanceof ArrayBuffer)) return;
      const jpegBytes = new Uint8Array(ev.data);
      this._processJpegFrame(jpegBytes);
    };

    this.ws.onclose = () => {
      this.wsReady = false;
      if (!this.stopRequested) {
        console.warn("[ScreenCapture] WebSocket closed; reconnecting...");
        this._scheduleReconnect(monitorId, 1500);
      } else {
        this.isActive = false;
        this.notifyListeners();
      }
    };

    this.ws.onerror = () => {
      this.lastError = "WebSocket screen stream error";
    };
  }

  private _scheduleReconnect(monitorId: number, delayMs: number): void {
    if (this.stopRequested) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.stopRequested) this._openWs(monitorId);
    }, delayMs);
  }

  private _processJpegFrame(jpegBytes: Uint8Array): void {
    this.frameCount++;
    this.lastCaptureTime = Date.now() / 1000;

    const blob = new Blob([jpegBytes], { type: "image/jpeg" });
    this.latestJpegBlob = blob;

    // Notify zero-URL blob consumers (e.g. createImageBitmap canvas renderer)
    if (this.blobListeners.length > 0) {
      this.blobListeners.forEach((l) => l(blob));
    }

    // Only allocate/revoke Blob URLs if a URL-based listener or MediaStream consumer exists
    if (this.frameListeners.length > 0 || (this.canvasStream && this.canvas && this.ctx)) {
      const staleUrl = this.prevBlobUrl;
      if (staleUrl) {
        setTimeout(() => {
          try { URL.revokeObjectURL(staleUrl); } catch {}
        }, 250);
      }

      const displayUrl = URL.createObjectURL(blob);
      this.prevBlobUrl = displayUrl;
      this.latestFrame = displayUrl;

      // Draw to hidden canvas only if a MediaStream consumer actually requested captureStream()
      if (this.canvasStream && this.canvas && this.ctx) {
        createImageBitmap(blob).then((bitmap) => {
          if (!this.canvas || !this.ctx) {
            bitmap.close();
            return;
          }
          if (bitmap.width !== this.canvas.width || bitmap.height !== this.canvas.height) {
            this.canvas.width = bitmap.width;
            this.canvas.height = bitmap.height;
            this.frameWidth = bitmap.width;
            this.frameHeight = bitmap.height;
          }
          this.ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
        }).catch(() => {});
      }

      // Notify URL listeners
      if (this.frameListeners.length > 0) {
        this.frameListeners.forEach((l) => l(displayUrl));
      }
    }
  }

  public disconnect(): void {
    this.stopRequested = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if (this.prevBlobUrl) {
      try { URL.revokeObjectURL(this.prevBlobUrl); } catch {}
      this.prevBlobUrl = null;
    }
    this.wsReady = false;
    this.isActive = false;
    this.latestFrame = null;
    this.latestRawB64 = null;
    this.latestJpegBlob = null;
    this.notifyListeners();

    // Revoke capture on Python side
    fetch("/api/screen/revoke", { method: "POST", headers: { "Content-Type": "application/json" } }).catch(() => {});
  }

  // ─── Legacy compatibility shims (used by VisionManager, VisionAnalyzer) ──

  public async startCapture(monitorId: number = 0): Promise<MediaStream | null> {
    this.connect(monitorId);
    return this.getVideoStream();
  }

  public async stopCapture(): Promise<void> {
    this.disconnect();
  }

  /**
   * Returns raw base64 of the latest JPEG for Gemini Live / vision analysis.
   * Converts the Blob to base64 asynchronously.
   */
  public async fetchLatestNativeFrame(): Promise<string | null> {
    if (!this.latestJpegBlob) {
      // Fall back to HTTP if WebSocket hasn't received a frame yet
      try {
        const resp = await fetch("/api/screen/frame");
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.frame) {
            this.latestFrame = data.frame;
            this.latestRawB64 = data.rawBase64 || data.frame.split("base64,")[1] || null;
            this.frameWidth = data.width || 1280;
            this.frameHeight = data.height || 720;
            this.screenWidth = data.screenWidth || 1920;
            this.screenHeight = data.screenHeight || 1080;
            this.dpr = data.dpr || 1.0;
            if (this.frameListeners.length > 0 && this.latestFrame) {
              this.frameListeners.forEach((l) => l(this.latestFrame!));
            }
            return this.latestFrame;
          }
        }
      } catch {}
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.latestRawB64 = dataUrl.split("base64,")[1] || null;
        this.latestFrame = dataUrl;
        resolve(dataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(this.latestJpegBlob!);
    });
  }

  public captureFrame(): string | null {
    return this.latestFrame;
  }

  public getRawBase64(): string | null {
    return this.latestRawB64;
  }

  /**
   * Continuous loop that feeds frames to Gemini Live.
   * Throttled — sends one frame every `intervalMs`.
   */
  public captureVideoFrames(
    callback: (frameBase64: string) => void,
    intervalMs: number = 1000
  ): () => void {
    let running = true;

    const loop = async () => {
      while (running && this.isActive) {
        const frame = await this.fetchLatestNativeFrame();
        const raw = this.latestRawB64;
        if (raw) callback(raw);
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    };

    loop();

    const unsub = this.subscribe((active) => {
      if (!active) running = false;
    });

    return () => {
      running = false;
      unsub();
    };
  }

  // ─── Canvas / MediaStream ─────────────────────────────────────────────────

  public getVideoStream(): MediaStream | null {
    if (this.canvasStream) return this.canvasStream;
    if (this.canvas && typeof (this.canvas as any).captureStream === "function") {
      try {
        this.canvasStream = (this.canvas as any).captureStream(30);
        return this.canvasStream;
      } catch {}
    }
    return null;
  }

  public getStreamUrl(): string {
    return `/api/screen/ws?m=${this.selectedMonitorId}`;
  }

  // ─── Metadata ─────────────────────────────────────────────────────────────

  public getIsActive(): boolean { return this.isActive; }
  public getIsAuthorized(): boolean { return this.isActive; }
  public getSelectedMonitorId(): number { return this.selectedMonitorId; }
  public getLastError(): string | null { return this.lastError; }

  public getDimensions() {
    return {
      width: this.frameWidth, height: this.frameHeight,
      screenWidth: this.screenWidth, screenHeight: this.screenHeight,
      dpr: this.dpr
    };
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────

  public subscribe(listener: (isActive: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  public onFrame(listener: (frameUrl: string) => void): () => void {
    this.frameListeners.push(listener);
    if (this.latestFrame) listener(this.latestFrame);
    return () => { this.frameListeners = this.frameListeners.filter((l) => l !== listener); };
  }

  public onBlobFrame(listener: (blob: Blob) => void): () => void {
    this.blobListeners.push(listener);
    if (this.latestJpegBlob) listener(this.latestJpegBlob);
    return () => { this.blobListeners = this.blobListeners.filter((l) => l !== listener); };
  }

  public getLatestBlob(): Blob | null {
    return this.latestJpegBlob;
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.isActive));
  }
}
