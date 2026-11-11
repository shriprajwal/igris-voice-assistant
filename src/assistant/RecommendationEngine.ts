import { ContextMetadata } from "../intelligence/ContextManager";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: "learning" | "coding" | "planning" | "productivity";
  relevanceScore: number; // 0.0 to 1.0
  suggestedAction: string;
}

export class RecommendationEngine {
  private static instance: RecommendationEngine | null = null;

  private constructor() {}

  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Generates tailored system recommendations based on current user situation, mood, and state.
   */
  public generateRecommendations(query: string, metadata: ContextMetadata): Recommendation[] {
    const lower = query.toLowerCase();
    const recommendations: Recommendation[] = [];

    // General "What to do" or "I am bored"
    if (lower.includes("bored") || lower.includes("what to do") || lower.includes("boredom")) {
      recommendations.push({
        id: "rec_bored_project",
        title: "Initiate Creative Prototyping",
        description: "Monarch, you seem to need an engaging challenge. I suggest starting a fresh sandbox prototype in React + Tailwind CSS.",
        category: "coding",
        relevanceScore: 0.95,
        suggestedAction: "Create a modular interactive sandbox"
      });
      recommendations.push({
        id: "rec_bored_concept",
        title: "Master High-Performance Web Sockets",
        description: "Learn and implement low-latency server authoritative loops or deep canvas interactions.",
        category: "learning",
        relevanceScore: 0.85,
        suggestedAction: "IGRIS teach me WebSockets"
      });
    }

    // Coding & Development Intent
    if (lower.includes("build") || lower.includes("project") || lower.includes("app") || lower.includes("code")) {
      recommendations.push({
        id: "rec_code_arch",
        title: "Design Full-Stack Architecture",
        description: "To support durable data storage, I highly recommend adopting React (Vite) + Express server + Google Firestore with strict security rules.",
        category: "coding",
        relevanceScore: 0.90,
        suggestedAction: "Calibrate project architecture blueprint"
      });
      recommendations.push({
        id: "rec_code_lint",
        title: "Verify Syntax and Build Checks",
        description: "Maintain clean code-integrity by running system-wide compilation audits periodically.",
        category: "productivity",
        relevanceScore: 0.80,
        suggestedAction: "Initiate system compile audit"
      });
    }

    // Exhausted/Tired state
    if (metadata.isExhausted) {
      recommendations.push({
        id: "rec_exhausted_planning",
        title: "Lightweight Task Breakdown",
        description: "Your fatigue index is elevated, Monarch. I suggest breaking down high-level milestones into granular low-friction check-lists.",
        category: "planning",
        relevanceScore: 0.95,
        suggestedAction: "Generate micro task list"
      });
    }

    // Default proactive suggestions
    if (recommendations.length === 0) {
      recommendations.push({
        id: "rec_default_dev",
        title: "Optimize Existing Code Quality",
        description: "Review current component performance, modular state arrays, and dependency trees.",
        category: "coding",
        relevanceScore: 0.70,
        suggestedAction: "IGRIS developer mode"
      });
      recommendations.push({
        id: "rec_default_teach",
        title: "Expand Cognitive Foundations",
        description: "I can lead you through practical step-by-step programming modules with rich examples.",
        category: "learning",
        relevanceScore: 0.65,
        suggestedAction: "IGRIS teach me"
      });
    }

    return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
