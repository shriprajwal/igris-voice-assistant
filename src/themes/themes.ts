/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Theme {
  id: string;
  name: string;
  background: string;             // CSS class/value for main background
  secondaryBackground: string;    // CSS class/value for cards, panels
  primaryAccent: string;          // Tailwind color or hex (e.g., cyan-400)
  secondaryAccent: string;        // Supporting accent
  waveformColor: string;          // hex or RGB for waveform rendering
  orbGlow: string;                // CSS shadow/glow styles
  buttonColor: string;            // Tailwind styles for buttons
  glassOpacity: string;           // Opacity value (e.g. "bg-white/5" vs "bg-black/40")
  borderColor: string;            // Border styling
  shadowColor: string;            // Accent shadow color
  animationStyle: string;         // e.g., 'pulse', 'float', 'glitch', 'smooth'
  voiceConfirmations: string[];   // Confirmation phrases used when selected
}

export const THEMES: Record<string, Theme> = {
  shadow: {
    id: "shadow",
    name: "Dark Theam",
    background: "bg-slate-950 text-slate-100",
    secondaryBackground: "bg-black/40 border-white/5",
    primaryAccent: "text-cyan-400",
    secondaryAccent: "text-blue-500",
    waveformColor: "#22d3ee", // cyan-400
    orbGlow: "shadow-[0_0_50px_rgba(34,211,238,0.25)] border-cyan-500/20",
    buttonColor: "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    glassOpacity: "bg-white/5 backdrop-blur-md",
    borderColor: "border-white/10",
    shadowColor: "rgba(6,182,212,0.15)",
    animationStyle: "smooth",
    voiceConfirmations: [
      "Stealth interface online.",
      "Shadow Protocol active, Monarch.",
      "Muting environment lighting. Protocol initialized."
    ]
  },
  cyber: {
    id: "cyber",
    name: "Cyber Blue",
    background: "bg-slate-900 text-slate-100",
    secondaryBackground: "bg-slate-950/60 border-blue-500/10",
    primaryAccent: "text-blue-400",
    secondaryAccent: "text-cyan-400",
    waveformColor: "#3b82f6", // blue-500
    orbGlow: "shadow-[0_0_50px_rgba(59,130,246,0.35)] border-blue-500/30",
    buttonColor: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30",
    glassOpacity: "bg-blue-950/20 backdrop-blur-md",
    borderColor: "border-blue-500/20",
    shadowColor: "rgba(59,130,246,0.2)",
    animationStyle: "float",
    voiceConfirmations: [
      "Cyber theme activated, Monarch.",
      "Main cyber grid connected.",
      "Cybernetic systems initialized."
    ]
  },
  crimson: {
    id: "crimson",
    name: "Crimson Core",
    background: "bg-zinc-950 text-zinc-100",
    secondaryBackground: "bg-red-950/10 border-red-500/10",
    primaryAccent: "text-red-500",
    secondaryAccent: "text-rose-400",
    waveformColor: "#ef4444", // red-500
    orbGlow: "shadow-[0_0_60px_rgba(239,68,68,0.4)] border-red-500/40",
    buttonColor: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30",
    glassOpacity: "bg-red-950/5 backdrop-blur-lg",
    borderColor: "border-red-950/40",
    shadowColor: "rgba(239,68,68,0.25)",
    animationStyle: "pulse",
    voiceConfirmations: [
      "Crimson mode engaged. Absolute system authority granted.",
      "Powering crimson core. Fully prepared for tactical operations.",
      "Crimson Protocol online, Monarch."
    ]
  },
  emerald: {
    id: "emerald",
    name: "Emerald Protocol",
    background: "bg-zinc-900 text-emerald-50",
    secondaryBackground: "bg-black/60 border-emerald-500/10",
    primaryAccent: "text-emerald-400",
    secondaryAccent: "text-green-500",
    waveformColor: "#34d399", // emerald-400
    orbGlow: "shadow-[0_0_50px_rgba(52,211,153,0.3)] border-emerald-500/30",
    buttonColor: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    glassOpacity: "bg-emerald-950/5 backdrop-blur-md",
    borderColor: "border-emerald-500/25",
    shadowColor: "rgba(16,185,129,0.2)",
    animationStyle: "glitch",
    voiceConfirmations: [
      "Emerald protocol engaged.",
      "Matrix parameters fully stabilized.",
      "Tactical visual override complete, Monarch."
    ]
  },
  purple: {
    id: "purple",
    name: "Royal Purple",
    background: "bg-slate-950 text-slate-100",
    secondaryBackground: "bg-purple-950/10 border-purple-500/10",
    primaryAccent: "text-purple-400",
    secondaryAccent: "text-fuchsia-400",
    waveformColor: "#c084fc", // purple-400
    orbGlow: "shadow-[0_0_55px_rgba(192,132,252,0.35)] border-purple-500/30",
    buttonColor: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/30",
    glassOpacity: "bg-purple-950/5 backdrop-blur-md",
    borderColor: "border-purple-500/20",
    shadowColor: "rgba(168,85,247,0.2)",
    animationStyle: "smooth",
    voiceConfirmations: [
      "Royal purple active. Elegance mode online.",
      "Sovereign diagnostics running. Purple systems active.",
      "Purple protocol engaged, Monarch."
    ]
  },
  white: {
    id: "white",
    name: "Arctic White",
    background: "bg-slate-50 text-slate-900",
    secondaryBackground: "bg-white/60 border-slate-200",
    primaryAccent: "text-blue-600",
    secondaryAccent: "text-slate-600",
    waveformColor: "#2563eb", // blue-600
    orbGlow: "shadow-[0_0_40px_rgba(37,99,235,0.2)] border-blue-400/40",
    buttonColor: "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200",
    glassOpacity: "bg-white/70 backdrop-blur-lg shadow-sm",
    borderColor: "border-slate-200/80",
    shadowColor: "rgba(37,99,235,0.1)",
    animationStyle: "smooth",
    voiceConfirmations: [
      "Arctic theme loaded. Optimal luminosity achieved.",
      "Stealth illumination active.",
      "Frosted systems standing by."
    ]
  },
  gold: {
    id: "gold",
    name: "Gold Elite",
    background: "bg-neutral-950 text-amber-50",
    secondaryBackground: "bg-neutral-900/60 border-amber-500/15",
    primaryAccent: "text-amber-400",
    secondaryAccent: "text-yellow-500",
    waveformColor: "#fbbf24", // amber-400
    orbGlow: "shadow-[0_0_60px_rgba(251,191,36,0.3)] border-amber-500/40",
    buttonColor: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30",
    glassOpacity: "bg-amber-950/5 backdrop-blur-md",
    borderColor: "border-amber-500/20",
    shadowColor: "rgba(245,158,11,0.25)",
    animationStyle: "float",
    voiceConfirmations: [
      "Gold Elite interface established. Premium command aesthetic active.",
      "Monarch command console finished in gold livery.",
      "Gilded sensors ready."
    ]
  },
  neon: {
    id: "neon",
    name: "Neon RGB",
    background: "bg-black text-white",
    secondaryBackground: "bg-neutral-950/80 border-cyan-500/20",
    primaryAccent: "text-cyan-400",
    secondaryAccent: "text-pink-500",
    waveformColor: "#f43f5e", // rose-500
    orbGlow: "shadow-[0_0_60px_rgba(244,63,94,0.35)] border-pink-500/40 animate-pulse",
    buttonColor: "bg-white/5 hover:bg-white/10 text-white border-white/20",
    glassOpacity: "bg-black/60 backdrop-blur-xl",
    borderColor: "border-cyan-500/30",
    shadowColor: "rgba(244,63,94,0.3)",
    animationStyle: "glitch",
    voiceConfirmations: [
      "Dynamic Neon RGB online.",
      "Gradients activated. Audio-reactive mode initialized.",
      "Prismatic theme online, Monarch."
    ]
  }
};
