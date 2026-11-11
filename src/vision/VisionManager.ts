import { ScreenCapture } from "./ScreenCapture";
import { VisionAnalyzer } from "./VisionAnalyzer";
import { StateManager } from "../state/StateManager";
import { LiveSession } from "../live/LiveSession";

export type VisionLifecycleState = "Connected" | "Analyzing" | "Disconnected";
export type VisionLifecycleListener = (state: VisionLifecycleState) => void;

export class VisionManager {
  private static instance: VisionManager | null = null;
  private captureCleanup: (() => void) | null = null;
  private currentSession: LiveSession | null = null;
  private status: VisionLifecycleState = "Disconnected";
  private listeners: Set<VisionLifecycleListener> = new Set();

  private constructor() {
    // Listen to ScreenCapture changes
    ScreenCapture.getInstance().subscribe((active) => {
      if (!active) {
        this.stopStreaming();
        this.setStatus("Disconnected");
        StateManager.getInstance().addLog("Visual screen assistance disconnected.", "info");
      } else {
        this.setStatus("Connected");
      }
    });
  }

  public static getInstance(): VisionManager {
    if (!VisionManager.instance) {
      VisionManager.instance = new VisionManager();
    }
    return VisionManager.instance;
  }

  /**
   * Subscribe to VisionManager lifecycle state changes
   */
  public subscribe(listener: VisionLifecycleListener): () => void {
    this.listeners.add(listener);
    // Trigger immediately with current state
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Set and broadcast current lifecycle status
   */
  public setStatus(newStatus: VisionLifecycleState) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.listeners.forEach((listener) => listener(newStatus));
    }
  }

  /**
   * Retrieve the current lifecycle status
   */
  public getStatus(): VisionLifecycleState {
    return this.status;
  }

  /**
   * Starts the screen capture and streaming loop
   */
  public async startVision(): Promise<void> {
    await this.startVisionAssist();
  }

  /**
   * Stops the screen capture and streaming loop
   */
  public stopVision(): void {
    this.stopVisionAssist();
  }

  /**
   * Triggers a real-time frame snapshot analysis
   */
  public async analyzeScreen(question?: string, context?: string) {
    this.setStatus("Analyzing");
    try {
      const result = await VisionAnalyzer.getInstance().analyzeCurrentScreen(question, context);
      return result;
    } finally {
      const active = ScreenCapture.getInstance().getIsActive();
      this.setStatus(active ? "Connected" : "Disconnected");
    }
  }

  /**
   * Gets the current screen vision capture status
   */
  public getVisionStatus(): { isActive: boolean; hasSession: boolean } {
    return {
      isActive: ScreenCapture.getInstance().getIsActive(),
      hasSession: this.currentSession !== null
    };
  }

  /**
   * Set the active LiveSession to stream frames to
   */
  public setSession(session: LiveSession | null) {
    this.currentSession = session;
    if (session && ScreenCapture.getInstance().getIsActive()) {
      this.startStreaming();
    } else {
      this.stopStreaming();
    }
  }

  /**
   * Starts the screen capture and streaming loop
   */
  public async startVisionAssist(): Promise<void> {
    try {
      StateManager.getInstance().addLog("Requesting screen vision permission from Monarch...", "info");
      await ScreenCapture.getInstance().startCapture();
      
      StateManager.getInstance().addLog("Visual interface connected. Screen vision active.", "success");
      this.setStatus("Connected");
      
      // Notify the active LiveSession so IGRIS verbally responds
      if (this.currentSession) {
        // Send a direct instruction to say exactly: "Visual interface connected, Monarch. I can now assist with your screen."
        this.currentSession.sendText("System instruction: Screen capture was approved. Verbally respond with exactly: 'Visual interface connected, Monarch. I can now assist with your screen.'", true);
        this.startStreaming();
      }
    } catch (err: any) {
      this.setStatus("Disconnected");
      StateManager.getInstance().addLog("Screen capture permission declined or blocked.", "error");
      if (this.currentSession) {
        this.currentSession.sendText("System instruction: Screen capture permission was denied. Verbally respond with exactly: 'Screen access denied, Monarch.'", true);
      }
      throw err;
    }
  }

  /**
   * Stops the screen capture and streaming loop
   */
  public stopVisionAssist(): void {
    ScreenCapture.getInstance().stopCapture();
    this.stopStreaming();
    this.setStatus("Disconnected");
    if (this.currentSession) {
      this.currentSession.sendText("System instruction: Screen capture was disconnected. Verbally respond with exactly: 'Visual connection terminated.'", true);
    }
  }

  /**
   * Continuous streaming of frame captures to the LiveSession using the real-time video pipeline
   */
  private startStreaming() {
    this.stopStreaming();

    // Stream frames using the continuous captureVideoFrames pipeline
    this.captureCleanup = ScreenCapture.getInstance().captureVideoFrames((frame) => {
      if (!this.currentSession || !ScreenCapture.getInstance().getIsActive()) {
        this.stopStreaming();
        return;
      }
      // Strip data prefix if present and send
      const cleanFrame = frame.includes("base64,") ? frame.split("base64,")[1] : frame;
      this.currentSession.sendVideoFrame(cleanFrame);
    }, 2500);
  }

  private stopStreaming() {
    if (this.captureCleanup) {
      this.captureCleanup();
      this.captureCleanup = null;
    }
  }
}
