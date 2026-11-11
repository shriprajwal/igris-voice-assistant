import { ContextManager, ContextMetadata, ConversationTurn } from "./ContextManager";
import { PersonalityEngine } from "./PersonalityEngine";
import { DecisionEngine, DecisionEvaluation } from "./DecisionEngine";
import { StateManager } from "../state/StateManager";

export interface ReasoningStep {
  title: string;
  detail: string;
  status: "pending" | "processing" | "completed";
}

export interface CognitiveAnalysis {
  timestamp: string;
  query: string;
  context: ContextMetadata;
  decision: DecisionEvaluation;
  steps: ReasoningStep[];
  suggestedAction: string;
}

type CognitiveListener = (analysis: CognitiveAnalysis) => void;

export class ReasoningManager {
  private static instance: ReasoningManager | null = null;
  private currentAnalysis: CognitiveAnalysis | null = null;
  private listeners: Set<CognitiveListener> = new Set();
  private lastProcessedTranscription: any = null;

  private constructor() {
    // Automatically trigger analysis on user speech
    StateManager.getInstance().subscribe((appState) => {
      if (appState.transcription && appState.transcription.isUser && appState.transcription !== this.lastProcessedTranscription) {
        this.lastProcessedTranscription = appState.transcription;
        this.performDeepReasoning(appState.transcription.text, appState.voiceMode || "system");
      }
    });
  }

  public static getInstance(): ReasoningManager {
    if (!ReasoningManager.instance) {
      ReasoningManager.instance = new ReasoningManager();
    }
    return ReasoningManager.instance;
  }

  public subscribe(listener: CognitiveListener): () => void {
    this.listeners.add(listener);
    if (this.currentAnalysis) {
      listener(this.currentAnalysis);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentAnalysis(): CognitiveAnalysis | null {
    return this.currentAnalysis;
  }

  /**
   * Resets ReasoningManager state.
   */
  public resetToDefault() {
    this.currentAnalysis = null;
    this.lastProcessedTranscription = null;
  }

  /**
   * Simulates deep cognitive reasoning in 5 key pipeline stages.
   */
  public performDeepReasoning(query: string, mode: "system" | "friendly" | "shadow") {
    const contextMgr = ContextManager.getInstance();
    
    // 1. Log turn in conversational history
    contextMgr.addTurn("user", query);
    const metadata = contextMgr.getMetadata();

    // 2. Trigger decision appraisal
    const decision = DecisionEngine.getInstance().evaluate(query, metadata);

    // 3. Build multi-step thinking trail
    const steps: ReasoningStep[] = [
      {
        title: "Intent Parsing",
        detail: `Analyzed query syntax. Extracted intent: [${metadata.intent.toUpperCase()}]. Mood alignment: [${metadata.userMood.toUpperCase()}].`,
        status: "completed"
      },
      {
        title: "Context Appraisal",
        detail: `Synthesized background parameters. Tired: ${metadata.isExhausted ? "YES" : "NO"}, Bored: ${metadata.isBored ? "YES" : "NO"}, Victorious: ${metadata.isVictorious ? "YES" : "NO"}.`,
        status: "completed"
      },
      {
        title: "Memory Lookup",
        detail: "Queried secure storage for relevant Monarch preference matches.",
        status: "completed"
      },
      {
        title: "Action Synthesis",
        detail: `Appraised security risks. Action: [${decision.primaryAction.toUpperCase()}]. Risk appraisal: [${decision.riskLevel.toUpperCase()}]. ${decision.rationale}`,
        status: "completed"
      },
      {
        title: "Personality Adaptation",
        detail: `Pacing calibration set to ${metadata.preferenceBrevity.toUpperCase()}. Core alignment complete. Preparing noble presence.`,
        status: "completed"
      }
    ];

    const analysis: CognitiveAnalysis = {
      timestamp: new Date().toISOString(),
      query,
      context: metadata,
      decision,
      steps,
      suggestedAction: decision.primaryAction
    };

    this.currentAnalysis = analysis;
    this.notify();

    // Push diagnostic logs to show that IGRIS cognitive matrix is fully active!
    StateManager.getInstance().addLog(`IGRIS deductive core completed thinking cycle for: "${query.substring(0, 30)}..."`, "success");
  }

  private notify() {
    if (this.currentAnalysis) {
      this.listeners.forEach((listener) => {
        try {
          listener(this.currentAnalysis!);
        } catch (err) {
          console.error("[ReasoningManager] Listener error:", err);
        }
      });
    }
  }
}
