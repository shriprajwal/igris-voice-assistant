import React, { useState, useEffect } from "react";
import { Monitor, CheckCircle2, Eye, X, RefreshCw } from "lucide-react";
import { ScreenCapture, MonitorInfo } from "../vision/ScreenCapture";
import { VisionManager } from "../vision/VisionManager";

interface ScreenAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized?: () => void;
}

export const ScreenAccessModal: React.FC<ScreenAccessModalProps> = ({ isOpen, onClose, onAuthorized }) => {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<number>(0);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      ScreenCapture.getInstance().listMonitors().then((list) => {
        if (list && list.length > 0) {
          setMonitors(list);
          const primary = list.find((m) => m.isPrimary);
          if (primary) {
            setSelectedMonitor(primary.id);
          }
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    setError(null);
    try {
      await VisionManager.getInstance().startVisionAssist(selectedMonitor);
      onAuthorized?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to authorize desktop screen observation.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b101b] border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-cyan-950/50 flex flex-col gap-5 font-mono text-left relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Authorize Desktop Observation
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              Native Windows Screen Access Protocol
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-300 space-y-3 leading-relaxed">
          <p>
            IGRIS will observe your active Windows desktop to recognize UI controls, diagnose on-screen errors, locate buttons, and provide visual guidance to Gemini Live.
          </p>
          <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-3 text-[10px] text-cyan-300">
            <span className="font-bold flex items-center gap-1 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Active Session Authorization
            </span>
            Observation remains active throughout this session. You can stop or revoke desktop access at any time with one click.
          </div>

          {/* Monitor Selection */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold">Select Display Target:</label>
            <select
              value={selectedMonitor}
              onChange={(e) => setSelectedMonitor(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {monitors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.width}x{m.height}{m.isPrimary ? " - Primary" : ""})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400">
            ⚠️ {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={handleAuthorize}
            disabled={isAuthorizing}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg shadow-cyan-600/30 cursor-pointer flex items-center gap-2"
          >
            {isAuthorizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Authorize Observation
          </button>
        </div>
      </div>
    </div>
  );
};
