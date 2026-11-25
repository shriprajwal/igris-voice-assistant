/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Monitor, 
  Terminal, 
  Shield, 
  Play, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Volume2, 
  VolumeX, 
  HardDrive, 
  Folder, 
  Globe, 
  Camera, 
  Lock, 
  Cpu, 
  Clock, 
  ChevronRight,
  ShieldAlert,
  Radio
} from "lucide-react";
import { StateManager } from "../state/StateManager";
import { LiveSession } from "../live/LiveSession";
import { DesktopStatus, ActionLogEntry, DesktopAction } from "../desktop/types";

interface DesktopControlPanelProps {
  primaryAccentClass?: string;
  session: LiveSession | null;
}

export function DesktopControlPanel({ primaryAccentClass = "text-cyan-400", session }: DesktopControlPanelProps) {
  const [appState, setAppState] = useState(StateManager.getInstance().getState());

  useEffect(() => {
    const unsub = StateManager.getInstance().subscribe((s) => {
      setAppState(s);
    });
    return () => unsub();
  }, []);

  const desktopStatus: DesktopStatus = appState.desktopStatus || {
    state: "idle",
    activeApp: "Desktop",
    currentTask: null,
    currentStepIndex: 0,
    totalSteps: 0,
    lastAction: null,
    logEntries: [],
    pendingPermission: null
  };

  const isExecuting = desktopStatus.state === "executing" || desktopStatus.state === "planning" || desktopStatus.state === "observing" || desktopStatus.state === "verifying";

  const handleStop = () => {
    if (session) {
      session.stopDesktopTask();
    }
  };

  const handlePermission = (approved: boolean) => {
    if (session && desktopStatus.pendingPermission) {
      session.sendPermissionResponse(desktopStatus.pendingPermission.id, approved);
    }
  };

  const triggerQuickAction = (type: string, params: Record<string, any> = {}) => {
    if (session) {
      const actionObj: DesktopAction = {
        id: `manual_${Date.now()}`,
        type: type as any,
        params,
        description: `Manual trigger: ${type}`
      };
      session.sendDesktopAction(actionObj);
    }
  };

  const getStatusBadge = () => {
    switch (desktopStatus.state) {
      case "executing":
        return { text: "EXECUTING ACTION", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse" };
      case "observing":
        return { text: "OBSERVING SCREEN", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse" };
      case "verifying":
        return { text: "VERIFYING RESULT", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
      case "planning":
        return { text: "PLANNING TASK", color: "bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse" };
      case "awaiting_permission":
        return { text: "AWAITING AUTHORIZATION", color: "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-bounce" };
      case "completed":
        return { text: "OPERATION COMPLETE", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      case "stopped":
        return { text: "TASK HALTED", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" };
      case "error":
        return { text: "OPERATION RECOVERY", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" };
      default:
        return { text: "SYSTEM STANDBY", color: "bg-white/5 text-slate-400 border-white/10" };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="relative w-full rounded-2xl bg-slate-950/70 border border-white/10 backdrop-blur-xl p-6 overflow-hidden flex flex-col gap-6 shadow-2xl">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header telemetry */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-400 shadow-inner">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-white font-mono">
                DESKTOP CONTROL ENGINE
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v2.0 Native
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Direct Windows Automation Matrix • Voice Controlled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status pill */}
          <span className={`text-[10px] px-3 py-1 rounded-full font-mono font-medium border flex items-center gap-1.5 ${badge.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {badge.text}
          </span>

          {/* Emergency Stop Button */}
          <button
            onClick={handleStop}
            disabled={!isExecuting && desktopStatus.state !== "awaiting_permission"}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
              isExecuting || desktopStatus.state === "awaiting_permission"
                ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-950/50 animate-pulse"
                : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
            }`}
            title="Immediate Task Cancellation"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            STOP
          </button>
        </div>
      </div>

      {/* Active Task & Window Telemetry Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Active Application Box */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="uppercase tracking-wider">Active Foreground Window</span>
            <span className="flex items-center gap-1 text-cyan-400">
              <Radio className="w-3 h-3 animate-pulse" /> Live Focus
            </span>
          </div>
          <div className="text-sm font-mono text-white font-semibold truncate bg-black/30 p-2.5 rounded-lg border border-white/5">
            {desktopStatus.activeApp || "Desktop / Explorer"}
          </div>
        </div>

        {/* Current Task Box */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="uppercase tracking-wider">Active Directive</span>
            {desktopStatus.totalSteps > 0 && (
              <span className="text-cyan-400 font-mono text-[10px]">
                Step {desktopStatus.currentStepIndex} of {desktopStatus.totalSteps}
              </span>
            )}
          </div>
          <div className="text-sm font-mono text-white font-medium truncate bg-black/30 p-2.5 rounded-lg border border-white/5">
            {desktopStatus.currentTask || "Standing by for Monarch's voice directive..."}
          </div>
        </div>
      </div>

      {/* Tactical Quick Access Controls */}
      <div className="relative z-10 flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Direct Quick Commands
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          
          <button
            onClick={() => triggerQuickAction("OPEN_APPLICATION", { appName: "chrome" })}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer group"
          >
            <Globe className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono">Open Chrome</span>
          </button>

          <button
            onClick={() => triggerQuickAction("NAVIGATE_FOLDER", { folder: "downloads" })}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer group"
          >
            <Folder className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono">Downloads</span>
          </button>

          <button
            onClick={() => triggerQuickAction("SCREEN_ANALYSIS")}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer group"
          >
            <Camera className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono">Screen Snapshot</span>
          </button>

          <button
            onClick={() => triggerQuickAction("SYSTEM_INFO")}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer group"
          >
            <HardDrive className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono">Disk & System</span>
          </button>

          <button
            onClick={() => triggerQuickAction("SET_VOLUME", { direction: "up", steps: 3 })}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer group"
          >
            <Volume2 className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono">Volume Up</span>
          </button>

          <button
            onClick={() => triggerQuickAction("MUTE_VOLUME")}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer group"
          >
            <VolumeX className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono">Mute / Unmute</span>
          </button>
        </div>
      </div>

      {/* Real-time Action Activity Stream */}
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2">
          <span>Action Execution Stream</span>
          <span>{desktopStatus.logEntries.length} logged events</span>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
          {desktopStatus.logEntries.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-slate-500 bg-white/[0.01] rounded-xl border border-white/5">
              Awaiting native directives. Speak commands to IGRIS: "Open Chrome", "Search tutorials", "Scroll down", etc.
            </div>
          ) : (
            desktopStatus.logEntries.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start gap-2.5 p-2 rounded-lg bg-black/25 border border-white/5 font-mono text-[11px]"
              >
                {/* Status icon */}
                <div className="mt-0.5">
                  {log.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {log.status === "failed" && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  {log.status === "running" && <Play className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
                  {log.status === "pending" && <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-white/90">{log.action}</span>
                  <span className="text-slate-400 truncate flex-1">{log.details}</span>
                  <span className="text-[9px] text-white/30 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Permission Confirmation Modal */}
      <AnimatePresence>
        {desktopStatus.pendingPermission && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-yellow-500/40 shadow-2xl flex flex-col gap-4 text-white font-mono">
              <div className="flex items-center gap-3 text-yellow-400">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
                <h3 className="text-sm font-semibold tracking-wider uppercase">
                  Security Authorization Required
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {desktopStatus.pendingPermission.description}
              </p>

              <div className="text-[10px] text-slate-400 bg-white/5 p-2.5 rounded-lg border border-white/10">
                Action: <span className="text-yellow-400">{desktopStatus.pendingPermission.action}</span> • Risk: <span className="uppercase text-rose-400">{desktopStatus.pendingPermission.riskLevel}</span>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => handlePermission(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10 cursor-pointer"
                >
                  Deny
                </button>
                <button
                  onClick={() => handlePermission(true)}
                  className="px-4 py-2 rounded-xl text-xs font-mono bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 cursor-pointer shadow-lg shadow-yellow-950/50 font-semibold"
                >
                  Authorize Execution
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
