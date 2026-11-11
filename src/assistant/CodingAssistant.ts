export interface DebugReport {
  rootCause: string;
  recommendedFix: string;
  preventativeMeasures: string;
}

export class CodingAssistant {
  private static instance: CodingAssistant | null = null;

  private constructor() {}

  public static getInstance(): CodingAssistant {
    if (!CodingAssistant.instance) {
      CodingAssistant.instance = new CodingAssistant();
    }
    return CodingAssistant.instance;
  }

  /**
   * Analyzes common programming exceptions to return targeted debug reports.
   */
  public diagnoseError(errorLog: string): DebugReport {
    const err = errorLog.toLowerCase();

    if (err.includes("api_key") || err.includes("key is missing") || err.includes("secret")) {
      return {
        rootCause: "Target API key or credential is missing from runtime environment variables.",
        recommendedFix: "Declare the missing variable inside `.env.example` first, then provide the real value via the secure platform parameters panel.",
        preventativeMeasures: "Implement a lazy initialization pattern rather than calling SDK constructors at module load time."
      };
    }

    if (err.includes("target content not found") || err.includes("substring not found")) {
      return {
        rootCause: "Surgical replacement context is stale. The target lines do not exactly match the file content.",
        recommendedFix: "Run the view_file tool on the specific target lines first to retrieve the precise character sequence (including leading spaces).",
        preventativeMeasures: "Avoid assuming file contents. Always inspect existing lines prior to issuing edits."
      };
    }

    if (err.includes("infinite loop") || err.includes("maximum update depth exceeded")) {
      return {
        rootCause: "React state mutation triggered directly inside render pass or missing dependency from useEffect array.",
        recommendedFix: "Wrap state setters inside clean callback events or stabilize dependencies using memoized refs.",
        preventativeMeasures: "Never set state unconditionally inside the component main function body."
      };
    }

    // Default report
    return {
      rootCause: "Unclassified compile-time or runtime mismatch.",
      recommendedFix: "Analyze full standard error outputs, verify package versions inside package.json, and execute 'lint_applet' to identify static failures.",
      preventativeMeasures: "Maintain granular commits and run quick build audits frequently."
    };
  }
}
