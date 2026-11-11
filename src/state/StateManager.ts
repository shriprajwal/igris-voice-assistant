/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SessionState = "disconnected" | "connecting" | "listening" | "speaking" | "muted";

export interface LogEntry {
  id: string;
  text: string;
  type: "info" | "success" | "warning" | "error" | "system";
  timestamp: string;
}

export type AIMode = "friendly" | "system" | "shadow";

export interface AppState {
  state: SessionState;
  isMuted: boolean;
  theme: string;
  transcription: { text: string; isUser: boolean } | null;
  logs: LogEntry[];
  activeEffect: string | null;
  errorMessage: string | null;
  voiceMode?: AIMode;
  shadowAuthStatus?: "idle" | "pending" | "failed" | "verified";
}

type StateListener = (state: AppState) => void;

export class StateManager {
  private static instance: StateManager | null = null;
  private listeners: Set<StateListener> = new Set();

  private state: AppState = {
    state: "disconnected",
    isMuted: false,
    theme: "dark",
    transcription: null,
    logs: [],
    activeEffect: null,
    errorMessage: null,
    voiceMode: "friendly",
    shadowAuthStatus: "idle",
  };

  private constructor() {}

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  public getState(): AppState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Call listener immediately with current state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public update(updates: Partial<AppState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  public addLog(text: string, type: LogEntry["type"] = "info") {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    const logs = [...this.state.logs.slice(-30), newLog];
    this.update({ logs });
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error("[StateManager] Listener error:", err);
      }
    });
  }
}
