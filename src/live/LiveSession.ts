/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MicrophoneController } from "../audio/MicrophoneController";
import { AudioPlayer } from "../audio/AudioPlayer";
import { ToolManager } from "../tools/ToolManager";
import { MemoryManager } from "../memory/MemoryManager";
import { VoiceManager } from "../voice/VoiceManager";
import { getAuthorizedUser } from "../memory/AuthorizedUser";

export type SessionState = "disconnected" | "connecting" | "listening" | "speaking" | "muted";

export interface SessionCallbacks {
  onStateChange: (state: SessionState) => void;
  onTranscription: (text: string, isUser: boolean) => void;
  onToolCall: (name: string, args: any) => void;
  onLog: (text: string, type: "info" | "success" | "warning" | "error" | "system") => void;
  onError: (error: string) => void;
  onAudioInputLevel?: (level: number) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private micController: MicrophoneController | null = null;
  private player: AudioPlayer | null = null;
  private toolManager: ToolManager;
  private callbacks: SessionCallbacks;

  private state: SessionState = "disconnected";
  private isUserSpeaking: boolean = false;
  private isModelSpeaking: boolean = false;
  private isMuted: boolean = false;

  constructor(toolManager: ToolManager, callbacks: SessionCallbacks) {
    this.toolManager = toolManager;
    this.callbacks = callbacks;
  }

  /**
   * Connect to the backend proxy and start the real-time AI session
   */
  async connect(initText?: string) {
    if (this.state !== "disconnected") return;

    this.updateState("connecting");
    this.callbacks.onLog("Initializing security protocols...", "system");

    // Initialize AudioPlayer
    this.player = new AudioPlayer((isSpeaking) => {
      this.isModelSpeaking = isSpeaking;
      this.recomputeState();
    });

    // Initialize MicrophoneController
    this.micController = new MicrophoneController(
      (base64Chunk) => {
        // Send microphone chunk to server
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: "audio",
              data: base64Chunk,
            })
          );
        }
      },
      (level) => {
        if (this.callbacks.onAudioInputLevel) {
          this.callbacks.onAudioInputLevel(level);
        }
      }
    );
    this.micController.setMute(this.isMuted);

    try {
      // 1. Establish WebSocket connection to backend with saved user memories
      await MemoryManager.getInstance().init();
      const memories = await MemoryManager.getInstance().getMemories();
      const memoriesQuery = encodeURIComponent(JSON.stringify(memories));

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const voiceMode = VoiceManager.getInstance().getProfile().id;
      
      // Load current authorized user
      const currentUser = await getAuthorizedUser();

      let wsUrl = `${protocol}//${host}/api/live?memories=${memoriesQuery}&voiceMode=${voiceMode}&authorizedUser=${encodeURIComponent(currentUser)}`;
      if (initText) {
        wsUrl += `&initText=${encodeURIComponent(initText)}`;
      }

      this.callbacks.onLog(`Opening communication bridge to IGRIS...`, "info");
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.callbacks.onLog("Bridge established. Syncing sensors...", "success");
        try {
          // 2. Start capturing microphone input
          await this.micController?.start();
          this.callbacks.onLog("Microphone streaming active (16kHz PCM16).", "success");
          
          this.isUserSpeaking = true; // Streaming audio
          this.recomputeState();
        } catch (err: any) {
          const isPermissionDenied =
            err?.name === "NotAllowedError" ||
            err?.name === "PermissionDeniedError" ||
            err?.message?.toLowerCase().includes("permission denied") ||
            err?.message?.toLowerCase().includes("permission dismissed");

          if (isPermissionDenied) {
            this.callbacks.onError("Microphone permission denied. Please allow microphone access in your browser to speak with IGRIS.");
            this.callbacks.onLog("Microphone permission blocked. Please enable microphone access in your browser settings.", "warning");
          } else {
            this.callbacks.onError(`Microphone error: ${err.message || err}`);
            this.callbacks.onLog("Failed to bind microphone stream.", "error");
          }
          this.disconnect();
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "audio":
              // Play AI response voice chunk
              if (this.player) {
                await this.player.playChunk(msg.data);
              }
              break;

            case "interrupted":
              // AI was interrupted by user, stop playback immediately
              this.callbacks.onLog("System interrupted by user input.", "warning");
              if (this.player) {
                this.player.stop();
              }
              break;

            case "transcription":
              // Transcription chunk from AI or User
              this.callbacks.onTranscription(msg.data, msg.isUser || false);
              break;

            case "tool_call":
              // AI decided to execute a local tool
              this.callbacks.onLog(`Triggering protocol: ${msg.name}...`, "system");
              this.callbacks.onToolCall(msg.name, msg.args);
              
              // Run the tool using ToolManager
              const output = await this.toolManager.execute(msg.name, msg.args);
              
              // Send response back to backend
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(
                  JSON.stringify({
                    type: "tool_response",
                    callId: msg.callId,
                    name: msg.name,
                    output: output,
                  })
                );
              }
              break;

            case "error":
              this.callbacks.onError(msg.error);
              this.callbacks.onLog(`Error received: ${msg.error}`, "error");
              break;
          }
        } catch (e: any) {
          console.error("[LiveSession] Error handling WS message:", e);
        }
      };

      this.ws.onclose = () => {
        this.callbacks.onLog("Communication link severed.", "warning");
        this.disconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[LiveSession] WebSocket error:", err);
        this.callbacks.onError("Communication link error.");
        this.disconnect();
      };

    } catch (e: any) {
      this.callbacks.onError(e.message || "Failed to initialize communication link.");
      this.disconnect();
    }
  }

  /**
   * Set microphone mute state
   */
  setMute(isMuted: boolean) {
    this.isMuted = isMuted;
    if (this.micController) {
      this.micController.setMute(isMuted);
    }
    this.recomputeState();
  }

  /**
   * Send a direct text command to IGRIS
   */
  sendText(text: string, isSystem: boolean = false) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (!isSystem) {
        this.callbacks.onTranscription(text, true);
      }
      this.callbacks.onLog(isSystem ? "Sending system protocol..." : `Sending diagnostic query...`, "info");
      this.ws.send(
        JSON.stringify({
          type: "text",
          data: text,
        })
      );
    } else {
      this.callbacks.onError("Not connected to IGRIS. Cannot transmit text.");
    }
  }

  /**
   * Send a base64 encoded video frame to the live session
   */
  sendVideoFrame(base64Data: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "video",
          data: base64Data,
        })
      );
    }
  }

  /**
   * Terminate connection and clean up resources
   */
  disconnect() {
    if (this.state === "disconnected") return;

    this.callbacks.onLog("Disconnecting core systems...", "system");

    // 1. Stop micController
    if (this.micController) {
      this.micController.stop();
      this.micController = null;
    }

    // 2. Stop player
    if (this.player) {
      this.player.stop();
      this.player = null;
    }

    // 3. Close websocket
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.isUserSpeaking = false;
    this.isModelSpeaking = false;
    this.updateState("disconnected");
    this.callbacks.onLog("IGRIS offline. Standby mode active.", "system");
  }

  private updateState(newState: SessionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }

  private recomputeState() {
    if (this.state === "disconnected") return;

    if (this.isMuted) {
      this.updateState("muted");
    } else if (this.isModelSpeaking) {
      this.updateState("speaking");
    } else {
      this.updateState("listening");
    }
  }
}
