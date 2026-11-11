/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private onAudioChunk: (base64Chunk: string) => void;
  public onAudioLevel?: (level: number) => void;
  private smoothedLevel: number = 0;

  constructor(onAudioChunk: (base64Chunk: string) => void) {
    this.onAudioChunk = onAudioChunk;
  }

  async start() {
    try {
      // 1. Get user media (microphone stream)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Initialize AudioContext at 16000Hz (Gemini Live expects 16kHz)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create a ScriptProcessorNode with buffer size 1024, 1 input channel, 1 output channel
      this.scriptProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        const float32ChannelData = e.inputBuffer.getChannelData(0);
        
        // Calculate root-mean-square (RMS) volume level
        let sum = 0;
        for (let i = 0; i < float32ChannelData.length; i++) {
          sum += float32ChannelData[i] * float32ChannelData[i];
        }
        const rms = Math.sqrt(sum / float32ChannelData.length);
        
        // Normalize and amplify RMS to a 0-100 scale
        // A typical speak RMS is around 0.01 - 0.15
        const targetLevel = Math.min(100, Math.round(rms * 550));
        
        // Smooth out the level using a low-pass filter for highly responsive, lag-free but buttery visual movement
        if (targetLevel > this.smoothedLevel) {
          // Fast attack
          this.smoothedLevel = this.smoothedLevel * 0.15 + targetLevel * 0.85;
        } else {
          // Slightly slower decay
          this.smoothedLevel = this.smoothedLevel * 0.5 + targetLevel * 0.5;
        }
        
        // Ensure small noises below a threshold are zeroed out to prevent constant small fluctuations
        const finalLevel = this.smoothedLevel < 2 ? 0 : Math.round(this.smoothedLevel);

        if (this.onAudioLevel) {
          this.onAudioLevel(finalLevel);
        }

        const pcmBuffer = this.floatTo16BitPCM(float32ChannelData);
        const base64Chunk = this.arrayBufferToBase64(pcmBuffer);
        this.onAudioChunk(base64Chunk);
      };

      // Connect nodes
      this.mediaStreamSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      console.log("[AudioStreamer] Started capturing 16kHz microphone stream");
    } catch (error: any) {
      const isPermissionDenied =
        error?.name === "NotAllowedError" ||
        error?.name === "PermissionDeniedError" ||
        error?.message?.toLowerCase().includes("permission denied") ||
        error?.message?.toLowerCase().includes("permission dismissed");

      if (isPermissionDenied) {
        console.warn("[AudioStreamer] Microphone permission denied or dismissed by user.");
      } else {
        console.error("[AudioStreamer] Error starting microphone capture:", error);
      }
      throw error;
    }
  }

  stop() {
    console.log("[AudioStreamer] Stopping audio capture");

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch((err) => {
        console.warn("[AudioStreamer] Notice on closing AudioContext:", err);
      });
      this.audioContext = null;
    }
  }

  /**
   * Helper: Convert Float32Array to 16-bit PCM ArrayBuffer
   */
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit signed integer
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true); // true = little endian
    }
    return buffer;
  }

  /**
   * Helper: Convert ArrayBuffer to Base64 String
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
