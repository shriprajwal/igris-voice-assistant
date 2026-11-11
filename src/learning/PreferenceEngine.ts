import { MemoryManager } from "../memory/MemoryManager";
import { InteractionPattern } from "./PatternAnalyzer";

export interface LearnedPreference {
  userId: string;
  category: "preference" | "behavior" | "command";
  pattern: string;
  confidence: number; // 0.0 to 1.0
  lastUpdated: string;
}

export class PreferenceEngine {
  private static instance: PreferenceEngine | null = null;
  private preferences: LearnedPreference[] = [];

  private constructor() {}

  public static getInstance(): PreferenceEngine {
    if (!PreferenceEngine.instance) {
      PreferenceEngine.instance = new PreferenceEngine();
    }
    return PreferenceEngine.instance;
  }

  public getPreferences(): LearnedPreference[] {
    return [...this.preferences];
  }

  /**
   * Loads initial preferences from MemoryManager.
   */
  public async loadPreferences(authorizedUser: string): Promise<LearnedPreference[]> {
    const memoryMgr = MemoryManager.getInstance();
    const stored = await memoryMgr.getMemories("preference");
    
    this.preferences = stored.map(item => {
      // Parse confidence from key or structure if available, else default
      let confidence = 0.85;
      if (item.value.includes("confidence:")) {
        const match = item.value.match(/confidence:\s*([\d.]+)/);
        if (match) confidence = parseFloat(match[1]);
      }
      return {
        userId: authorizedUser,
        category: "preference",
        pattern: item.key,
        confidence,
        lastUpdated: item.updatedAt
      };
    });

    return this.preferences;
  }

  /**
   * Merges automatically detected patterns into active preferences.
   */
  public async mergePatterns(patterns: InteractionPattern[], authorizedUser: string) {
    const memoryMgr = MemoryManager.getInstance();

    for (const pat of patterns) {
      const existing = this.preferences.find(p => p.pattern.toLowerCase() === pat.pattern.toLowerCase());

      if (existing) {
        // Increase confidence with repeated interaction
        existing.confidence = Math.min(0.99, existing.confidence + 0.05);
        existing.lastUpdated = new Date().toISOString();
        
        // Update memory
        await memoryMgr.saveMemory(
          "preference", 
          existing.pattern, 
          `Auto-adapted preference of Monarch. Confidence: ${existing.confidence.toFixed(2)}`
        );
      } else {
        const newPref: LearnedPreference = {
          userId: authorizedUser,
          category: pat.category,
          pattern: pat.pattern,
          confidence: pat.confidence,
          lastUpdated: pat.lastUpdated
        };
        this.preferences.push(newPref);

        // Persist to MemoryManager
        await memoryMgr.saveMemory(
          "preference", 
          pat.pattern, 
          `Auto-adapted preference of Monarch. Confidence: ${pat.confidence.toFixed(2)}`
        );
      }
    }
  }

  /**
   * Registers a direct explicit rule from user feedback (e.g. "always explain code with examples").
   */
  public async registerExplicitPreference(feedback: string, authorizedUser: string): Promise<LearnedPreference> {
    const memoryMgr = MemoryManager.getInstance();
    
    // Normalize and extract rule
    let cleanRule = feedback;
    if (feedback.toLowerCase().startsWith("always ")) {
      cleanRule = feedback.substring(7);
    }

    const newPref: LearnedPreference = {
      userId: authorizedUser,
      category: "preference",
      pattern: cleanRule,
      confidence: 0.99, // Explicit feedback has maximum confidence
      lastUpdated: new Date().toISOString()
    };

    // Prevent duplicates
    this.preferences = this.preferences.filter(p => p.pattern.toLowerCase() !== cleanRule.toLowerCase());
    this.preferences.push(newPref);

    // Save as premium durable memory
    await memoryMgr.saveMemory(
      "preference",
      cleanRule,
      `Explicitly stated style guideline. Confidence: 0.99`
    );

    return newPref;
  }

  /**
   * Safely clears all learned preferences.
   */
  public clearPreferences() {
    this.preferences = [];
  }
}
