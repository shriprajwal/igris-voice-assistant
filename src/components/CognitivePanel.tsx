import React, { useState, useEffect } from "react";
import { 
  Brain, 
  Cpu, 
  CheckCircle2, 
  Workflow, 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  Lightbulb,
  Clock,
  User,
  GitBranch
} from "lucide-react";
import { ReasoningManager, CognitiveAnalysis } from "../intelligence/ReasoningManager";
import { ContextManager } from "../intelligence/ContextManager";
import { PersonalityEngine } from "../intelligence/PersonalityEngine";
import { StateManager } from "../state/StateManager";

interface CognitivePanelProps {
  primaryAccentClass: string;
}

const CognitivePanel: React.FC<CognitivePanelProps> = ({ primaryAccentClass }) => {
  const [analysis, setAnalysis] = useState<CognitiveAnalysis | null>(() => 
    ReasoningManager.getInstance().getCurrentAnalysis()
  );
  
  const [traits, setTraits] = useState(() => PersonalityEngine.getInstance().getTraits());
  const [voiceMode, setVoiceMode] = useState<"system" | "friendly" | "shadow">("system");

  useEffect(() => {
    // Subscribe to deep reasoning logs
    const unsubscribeReasoning = ReasoningManager.getInstance().subscribe((newAnalysis) => {
      setAnalysis(newAnalysis);
      setTraits(PersonalityEngine.getInstance().getTraits());
    });

    const unsubscribeState = StateManager.getInstance().subscribe((state) => {
      setVoiceMode(state.voiceMode || "system");
    });

    return () => {
      unsubscribeReasoning();
      unsubscribeState();
    };
  }, []);

  return (
    <div id="igris-cognitive-deductive-panel" className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-xl transition-all duration-500 hover:border-white/10">
      
      {/* Panel Header */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-5">
        <div className={`p-2 rounded-lg bg-white/5 flex items-center justify-center ${primaryAccentClass}`}>
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-medium tracking-wider uppercase text-white">
            Advanced Cognitive & Reasoning Matrix
          </h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Autonomous Problem Solving, Heuristics, & Personality Adapters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Cognitive Traits & Diagnostics */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Personality Engine Tuning */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-4">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Dynamic Personality Tuning
            </span>

            {/* Humor Level */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400">Humor Index</span>
                <span className="text-white">{(traits.humorLevel * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${traits.humorLevel * 100}%` }} />
              </div>
            </div>

            {/* Emotional Warmth */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400">Emotional Warmth</span>
                <span className="text-white">{(traits.expressionWarmth * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${traits.expressionWarmth * 100}%` }} />
              </div>
            </div>

            {/* Sarcasm Resistance */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400">Sarcasm Resistance</span>
                <span className="text-white">{(traits.sarcasmResistance * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${traits.sarcasmResistance * 100}%` }} />
              </div>
            </div>

            <p className="text-[9px] font-mono text-slate-500 leading-relaxed">
              Traits adapt in real-time as user mood changes, conversational speed shifts, and sarcasm is recognized.
            </p>
          </div>

          {/* Context Metrics */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-4">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block mb-3">
              Learned Context & State Detection
            </span>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg flex flex-col justify-between">
                <span className="text-slate-500">Brevity Preference</span>
                <span className="text-white font-bold uppercase mt-1">
                  {analysis?.context.preferenceBrevity || "Balanced"}
                </span>
              </div>
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg flex flex-col justify-between">
                <span className="text-slate-500">Fatigue Sensor</span>
                <span className={`font-bold uppercase mt-1 ${analysis?.context.isExhausted ? "text-amber-400" : "text-emerald-400"}`}>
                  {analysis?.context.isExhausted ? "FATIGUE" : "NOMINAL"}
                </span>
              </div>
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg flex flex-col justify-between">
                <span className="text-slate-500">Boredom Sensor</span>
                <span className={`font-bold uppercase mt-1 ${analysis?.context.isBored ? "text-indigo-400 animate-pulse" : "text-slate-400"}`}>
                  {analysis?.context.isBored ? "ENGAGING" : "STANDBY"}
                </span>
              </div>
              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg flex flex-col justify-between">
                <span className="text-slate-500">Victory State</span>
                <span className={`font-bold uppercase mt-1 ${analysis?.context.isVictorious ? "text-emerald-400" : "text-slate-400"}`}>
                  {analysis?.context.isVictorious ? "VICTORIOUS" : "STABLE"}
                </span>
              </div>
            </div>
          </div>

          {/* Decision Evaluation */}
          {analysis && (
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active Decision appraisal
              </span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] font-mono text-slate-400">Identified Action</span>
                <span className="text-xs font-mono font-bold uppercase text-white px-2 py-0.5 bg-white/5 border border-white/10 rounded">
                  {analysis.decision.primaryAction}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400">Security Risk</span>
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                  analysis.decision.riskLevel === "high" 
                    ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                    : analysis.decision.riskLevel === "medium"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {analysis.decision.riskLevel}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1 leading-relaxed bg-white/[0.01] p-2 border border-white/5 rounded-lg">
                <span className="text-slate-500">Rationale:</span> {analysis.decision.rationale}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Live Stepped thinking Trail */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="bg-black/40 border border-white/5 rounded-xl p-5 h-full flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-4">
                <Workflow className="w-3.5 h-3.5" />
                Stepped Thinking Trail (Reasoning Core)
              </span>

              {analysis ? (
                <div className="relative border-l border-white/10 ml-3.5 pl-5 space-y-5">
                  {analysis.steps.map((step, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border border-slate-900 bg-slate-950 flex items-center justify-center">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${primaryAccentClass}`} />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-white tracking-wide uppercase">
                            Step {idx + 1}: {step.title}
                          </span>
                          <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded uppercase tracking-widest">
                            {step.status}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-300 leading-relaxed font-light">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
                  <div className="p-4 rounded-full bg-white/[0.02] border border-white/5 animate-pulse">
                    <Brain className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                      Deductive Matrix Standby
                    </span>
                    <p className="text-[10px] text-slate-500 font-mono mt-1 max-w-sm uppercase">
                      Awaiting live voice or text transcription cycle from Monarch to map cognitive pathways
                    </p>
                  </div>
                </div>
              )}
            </div>

            {analysis && (
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Cycle completed at: {new Date(analysis.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">Query: "{analysis.query}"</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default CognitivePanel;
