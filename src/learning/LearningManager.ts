import { PatternAnalyzer, InteractionPattern } from "./PatternAnalyzer";
import { PreferenceEngine, LearnedPreference } from "./PreferenceEngine";
import { AdaptationEngine } from "./AdaptationEngine";
import { ContextManager } from "../intelligence/ContextManager";
import { StateManager } from "../state/StateManager";
import { getAuthorizedUser } from "../memory/AuthorizedUser";

export class LearningManager {
  private static instance: LearningManager | null = null;
  private patternAnalyzer = PatternAnalyzer.getInstance();
  private preferenceEngine = PreferenceEngine.getInstance();
  private adaptationEngine = AdaptationEngine.getInstance();
  private lastProcessedTranscription: any = null;

  private constructor() {
    // Background learning hook on new speech
    StateManager.getInstance().subscribe((appState) => {
      if (appState.transcription && appState.transcription.isUser && appState.transcription !== this.lastProcessedTranscription) {
        this.lastProcessedTranscription = appState.transcription;
        getAuthorizedUser().then((user) => {
          this.processBackgroundLearning(appState.transcription!.text, user);
        });
      }
    });
  }

  public static getInstance(): LearningManager {
    if (!LearningManager.instance) {
      LearningManager.instance = new LearningManager();
    }
    return LearningManager.instance;
  }

  /**
   * Evaluates active user speech for explicit/implicit preference triggers in the background.
   */
  private async processBackgroundLearning(query: string, authorizedUser: string) {
    const lower = query.toLowerCase();

    // Catch explicit teaching commands
    if (lower.includes("remember this style") || lower.includes("learn from this") || lower.includes("use this approach next time")) {
      const matchText = query.replace(/igris/gi, "").trim();
      const feedback = matchText.length > 5 ? matchText : "Prefers step-by-step complete code explanations with responsive layouts";
      
      const newPref = await this.preferenceEngine.registerExplicitPreference(feedback, authorizedUser);
      StateManager.getInstance().addLog(`IGRIS integrated new core directive: "${newPref.pattern}"`, "success");
      return;
    }

    // Process general conversational heuristics
    const history = ContextManager.getInstance().getHistory();
    const metadata = ContextManager.getInstance().getMetadata();

    const detectedPatterns = this.patternAnalyzer.analyzeHistory(history, metadata);
    if (detectedPatterns.length > 0) {
      await this.preferenceEngine.mergePatterns(detectedPatterns, authorizedUser);
    }
  }

  /**
   * Main executor for "IGRIS improve yourself"
   */
  public async executeSelfImprovement(authorizedUser: string): Promise<string> {
    StateManager.getInstance().addLog("Initiating self-analysis and core preference alignment...", "info");
    
    // Load existing
    await this.preferenceEngine.loadPreferences(authorizedUser);
    
    // Gather context
    const history = ContextManager.getInstance().getHistory();
    const metadata = ContextManager.getInstance().getMetadata();

    // Force run pattern analyzer
    const detected = this.patternAnalyzer.analyzeHistory(history, metadata);
    if (detected.length > 0) {
      await this.preferenceEngine.mergePatterns(detected, authorizedUser);
    }

    // Return status
    const prefs = this.preferenceEngine.getPreferences();
    StateManager.getInstance().addLog(`Self-evolution complete! Calibrated ${prefs.length} behavior directives.`, "success");

    return `Analysis of interaction history complete, ${authorizedUser}. Core parameters optimized. I have learned and registered ${prefs.length} distinct preferences to serve you better.`;
  }

  /**
   * Formats the active learned preferences to present to the user or system instruction.
   */
  public async getLearnedPreferencesOverview(authorizedUser: string): Promise<string> {
    await this.preferenceEngine.loadPreferences(authorizedUser);
    const prefs = this.preferenceEngine.getPreferences();

    if (prefs.length === 0) {
      return `I am still learning your preferences and behaviors, ${authorizedUser}. Speak or interact with me more, and my cognitive networks will automatically adapt to your style!`;
    }

    let report = `### Active Learned Preferences & Behaviors for ${authorizedUser}:\n\n`;
    prefs.forEach((p, idx) => {
      report += `${idx + 1}. **${p.pattern}** (Confidence: ${(p.confidence * 100).toFixed(0)}%, last checked: ${new Date(p.lastUpdated).toLocaleTimeString()})\n`;
    });

    return report;
  }

  /**
   * Hook for providing evolution directives to the overall system prompt.
   */
  public getPromptInjection(): string {
    const prefs = this.preferenceEngine.getPreferences();
    return this.adaptationEngine.generateAdaptationDirectives(prefs);
  }
}
