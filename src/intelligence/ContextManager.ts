import { MoodState } from "../emotion/EmotionManager";

export interface ConversationTurn {
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface ContextMetadata {
  userMood: MoodState;
  intent: string;
  isBored: boolean;
  isExhausted: boolean;
  isVictorious: boolean;
  isSarcastic: boolean;
  isJoking: boolean;
  preferenceBrevity: "concise" | "balanced" | "detailed";
  lastActionTriggered?: string;
}

export class ContextManager {
  private static instance: ContextManager | null = null;
  private history: ConversationTurn[] = [];
  private metadata: ContextMetadata = {
    userMood: "neutral",
    intent: "unknown",
    isBored: false,
    isExhausted: false,
    isVictorious: false,
    isSarcastic: false,
    isJoking: false,
    preferenceBrevity: "balanced"
  };

  private constructor() {}

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  public getHistory(): ConversationTurn[] {
    return [...this.history];
  }

  public addTurn(role: "user" | "model", text: string) {
    this.history.push({
      role,
      text,
      timestamp: new Date().toISOString()
    });
    // Keep last 20 turns
    if (this.history.length > 20) {
      this.history.shift();
    }
    
    if (role === "user") {
      this.analyzeContext(text);
    }
  }

  public getMetadata(): ContextMetadata {
    return { ...this.metadata };
  }

  /**
   * Resets conversational history and context metadata back to default settings.
   */
  public resetToDefault() {
    this.history = [];
    this.metadata = {
      userMood: "neutral",
      intent: "unknown",
      isBored: false,
      isExhausted: false,
      isVictorious: false,
      isSarcastic: false,
      isJoking: false,
      preferenceBrevity: "balanced"
    };
  }

  public updateMetadata(updates: Partial<ContextMetadata>) {
    this.metadata = { ...this.metadata, ...updates };
  }

  private analyzeContext(text: string) {
    const lower = text.toLowerCase();
    
    // Intent detection
    let detectedIntent = "general_query";
    if (lower.includes("help") || lower.includes("build") || lower.includes("create") || lower.includes("program")) {
      detectedIntent = "problem_solving";
    } else if (lower.includes("remember") || lower.includes("save") || lower.includes("recall")) {
      detectedIntent = "memory_management";
    } else if (lower.includes("theme") || lower.includes("look") || lower.includes("style") || lower.includes("color")) {
      detectedIntent = "system_calibration";
    }

    // Emotion & State detection
    const isBored = lower.includes("bored") || lower.includes("nothing to do") || lower.includes("tedious");
    const isExhausted = lower.includes("tired") || lower.includes("exhausted") || lower.includes("sleepy") || lower.includes("long day");
    const isVictorious = lower.includes("complete") || lower.includes("done") || lower.includes("won") || lower.includes("finished") || lower.includes("victory");
    
    // Joke and sarcasm heuristics
    const isJoking = lower.includes("joke") || lower.includes("haha") || lower.includes("hehe") || lower.includes("funny");
    const isSarcastic = lower.includes("sure, because") || lower.includes("whatever you say") || lower.includes("genius");

    // Adaptive Brevity detection from length of user turns
    let preferenceBrevity = this.metadata.preferenceBrevity;
    const userTurns = this.history.filter(t => t.role === "user");
    if (userTurns.length >= 3) {
      const lastThree = userTurns.slice(-3);
      const avgLen = lastThree.reduce((acc, t) => acc + t.text.split(" ").length, 0) / 3;
      if (avgLen < 5) {
        preferenceBrevity = "concise";
      } else if (avgLen > 15) {
        preferenceBrevity = "detailed";
      } else {
        preferenceBrevity = "balanced";
      }
    }

    this.metadata = {
      ...this.metadata,
      intent: detectedIntent,
      isBored,
      isExhausted,
      isVictorious,
      isJoking,
      isSarcastic,
      preferenceBrevity
    };
  }

  public clearHistory() {
    this.history = [];
    this.metadata = {
      userMood: "neutral",
      intent: "unknown",
      isBored: false,
      isExhausted: false,
      isVictorious: false,
      isSarcastic: false,
      isJoking: false,
      preferenceBrevity: "balanced"
    };
  }
}
