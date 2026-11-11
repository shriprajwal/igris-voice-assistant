import React, { useState, useEffect, useRef } from "react";
import { 
  Eye, 
  EyeOff, 
  Tv, 
  ShieldAlert, 
  RefreshCw, 
  Activity,
  HelpCircle
} from "lucide-react";
import { ScreenCapture } from "../vision/ScreenCapture";
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
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isCapturing = connectionState === "Connected" || connectionState === "Analyzing";
  const analyzing = connectionState === "Analyzing";

  // Bind the MediaStream to the local video element
  useEffect(() => {
    let active = true;

    const bindStream = async () => {
      if (isCapturing && videoRef.current) {
        const stream = ScreenCapture.getInstance().getVideoStream();
        if (stream) {
          if (videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
          }
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn("Screen video autoplay was prevented or paused:", e);
          }
        }
      } else if (!isCapturing && videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    bindStream();

    // Subscribe to ScreenCapture to re-bind if the stream toggles
    const unsubscribe = ScreenCapture.getInstance().subscribe((isActive) => {
      if (active && isActive) {
        bindStream();
      } else if (active && !isActive && videoRef.current) {
        videoRef.current.srcObject = null;
      }
    });

    return () => {
      active = false;
      unsubscribe();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isCapturing, connectionState]);

  // Sync session with VisionManager
  useEffect(() => {
    VisionManager.getInstance().setSession(session);
  }, [session]);

  useEffect(() => {
    // Subscribe to VisionManager's lifecycle state changes
    const unsubscribe = VisionManager.getInstance().subscribe((state) => {
      setConnectionState(state);
      if (state === "Disconnected") {
        setInsight(null);
        setCapturedFrame(null);
        setAutoRefresh(false);
      }
    });

    return () => {
      unsubscribe();
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);

  // Handle auto-refresh interval when capturing
  useEffect(() => {
    if (autoRefresh && isCapturing) {
      autoRefreshIntervalRef.current = setInterval(() => {
        handleAnalyze();
      }, 5000); // refresh layout metrics every 5 seconds
    } else {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh, isCapturing]);

  const handleStartCapture = async () => {
    setPermissionError(null);
    try {
      await VisionManager.getInstance().startVisionAssist();
      // Give a slight visual lag for authentic computer vision scanning
      setTimeout(() => {
        handleAnalyze();
      }, 800);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes("policy") || errMsg.includes("disallowed") || err?.name === "SecurityError") {
        setPermissionError("IFRAME_POLICY_BLOCKED");
      } else {
        setPermissionError(errMsg);
      }
    }
  };

  const handleStopCapture = () => {
    VisionManager.getInstance().stopVisionAssist();
    setInsight(null);
    capturedFrame && setCapturedFrame(null);
  };

  const handleAnalyze = async () => {
    if (!ScreenCapture.getInstance().getIsActive()) return;

    VisionManager.getInstance().setStatus("Analyzing");
    // Grab photo snapshot from local stream immediately for responsive UI
    const frame = ScreenCapture.getInstance().captureFrame();
    if (frame) {
      setCapturedFrame(frame);
    }

    try {
      const freshInsight = await VisionAnalyzer.getInstance().analyzeCurrentScreen();
      if (freshInsight) {
        setInsight(freshInsight);
      }
    } catch (e) {
      console.error(e);
    } finally {
      const active = ScreenCapture.getInstance().getIsActive();
      VisionManager.getInstance().setStatus(active ? "Connected" : "Disconnected");
    }
  };

  // Companion query buttons
  const handleQueryTest = async (query: string) => {
    if (!ScreenCapture.getInstance().getIsActive()) {
      StateManager.getInstance().addLog("Please start screen assistance first.", "info");
      return;
    }

    VisionManager.getInstance().setStatus("Analyzing");
    StateManager.getInstance().addLog(`Auditing screen for query: "${query}"...`, "info");
    
    const frame = ScreenCapture.getInstance().captureFrame();
    if (frame) {
      setCapturedFrame(frame);
    }

    try {
      const freshInsight = await VisionAnalyzer.getInstance().analyzeCurrentScreen(query);
      if (freshInsight) {
        setInsight(freshInsight);
        const guidance = VisionAnalyzer.getInstance().getVoiceCompanionGuidance(freshInsight, query);
        StateManager.getInstance().addLog(`[IGRIS Vision Assist]: ${guidance}`, "success");
        
        // Verbally state the analysis result to the active voice session if connected
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
    <div id="igris-vision-assistant-system-panel" className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-xl transition-all duration-500 hover:border-white/10">
      
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/5 flex items-center justify-center ${primaryAccentClass}`}>
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium tracking-wider uppercase text-white">
              Vision & Screen Assistance Core
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Real-Time Frame Scrubber, Spatial Layout OCR, & Companion Feed
            </p>
          </div>
        </div>

        {/* Live Active Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            connectionState === "Analyzing" 
              ? "bg-indigo-500 animate-pulse" 
              : connectionState === "Connected" 
                ? "bg-emerald-500 animate-pulse" 
                : "bg-slate-600"
          }`} />
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
            {connectionState === "Analyzing" 
              ? "Analyzing Screen" 
              : connectionState === "Connected" 
                ? "Connected Live" 
                : "Vision Offline"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: Visual Frame Sandbox Scanner (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="relative w-full aspect-video rounded-xl bg-black/60 border border-white/5 overflow-hidden flex flex-col items-center justify-center vision-panel-container">
            
            {/* Overlay grid lines for futuristic scanning feel */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

            {/* Real-time Video Stream Container */}
            <div className={`relative w-full h-full flex items-center justify-center transition-opacity duration-500 ${isCapturing ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none absolute inset-0"}`}>
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover filter brightness-95 contrast-105"
              />

              {/* CSS-Only Diagnostic HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none">
                
                {/* CRT Scanline and color aberration */}
                <div className="absolute inset-0 scanline opacity-25 mix-blend-overlay" />
                
                {/* Moving CRT scanning sweep */}
                <div className="absolute inset-x-0 h-[2px] bg-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.75)] animate-scan-line-sweep" />
                
                {/* Tech Corner Brackets */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-indigo-500/60 rounded-tl" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-indigo-500/60 rounded-tr" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-indigo-500/60 rounded-bl" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-indigo-500/60 rounded-br" />

                {/* Centered target/crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border border-indigo-500/15 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-indigo-500/40 rounded-full animate-ping" />
                  </div>
                  {/* Outer spinning HUD Reticle */}
                  <div className="absolute w-20 h-20 border border-dashed border-indigo-500/10 rounded-lg animate-spin-slow" />
                </div>

                {/* Left Side Metadata HUD */}
                <div className="absolute top-4 left-12 flex flex-col gap-0.5 font-mono text-[8px] text-indigo-300/60 tracking-wider">
                  <span className="flex items-center gap-1 font-bold text-indigo-400">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    LIVE_FEED // DSPL_01
                  </span>
                  <span>FPS: 30_STABLE</span>
                  <span>SCR_SCRUB: SECURE_LNK</span>
                </div>

                {/* Right Side Metadata HUD */}
                <div className="absolute top-4 right-12 flex flex-col items-end gap-0.5 font-mono text-[8px] text-indigo-300/60 tracking-wider">
                  <span className="text-rose-500/80 font-bold flex items-center gap-1 animate-pulse">
                    ● REC_LIVE
                  </span>
                  <span>ENGINE_LNK: CALM</span>
                  <span>ANOMALY_INDEX: {insight ? `${insight.layoutHealthScore}%` : "100%"}</span>
                </div>

                {/* Bottom Tech Grid/Framer */}
                <div className="absolute bottom-4 left-12 right-12 flex items-center justify-between font-mono text-[7px] text-indigo-400/40 uppercase tracking-widest">
                  <span>SECURE VISUAL STREAM PROXY</span>
                  <span>SHADOW_MODE_HUD_v4.2</span>
                </div>
                
              </div>

              {/* Draw scanner boxes over layout landmarks */}
              {insight && insight.detectedElements.map((el, i) => {
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
                        : "border-indigo-500/80 bg-indigo-500/5"
                    } rounded transition-all duration-300 pointer-events-none z-20`}
                  >
                    <span className={`absolute -top-4 left-0 text-[8px] font-mono px-1.5 py-0.5 rounded ${
                      el.type === "error_log" ? "bg-red-500 text-white" : "bg-indigo-600 text-white"
                    } uppercase tracking-wider font-bold whitespace-nowrap`}>
                      {el.label} ({(el.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                );
              })}

              {/* Pulsing Target Overlay */}
              <div className="absolute inset-0 border border-indigo-500/20 animate-pulse pointer-events-none z-10" />
            </div>

            {/* Offline/Waiting State */}
            {!isCapturing && (
              <div className="flex flex-col items-center gap-4 text-center px-4 max-w-sm z-10">
                <div className="p-4 rounded-full bg-white/[0.02] border border-white/5 text-slate-500">
                  <EyeOff className="w-12 h-12" />
                </div>
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-300 font-semibold">Awaiting Screen Attachment</h4>
                  <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase mt-2">
                    Start screen assistance to trigger display media prompts. Permission is strictly requested on-demand.
                  </p>
                </div>
                {permissionError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-mono text-red-400 uppercase leading-relaxed text-left">
                    {permissionError === "IFRAME_POLICY_BLOCKED" ? (
                      <span>
                        ⚠️ Browser Policy Block: Iframe security blocks screen share. Please click the <strong>Open in New Tab</strong> icon in the top-right corner to grant screen permission.
                      </span>
                    ) : (
                      <span>⚠️ {permissionError}</span>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={handleStartCapture}
                    className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/30"
                  >
                    Start Screen Assistance
                  </button>
                </div>
              </div>
            )}

            {/* Scanning Bar Animation */}
            {analyzing && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-lg shadow-indigo-500/50 animate-scan-line z-30 pointer-events-none" />
            )}
          </div>

          {/* Action buttons under the frame */}
          {isCapturing && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.01] border border-white/5 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 font-mono text-[10px] uppercase tracking-wider rounded-md cursor-pointer transition-all duration-200 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                  Grab Frame
                </button>

                <label className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 uppercase cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded bg-black border-white/20 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                  />
                  Auto Refresh (5s)
                </label>
              </div>

              <button
                onClick={handleStopCapture}
                className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 font-mono text-[10px] uppercase tracking-wider rounded-md cursor-pointer transition-all duration-200"
              >
                Disconnect Vision
              </button>
            </div>
          )}

        </div>

        {/* Right Hand: Vision Diagnostics & Diagnostics Log (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Security Compliance Rule Card */}
          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl text-[10px] font-mono text-slate-400 uppercase leading-relaxed">
            <span className="text-amber-400 font-bold flex items-center gap-1.5 mb-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Privacy & Frame Control Protocol
            </span>
            Screen sharing is strictly local, browser-authorized, and can be terminated instantly by clicking standard stop triggers.
          </div>

          {/* Diagnostics Display */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-4 flex-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Intelligence Telemetry & OCR Output
            </span>

            {insight ? (
              <div className="space-y-4">
                
                {/* Health Score Metabar */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div>
                    <span className="text-slate-500 text-[9px] font-mono uppercase block">Identified Active App:</span>
                    <span className="text-white text-xs font-mono font-semibold uppercase">{insight.primaryApp}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[9px] font-mono uppercase block">Layout Health:</span>
                    <span className={`text-xs font-mono font-bold ${
                      insight.layoutHealthScore > 85 ? "text-emerald-400" : "text-amber-400"
                    }`}>{insight.layoutHealthScore}%</span>
                  </div>
                </div>

                {/* Problems discovered */}
                <div className="space-y-3">
                  <div>
                    <span className="text-indigo-400 text-[9px] font-mono uppercase block font-bold">⚠️ Diagnosed Vision Anomalies:</span>
                    <p className="text-[11px] font-mono text-slate-300 leading-relaxed uppercase mt-1">
                      {insight.diagnosedIssue || "No layout issues detected by Gemini Vision."}
                    </p>
                  </div>

                  {insight.recommendedFix && (
                    <div>
                      <span className="text-emerald-400 text-[9px] font-mono uppercase block font-bold">💡 Recommended Action Fix:</span>
                      <p className="text-[11px] font-mono text-slate-300 leading-relaxed uppercase mt-1">
                        {insight.recommendedFix}
                      </p>
                    </div>
                  )}
                </div>

                {/* Companion Query Prompts Testing */}
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block mb-2 font-bold">Inquire IGRIS Companion:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleQueryTest("Find the error on my screen")}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] font-mono text-slate-300 uppercase tracking-wider text-left transition-all duration-200 cursor-pointer"
                    >
                      • Identify Error?
                    </button>
                    <button
                      onClick={() => handleQueryTest("Explain this code section")}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] font-mono text-slate-300 uppercase tracking-wider text-left transition-all duration-200 cursor-pointer"
                    >
                      • Explain Code?
                    </button>
                    <button
                      onClick={() => handleQueryTest("What is wrong here?")}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] font-mono text-slate-300 uppercase tracking-wider text-left transition-all duration-200 cursor-pointer"
                    >
                      • What is wrong?
                    </button>
                    <button
                      onClick={() => handleQueryTest("Show layout metrics")}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[9px] font-mono text-slate-300 uppercase tracking-wider text-left transition-all duration-200 cursor-pointer"
                    >
                      • Active Metrics?
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <HelpCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-[10px] font-mono uppercase leading-relaxed max-w-xs">
                  Connect display input and click "Grab Frame" or select an inquiry below to populate OCR structures.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
