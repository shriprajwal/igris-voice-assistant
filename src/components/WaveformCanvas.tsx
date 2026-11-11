/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { useTheme } from "../themes/ThemeContext";
import { EmotionManager } from "../emotion/EmotionManager";
import { StateManager } from "../state/StateManager";

interface WaveformCanvasProps {
  state: "disconnected" | "connecting" | "listening" | "speaking";
}

function hexToRgba(hex: string, alpha: number): string {
  let r = 34, g = 211, b = 238; // Default cyan
  try {
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    }
  } catch (e) {
    console.error("Hex parsing error:", e);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function WaveformCanvas({ state }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeTheme } = useTheme();
  const [voiceMode, setVoiceMode] = useState<"system" | "friendly" | "shadow">("system");

  useEffect(() => {
    const unsubscribe = StateManager.getInstance().subscribe((appState) => {
      setVoiceMode(appState.voiceMode || "system");
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 600;
      canvas.height = canvas.parentElement?.clientHeight || 150;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Adjust wave parameters based on state & theme
      let numWaves = 3;
      let colors: string[] = [];
      let baseAmplitude = 0;
      let speed = 0.015;

      const themeColor = activeTheme.waveformColor;

      // Get dynamic mood configurations from our Emotional layer
      const emotion = EmotionManager.getInstance().getEmotion();
      const currentMood = emotion.currentMood;

      if (state === "disconnected") {
        numWaves = 1;
        colors = [hexToRgba(themeColor, 0.2)];
        baseAmplitude = 2;
        speed = 0.005;
      } else if (state === "connecting") {
        numWaves = 2;
        colors = [
          hexToRgba(themeColor, 0.45),
          hexToRgba(themeColor, 0.2)
        ];
        baseAmplitude = 12;
        speed = 0.025;
      } else if (state === "listening") {
        numWaves = 3;
        colors = [
          hexToRgba(themeColor, 0.6),
          hexToRgba(themeColor, 0.35),
          hexToRgba(themeColor, 0.15)
        ];
        baseAmplitude = 22;
        speed = 0.035;
      } else if (state === "speaking") {
        numWaves = 4;
        colors = [
          hexToRgba(themeColor, 0.8),
          hexToRgba(themeColor, 0.55),
          hexToRgba(themeColor, 0.3),
          hexToRgba(themeColor, 0.15)
        ];
        baseAmplitude = 48;
        speed = 0.055;
      }

      // Emotional state adjustments:
      if (currentMood === "happy" || currentMood === "excited") {
        // Happy: Faster waveform movement
        speed *= 1.7;
        baseAmplitude *= 1.15;
      } else if (currentMood === "focused" || currentMood === "analytical" || currentMood === "protective") {
        // Focused: Stable pulse, Controlled animation
        speed *= 0.65;
        baseAmplitude *= 0.8;
      } else if (currentMood === "curious") {
        speed *= 1.2;
      } else if (currentMood === "concerned") {
        speed *= 0.8;
        baseAmplitude *= 1.1;
      }

      // Speaking: Waveform reacts to voice intensity dynamically
      if (state === "speaking") {
        // High fidelity modulation simulation using multi-harmonic sine wave calculations
        const intensityFactor = 1.0 + Math.sin(phase * 4.5) * 0.4 + Math.cos(phase * 9.2) * 0.2;
        baseAmplitude *= intensityFactor;
      }

      phase += speed;

      const isNeon = activeTheme.id === "neon";
      const isShadow = voiceMode === "shadow";

      // Override colors for Shadow Mode to give a tactical cyber feel
      if (isShadow) {
        colors = [
          "rgba(34, 211, 238, 0.85)",  // Cyan-400
          "rgba(59, 130, 246, 0.55)",  // Blue-500
          "rgba(29, 78, 216, 0.25)",   // Dark blue
          "rgba(15, 23, 42, 0.1)"      // Deep slate-900
        ];
        if (state === "disconnected") {
          colors = ["rgba(34, 211, 238, 0.25)"];
        }
      }

      for (let i = 0; i < numWaves; i++) {
        ctx.beginPath();
        ctx.lineWidth = i === 0 ? 3 : 1.5;
        
        if (isNeon) {
          const hueShift = (phase * 20 + i * 90) % 360;
          ctx.strokeStyle = `hsla(${hueShift}, 95%, 60%, ${i === 0 ? 0.8 : 0.4})`;
        } else {
          ctx.strokeStyle = colors[i] || "rgba(34, 211, 238, 0.2)";
        }

        // Advanced math formula for multi-harmonic organic overlapping wave look
        const freqModifier = 0.006 + i * 0.003;
        // Dampen higher order wave amplitudes
        const ampModifier = baseAmplitude * (1 - i * 0.22);
        // Vary phase per wave for dynamic overlap
        const individualPhase = phase * (1 + i * 0.15) * 10;

        for (let x = 0; x < width; x++) {
          // Apply stepped/pixelated wave logic if in Shadow Mode
          const stepX = isShadow ? Math.floor(x / 6) * 6 : x;
          const pinch = Math.sin((stepX / width) * Math.PI);
          let yVal = Math.sin(stepX * freqModifier + individualPhase) * ampModifier * pinch;

          if (isShadow) {
            yVal = Math.round(yVal / 8) * 8; // Step Y values for staircase effect
            if (state === "speaking" && Math.random() < 0.0005) {
              yVal += (Math.random() - 0.5) * 30; // Inject slight cyber glitch spikes
            }
          }

          const y = centerY + yVal;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [state, activeTheme]);

  return <canvas ref={canvasRef} className="w-full h-full block" id="waveform-display" />;
}
