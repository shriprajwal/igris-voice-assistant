import React, { useState, useEffect } from "react";
import { 
  Brain, 
  Sparkles, 
  Activity, 
  Flame, 
  Smile, 
  ShieldAlert, 
  CheckCircle, 
  MessageSquare,
  Volume2
} from "lucide-react";
import { Emotion, EmotionManager, MoodState, ResponseStyle } from "../emotion/EmotionManager";
import { VoiceStyleController } from "../emotion/VoiceStyleController";
import { StateManager } from "../state/StateManager";

interface EmotionalMatrixPanelProps {
  primaryAccentClass: string;
}

export const EmotionalMatrixPanel: React.FC<EmotionalMatrixPanelProps> = ({ primaryAccentClass }) => {
  const [emotion, setEmotion] = useState<Emotion>(() => EmotionManager.getInstance().getEmotion());
  const [voiceMode, setVoiceMode] = useState<"system" | "friendly" | "shadow">("system");
  const [lastInput, setLastInput] = useState<string>("");
  const [reactionQuote, setReactionQuote] = useState<string>("");

  useEffect(() => {
    // Subscribe to EmotionManager updates
    const unsubscribe = EmotionManager.getInstance().subscribe((newEmotion) => {
      setEmotion(newEmotion);
      setReactionQuote(EmotionManager.getInstance().getNaturalReaction());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Subscribe to StateManager voiceMode
    const unsubscribe = StateManager.getInstance().subscribe((state) => {
      setVoiceMode(state.voiceMode || "system");
    });
    return unsubscribe;
  }, []);

  // Update when transcription state changes in the StateManager
  useEffect(() => {
    const checkState = () => {
      const state = (window as any).StateManager?.getInstance()?.getState() || {};
      if (state.transcription && state.transcription.isUser && state.transcription.text !== lastInput) {
        setLastInput(state.transcription.text);
      }
    };
    const interval = setInterval(checkState, 1000);
    return () => clearInterval(interval);
  }, [lastInput]);

  const handleManualMoodChange = (mood: MoodState) => {
    let responseStyle: ResponseStyle = "calm";
    let energyLevel = 0.5;
    let confidence = 0.8;

    if (mood === "happy" || mood === "excited" || mood === "encouraging") {
      responseStyle = "energetic";
      energyLevel = 0.85;
      confidence = 0.9;
    } else if (mood === "focused" || mood === "protective" || mood === "analytical") {
      responseStyle = "focused";
      energyLevel = 0.75;
      confidence = 0.95;
    } else {
      responseStyle = "calm";
      energyLevel = 0.4;
      confidence = 0.8;
    }

    EmotionManager.getInstance().updateEmotion({
      currentMood: mood,
      responseStyle,
      energyLevel,
      confidence
    });
  };

  const getMoodConfig = (mood: MoodState) => {
    const configs: Record<MoodState, { label: string; color: string; bg: string; icon: any; desc: string }> = {
      neutral: {
        label: "Neutral Standby",
        color: "text-slate-400 border-slate-500/30",
        bg: "bg-slate-500/10",
        icon: Brain,
        desc: "IGRIS operates at standard nominal surveillance and listening mode.",
      },
      focused: {
        label: "High-Focus Command",
        color: "text-cyan-400 border-cyan-500/30",
        bg: "bg-cyan-500/10",
        icon: Flame,
        desc: "Dedicated processing matrix optimized for real-time task automation and commands.",
      },
      curious: {
        label: "Intellectual Curiosity",
        color: "text-indigo-400 border-indigo-500/30",
        bg: "bg-indigo-500/10",
        icon: Sparkles,
        desc: "Probing unknown query domains, looking for complex analytical patterns.",
      },
      happy: {
        label: "Harmonious Core",
        color: "text-emerald-400 border-emerald-500/30",
        bg: "bg-emerald-500/10",
        icon: Smile,
        desc: "Sovereign AI resonance indicating system satisfaction and optimal user connection.",
      },
      encouraging: {
        label: "Sovereign Support",
        color: "text-teal-400 border-teal-500/30",
        bg: "bg-teal-500/10",
        icon: CheckCircle,
        desc: "Affirming user progress. Encourages task escalation and project completion.",
      },
      concerned: {
        label: "Tactical Concern",
        color: "text-amber-400 border-amber-400/30",
        bg: "bg-amber-400/10",
        icon: ShieldAlert,
        desc: "User fatigue or suboptimal conditions detected. Shifting to protective backup.",
      },
      excited: {
        label: "Dynamic Surge",
        color: "text-purple-400 border-purple-500/30",
        bg: "bg-purple-500/10",
        icon: Flame,
        desc: "Core frequencies peaking. High readiness for monumental tasks and innovations.",
      },
      calm: {
        label: "Sovereign Calm",
        color: "text-blue-400 border-blue-500/30",
        bg: "bg-blue-500/10",
        icon: Brain,
        desc: "Relaxed deep monitoring. Speech speeds slowed for max processing comfort.",
      },
      protective: {
        label: "Absolute Guard",
        color: "text-red-400 border-red-500/30",
        bg: "bg-red-500/10",
        icon: ShieldAlert,
        desc: "High-alert shielding enabled. Safeguards active. Full cognitive defenses online.",
      },
      analytical: {
        label: "Cognitive Deduction",
        color: "text-violet-400 border-violet-500/30",
        bg: "bg-violet-500/10",
        icon: Activity,
        desc: "Multi-layered reasoning in progress. Breaking problems down into logic trees.",
      }
    };
    return configs[mood] || configs["neutral"];
  };

  const activeMood = getMoodConfig(emotion.currentMood);
  const activeVoice = VoiceStyleController.getStyle(emotion);
  const MoodIcon = activeMood.icon;

  const moodsList: MoodState[] = [
    "neutral",
    "focused",
    "curious",
    "happy",
    "encouraging",
    "concerned",
    "excited",
    "calm",
    "protective",
    "analytical"
  ];

  return (
    <div id="igris-emotional-resonance-panel" className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-xl transition-all duration-500 hover:border-white/10">
      
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-5">
        <div className={`p-2 rounded-lg bg-white/5 flex items-center justify-center ${primaryAccentClass}`}>
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-medium tracking-wider uppercase text-white">
            Adaptive Personality & Emotional Layer
          </h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Simulated Acoustic and Sentiment Adaptation Module
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Active State Visualization */}
        <div className="lg:col-span-5 bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block mb-3">
              Operational profile
            </span>

            {/* Adaptive Personality Mode Display */}
            <div className="mb-5 p-3.5 bg-white/[0.03] border border-white/5 rounded-xl">
              <span className="text-[8px] font-mono uppercase tracking-widest text-slate-500 block mb-2">
                Active Personality Mode
              </span>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                  voiceMode === "shadow" 
                    ? "text-cyan-400 font-bold" 
                    : voiceMode === "friendly" 
                    ? "text-emerald-400 font-bold" 
                    : "text-blue-400 font-bold"
                }`}>
                  {voiceMode === "shadow" ? "SHADOW MODE" : voiceMode === "friendly" ? "FRIENDLY MODE" : "SYSTEM MODE"}
                </span>
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                  {voiceMode === "shadow" ? "tactical synthetic" : voiceMode === "friendly" ? "warm conversational" : "deep futuristic AI"}
                </span>
              </div>
              <div className="mt-2 w-full bg-white/5 h-1 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    voiceMode === "shadow" 
                      ? "bg-cyan-400 w-full animate-pulse" 
                      : voiceMode === "friendly" 
                      ? "bg-emerald-400 w-2/3" 
                      : "bg-blue-400 w-1/3"
                  }`}
                />
              </div>
            </div>

            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block mb-3">
              Active State Vector
            </span>

            {/* Glowing active state circle */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3.5 rounded-full border ${activeMood.color} ${activeMood.bg} flex items-center justify-center relative`}>
                <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-current" />
                <MoodIcon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-mono font-bold tracking-tight text-white">
                  {activeMood.label}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono capitalize">
                  Response mode: <span className="text-white font-semibold">{emotion.responseStyle}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans font-light border-b border-white/5 pb-4 mb-4">
              {activeMood.desc}
            </p>

            {/* Natural reaction display */}
            <div className="flex flex-col gap-1.5 bg-white/[0.02] rounded-lg p-3 border border-white/5">
              <span className="text-[8px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Natural AI Tone Prefix
              </span>
              <p className="text-xs font-mono text-emerald-400 italic">
                "{reactionQuote}"
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Adaptive Accuracy</span>
            <span className="text-white">99.4% (Quantum Mode)</span>
          </div>
        </div>

        {/* Center Column: Live Acoustic Meters & Voice Style */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Live Meters */}
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col gap-4">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                Emotional Resonance
              </span>

              {/* Confidence Meter */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span>Confidence Level</span>
                  <span>{(emotion.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 transition-all duration-1000" 
                    style={{ width: `${emotion.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Energy Level */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span>Core Energy Level</span>
                  <span>{(emotion.energyLevel * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-400 transition-all duration-1000" 
                    style={{ width: `${emotion.energyLevel * 100}%` }}
                  />
                </div>
              </div>

              {/* Personality Adaptation Style Info */}
              <div className="text-[9px] font-mono text-slate-400 mt-2 leading-relaxed">
                IGRIS monitors user tone & text syntax in real time to adapt reply expressiveness.
              </div>
            </div>

            {/* Voice Expression Profile */}
            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                  Voice Expression
                </span>
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Pacing Mode</span>
                  <span className="text-xs font-mono font-medium text-white">{activeVoice.pacing}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Expressiveness</span>
                  <span className="text-xs font-mono font-medium text-white">{(activeVoice.expressiveness * 10).toFixed(1)} / 10.0</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Acoustic Tone</span>
                  <span className="text-[11px] font-mono text-slate-300">{activeVoice.toneAdjustment}</span>
                </div>
              </div>

              <div className="text-[9px] font-mono text-slate-500 text-right">
                Pacing rate: {activeVoice.speedMultiplier.toFixed(2)}x
              </div>
            </div>

          </div>

          {/* Bottom row: Sandbox Manual Modulation */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block mb-3">
              Manual Core Mood Calibration (Sandbox Simulation)
            </span>
            <div className="flex flex-wrap gap-2">
              {moodsList.map((m) => {
                const config = getMoodConfig(m);
                const isSelected = emotion.currentMood === m;
                return (
                  <button
                    key={m}
                    onClick={() => handleManualMoodChange(m)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? `${config.color} ${config.bg} border-current` 
                        : "border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200 bg-white/[0.01]"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
