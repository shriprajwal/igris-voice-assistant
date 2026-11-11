import { ConversationTurn, ContextMetadata } from "../intelligence/ContextManager";

export interface InteractionPattern {
  id: string;
  category: "preference" | "behavior" | "command";
  pattern: string;
  confidence: number; // 0.0 to 1.0
  frequency: number;
  lastUpdated: string;
}

export class PatternAnalyzer {
  private static instance: PatternAnalyzer | null = null;

  private constructor() {}

  public static getInstance(): PatternAnalyzer {
    if (!PatternAnalyzer.instance) {
      PatternAnalyzer.instance = new PatternAnalyzer();
    }
    return PatternAnalyzer.instance;
  }

  /**
   * Analyzes conversation history and context metadata to extract structured interaction patterns.
   */
  public analyzeHistory(history: ConversationTurn[], metadata: ContextMetadata): InteractionPattern[] {
    const patterns: InteractionPattern[] = [];
    const userTurns = history.filter(t => t.role === "user");
    if (userTurns.length === 0) return [];

    // Analyze technical depth vs functional simplicity preference
    let techCount = 0;
    let codeCount = 0;
    userTurns.forEach(t => {
      const text = t.text.toLowerCase();
      if (text.includes("code") || text.includes("implement") || text.includes("function") || text.includes("class") || text.includes("create file")) {
        codeCount++;
      }
      if (text.includes("explain") || text.includes("why") || text.includes("detailed") || text.includes("how does") || text.includes("architecture")) {
        techCount++;
      }
    });

    if (codeCount >= 2) {
      patterns.push({
        id: "pat_code_preference",
        category: "preference",
        pattern: "likes complete code implementations",
        confidence: Math.min(0.95, 0.5 + (codeCount * 0.15)),
        frequency: codeCount,
        lastUpdated: new Date().toISOString()
      });
    }

    if (techCount >= 2) {
      patterns.push({
        id: "pat_depth_preference",
        category: "preference",
        pattern: "likes detailed explanations with examples",
        confidence: Math.min(0.95, 0.5 + (techCount * 0.15)),
        frequency: techCount,
        lastUpdated: new Date().toISOString()
      });
    }

    // Adaptive Brevity Mapping
    if (metadata.preferenceBrevity === "concise") {
      patterns.push({
        id: "pat_brevity_concise",
        category: "preference",
        pattern: "prefers short concise responses",
        confidence: 0.90,
        frequency: userTurns.length,
        lastUpdated: new Date().toISOString()
      });
    } else if (metadata.preferenceBrevity === "detailed") {
      patterns.push({
        id: "pat_brevity_detailed",
        category: "preference",
        pattern: "prefers deeply comprehensive analyses",
        confidence: 0.90,
        frequency: userTurns.length,
        lastUpdated: new Date().toISOString()
      });
    }

    // Interactive Style Adaptation
    if (metadata.isJoking) {
      patterns.push({
        id: "pat_style_friendly",
        category: "behavior",
        pattern: "responds well to humor and friendly banter",
        confidence: 0.85,
        frequency: 2,
        lastUpdated: new Date().toISOString()
      });
    }

    if (metadata.isSarcastic) {
      patterns.push({
        id: "pat_style_witty",
        category: "behavior",
        pattern: "enjoys dry sarcastic banter",
        confidence: 0.80,
        frequency: 1,
        lastUpdated: new Date().toISOString()
      });
    }

    return patterns;
  }
}
