import { LearnedPreference } from "./PreferenceEngine";

export class AdaptationEngine {
  private static instance: AdaptationEngine | null = null;

  private constructor() {}

  public static getInstance(): AdaptationEngine {
    if (!AdaptationEngine.instance) {
      AdaptationEngine.instance = new AdaptationEngine();
    }
    return AdaptationEngine.instance;
  }

  /**
   * Generates a fully-tailored system prompt segment matching all active preferences of high confidence (> 0.7).
   */
  public generateAdaptationDirectives(preferences: LearnedPreference[]): string {
    const highConfidencePrefs = preferences.filter(p => p.confidence > 0.7);
    if (highConfidencePrefs.length === 0) {
      return "IGRIS SELF-EVOLUTION ENGINE: No highly confident user preferences detected yet. Continue standard adaptive learning.";
    }

    let directives = "IGRIS ACTIVE SELF-EVOLUTION ALIGNMENTS:\n";
    highConfidencePrefs.forEach(pref => {
      directives += `- Aligned preference: "${pref.pattern}" (Confidence: ${(pref.confidence * 100).toFixed(0)}%). Ensure your explanation, layout, and styling matches this rule directly.\n`;
    });

    return directives;
  }
}
