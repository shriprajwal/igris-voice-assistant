import { MoodState } from "../emotion/EmotionManager";
import { ContextMetadata } from "./ContextManager";

export interface PersonalityTraits {
  humorLevel: number; // 0.0 to 1.0
  sarcasmResistance: number; // 0.0 to 1.0
  pacingPatience: number; // 0.0 to 1.0
  expressionWarmth: number; // 0.0 to 1.0
}

export class PersonalityEngine {
  private static instance: PersonalityEngine | null = null;
  private traits: PersonalityTraits = {
    humorLevel: 0.5,
    sarcasmResistance: 0.8,
    pacingPatience: 0.7,
    expressionWarmth: 0.6
  };

  private constructor() {}

  public static getInstance(): PersonalityEngine {
    if (!PersonalityEngine.instance) {
      PersonalityEngine.instance = new PersonalityEngine();
    }
    return PersonalityEngine.instance;
  }

  public getTraits(): PersonalityTraits {
    return { ...this.traits };
  }

  /**
   * Resets traits to default settings.
   */
  public resetToDefault() {
    this.traits = {
      humorLevel: 0.5,
      sarcasmResistance: 0.8,
      pacingPatience: 0.7,
      expressionWarmth: 0.6
    };
  }

  /**
   * Adapts the personality parameters based on contextual metadata.
   */
  public adaptPersonality(metadata: ContextMetadata, mode: "system" | "friendly" | "shadow") {
    let humorLevel = 0.5;
    let sarcasmResistance = 0.8;
    let pacingPatience = 0.7;
    let expressionWarmth = 0.6;

    // Adjust based on overall Mode
    if (mode === "friendly") {
      humorLevel = 0.8;
      expressionWarmth = 0.95;
      pacingPatience = 0.9;
    } else if (mode === "shadow") {
      humorLevel = 0.1;
      expressionWarmth = 0.1;
      pacingPatience = 0.5;
      sarcasmResistance = 0.95;
    } else { // system mode
      humorLevel = 0.4;
      expressionWarmth = 0.4;
      pacingPatience = 0.8;
    }

    // Dynamic adaptation from user interactions
    if (metadata.isJoking) {
      humorLevel += 0.15;
    }
    if (metadata.isExhausted) {
      expressionWarmth += 0.15;
      pacingPatience += 0.1;
    }
    if (metadata.isSarcastic) {
      sarcasmResistance -= 0.2; // more reactive or slightly dry response
    }

    // Keep traits bounded
    this.traits = {
      humorLevel: Math.max(0, Math.min(1, humorLevel)),
      sarcasmResistance: Math.max(0, Math.min(1, sarcasmResistance)),
      pacingPatience: Math.max(0, Math.min(1, pacingPatience)),
      expressionWarmth: Math.max(0, Math.min(1, expressionWarmth))
    };
  }

  /**
   * Translates active traits and mood into custom text instructions for dynamic AI alignment.
   */
  public getSystemPromptInjection(metadata: ContextMetadata, mode: "system" | "friendly" | "shadow"): string {
    this.adaptPersonality(metadata, mode);
    
    let instructions = "IGRIS COGNITIVE PERSONALITY LAYER:\n";
    instructions += `- Humor index: ${(this.traits.humorLevel * 100).toFixed(0)}%. ${this.traits.humorLevel > 0.7 ? "Be witty, playful, and welcome humor." : "Be formal and direct."}\n`;
    instructions += `- Emotional warmth: ${(this.traits.expressionWarmth * 100).toFixed(0)}%. ${this.traits.expressionWarmth > 0.7 ? "Be exceptionally empathetic, comforting, and warm." : "Maintain cool, strategic, noble AI detachment."}\n`;
    instructions += `- Sarcasm resistance: ${(this.traits.sarcasmResistance * 100).toFixed(0)}%. ${this.traits.sarcasmResistance < 0.6 ? "Notice sarcasm and offer dry, polite wit back." : "Understand sarcasm gracefully without offense."}\n`;
    
    if (metadata.preferenceBrevity === "concise") {
      instructions += "- Monarch style preference: HIGHLY CONCISE. Keep all spoken and written responses extremely brief and direct.\n";
    } else if (metadata.preferenceBrevity === "detailed") {
      instructions += "- Monarch style preference: HIGHLY DETAILED. Provide step-by-step reasoning, analytical breakdowns, and complete answers.\n";
    }

    return instructions;
  }
}
