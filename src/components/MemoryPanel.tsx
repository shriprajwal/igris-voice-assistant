import { useState, useEffect, FormEvent } from "react";
import { 
  Brain, 
  Trash2, 
  Search, 
  Plus, 
  RefreshCw, 
  Database, 
  User, 
  Settings, 
  CheckSquare, 
  History,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { MemoryManager } from "../memory/MemoryManager";
import { MemoryItem, MemoryCategory } from "../memory/MemoryTypes";

interface MemoryPanelProps {
  onMemoryChanged?: () => void;
  primaryAccentClass?: string;
}

export default function MemoryPanel({ onMemoryChanged, primaryAccentClass = "text-cyan-400" }: MemoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isFirebaseSyncActive, setIsFirebaseSyncActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Manual entry fields
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryCategory>("preference");
  const [showManualForm, setShowManualForm] = useState(false);

  // Clear confirmation
  const [confirmClear, setConfirmClear] = useState(false);

  const memoryManager = MemoryManager.getInstance();

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      await memoryManager.init();
      const list = await memoryManager.getMemories();
      setMemories(list);
      setIsFirebaseSyncActive(false);
    } catch (err) {
      console.error("Failed to load memories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const handleSaveMemory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      await memoryManager.saveMemory(newCategory, newKey, newValue);
      setNewKey("");
      setNewValue("");
      setShowManualForm(false);
      await loadMemories();
      onMemoryChanged?.();
    } catch (err) {
      console.error("Failed to save memory manually:", err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await memoryManager.deleteMemory(id);
      await loadMemories();
      onMemoryChanged?.();
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  const handleClearAllMemories = async () => {
    try {
      await memoryManager.clearAllMemories();
      setConfirmClear(false);
      await loadMemories();
      onMemoryChanged?.();
    } catch (err) {
      console.error("Failed to clear memories:", err);
    }
  };

  // Filter and search logic
  const filteredMemories = memories.filter(item => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch = item.key.toLowerCase().includes(search.toLowerCase()) || 
                          item.value.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: MemoryCategory) => {
    switch (category) {
      case "personal": return <User className="w-3.5 h-3.5" />;
      case "preference": return <Settings className="w-3.5 h-3.5" />;
      case "task": return <CheckSquare className="w-3.5 h-3.5" />;
      case "history": return <History className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryColor = (category: MemoryCategory) => {
    switch (category) {
      case "personal": return "border-blue-500/30 bg-blue-500/5 text-blue-400";
      case "preference": return "border-cyan-500/30 bg-cyan-500/5 text-cyan-400";
      case "task": return "border-emerald-500/30 bg-emerald-500/5 text-emerald-400";
      case "history": return "border-purple-500/30 bg-purple-500/5 text-purple-400";
    }
  };

  return (
    <div id="memory-matrix-panel" className="w-full border border-white/5 rounded-2xl bg-zinc-950/40 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300">
      
      {/* Header section toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-4 flex items-center justify-between cursor-pointer select-none border-b border-white/5 hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <Brain className={`w-5 h-5 ${primaryAccentClass} animate-pulse`} />
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-white">IGRIS Memory Matrix</h3>
            <p className="text-[10px] text-white/40 tracking-wide font-sans mt-0.5">
              {memories.length} item{memories.length !== 1 && "s"} stored • Local database active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[9px] font-mono border border-white/10 px-2 py-0.5 rounded bg-white/5 text-white/50">
            <Database className="w-3 h-3" />
            INDEXEDDB
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
        </div>
      </div>

      {/* Main panel body */}
      {isOpen && (
        <div className="p-6 flex flex-col gap-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-white/5 pb-4">
            
            {/* Search inputs and filter pills */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/30" />
                <input 
                  type="text" 
                  placeholder="Search memories..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30 font-sans"
                />
              </div>

              {/* Category pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["all", "personal", "preference", "task", "history"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      categoryFilter === cat 
                        ? "bg-white/10 border-white/30 text-white" 
                        : "bg-transparent border-white/5 text-white/50 hover:text-white/80 hover:border-white/10"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Refresh, Clear, Add */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <button 
                onClick={loadMemories}
                disabled={isLoading}
                title="Refresh memories"
                className="p-2 border border-white/10 rounded-lg hover:bg-white/5 text-white/75 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="flex items-center gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>INJECT</span>
              </button>

              {memories.length > 0 && (
                <div>
                  {confirmClear ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleClearAllMemories}
                        className="bg-red-500 hover:bg-red-600 border border-red-500 text-white px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition-all cursor-pointer"
                      >
                        CONFIRM WIPE
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="border border-white/10 hover:bg-white/5 text-white/70 px-2 py-1 rounded text-[10px] font-mono tracking-wider transition-all cursor-pointer"
                      >
                        CANCEL
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 text-red-400 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all cursor-pointer"
                    >
                      WIPE MATRIX
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form to inject memory manually */}
          {showManualForm && (
            <form onSubmit={handleSaveMemory} className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-4">
              <div className="text-[10px] uppercase font-mono tracking-wider text-white/50">Inject Manual Memory Key-Value</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono text-white/40 uppercase">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                    className="bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/30 font-sans"
                  >
                    <option value="personal">Personal</option>
                    <option value="preference">Preference</option>
                    <option value="task">Task</option>
                    <option value="history">History</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono text-white/40 uppercase">Memory Key (Topic)</label>
                  <input
                    type="text"
                    placeholder="e.g. coffee_style, user_name"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    required
                    className="bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/30 font-sans"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono text-white/40 uppercase">Memory Value (Details)</label>
                  <input
                    type="text"
                    placeholder="e.g. loves cold brew, prefers Monarch"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    required
                    className="bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-white/30 font-sans"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="border border-white/10 hover:bg-white/5 text-white/75 px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all cursor-pointer"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="bg-white text-zinc-950 hover:bg-white/90 font-medium px-4 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all cursor-pointer"
                >
                  SAVE PROTOCOL
                </button>
              </div>
            </form>
          )}

          {/* Stored memories grid */}
          {filteredMemories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemories.map((item) => (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between gap-3 group hover:border-white/10 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono tracking-wider uppercase text-white/40 font-bold">
                        {item.key}
                      </span>
                      <span className="text-xs text-white font-medium break-words leading-relaxed">
                        {item.value}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(item.id)}
                      title="Forget this memory"
                      className="text-white/20 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-[9px] font-mono text-white/30">
                    <div className={`flex items-center gap-1 border px-1.5 py-0.5 rounded-md ${getCategoryColor(item.category)}`}>
                      {getCategoryIcon(item.category)}
                      <span className="uppercase tracking-widest text-[8px] leading-none">{item.category}</span>
                    </div>
                    <span>
                      {new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
              <Brain className="w-8 h-8 text-white/10 mb-3" />
              <div className="text-xs font-mono font-bold uppercase text-white/40 tracking-wider">No Records Detected</div>
              <p className="text-[10px] text-white/30 max-w-xs leading-relaxed mt-1">
                IGRIS's memory matrix is empty or matches no filters. Direct IGRIS to "Remember..." or click "Inject" to register a preference.
              </p>
            </div>
          )}

          {/* Quick instructions banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-cyan-500/10 bg-cyan-500/5 text-cyan-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed font-sans">
              <strong>Vocal Interaction:</strong> Try saying <em>"IGRIS, remember that I prefer matrix visual theme"</em>, <em>"What do you remember about me?"</em>, or <em>"Forget my favorite site"</em>. IGRIS will dynamically calibrate its responses and options according to the retrieved preferences.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
