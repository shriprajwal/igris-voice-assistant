/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onSpeakingStateChange: (isSpeaking: boolean) => void;
  private speakingTimeout: any = null;

  constructor(onSpeakingStateChange: (isSpeaking: boolean) => void) {
    this.onSpeakingStateChange = onSpeakingStateChange;
  }

  /**
   * Play a raw 24kHz Int16 PCM audio chunk (Base64 encoded)
   */
  async playChunk(base64Chunk: string) {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      // 1. Decode base64 PCM16 into Float32
      const float32Data = this.base64ToFloat32(base64Chunk);
      if (float32Data.length === 0) return;

      // 2. Create AudioBuffer at 24000Hz (Gemini Live returns 24kHz)
      const buffer = this.audioCtx.createBuffer(1, float32Data.length, 24000);
      buffer.copyToChannel(float32Data, 0);

      // 3. Create Buffer Source Node
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx.destination);

      // 4. Precise Scheduling
      const currentTime = this.audioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        // If next play time has elapsed (e.g., first chunk or after a pause),
        // schedule immediately with a tiny buffer safety margin (50ms) to prevent clicks
        this.nextStartTime = currentTime + 0.05;
      }

      source.start(this.nextStartTime);

      // Track active sources so we can stop them immediately upon interruption
      this.activeSources.push(source);

      // Increment start time by current chunk's duration
      this.nextStartTime += buffer.duration;

      // Notify that speaking has started/is active
      this.triggerSpeakingState(true);

      // Clean up source from active array on end
      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index !== -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0) {
          // If no more sources are scheduled, speaking is complete
          this.triggerSpeakingState(false);
        }
      };
    } catch (err) {
      console.error("[AudioPlayer] Error playing audio chunk:", err);
    }
  }

  /**
   * Stop all playback, clear scheduled queue, and interrupt immediately
   */
  stop() {
    console.log("[AudioPlayer] Interrupting audio playback");

    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
      this.speakingTimeout = null;
    }

    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors from already stopped sources
      }
    });

    this.activeSources = [];
    this.nextStartTime = 0;
    this.onSpeakingStateChange(false);
  }

  private initAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Handle 24kHz directly
      });
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  private triggerSpeakingState(isSpeaking: boolean) {
    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
    }

    if (isSpeaking) {
      this.onSpeakingStateChange(true);
      // Safety timeout in case source ended callback isn't clean
      const durationMs = Math.max(100, (this.nextStartTime - (this.audioCtx?.currentTime || 0)) * 1000);
      this.speakingTimeout = setTimeout(() => {
        if (this.activeSources.length === 0) {
          this.onSpeakingStateChange(false);
        }
      }, durationMs + 100);
    } else {
      if (this.activeSources.length === 0) {
        this.onSpeakingStateChange(false);
      }
    }
  }

  /**
   * Convert Base64 raw Int16 PCM data to Float32Array
   */
  private base64ToFloat32(base64: string): Float32Array {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // 16-bit PCM = 2 bytes per sample
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        // Normalize Int16 range [-32768, 32767] to Float32 [-1.0, 1.0]
        float32Array[i] = int16Array[i] / 32768.0;
      }

      return float32Array;
    } catch (e) {
      console.error("[AudioPlayer] Error converting base64 to Float32:", e);
      return new Float32Array(0);
    }
  }
}
