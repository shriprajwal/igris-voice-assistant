import { Emotion, ResponseStyle } from "./EmotionManager";

export interface VoiceStyle {
  mode: ResponseStyle;
  pacing: string; // "Slow" | "Slightly faster" | "Precise/Efficient"
  expressiveness: number; // 0.0 - 1.0
  toneAdjustment: string; // Description
  speedMultiplier: number;
  pitchShiftHz: number;
}

export class VoiceStyleController {
  public static getStyle(emotion: Emotion): VoiceStyle {
    switch (emotion.responseStyle) {
      case "energetic":
        return {
          mode: "energetic",
          pacing: "Slightly faster & expressive",
          expressiveness: 0.9,
          toneAdjustment: "Expressive, high dynamic inflection, proud energy",
          speedMultiplier: 1.15,
          pitchShiftHz: 15
        };
      case "focused":
        return {
          mode: "focused",
          pacing: "Precise & efficient",
          expressiveness: 0.3,
          toneAdjustment: "Command-center, stable resonance, authoritative dry output",
          speedMultiplier: 1.0,
          pitchShiftHz: -10
        };
      case "calm":
      default:
        return {
          mode: "calm",
          pacing: "Slow, clear & controlled",
          expressiveness: 0.6,
          toneAdjustment: "Deep, unwavering resonance, sovereign command presence",
          speedMultiplier: 0.85,
          pitchShiftHz: 0
        };
    }
  }
}
