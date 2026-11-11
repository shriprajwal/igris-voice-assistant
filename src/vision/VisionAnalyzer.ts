import { ScreenCapture } from "./ScreenCapture";
import { ImageProcessor } from "./ImageProcessor";

export interface DetectedElement {
  type: string;
  label: string;
  confidence: number;
  coordinates: { x: number; y: number; w: number; h: number };
  details?: string;
}

export interface VisionInsight {
  elementCount: number;
  layoutHealthScore: number; // 0 to 100
  primaryApp: string;
  diagnosedIssue?: string;
  recommendedFix?: string;
  detectedElements: DetectedElement[];
}

export class VisionAnalyzer {
  private static instance: VisionAnalyzer | null = null;

  private constructor() {}

  public static getInstance(): VisionAnalyzer {
    if (!VisionAnalyzer.instance) {
      VisionAnalyzer.instance = new VisionAnalyzer();
    }
    return VisionAnalyzer.instance;
  }

  /**
   * Captures the current active frame and requests a real Gemini Vision audit from the backend.
   */
  public async analyzeCurrentScreen(question?: string, context?: string): Promise<VisionInsight | null> {
    const frame = ScreenCapture.getInstance().captureFrame();
    if (!frame) {
      return null;
    }

    const cleanBase64 = ImageProcessor.getInstance().getCleanBase64(frame);

    try {
      const response = await fetch("/api/analyze-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: cleanBase64,
          question: question || "Identify any layout errors, compiler warnings, off-center buttons, or general visual problems.",
          context: context || "Developer workspace"
        })
      });

      if (!response.ok) {
        throw new Error("Vision endpoint rejected query");
      }

      const result = await response.json();
      if (result.success && result.data) {
        // Formulate detected landmarks or mock highlight boxes from the AI feedback
        const hasIssue = result.data.layoutHealthScore < 90;
        
        const detectedElements: DetectedElement[] = [
          {
            type: hasIssue ? "error_log" : "layout_grid",
            label: result.data.primaryApp || "Active Viewport",
            confidence: 0.96,
            coordinates: { x: 50, y: 50, w: 900, h: 480 },
            details: result.data.diagnosedIssue
          }
        ];

        return {
          elementCount: result.data.elementCount || 1,
          layoutHealthScore: result.data.layoutHealthScore || 100,
          primaryApp: result.data.primaryApp || "Detected Screen Area",
          diagnosedIssue: result.data.diagnosedIssue,
          recommendedFix: result.data.recommendedFix,
          detectedElements
        };
      }
      return null;
    } catch (err) {
      console.error("Error performing real visual analysis:", err);
      return null;
    }
  }

  /**
   * Translates visual insights to a helpful companion response for the voice synthesis loop.
   */
  public getVoiceCompanionGuidance(insight: VisionInsight, query?: string): string {
    const lowerQuery = query ? query.toLowerCase() : "";

    if (lowerQuery.includes("error") || lowerQuery.includes("wrong") || lowerQuery.includes("fix")) {
      if (insight.layoutHealthScore < 90) {
        return `Analyzing visual input. I detected a layout warning or compiler constraint: "${insight.diagnosedIssue}". ${insight.recommendedFix}`;
      } else {
        return `Analyzing visual input. Everything appears optimal. No severe issues found on screen. Let me know if you would like me to review any other segment.`;
      }
    }

    if (lowerQuery.includes("explain") || lowerQuery.includes("code")) {
      return `Visual stream active, Monarch. I see you are inside your ${insight.primaryApp}. ${insight.diagnosedIssue}. ${insight.recommendedFix}`;
    }

    // Default response
    return `Visual analysis complete, Monarch. I detected an issue: ${insight.diagnosedIssue}. ${insight.recommendedFix}`;
  }
}
