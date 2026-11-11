import { ContextMetadata } from "./ContextManager";

export interface DecisionEvaluation {
  primaryAction: string;
  suggestedTools: string[];
  riskLevel: "low" | "medium" | "high";
  rationale: string;
}

export class DecisionEngine {
  private static instance: DecisionEngine | null = null;

  private constructor() {}

  public static getInstance(): DecisionEngine {
    if (!DecisionEngine.instance) {
      DecisionEngine.instance = new DecisionEngine();
    }
    return DecisionEngine.instance;
  }

  /**
   * Evaluates incoming request to plan the optimal tool and state pathway.
   */
  public evaluate(query: string, metadata: ContextMetadata): DecisionEvaluation {
    const lower = query.toLowerCase();
    
    // Default low-risk state
    let primaryAction = "converse";
    let suggestedTools: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "low";
    let rationale = "Standard conversational response with emotional and cognitive adaptation.";

    // Memory manipulation commands
    if (lower.includes("forget everything") || lower.includes("clear all memories")) {
      primaryAction = "clear_all_memories";
      suggestedTools = ["clearAllMemories"];
      riskLevel = "high";
      rationale = "User requested complete memory erasure. High-risk protocol, verification required.";
    } else if (lower.includes("forget") || lower.includes("delete memory")) {
      primaryAction = "delete_memory";
      suggestedTools = ["deleteMemory"];
      riskLevel = "medium";
      rationale = "User requested single memory deletion. Requires targeted key identification.";
    } else if (lower.includes("remember") || lower.includes("save memory") || lower.includes("store")) {
      primaryAction = "save_memory";
      suggestedTools = ["saveMemory"];
      riskLevel = "low";
      rationale = "User specified an active personal fact or preference to persist.";
    }

    // System theme & Appearance
    if (lower.includes("theme") || lower.includes("appearance") || lower.includes("color") || lower.includes("dark mode") || lower.includes("light mode")) {
      primaryAction = "adjust_theme";
      suggestedTools = ["setSystemTheme"];
      riskLevel = "low";
      rationale = "Aesthetic calibration. Matching user choice to system presets.";
    }

    // External Navigation
    if (lower.includes("open") || lower.includes("go to") || lower.includes("website") || lower.includes("url")) {
      primaryAction = "launch_navigation";
      suggestedTools = ["openWebsite"];
      riskLevel = "low";
      rationale = "Monarch requested a visual projection. Launching website in standard workspace frame.";
    }

    // Diagnostics / glitch actions
    if (lower.includes("calibrate") || lower.includes("glitch") || lower.includes("diagnosis") || lower.includes("overload")) {
      primaryAction = "trigger_diagnostic";
      suggestedTools = ["triggerSystemAction"];
      riskLevel = "medium";
      rationale = "Initiating core sensor calibration or simulation parameters.";
    }

    return {
      primaryAction,
      suggestedTools,
      riskLevel,
      rationale
    };
  }
}
