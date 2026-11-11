import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  RefreshCw, 
  ListRestart, 
  HelpCircle, 
  BookOpen, 
  ShieldAlert, 
  Lightbulb, 
  CheckCircle,
  BrainCircuit,
  MessageSquare,
  Award
} from "lucide-react";
import { LearningManager } from "../learning/LearningManager";
import { PreferenceEngine, LearnedPreference } from "../learning/PreferenceEngine";
import { StateManager } from "../state/StateManager";

import { getAuthorizedUser } from "../memory/AuthorizedUser";

interface EvolutionPanelProps {
  primaryAccentClass: string;
}

const EvolutionPanel: React.FC<EvolutionPanelProps> = ({ primaryAccentClass }) => {
  const [preferences, setPreferences] = useState<LearnedPreference[]>([]);
  const [authorizedUser, setAuthorizedUser] = useState("Monarch");
  const [isImproving, setIsImproving] = useState(false);
  const [manualPreference, setManualPreference] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchPreferences = async (user: string) => {
    const prefs = await PreferenceEngine.getInstance().loadPreferences(user);
    setPreferences(prefs);
  };

  useEffect(() => {
    const init = async () => {
      const user = await getAuthorizedUser();
      setAuthorizedUser(user);
      fetchPreferences(user);
    };
    init();

    // Dynamic subscription to updates
    const unsubscribe = StateManager.getInstance().subscribe(async () => {
      const user = await getAuthorizedUser();
      setAuthorizedUser(user);
      fetchPreferences(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleImproveSelf = async () => {
    setIsImproving(true);
    setStatusMessage(null);
    
    // Simulate cognitive parsing
    setTimeout(async () => {
      const resultMsg = await LearningManager.getInstance().executeSelfImprovement(authorizedUser);
      await fetchPreferences(authorizedUser);
      setIsImproving(false);
      setStatusMessage(resultMsg);
    }, 1200);
  };

  const handleRegisterManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPreference.trim()) return;

    await PreferenceEngine.getInstance().registerExplicitPreference(manualPreference, authorizedUser);
    await fetchPreferences(authorizedUser);
    setManualPreference("");
    setStatusMessage("New style rule registered successfully into your preferences archive.");
  };

  return (
    <div id="igris-evolution-panel" className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-xl transition-all duration-500 hover:border-white/10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/5 flex items-center justify-center ${primaryAccentClass}`}>
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-wider uppercase text-white">
              Adaptive Self-Improvement & Memory Evolution
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Self-Correcting Response Optimization & Learned Preferences
            </p>
          </div>
        </div>
        
        <button
          onClick={handleImproveSelf}
          disabled={isImproving}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-mono uppercase tracking-widest cursor-pointer transition-all duration-300 ${
            isImproving 
              ? "border-white/10 bg-white/5 text-slate-400 animate-pulse" 
              : "border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-indigo-500/5 text-white hover:text-indigo-400"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isImproving ? "animate-spin" : ""}`} />
          {isImproving ? "Calibrating..." : "IGRIS Improve Yourself"}
        </button>
      </div>

      {statusMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs font-mono text-emerald-300 leading-relaxed uppercase">
            {statusMessage}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Learned Prefs list */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-black/40 border border-white/5 rounded-xl p-5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-4">
              <Award className="w-3.5 h-3.5" />
              Calibrated Behavior Rules
            </span>

            {preferences.length > 0 ? (
              <div className="space-y-4">
                {preferences.map((pref, idx) => (
                  <div key={idx} className="p-3.5 bg-white/[0.01] border border-white/5 rounded-lg flex flex-col gap-2 transition-all hover:bg-white/[0.02]">
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-xs font-mono font-medium text-slate-200">
                        "{pref.pattern}"
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded uppercase shrink-0">
                        {pref.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 uppercase">
                        <span>Confidence Level</span>
                        <span className="text-slate-300 font-bold">{(pref.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500">
                        Updated: {new Date(pref.lastUpdated).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500" 
                        style={{ width: `${pref.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 gap-3 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                <Sparkles className="w-8 h-8 text-slate-600 animate-pulse" />
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    Evolving Intellect Initiated
                  </span>
                  <p className="text-[9px] font-mono text-slate-500 uppercase max-w-xs mt-1 leading-relaxed">
                    Say "IGRIS remember this style" or "IGRIS learn from this" to explicitly save custom response rules.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Teach IGRIS form */}
          <form onSubmit={handleRegisterManual} className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-3">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Direct Styling Constraint
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Example: Always give complete functional code blocks with styled CSS..."
                value={manualPreference}
                onChange={(e) => setManualPreference(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer transition-all duration-300"
              >
                Teach
              </button>
            </div>
            <p className="text-[9px] font-mono text-slate-500 uppercase leading-relaxed">
              Provides direct feed into IGRIS system adapters, setting premium level 0.99 confidence on the guideline.
            </p>
          </form>
        </div>

        {/* Right Column: Systems parameters, guides, safety restrictions */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* How self learning works card */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 flex flex-col gap-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white font-medium flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Cognitive Self-Evolution
            </span>
            
            <p className="text-xs font-mono text-slate-400 leading-relaxed uppercase">
              IGRIS analyzes multiple interaction heuristics:
            </p>

            <div className="space-y-3.5 text-[10px] font-mono text-slate-400 uppercase">
              <div className="flex gap-2.5 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <p><strong className="text-white">Style Calibration:</strong> Remembers your coding paradigms, layout models, and complexity preferences.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <p><strong className="text-white">Pacing Optimization:</strong> Automatically adjusts response brevity according to the tempo of commands.</p>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                <p><strong className="text-white">Context Recall:</strong> Combines historic emotional parameters with memory stores to maximize performance.</p>
              </div>
            </div>
          </div>

          {/* Safety parameters (Source code is NEVER modified) */}
          <div className="bg-red-950/10 border border-red-500/10 rounded-xl p-5 flex flex-col gap-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-medium flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
              Self-Evolution Safety Guardrails
            </span>
            
            <div className="space-y-3 text-[10px] font-mono text-slate-400 uppercase leading-relaxed">
              <p className="flex gap-2 items-start">
                <span className="text-red-400">⚡</span>
                <span>Source integrity locked. Dynamic learning is compiled entirely as isolated instruction adapters (source code is never modified).</span>
              </p>
              <p className="flex gap-2 items-start">
                <span className="text-red-400">⚡</span>
                <span>Security matrix bypassed constraints are forbidden. Permission and authorization scopes remain immutable.</span>
              </p>
              <p className="flex gap-2 items-start">
                <span className="text-red-400">⚡</span>
                <span>Complete transparency. All self-learned parameters are fully cataloged above and controlled by the Monarch.</span>
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default EvolutionPanel;
