import { StateManager } from "../state/StateManager";
import { MoodAnalyzer } from "./MoodAnalyzer";
import { VoiceManager } from "../voice/VoiceManager";

export type MoodState = 
  | "neutral" 
  | "focused" 
  | "curious" 
  | "happy" 
  | "encouraging" 
  | "concerned" 
  | "excited" 
  | "calm" 
  | "protective" 
  | "analytical";

export type ResponseStyle = "calm" | "energetic" | "focused";

export interface Emotion {
  currentMood: MoodState;
  confidence: number;
  energyLevel: number;
  responseStyle: ResponseStyle;
  personalityMode?: "system" | "friendly" | "shadow";
}

type EmotionListener = (emotion: Emotion) => void;

export class EmotionManager {
  private static instance: EmotionManager | null = null;
  private listeners: Set<EmotionListener> = new Set();
  
  private currentEmotion: Emotion = {
    currentMood: "neutral",
    confidence: 0.8,
    energyLevel: 0.5,
    responseStyle: "calm"
  };
  private lastProcessedTranscription: any = null;

  private constructor() {
    // Automatically subscribe to StateManager to detect user transcriptions
    StateManager.getInstance().subscribe((appState) => {
      if (appState.transcription && appState.transcription.isUser && appState.transcription !== this.lastProcessedTranscription) {
        this.lastProcessedTranscription = appState.transcription;
        this.analyzeAndSetEmotion(appState.transcription.text);
      }
    });
  }

  public static getInstance(): EmotionManager {
    if (!EmotionManager.instance) {
      EmotionManager.instance = new EmotionManager();
    }
    return EmotionManager.instance;
  }

  public getEmotion(): Emotion {
    return { ...this.currentEmotion };
  }

  /**
   * Resets emotion to default settings.
   */
  public resetToDefault() {
    this.currentEmotion = {
      currentMood: "neutral",
      confidence: 0.8,
      energyLevel: 0.5,
      responseStyle: "calm",
      personalityMode: "friendly"
    };
    this.lastProcessedTranscription = null;
    this.notify();
  }

  public subscribe(listener: EmotionListener): () => void {
    this.listeners.add(listener);
    listener(this.getEmotion());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public updateEmotion(updates: Partial<Emotion>) {
    this.currentEmotion = { ...this.currentEmotion, ...updates };
    this.notify();
  }

  /**
   * Run MoodAnalyzer and update state.
   */
  public analyzeAndSetEmotion(text: string) {
    const newEmotion = MoodAnalyzer.analyze(text);
    this.updateEmotion(newEmotion);

    // Auto-sync the personality voice profile with the detected conversation style/mode
    if (newEmotion.personalityMode) {
      const voiceManager = VoiceManager.getInstance();
      const currentMode = voiceManager.getProfile().id;
      
      if (currentMode === "shadow") {
        // If we are currently in shadow mode, do not automatically exit to system or friendly mode 
        // on normal conversational inputs.
        if (newEmotion.personalityMode === "shadow") {
          // Already in shadow mode, no action needed
        }
      } else if (currentMode === "friendly") {
        // If we are currently in friendly mode, do not automatically exit to system mode
        // on normal conversational inputs. Keep the warm conversational style active.
        if (newEmotion.personalityMode === "shadow") {
          voiceManager.setProfile("shadow");
          StateManager.getInstance().addLog("Core matrix auto-adapted profile to SHADOW Mode.", "info");
        }
      } else {
        if (currentMode !== newEmotion.personalityMode) {
          voiceManager.setProfile(newEmotion.personalityMode);
          StateManager.getInstance().addLog(`Core matrix auto-adapted profile to ${newEmotion.personalityMode.toUpperCase()} Mode.`, "info");
        }
      }
    }
  }

  /**
   * Generates a natural reaction prefix based on the current emotion state.
   */
  public getNaturalReaction(): string {
    const mood = this.currentEmotion.currentMood;
    const reactions: Record<MoodState, string[]> = {
      neutral: ["Acknowledged, Monarch.", "Processing command matrix.", "System listening, Monarch."],
      focused: ["Affirmative, Monarch. Optimizing process.", "Command authorized. Initializing.", "Deploying high-efficiency sequence."],
      curious: ["Interesting, Monarch. Processing that.", "A fascinating concept. Let us delve deeper.", "Exploring this dimension, Monarch."],
      happy: ["Excellent choice, Monarch.", "A superb selection.", "Confirmed. Glad to assist, Monarch."],
      encouraging: ["Excellent work, Monarch. Progress is fully confirmed.", "A phenomenal breakthrough, Monarch.", "Stellar execution. Standby for next phase."],
      concerned: ["Understood, Monarch. I will prioritize this security aspect immediately.", "Monarch, safeguards are fully online. Speak your command.", "Concern noted. Calibrating core defenses."],
      excited: ["Unexpected, but highly effective!", "Incredible vector! Initializing fully.", "A brilliant tactic, Monarch!"],
      calm: ["Always ready to assist, Monarch.", "At your service, as always.", "Tranquil state confirmed."],
      protective: ["Core defensive protocols active, Monarch.", "Safeguards engaged. State your target.", "Under extreme supervision. Standing by."],
      analytical: ["Analyzing the possibilities, Monarch.", "Fascinating approach. Parsing parameters.", "Synthesizing relational nodes."]
    };

    const choices = reactions[mood] || reactions["neutral"];
    const index = Math.floor(Math.random() * choices.length);
    return choices[index];
  }

  private notify() {
    const current = this.getEmotion();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error("[EmotionManager] Listener error:", err);
      }
    });
  }
}
