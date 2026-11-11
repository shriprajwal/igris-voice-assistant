/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioStreamer } from "./AudioStreamer";

export class MicrophoneController {
  private streamer: AudioStreamer | null = null;
  private onAudioChunk: (base64Chunk: string) => void;
  private onAudioLevel?: (level: number) => void;
  private muted: boolean = false;

  constructor(onAudioChunk: (base64Chunk: string) => void, onAudioLevel?: (level: number) => void) {
    this.onAudioChunk = onAudioChunk;
    this.onAudioLevel = onAudioLevel;
  }

  async start() {
    if (this.streamer) return;

    this.streamer = new AudioStreamer((base64Chunk) => {
      if (!this.muted) {
        this.onAudioChunk(base64Chunk);
      }
    });

    if (this.onAudioLevel) {
      this.streamer.onAudioLevel = (level) => {
        if (!this.muted) {
          this.onAudioLevel!(level);
        } else {
          this.onAudioLevel!(0);
        }
      };
    }

    await this.streamer.start();
  }

  stop() {
    if (this.streamer) {
      this.streamer.stop();
      this.streamer = null;
    }
  }

  setMute(muted: boolean) {
    this.muted = muted;
    console.log(`[MicrophoneController] Microphone mute state updated: ${muted ? "MUTED" : "UNMUTED"}`);
  }

  isMuted(): boolean {
    return this.muted;
  }
}
