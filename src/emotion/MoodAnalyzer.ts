import { Emotion, MoodState, ResponseStyle } from "./EmotionManager";

export class MoodAnalyzer {
  /**
   * Analyzes text input to determine current emotional state.
   */
  public static analyze(text: string): Emotion {
    const clean = text.toLowerCase().trim();

    // Default values
    let currentMood: MoodState = "neutral";
    let confidence = 0.8;
    let energyLevel = 0.5;
    let responseStyle: ResponseStyle = "calm";

    // 1. Urgency & Focus Detection (Commands, tasks, automations)
    const focusKeywords = ["run", "execute", "start", "stop", "initialize", "system", "optimize", "calibrate", "configure", "disconnect", "mute", "unmute"];
    const hasFocus = focusKeywords.some(kw => clean.includes(kw));

    // 2. High Urgency (Concerned / Protective)
    const dangerKeywords = ["danger", "alert", "error", "fail", "failed", "critical", "warning", "attack", "risk", "breach", "emergency"];
    const hasDanger = dangerKeywords.some(kw => clean.includes(kw));

    // 3. Positive / Accomplishment (Happy / Excited / Encouraging)
    const happyKeywords = ["happy", "great", "excellent", "completed", "done", "project", "finished", "won", "success", "achieved", "achievement", "win", "good job", "awesome", "perfect"];
    const hasHappy = happyKeywords.some(kw => clean.includes(kw));

    // 4. Low energy / Sad / Tired (Concerned / Encouraging / Calm)
    const tiredKeywords = ["tired", "exhausted", "sleepy", "sad", "down", "bad day", "failed project", "depressed", "rough", "stress", "stressed"];
    const hasTired = tiredKeywords.some(kw => clean.includes(kw));

    // 5. Inquisitive / analytical (Curious / Analytical)
    const analyticalKeywords = ["why", "how", "what is", "analyze", "explain", "research", "compare", "formula", "quantum", "calculation", "code", "explain", "details", "reason"];
    const hasAnalytical = analyticalKeywords.some(kw => clean.includes(kw));

    if (hasDanger) {
      currentMood = "protective";
      confidence = 0.95;
      energyLevel = 0.9;
      responseStyle = "focused";
    } else if (clean.includes("disconnect") || clean.includes("standby") || clean.includes("stop the session") || clean.includes("goodbye")) {
      currentMood = "calm";
      confidence = 0.9;
      energyLevel = 0.3;
      responseStyle = "calm";
    } else if (hasHappy) {
      if (clean.includes("completed") || clean.includes("project") || clean.includes("achieved") || clean.includes("done")) {
        currentMood = "encouraging";
        confidence = 0.9;
        energyLevel = 0.75;
        responseStyle = "energetic";
      } else {
        currentMood = "happy";
        confidence = 0.85;
        energyLevel = 0.8;
        responseStyle = "energetic";
      }
    } else if (hasTired) {
      currentMood = "concerned";
      confidence = 0.85;
      energyLevel = 0.4;
      responseStyle = "calm";
    } else if (hasAnalytical) {
      currentMood = "analytical";
      confidence = 0.9;
      energyLevel = 0.6;
      responseStyle = "calm";
    } else if (hasFocus) {
      currentMood = "focused";
      confidence = 0.9;
      energyLevel = 0.7;
      responseStyle = "focused";
    } else if (clean.endsWith("?") || clean.includes("curious") || clean.includes("wonder")) {
      currentMood = "curious";
      confidence = 0.75;
      energyLevel = 0.65;
      responseStyle = "calm";
    } else if (clean.includes("thank you") || clean.includes("thanks") || clean.includes("grateful")) {
      currentMood = "calm";
      confidence = 0.9;
      energyLevel = 0.5;
      responseStyle = "calm";
    } else {
      currentMood = "neutral";
      confidence = 0.8;
      energyLevel = 0.5;
      responseStyle = "calm";
    }

    // Determine Personality Mode based on user words, tone, and conversation style
    let personalityMode: "system" | "friendly" | "shadow" = "system";

    const shadowTriggers = ["shadow", "igris shadow mood", "activate shadow", "enter shadow", "shadow protocol"];
    const friendlyTriggers = ["be friendly", "chat with me", "chat with us", "joke", "bored", "whats up", "what's up", "how are you", "funny", "friendly mode", "chill", "relax"];
    const exitOrCancelTriggers = [
      "exit mode", "cancel mode", "turn off mode", "deactivate mode",
      "exit current mode", "cancel current mode", "stop current mode",
      "exit shadow", "cancel shadow", "deactivate shadow", "disable shadow", "turn off shadow",
      "exit system", "cancel system", "deactivate system", "disable system", "turn off system",
      "return normal", "return to normal", "return to friendly", "normal mode", "standard mode",
      "cancel", "exit", "deactivate"
    ];

    const isShadowTrigger = shadowTriggers.some(kw => clean.includes(kw));
    const isFriendlyTrigger = friendlyTriggers.some(kw => clean.includes(kw));
    const isExitOrCancelTrigger = exitOrCancelTriggers.some(kw => clean.includes(kw));

    if (isExitOrCancelTrigger) {
      personalityMode = "friendly";
    } else if (isShadowTrigger) {
      personalityMode = "shadow";
    } else if (isFriendlyTrigger || ["happy", "encouraging", "curious", "calm"].includes(currentMood)) {
      personalityMode = "friendly";
    } else {
      personalityMode = "system";
    }

    return {
      currentMood,
      confidence,
      energyLevel,
      responseStyle,
      personalityMode
    };
  }
}
