import React, { useState, useEffect } from "react";
import { 
  Lightbulb, 
  Sparkles, 
  Cpu, 
  Terminal, 
  AlertTriangle, 
  BookOpen, 
  Play, 
  Layers, 
  Bookmark, 
  ListTodo,
  CheckCircle,
  HelpCircle,
  BookMarked,
  Hammer
} from "lucide-react";
import { RecommendationEngine, Recommendation } from "../assistant/RecommendationEngine";
import { ProjectManager, ProjectBlueprint } from "../assistant/ProjectManager";
import { CodingAssistant, DebugReport } from "../assistant/CodingAssistant";
import { LearningManager, InteractiveLesson } from "../assistant/LearningManager";
import { ContextManager } from "../intelligence/ContextManager";
import { StateManager } from "../state/StateManager";

interface AssistantPanelProps {
  primaryAccentClass: string;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ primaryAccentClass }) => {
  // Recommendation state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  // Project Planner state
  const [appName, setAppName] = useState("Monarch Portal");
  const [appDesc, setAppDesc] = useState("A secure real-time full-stack portal built with React, Vite, Tailwind CSS and durable Firestore.");
  const [blueprint, setBlueprint] = useState<ProjectBlueprint | null>(null);

  // Coding Assistant state
  const [errorInput, setErrorInput] = useState("maximum update depth exceeded");
  const [debugReport, setDebugReport] = useState<DebugReport | null>(null);

  // Learning Manager state
  const [lessons, setLessons] = useState<InteractiveLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<InteractiveLesson | null>(null);

  // General state triggers
  const [devModeActive, setDevModeActive] = useState(false);
  const [teachModeActive, setTeachModeActive] = useState(false);

  useEffect(() => {
    // Initial data load
    const contextMetadata = ContextManager.getInstance().getMetadata();
    const lastUserTurn = ContextManager.getInstance().getHistory().filter(t => t.role === "user").pop();
    const queryStr = lastUserTurn ? lastUserTurn.text : "Standard operation mode active.";
    
    // Recommendations
    const recs = RecommendationEngine.getInstance().generateRecommendations(queryStr, contextMetadata);
    setRecommendations(recs);

    // Project blueprint
    const bp = ProjectManager.getInstance().generateProjectPlan(appName, appDesc);
    setBlueprint(bp);

    // Diagnose default error
    const debug = CodingAssistant.getInstance().diagnoseError(errorInput);
    setDebugReport(debug);

    // Lessons
    const list = LearningManager.getInstance().getLessonsList();
    setLessons(list);
    setSelectedLesson(list[0]);

    // Active voice mode monitoring
    let lastProcessedTranscription: any = null;
    const unsubscribe = StateManager.getInstance().subscribe((appState) => {
      // Dynamic updates on user commands
      if (appState.transcription && appState.transcription.isUser && appState.transcription !== lastProcessedTranscription) {
        lastProcessedTranscription = appState.transcription;
        const text = appState.transcription.text.toLowerCase();
        
        if (text.includes("developer mode")) {
          setDevModeActive(true);
          setTeachModeActive(false);
          StateManager.getInstance().addLog("IGRIS Developer Mode online. Multi-threading logic systems.", "success");
        }
        if (text.includes("teach me")) {
          setTeachModeActive(true);
          setDevModeActive(false);
          StateManager.getInstance().addLog("IGRIS Educational Mentoring mode engaged.", "info");
        }

        const freshMetadata = ContextManager.getInstance().getMetadata();
        const freshRecs = RecommendationEngine.getInstance().generateRecommendations(appState.transcription.text, freshMetadata);
        setRecommendations(freshRecs);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleCreateBlueprint = (e: React.FormEvent) => {
    e.preventDefault();
    const bp = ProjectManager.getInstance().generateProjectPlan(appName, appDesc);
    setBlueprint(bp);
    StateManager.getInstance().addLog(`Constructed architectural blueprint for: "${appName}"`, "success");
  };

  const handleDiagnose = (e: React.FormEvent) => {
    e.preventDefault();
    const report = CodingAssistant.getInstance().diagnoseError(errorInput);
    setDebugReport(report);
    StateManager.getInstance().addLog("Error debug report generated.", "success");
  };

  const toggleDevMode = () => {
    const newState = !devModeActive;
    setDevModeActive(newState);
    if (newState) {
      setTeachModeActive(false);
      StateManager.getInstance().addLog("Developer Mode activated manually.", "success");
    }
  };

  const toggleTeachMode = () => {
    const newState = !teachModeActive;
    setTeachModeActive(newState);
    if (newState) {
      setDevModeActive(false);
      StateManager.getInstance().addLog("Learning Mentor Mode activated manually.", "info");
    }
  };

  return (
    <div id="igris-assistant-personal-mentor-panel" className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-xl transition-all duration-500 hover:border-white/10">
      
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/5 flex items-center justify-center ${primaryAccentClass}`}>
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-wider uppercase text-white">
              Personal Intelligence & Mentoring Core
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Recommendation Engine, Code Debugger, & Blueprint Manager
            </p>
          </div>
        </div>

        {/* Quick Modes toggles */}
        <div className="flex gap-2">
          <button
            onClick={toggleDevMode}
            className={`px-3 py-1.5 rounded-lg border text-[9px] font-mono uppercase tracking-wider cursor-pointer transition-all duration-300 ${
              devModeActive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {devModeActive ? "● Dev Mode Active" : "Developer Mode"}
          </button>
          <button
            onClick={toggleTeachMode}
            className={`px-3 py-1.5 rounded-lg border text-[9px] font-mono uppercase tracking-wider cursor-pointer transition-all duration-300 ${
              teachModeActive
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                : "bg-white/5 border-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {teachModeActive ? "● Teach Mode Active" : "Learning Mode"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Columns (7/12): Blueprint Planner & Recommendations */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Recommendation Intelligence */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-4">
              <Lightbulb className="w-3.5 h-3.5" />
              Dynamic Advice & Strategic Recommendations
            </span>

            <div className="space-y-3.5">
              {recommendations.map((rec) => (
                <div key={rec.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-white/[0.02]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                        rec.category === "coding" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : rec.category === "learning"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {rec.category}
                      </span>
                      <h4 className="text-xs font-mono font-bold text-white uppercase">{rec.title}</h4>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 leading-relaxed uppercase">
                      {rec.description}
                    </p>
                  </div>
                  <button 
                    onClick={() => StateManager.getInstance().addLog(`Monarch initiated suggested routine: "${rec.suggestedAction}"`, "info")}
                    className="shrink-0 text-[9px] font-mono border border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-indigo-500/5 text-white hover:text-indigo-400 px-3 py-1.5 rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer"
                  >
                    Engage
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Project Planning Blueprints */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-4">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Full-Stack Architecture Milestones & Technology Planner
            </span>

            <form onSubmit={handleCreateBlueprint} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-mono text-slate-500 uppercase">Target Project Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[8px] font-mono text-slate-500 uppercase">Brief Concept Description</label>
                  <input
                    type="text"
                    value={appDesc}
                    onChange={(e) => setAppDesc(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs uppercase tracking-wider rounded cursor-pointer transition-all duration-200 shrink-0"
                >
                  Plan
                </button>
              </div>
            </form>

            {blueprint && (
              <div className="border border-white/5 rounded-lg bg-white/[0.01] p-4 flex flex-col gap-4">
                <div className="border-b border-white/5 pb-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Active Blueprint Stack:</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-[10px] font-mono">
                    <div className="p-2 bg-white/[0.02] border border-white/5 rounded">
                      <span className="text-slate-500 block">Frontend</span>
                      <span className="text-white font-semibold block truncate">React (Vite)</span>
                    </div>
                    <div className="p-2 bg-white/[0.02] border border-white/5 rounded">
                      <span className="text-slate-500 block">Backend</span>
                      <span className="text-white font-semibold block truncate">Express Server</span>
                    </div>
                    <div className="p-2 bg-white/[0.02] border border-white/5 rounded">
                      <span className="text-slate-500 block">Database</span>
                      <span className="text-white font-semibold block truncate">Firestore</span>
                    </div>
                    <div className="p-2 bg-white/[0.02] border border-white/5 rounded">
                      <span className="text-slate-500 block">Authentication</span>
                      <span className="text-white font-semibold block truncate">Firebase Auth</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase block mb-2.5">Development Phases & Milestones:</span>
                  <div className="space-y-2">
                    {blueprint.milestones.map((m, idx) => (
                      <div key={idx} className="flex gap-2 text-[10px] font-mono text-slate-300 uppercase">
                        <span className="text-indigo-400 shrink-0">[{idx + 1}]</span>
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Columns (5/12): Debug Diagnostic & Lessons */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Debug & Diagnostic Center */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-4">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Developer Diagnosis & Error Resolver
            </span>

            <form onSubmit={handleDiagnose} className="flex flex-col gap-2">
              <label className="text-[8px] font-mono text-slate-500 uppercase">Paste error log or trace</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={errorInput}
                  onChange={(e) => setErrorInput(e.target.value)}
                  placeholder="e.g., maximum update depth exceeded"
                  className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs uppercase tracking-wider rounded cursor-pointer transition-all duration-200"
                >
                  Diagnose
                </button>
              </div>
            </form>

            {debugReport && (
              <div className="border border-white/5 bg-white/[0.01] p-3.5 rounded-lg space-y-3.5 text-[10px] font-mono">
                <div>
                  <span className="text-red-400 font-bold block mb-0.5">⚠️ ROOT CAUSE ANALYSIS:</span>
                  <p className="text-slate-300 leading-relaxed uppercase">{debugReport.rootCause}</p>
                </div>
                <div>
                  <span className="text-emerald-400 font-bold block mb-0.5">✅ RESOLUTION STEPS:</span>
                  <p className="text-slate-300 leading-relaxed uppercase">{debugReport.recommendedFix}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block mb-0.5">🛡️ PREVENTION METHODOLOGY:</span>
                  <p className="text-slate-300 leading-relaxed uppercase">{debugReport.preventativeMeasures}</p>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Lesson Mentor */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-4">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Mentor Educational Tutorials
            </span>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {lessons.map((les) => (
                <button
                  key={les.id}
                  onClick={() => setSelectedLesson(les)}
                  className={`px-3 py-1.5 border rounded text-[9px] font-mono uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all duration-300 ${
                    selectedLesson?.id === les.id
                      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
                      : "border-white/5 bg-white/[0.01] text-slate-400 hover:text-white"
                  }`}
                >
                  {les.topic}
                </button>
              ))}
            </div>

            {selectedLesson && (
              <div className="border border-white/5 bg-white/[0.01] p-4 rounded-lg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Target Objective:</span>
                  <span className="text-[8px] font-mono px-1 bg-indigo-500/10 text-indigo-400 rounded uppercase font-bold tracking-widest">
                    {selectedLesson.difficulty}
                  </span>
                </div>
                <p className="text-[11px] font-mono font-medium text-slate-200 uppercase leading-relaxed">
                  {selectedLesson.objective}
                </p>

                <div className="space-y-1.5">
                  {selectedLesson.steps.map((st, idx) => (
                    <div key={idx} className="text-[10px] font-mono text-slate-400 uppercase leading-relaxed">
                      <span>• {st}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block mb-1">Clean Practice Snippet:</span>
                  <pre className="p-3 bg-black/60 border border-white/5 rounded-md text-[9px] font-mono text-indigo-300 overflow-x-auto leading-relaxed max-h-40">
                    <code>{selectedLesson.codeSnippet}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
