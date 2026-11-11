export interface ProjectBlueprint {
  name: string;
  description: string;
  recommendedStack: {
    frontend: string;
    backend: string;
    database: string;
    authentication: string;
  };
  milestones: string[];
}

export class ProjectManager {
  private static instance: ProjectManager | null = null;
  private currentBlueprint: ProjectBlueprint | null = null;

  private constructor() {}

  public static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  public getCurrentBlueprint(): ProjectBlueprint | null {
    return this.currentBlueprint;
  }

  /**
   * Generates a fully customized architectural project blueprint.
   */
  public generateProjectPlan(appName: string, appDescription: string): ProjectBlueprint {
    const blueprint: ProjectBlueprint = {
      name: appName || "Shadow Sovereign Sandbox",
      description: appDescription || "A high-performance full-stack web ecosystem engineered with premium responsive layouts.",
      recommendedStack: {
        frontend: "React 18+ with Vite and Tailwind CSS for rapid responsive styles",
        backend: "Custom Express.js Server proxying secure API routes",
        database: "Google Cloud Firestore for durable real-time cloud storage",
        authentication: "Firebase Auth (OAuth & Passwordless verification)"
      },
      milestones: [
        "Milestone 1: Design clean display typography and primary off-white/slate dashboard container",
        "Milestone 2: Configure modular state arrays and connect standard key-value persistence",
        "Milestone 3: Construct local proxy servers to safeguard secure API keys inside .env.example",
        "Milestone 4: Program custom micro-animations (e.g. motion fade transitions) to delight user flow",
        "Milestone 5: Deploy full-scale build targets and verify zero-fault compilation checks"
      ]
    };

    this.currentBlueprint = blueprint;
    return blueprint;
  }
}
