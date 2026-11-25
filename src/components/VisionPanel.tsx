import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Eye, 
  EyeOff, 
  Tv, 
  ShieldAlert, 
  RefreshCw, 
  Activity,
  HelpCircle,
  Monitor,
  CheckCircle2,
  X
} from "lucide-react";
import { ScreenCapture, MonitorInfo } from "../vision/ScreenCapture";
import { VisionAnalyzer, VisionInsight } from "../vision/VisionAnalyzer";
import { VisionManager, VisionLifecycleState } from "../vision/VisionManager";
import { StateManager } from "../state/StateManager";
import { LiveSession } from "../live/LiveSession";

interface VisionPanelProps {
  primaryAccentClass: string;
  session: LiveSession | null;
}

export const VisionPanel: React.FC<VisionPanelProps> = ({ primaryAccentClass, session }) => {
  const [connectionState, setConnectionState] = useState<VisionLifecycleState>("Disconnected");
  const [insight, setInsight] = useState<VisionInsight | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<number>(0);
  const [dimensions, setDimensions] = useState<{ width: number; height: number; screenWidth: number; screenHeight: number; dpr: number }>({
    width: 0,
    height: 0,
    screenWidth: 0,
    screenHeight: 0,
    dpr: 1.0
  });
  const dimensionsRef = useRef(dimensions);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [fps, setFps] = useState(0);

  // Canvas ref for drawing live WebSocket frames
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsCounterRef = useRef<{ count: number; lastTs: number }>({ count: 0, lastTs: Date.now() });
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const pendingBlobRef = useRef<Blob | null>(null);
  const isDecodingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const lastDrawTsRef = useRef<number>(0);

  const isCapturing = connectionState === "Connected" || connectionState === "Analyzing";
  const analyzing = connectionState === "Analyzing";

  // ── Auto-connect on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const init = async () => {
      // Enumerate monitors
      const monList = await ScreenCapture.getInstance().listMonitors();
      if (active && monList.length > 0) setMonitors(monList);

      // Connect only if capture is already active (or user authorized)
      const st = await ScreenCapture.getInstance().checkStatus();
      if (active && st && st.isCapturing) {
        setSelectedMonitor(st.selectedMonitorId);
        ScreenCapture.getInstance().connect(st.selectedMonitorId);
      }
    };

    init();

    // Debounced, vsync-coalesced ImageBitmap renderer (prevents out-of-order draws & Blob URL churn)
    const scheduleDraw = () => {
      if (!active || rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(async (ts) => {
        rafIdRef.current = null;
        if (!active) return;

        // Cap UI preview paint cadence (~15 FPS / 66ms) to prevent QtWebEngine compositor flicker
        if (ts - lastDrawTsRef.current < 66) {
          if (pendingBlobRef.current) scheduleDraw();
          return;
        }

        if (isDecodingRef.current || !pendingBlobRef.current || !canvasRef.current) {
          if (pendingBlobRef.current) scheduleDraw();
          return;
        }

        const blob = pendingBlobRef.current;
        pendingBlobRef.current = null;
        isDecodingRef.current = true;

        try {
          const bitmap = await createImageBitmap(blob);
          if (!active || !canvasRef.current) {
            bitmap.close();
            return;
          }
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d", { alpha: false });
          if (ctx) {
            if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
            }
            ctx.drawImage(bitmap, 0, 0);
            lastDrawTsRef.current = performance.now();
          }
          bitmap.close();

          // Update live FPS counter once per second without spamming state
          fpsCounterRef.current.count++;
          const now = Date.now();
          if (now - fpsCounterRef.current.lastTs >= 1000) {
            setFps(fpsCounterRef.current.count);
            fpsCounterRef.current = { count: 0, lastTs: now };
          }

          // Update dimension metadata ONLY if dimensions actually changed
          const latestDims = ScreenCapture.getInstance().getDimensions();
          if (
            latestDims.width !== dimensionsRef.current.width ||
            latestDims.height !== dimensionsRef.current.height ||
            latestDims.screenWidth !== dimensionsRef.current.screenWidth
          ) {
            dimensionsRef.current = latestDims;
            setDimensions(latestDims);
          }
        } catch {
          // Ignore transient decode errors on interrupted frames
        } finally {
          isDecodingRef.current = false;
          if (active && pendingBlobRef.current) {
            scheduleDraw();
          }
        }
      });
    };

    const unsubFrames = ScreenCapture.getInstance().onBlobFrame((blob: Blob) => {
      if (!active) return;
      // Coalesce: always keep only the newest unrendered frame
      pendingBlobRef.current = blob;
      scheduleDraw();
    });

    return () => {
      active = false;
      unsubFrames();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      pendingBlobRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync session with VisionManager ───────────────────────────────────────
  useEffect(() => {
    VisionManager.getInstance().setSession(session);
  }, [session]);

  // ── Subscribe to VisionManager lifecycle state ─────────────────────────────
  useEffect(() => {
    const unsubscribe = VisionManager.getInstance().subscribe((state) => {
      setConnectionState(state);
      if (state === "Disconnected") {
        setInsight(null);
        setAutoRefresh(false);
        setFps(0);
        // Clear canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    });

    // Also track ScreenCapture active state directly for immediate UI updates
    const unsubCapture = ScreenCapture.getInstance().subscribe((isActive) => {
      if (isActive) {
        setConnectionState("Connected");
      } else {
        setConnectionState("Disconnected");
      }
    });

    return () => {
      unsubscribe();
      unsubCapture();
    };
  }, []);

  // ── Auto-refresh analysis ─────────────────────────────────────────────────
  useEffect(() => {
    if (autoRefresh && isCapturing) {
      autoRefreshIntervalRef.current = setInterval(() => {
        handleAnalyze();
      }, 5000);
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }
    return () => {
      if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, isCapturing]);

  // ── Monitor change ─────────────────────────────────────────────────────────
  const handleMonitorChange = async (newMonId: number) => {
    setSelectedMonitor(newMonId);
    // Reconnect WebSocket with new monitor
    ScreenCapture.getInstance().disconnect();
    setTimeout(() => ScreenCapture.getInstance().connect(newMonId), 300);
    if (isCapturing) {
      await VisionManager.getInstance().startVisionAssist(newMonId);
    }
  };

  // ── Start screen observation (manual button) ───────────────────────────────
  const handleStartObservation = useCallback(async () => {
    setPermissionError(null);
    try {
      await VisionManager.getInstance().startVisionAssist(selectedMonitor);
    } catch (err: any) {
      setPermissionError(err?.message || "Failed to start screen capture.");
    }
  }, [selectedMonitor]);

  // ── Stop observation ───────────────────────────────────────────────────────
  const handleStopCapture = () => {
    VisionManager.getInstance().stopVisionAssist();
    setInsight(null);
  };

  // ── Grab a fresh frame and analyze ────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!ScreenCapture.getInstance().getIsActive() || isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;

    VisionManager.getInstance().setStatus("Analyzing");
    try {
      const freshInsight = await VisionAnalyzer.getInstance().analyzeCurrentScreen();
      if (freshInsight) setInsight(freshInsight);
    } catch (e) {
      console.error(e);
    } finally {
      isAnalyzingRef.current = false;
      const active = ScreenCapture.getInstance().getIsActive();
      VisionManager.getInstance().setStatus(active ? "Connected" : "Disconnected");
    }
  };

  // ── Query helper ───────────────────────────────────────────────────────────
  const handleQueryTest = async (query: string) => {
    if (!ScreenCapture.getInstance().getIsActive()) {
      StateManager.getInstance().addLog("Screen observation not active. Starting now...", "info");
      await handleStartObservation();
      return;
    }

    VisionManager.getInstance().setStatus("Analyzing");
    StateManager.getInstance().addLog(`Auditing desktop for query: "${query}"...`, "info");

    try {
      const freshInsight = await VisionAnalyzer.getInstance().analyzeCurrentScreen(query);
      if (freshInsight) {
        setInsight(freshInsight);
        const guidance = VisionAnalyzer.getInstance().getVoiceCompanionGuidance(freshInsight, query);
        StateManager.getInstance().addLog(`[IGRIS Vision Assist]: ${guidance}`, "success");
        if (session) {
          session.sendText(`Provide verbal guidance on this visual query: "${query}". Visual findings: ${freshInsight.diagnosedIssue}. ${freshInsight.recommendedFix}`);
        }
      } else {
        StateManager.getInstance().addLog("Visual system failed to gather frame diagnostics.", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      const active = ScreenCapture.getInstance().getIsActive();
      VisionManager.getInstance().setStatus(active ? "Connected" : "Disconnected");
    }
  };

  return (
    <div id="igris-vision-assistant-system-panel" className="w-full bg-slate-950/85 border border-white/5 rounded-2xl p-5 md:p-6 transition-colors duration-300 hover:border-white/10 relative">

      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/5 flex items-center justify-center ${primaryAccentClass}`}>
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-wider uppercase text-white">
              Native Windows Screen Observation Core
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Hardware-Accelerated Frame Capture & Gemini Live Vision Pipeline
            </p>
          </div>
        </div>

        {/* Live Active Status Indicator & Monitor Selector */}
        <div className="flex items-center gap-3">
          {monitors.length > 1 && (
            <select
              value={selectedMonitor}
              onChange={(e) => handleMonitorChange(Number(e.target.value))}
              className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-slate-300 uppercase cursor-pointer"
            >
              {monitors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${
              analyzing 
                ? "bg-indigo-500 animate-pulse" 
                : isCapturing 
                  ? "bg-emerald-500 animate-pulse" 
                  : "bg-slate-600"
            }`} />
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
              {analyzing 
                ? "Analyzing Desktop" 
                : isCapturing 
                  ? `Observing Windows Desktop ${fps > 0 ? `· ${fps} FPS` : ""}` 
                  : "Observation Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Canvas Live Stream (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="relative w-full aspect-video rounded-xl bg-black/60 border border-white/5 overflow-hidden flex flex-col items-center justify-center vision-panel-container">
            
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

            {/* Live canvas stream — isolated GPU layer, no CSS filter/blend re-composite */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-contain select-none ${isCapturing ? "opacity-100" : "opacity-0"}`}
              style={{ imageRendering: "auto", transform: "translateZ(0)", willChange: "contents" }}
            />

            {/* Diagnostic HUD Overlay — only when capturing */}
            {isCapturing && (
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none">
                
                {/* CRT Scanline (no mix-blend-overlay to prevent canvas re-composite flicker) */}
                <div className="absolute inset-0 scanline opacity-10" />
                
                {/* Moving CRT scan sweep */}
                <div className="absolute inset-x-0 h-[2px] bg-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.75)] animate-scan-line-sweep" />
                
                {/* Corner brackets */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-500/60 rounded-tl" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-500/60 rounded-tr" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-500/60 rounded-bl" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-500/60 rounded-br" />

                {/* Left HUD */}
                <div className="absolute top-4 left-12 flex flex-col gap-0.5 font-mono text-[8px] text-cyan-300/80 tracking-wider">
                  <span className="flex items-center gap-1 font-bold text-cyan-400">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    NATIVE_WIN_FEED // {monitors[selectedMonitor]?.name || "DISPLAY_01"}
                  </span>
                  <span>RES: {dimensions.screenWidth || 2560}x{dimensions.screenHeight || 1600} ({dimensions.dpr}x DPI)</span>
                  <span>STREAM: {fps > 0 ? `${fps} FPS` : "LIVE"} CONTINUOUS</span>
                </div>

                {/* Right HUD */}
                <div className="absolute top-4 right-12 flex flex-col items-end gap-0.5 font-mono text-[8px] text-cyan-300/80 tracking-wider">
                  <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                    ● ACTIVE_OBSERVATION
                  </span>
                  <span>GEMINI_LINK: SYNCED</span>
                  <span>HEALTH_INDEX: {insight ? `${insight.layoutHealthScore}%` : "100%"}</span>
                </div>

                {/* Bottom HUD */}
                <div className="absolute bottom-4 left-12 right-12 flex items-center justify-between font-mono text-[7px] text-cyan-400/50 uppercase tracking-widest">
                  <span>WINDOWS DESKTOP OBSERVATION ACTIVE</span>
                  <span>AUTO_COORDINATE_MAPPING_v2.0</span>
                </div>
              </div>
            )}

            {/* Element overlay boxes from insight */}
            {isCapturing && insight && insight.detectedElements.map((el, i) => {
              const style: React.CSSProperties = {
                position: "absolute",
                left: `${el.coordinates.x}%`,
                top: `${el.coordinates.y}%`,
                width: `${el.coordinates.w}%`,
                height: `${el.coordinates.h}%`,
              };
              return (
                <div 
                  key={i} 
                  style={style} 
                  className={`border-2 ${
                    el.type === "error_log" 
                      ? "border-red-500/80 bg-red-500/10" 
                      : "border-cyan-500/80 bg-cyan-500/10"
                  } rounded transition-all duration-300 pointer-events-none z-20`}
                >
                  <span className={`absolute -top-4 left-0 text-[8px] font-mono px-1.5 py-0.5 rounded ${
                    el.type === "error_log" ? "bg-red-500 text-white" : "bg-cyan-600 text-white"
                  } uppercase tracking-wider font-bold whitespace-nowrap`}>
                    {el.label} ({(el.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              );
            })}

            {/* Offline / Standby State */}
            {!isCapturing && (
              <div className="flex flex-col items-center gap-4 text-center px-4 max-w-sm z-10">
                <div className="p-4 rounded-full bg-white/[0.02] border border-white/5 text-slate-500">
                  <EyeOff className="w-12 h-12" />
                </div>
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-300 font-semibold">Desktop Observation Standby</h4>
                  <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase mt-2">
                    Starting screen capture... Click below if it doesn't start automatically.
                  </p>
                </div>
                {permissionError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-mono text-red-400 uppercase leading-relaxed text-left">
                    <span>⚠️ {permissionError}</span>
                  </div>
                )}
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={handleStartObservation}
                    className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Start Desktop Observation
                  </button>
                </div>
              </div>
            )}

            {/* Analysis scanning bar */}
            {analyzing && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-500/50 animate-scan-line z-30 pointer-events-none" />
            )}

            {/* Static subtle border (no animate-pulse over live canvas) */}
            {isCapturing && (
              <div className="absolute inset-0 border border-cyan-500/20 pointer-events-none z-10" />
            )}
          </div>

          {/* Action buttons under frame */}
          {isCapturing && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.01] border border-white/5 p-3 rounded-xl font-mono">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="px-3.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300 text-[10px] uppercase tracking-wider rounded-md cursor-pointer transition-all duration-200 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                  Analyze Frame
                </button>

                <label className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded bg-black border-white/20 text-cyan-600 focus:ring-0 focus:ring-offset-0"
                  />
                  Auto Analyze (5s)
                </label>
              </div>

              <button
                onClick={handleStopCapture}
                className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 text-[10px] uppercase tracking-wider rounded-md cursor-pointer transition-all duration-200"
              >
                Stop Observation
              </button>
            </div>
          )}

        </div>

        {/* Right: Vision Diagnostics (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4 font-mono">
          
          {/* Security Card */}
          <div className="bg-cyan-500/5 border border-cyan-500/15 p-4 rounded-xl text-[10px] text-slate-400 uppercase leading-relaxed">
            <span className="text-cyan-400 font-bold flex items-center gap-1.5 mb-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Native Security & Privacy Protocol
            </span>
            Desktop observation runs entirely locally via native Windows APIs. Screen access can be terminated immediately anytime.
          </div>

          {/* Diagnostics Display */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-4 flex-1">
            <span className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Intelligence Telemetry & OCR Output
            </span>

            {insight ? (
              <div className="space-y-4">
                
                {/* Health Score */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div>
                    <span className="text-slate-500 text-[9px] uppercase block">Identified Active App:</span>
                    <span className="text-white text-xs font-semibold uppercase">{insight.primaryApp}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[9px] uppercase block">Layout Health:</span>
                    <span className={`text-xs font-bold ${
                      insight.layoutHealthScore > 85 ? "text-emerald-400" : "text-amber-400"
                    }`}>{insight.layoutHealthScore}%</span>
                  </div>
                </div>

                {/* Problems */}
                <div className="space-y-3">
                  <div>
                    <span className="text-cyan-400 text-[9px] uppercase block font-bold">⚠️ Diagnosed Vision Findings:</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed uppercase mt-1">
                      {insight.diagnosedIssue || "No anomalies detected on screen."}
                    </p>
                  </div>

                  {insight.recommendedFix && (
                    <div>
                      <span className="text-emerald-400 text-[9px] uppercase block font-bold">💡 Recommended Action:</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed uppercase mt-1">
                        {insight.recommendedFix}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick query prompts */}
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase block mb-2 font-bold">Inquire IGRIS Companion:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleQueryTest("What application is open and what is on screen?")}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] text-slate-300 uppercase tracking-wider text-left transition-all duration-200 cursor-pointer"
                    >
                      • What is on screen?
                    </button>
                    <button
                      onClick={() => handleQueryTest("Find the error on my screen")}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] text-slate-300 uppercase tracking-wider text-left transition-all duration-200 cursor-pointer"
                    >
                      • Identify Error?
                    </button>
                    <button
                      onClick={() => handleQueryTest("Where is the Save button?")}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] text-slate-300 uppercase tracking-wider text-left transition-all duration-200 cursor-pointer"
                    >
                      • Locate Button?
                    </button>
                    <button
                      onClick={() => handleQueryTest("Explain visible content")}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] text-slate-300 uppercase tracking-wider text-left transition-all duration-200 cursor-pointer"
                    >
                      • Explain Content?
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <HelpCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-[10px] uppercase leading-relaxed max-w-xs">
                  {isCapturing 
                    ? 'Click "Analyze Frame" or use the query shortcuts to inspect screen content.'
                    : 'Screen observation will start automatically. If it does not start, click the button in the preview area.'}
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
