/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mic, 
  MicOff, 
  Cpu, 
  ExternalLink, 
  Power, 
  Terminal, 
  ShieldAlert, 
  Info,
  Sliders,
  Zap,
  Edit3,
  Check,
  X,
  RotateCcw
} from "lucide-react";
import { LiveSession } from "./live/LiveSession";
import { ToolManager } from "./tools/ToolManager";
import WaveformCanvas from "./components/WaveformCanvas";
import MemoryPanel from "./components/MemoryPanel";
import { StateManager, SessionState, LogEntry, AIMode } from "./state/StateManager";
import { useTheme } from "./themes/ThemeContext";
import { ThemeManager } from "./themes/ThemeManager";
import { VisionPanel } from "./components/VisionPanel";
import { VisionManager } from "./vision/VisionManager";
import { getAuthorizedUser, saveAuthorizedUser } from "./memory/AuthorizedUser";
import { EmotionManager } from "./emotion/EmotionManager";
import { CoreSoundEffects } from "./audio/CoreSoundEffects";
import { VoiceManager } from "./voice/VoiceManager";
import { BinaryMatrixRain } from "./components/BinaryMatrixRain";
import { StarfieldBackground } from "./components/StarfieldBackground";
import { ReasoningManager } from "./intelligence/ReasoningManager";
import { LearningManager } from "./learning/LearningManager";
import { PersonalityEngine } from "./intelligence/PersonalityEngine";
import { ContextManager } from "./intelligence/ContextManager";

export default function App() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"memory" | "vision">("memory");
  const [showBootFlash, setShowBootFlash] = useState(false);
  const [authorizedUser, setAuthorizedUserState] = useState<string>("Monarch");
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editingUserName, setEditingUserName] = useState("");

  useEffect(() => {
    const initUser = async () => {
      const user = await getAuthorizedUser();
      setAuthorizedUserState(user);
    };
    initUser();
    
    // Kick-start advanced cognitive intelligence and self-evolution systems
    ReasoningManager.getInstance();
    LearningManager.getInstance();
  }, []);
  
  // Subscribe to central state manager
  const [appState, setAppState] = useState(StateManager.getInstance().getState());
  const [currentEmotion, setCurrentEmotion] = useState(() => EmotionManager.getInstance().getEmotion());

  // Dynamic Threat Assessment & Operational Integrity values for Shadow Mode
  const [tacticalMetrics, setTacticalMetrics] = useState({
    threatLevel: 52.4,
    operationalIntegrity: 98.6,
  });

  useEffect(() => {
    const unsubState = StateManager.getInstance().subscribe((newState) => {
      setAppState(newState);
    });
    const unsubEmotion = EmotionManager.getInstance().subscribe((newEmotion) => {
      setCurrentEmotion(newEmotion);
    });
    return () => {
      unsubState();
      unsubEmotion();
    };
  }, []);

  // Sync session with VisionManager at the root level so voice triggers work seamlessly regardless of selected tab
  useEffect(() => {
    VisionManager.getInstance().setSession(session);
  }, [session]);

  const { state, isMuted, theme, transcription, logs, activeEffect, errorMessage, voiceMode, shadowAuthStatus = "idle" } = appState;

  useEffect(() => {
    if (voiceMode !== "shadow") return;

    const interval = setInterval(() => {
      // Base values
      let threat = 45.0;
      let integrity = 99.2;

      // Adjust based on active connection state
      if (state === "listening") {
        threat += 8.3;
        integrity -= 0.5;
      } else if (state === "speaking") {
        threat += 12.7;
        integrity -= 0.8;
      }

      // Adjust based on active effects
      if (activeEffect === "overload_core") {
        threat += 41.5;
        integrity -= 64.8;
      } else if (activeEffect === "matrix_glitch") {
        threat += 22.1;
        integrity -= 18.3;
      } else if (activeEffect === "calibrate_sensors") {
        threat -= 15.4;
        integrity += 0.5;
      }

      // Adjust based on mute state
      if (isMuted) {
        threat -= 10.5;
      }

      // Adjust based on error
      if (errorMessage) {
        threat += 25.0;
        integrity -= 20.0;
      }

      // Adjust based on logs count
      const logImpact = Math.min(10, logs.length * 0.4);
      threat += logImpact;

      // Introduce dynamic micro-fluctuations (simulating live scanning)
      const fluctuation = (Math.sin(Date.now() / 2000) * 1.8);
      threat += fluctuation;
      integrity += (Math.cos(Date.now() / 3000) * 0.3);

      // Clamp ranges
      threat = Math.max(5.0, Math.min(99.9, threat));
      integrity = Math.max(10.0, Math.min(100.0, integrity));

      setTacticalMetrics({
        threatLevel: parseFloat(threat.toFixed(1)),
        operationalIntegrity: parseFloat(integrity.toFixed(1)),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [voiceMode, state, activeEffect, isMuted, errorMessage, logs.length]);

  // Sound effects on state transitions
  const prevStateRef = useRef(state);
  const prevMutedRef = useRef(isMuted);

  useEffect(() => {
    const prev = prevStateRef.current;
    if (prev !== state) {
      const sfx = CoreSoundEffects.getInstance();
      if (state === "connecting") {
        sfx.playConnect();
        setShowBootFlash(true);
        const timer = setTimeout(() => setShowBootFlash(false), 1200);
        return () => clearTimeout(timer);
      } else if (state === "listening" && prev !== "speaking") {
        sfx.playActivation();
      } else if (state === "speaking") {
        sfx.playSpeakingOnset();
      } else if (state === "disconnected") {
        sfx.playDisconnect();
      }
      prevStateRef.current = state;
    }
  }, [state]);

  useEffect(() => {
    const prevMuted = prevMutedRef.current;
    if (prevMuted !== isMuted) {
      const sfx = CoreSoundEffects.getInstance();
      if (isMuted) {
        sfx.playMute();
      } else {
        sfx.playUnmute();
      }
      prevMutedRef.current = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (state === "disconnected") {
      setSessionDuration(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setSessionDuration(elapsedSeconds);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [state === "disconnected"]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleResetSession = async () => {
    addLog("Initiating core session reset protocol...", "info");
    setSessionDuration(0);

    // Disconnect current session if active
    if (sessionRef.current || session) {
      try {
        session?.disconnect();
        sessionRef.current?.disconnect();
      } catch (err) {
        console.error("Error during session disconnect on reset:", err);
      }
      setSession(null);
      sessionRef.current = null;
    }

    // Explicitly update StateManager
    StateManager.getInstance().update({ state: "disconnected", transcription: null, errorMessage: null });

    // Restart connection immediately with a tiny delay
    setTimeout(async () => {
      StateManager.getInstance().update({ errorMessage: null });
      StateManager.getInstance().update({ 
        transcription: { text: `IGRIS core restarted. Ready for command, ${authorizedUser}.`, isUser: false } 
      });

      const callbacks = {
        onStateChange: (newState: SessionState) => {
          StateManager.getInstance().update({ state: newState });
        },
        onTranscription: (text: string, isUser: boolean) => {
          handleVoiceTranscription(text, isUser);
        },
        onToolCall: (name: string, args: any) => {
          addLog(`IGRIS requested local sub-routine: ${name}`, "info");
        },
        onLog: (text: string, type: LogEntry["type"]) => {
          addLog(text, type);
        },
        onError: (err: string) => {
          StateManager.getInstance().update({ errorMessage: err });
          addLog(`SYSTEM FAILURE: ${err}`, "error");
        },
        onAudioInputLevel: (level: number) => {
          if (audioLevelRingRef.current) {
            const scale = 1 + (level / 100) * 0.35;
            const opacity = level > 2 ? 0.3 + (level / 100) * 0.7 : 0;
            audioLevelRingRef.current.style.transform = `scale(${scale})`;
            audioLevelRingRef.current.style.opacity = `${opacity}`;
          }
          if (audioLevelPulseRef.current) {
            const scale = 1 + (level / 100) * 0.8;
            const opacity = level > 2 ? 0.15 + (level / 100) * 0.65 : 0;
            audioLevelPulseRef.current.style.transform = `scale(${scale})`;
            audioLevelPulseRef.current.style.opacity = `${opacity}`;
          }
        }
      };

      const newSession = new LiveSession(toolManagerRef.current, callbacks);
      setSession(newSession);
      sessionRef.current = newSession;
      newSession.setMute(isMuted);

      try {
        await newSession.connect();
        addLog(`System re-connected to IGRIS service successfully, ${authorizedUser}.`, "success");
      } catch (e: any) {
        addLog(`Failed to re-connect to core service: ${e.message}`, "error");
      }
    }, 300);
  };

  const toolManagerRef = useRef<ToolManager>(new ToolManager());
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const audioLevelRingRef = useRef<HTMLDivElement | null>(null);
  const audioLevelPulseRef = useRef<HTMLDivElement | null>(null);

  const { activeTheme, setTheme: changeTheme, availableThemes } = useTheme();
  const changeThemeRef = useRef(changeTheme);
  const prevThemeRef = useRef<string>("cyber");

  useEffect(() => {
    changeThemeRef.current = changeTheme;
  }, [changeTheme]);

  const getThemeBg = () => activeTheme.background;
  const getSystemLabelColor = () => activeTheme.primaryAccent;
  const getVersionColor = () => activeTheme.primaryAccent;
  const getBadgeActiveClasses = () => `border-current bg-white/5 ${activeTheme.primaryAccent}`;
  const getMetricValueColor = () => activeTheme.primaryAccent;
  const getTelemetryLogBadgeGlow = () => `bg-current shadow-[0_0_10px_currentColor] ${activeTheme.primaryAccent}`;
  const getLogSuccessColor = () => activeTheme.primaryAccent;

  const setTheme = (newTheme: string) => {
    changeTheme(newTheme);
  };

  // Helper to add logs
  const addLog = (text: string, type: LogEntry["type"] = "info") => {
    StateManager.getInstance().addLog(text, type);
  };

  // Register local tool behaviors
  useEffect(() => {
    const tm = toolManagerRef.current;

    // Extend openWebsite to log visually
    const originalOpenWebsite = tm["handlers"]["openWebsite"];
    tm.register("openWebsite", async (name, args) => {
      addLog(`Executing openWebsite URL: ${args.url}`, "system");
      const res = await originalOpenWebsite(name, args);
      addLog(res.message, res.success ? "success" : "error");
      return res;
    });

    // Register triggerSystemAction
    tm.register("triggerSystemAction", async (_, args) => {
      const { action } = args;
      addLog(`System core action authorized: ${action.toUpperCase()}`, "system");
      StateManager.getInstance().update({ activeEffect: action });

      // Clear the overlay/glitch effect after 5 seconds
      setTimeout(() => {
        StateManager.getInstance().update({ activeEffect: null });
      }, 5000);

      return {
        success: true,
        triggeredAction: action,
        message: `System action '${action}' successfully updated physical display matrix.`
      };
    });

    // Register setMicrophoneMute tool (called by Gemini voice or text commands)
    tm.register("setMicrophoneMute", async (_, args) => {
      const { muted } = args;
      addLog(`Mute protocol authorized via voice: ${muted ? "MUTE" : "UNMUTE"}`, "system");
      
      StateManager.getInstance().update({ isMuted: muted });
      if (sessionRef.current) {
        sessionRef.current.setMute(muted);
      }
      
      return {
        success: true,
        muted,
        message: `${authorizedUser}'s microphone is now successfully ${muted ? "muted" : "unmuted"}.`
      };
    });

    // Register setSystemTheme tool (called by Gemini voice or text commands)
    tm.register("setSystemTheme", async (_, args) => {
      const { theme: targetTheme } = args;
      const manager = ThemeManager.getInstance();
      const resolvedId = manager.resolveThemeId(targetTheme);

      if (resolvedId) {
        addLog(`System theme calibration authorized via voice: ${targetTheme.toUpperCase()}`, "system");
        changeThemeRef.current(resolvedId);
        
        const currentActive = manager.getTheme(resolvedId === "random" ? "shadow" : resolvedId);
        const name = currentActive ? currentActive.name : targetTheme;

        return {
          success: true,
          theme: resolvedId,
          message: `System theme adjusted to ${name} successfully, ${authorizedUser}.`
        };
      } else {
        return {
          success: false,
          message: `Unsupported theme alignment requested: ${targetTheme}. Available settings are: shadow, cyber, crimson, emerald, purple, white, gold, and neon.`
        };
      }
    });

    // Register setVoiceMode tool (called by Gemini voice or text commands)
    tm.register("setVoiceMode", async (_, args) => {
      const { mode } = args;
      if (mode === "shadow" || mode === "friendly" || mode === "system") {
        addLog(`System authorized voice mode transition: ${mode.toUpperCase()}`, "system");
        triggerModeTransition(mode);
        return {
          success: true,
          mode: mode,
          message: `IGRIS voice profile transitioned to ${mode.toUpperCase()} Mode successfully, ${authorizedUser}.`
        };
      } else {
        return {
          success: false,
          message: `Unsupported voice mode alignment requested: ${mode}.`
        };
      }
    });

    // Register setShadowAuthState tool (called by Gemini voice or text commands to show auth status)
    tm.register("setShadowAuthState", async (_, args) => {
      const { status } = args;
      if (status === "idle" || status === "pending" || status === "success" || status === "failed") {
        if (status === "pending") {
          addLog(`System authorization protocol engaged: Provide security code, ${authorizedUser}.`, "warning");
        } else if (status === "success") {
          addLog("System authorization protocol verified: Shadow protocol initialized.", "success");
        } else if (status === "failed") {
          addLog("System authorization protocol failed: Access denied.", "error");
        }
        StateManager.getInstance().update({ shadowAuthStatus: status });
        return {
          success: true,
          message: "Security state synchronized successfully"
        };
      } else {
        return {
          success: false,
          message: `Unsupported security state: ${status}`
        };
      }
    });

    // Register disconnectSession tool (called by Gemini voice or text commands)
    tm.register("disconnectSession", async () => {
      addLog("Communications termination authorized via voice command.", "system");
      setTimeout(() => {
        sessionRef.current?.disconnect();
        setSession(null);
        sessionRef.current = null;
        StateManager.getInstance().update({ transcription: null, errorMessage: null, shadowAuthStatus: "idle" });
      }, 500);
      return {
        success: true,
        message: `Disconnecting live assistant session now, ${authorizedUser}.`
      };
    });

    // Register setScreenVision tool (called by Gemini voice or text commands)
    tm.register("setScreenVision", async (_, args) => {
      const active = args?.active === true || args?.active === "true" || args?.active === "active";
      if (active) {
        addLog("Screen vision activation command received via tool. Requesting display permission...", "info");
        try {
          await VisionManager.getInstance().startVision();
          return {
            success: true,
            message: "Screen vision stream successfully activated."
          };
        } catch (err: any) {
          console.error("Failed to start screen vision from tool call:", err);
          return {
            success: false,
            error: err.message || "Failed to start screen vision capture"
          };
        }
      } else {
        addLog("Screen vision deactivation command received via tool. Disconnecting display stream...", "info");
        VisionManager.getInstance().stopVision();
        return {
          success: true,
          message: "Screen vision stream successfully disconnected."
        };
      }
    });

    // Register setAuthorizedUser tool (called by Gemini voice or text commands)
    tm.register("setAuthorizedUser", async (_, args) => {
      const { name: newName } = args;
      if (newName) {
        setAuthorizedUserState(newName);
        saveAuthorizedUser(newName);
        addLog(`Authorized User designation updated to ${newName}.`, "success");
        return {
          success: true,
          name: newName,
          message: `Authorized User designation successfully updated to ${newName}.`
        };
      } else {
        return {
          success: false,
          message: "No valid name was provided."
        };
      }
    });
  }, [authorizedUser]); // update dependency to handle dynamic name in voice responses

  // Mode transition handler for smooth switching between system, friendly, and shadow profiles
  const triggerModeTransition = async (targetMode: AIMode, initText?: string) => {
    const currentMuted = isMuted;
    
    // Play transition chime
    const sfx = CoreSoundEffects.getInstance();
    sfx.playActivation();
    
    if (targetMode === "shadow") {
      if (theme !== "shadow") {
        prevThemeRef.current = theme;
      }
      changeThemeRef.current("shadow");
      await VoiceManager.getInstance().setProfile("shadow");
      addLog(`Shadow protocol activated, ${authorizedUser}.`, "success");
    } else if (targetMode === "friendly") {
      const targetTheme = prevThemeRef.current || "cyber";
      changeThemeRef.current(targetTheme);
      await VoiceManager.getInstance().setProfile("friendly");
      
      // Explicitly reset the personality engine, emotion states, context and reasoning to default settings
      PersonalityEngine.getInstance().resetToDefault();
      EmotionManager.getInstance().resetToDefault();
      ReasoningManager.getInstance().resetToDefault();
      ContextManager.getInstance().resetToDefault();

      const logMessage = voiceMode === "shadow" 
        ? `Shadow protocol disabled, ${authorizedUser}. Returning to friendly mode.`
        : `System calibration completed, ${authorizedUser}. Returning to friendly mode.`;

      // Explicitly reset global StateManager properties
      StateManager.getInstance().update({
        voiceMode: "friendly",
        shadowAuthStatus: "idle",
        isMuted: false,
        activeEffect: null,
        errorMessage: null,
        transcription: null,
      });

      addLog(logMessage, "success");
    } else {
      const targetTheme = prevThemeRef.current || "cyber";
      changeThemeRef.current(targetTheme); // Restore default/previous interface
      await VoiceManager.getInstance().setProfile("system");
      addLog(`Standard system operation activated, ${authorizedUser}.`, "system");
    }

    // Seamlessly reconnect active session to update the AI's model persona & voice properties
    if (state !== "disconnected" && sessionRef.current) {
      sessionRef.current.disconnect();
      setSession(null);
      sessionRef.current = null;
      
      setTimeout(async () => {
        StateManager.getInstance().update({ state: "connecting", errorMessage: null });
        
        const callbacks = {
          onStateChange: (newState: SessionState) => {
            StateManager.getInstance().update({ state: newState });
          },
          onTranscription: (text: string, isUser: boolean) => {
            handleVoiceTranscription(text, isUser);
          },
          onToolCall: (name: string, args: any) => {
            addLog(`IGRIS requested local sub-routine: ${name}`, "info");
          },
          onLog: (text: string, type: LogEntry["type"]) => {
            addLog(text, type);
          },
          onError: (err: string) => {
            StateManager.getInstance().update({ errorMessage: err });
            addLog(`SYSTEM FAILURE: ${err}`, "error");
          },
          onAudioInputLevel: (level: number) => {
            if (audioLevelRingRef.current) {
              const scale = 1 + (level / 100) * 0.35;
              const opacity = level > 2 ? 0.3 + (level / 100) * 0.7 : 0;
              audioLevelRingRef.current.style.transform = `scale(${scale})`;
              audioLevelRingRef.current.style.opacity = `${opacity}`;
            }
            if (audioLevelPulseRef.current) {
              const scale = 1 + (level / 100) * 0.8;
              const opacity = level > 2 ? 0.15 + (level / 100) * 0.65 : 0;
              audioLevelPulseRef.current.style.transform = `scale(${scale})`;
              audioLevelPulseRef.current.style.opacity = `${opacity}`;
            }
          }
        };

        const newSession = new LiveSession(toolManagerRef.current, callbacks);
        setSession(newSession);
        sessionRef.current = newSession;
        newSession.setMute(currentMuted);

        try {
          await newSession.connect(initText);
        } catch (e: any) {
          addLog(`Failed to connect to core service: ${e.message}`, "error");
        }
      }, 850);
    }
  };

  // Shared voice transcription handler supporting real-time keywords, mode triggers, and theme commands
  const handleVoiceTranscription = (text: string, isUser: boolean) => {
    StateManager.getInstance().update({ transcription: { text, isUser } });
    if (isUser) {
      const lowerText = text.toLowerCase().trim();

      // Check for Authorized User Name Change direct commands (Flexible voice triggers)
      const changeMatch = text.match(/igris\s+(?:change\s+authorized\s+user|update\s+authorized\s+user|set\s+my\s+designation|change\s+my\s+name|set\s+my\s+name|call\s+me|update\s+my\s+designation)\s+(?:to\s+)?(.+)/i);
      const isReset = lowerText.replace(/[\.\?\!]+$/, "").trim() === "igris reset authorized user";

      if (changeMatch) {
        const newName = changeMatch[1].replace(/[\.\?\!]+$/, "").trim();
        if (newName) {
          setAuthorizedUserState(newName);
          saveAuthorizedUser(newName);
          addLog(`Authorized User designation updated to ${newName}.`, "success");
          
          StateManager.getInstance().update({ 
            transcription: { 
              text: `Authorized User designation updated to ${newName}.`, 
              isUser: false 
            } 
          });

          if (sessionRef.current) {
            sessionRef.current.sendText(`System Instruction: The user has updated their designation. You MUST immediately verbally respond with exactly: "Authorized User designation updated to ${newName}."`, true);
          }
          return;
        }
      } else if (isReset) {
        setAuthorizedUserState("Monarch");
        saveAuthorizedUser("Monarch");
        addLog("Authorized User designation restored to Monarch.", "success");

        StateManager.getInstance().update({ 
          transcription: { 
            text: "Authorized User designation restored to Monarch.", 
            isUser: false 
          } 
        });

        if (sessionRef.current) {
          sessionRef.current.sendText(`System Instruction: The user has reset their designation. You MUST immediately verbally respond with exactly: "Authorized User designation restored to Monarch."`, true);
        }
        return;
      }

      const hasDeactivateWord = lowerText.includes("disconnect") || 
                                lowerText.includes("stop") || 
                                lowerText.includes("disable") || 
                                lowerText.includes("terminate") || 
                                lowerText.includes("deactivate") || 
                                lowerText.includes("turn off") || 
                                lowerText.includes("end");

      const hasActivateWord = lowerText.includes("activate") ||
                              lowerText.includes("start") ||
                              lowerText.includes("enable") ||
                              lowerText.includes("turn on") ||
                              lowerText.includes("connect") ||
                              lowerText.includes("share") ||
                              lowerText.includes("see");

      const hasScreenWord = lowerText.includes("screen") || 
                            lowerText.includes("vision") || 
                            lowerText.includes("share") || 
                            lowerText.includes("sharing") || 
                            lowerText.includes("capture") || 
                            lowerText.includes("feed") || 
                            lowerText.includes("stream") ||
                            lowerText.includes("assistance");

      if (hasDeactivateWord && hasScreenWord) {
        addLog("Stop vision stream voice command detected. Terminating screen share stream...", "system");
        VisionManager.getInstance().stopVisionAssist();
        
        StateManager.getInstance().update({ 
          transcription: { 
            text: "Screen sharing disconnected.", 
            isUser: false 
          } 
        });
        return;
      }

      if (hasActivateWord && hasScreenWord) {
        addLog("Screen vision activation command received. Requesting display permission...", "info");
        if (sessionRef.current) {
          sessionRef.current.sendText(`System instruction: The user requested to share their screen. You MUST immediately verbally respond with exactly: "Screen vision request received, Monarch. Awaiting permission."`, true);
        }
        
        // Trigger browser screen sharing popup through startVision()
        VisionManager.getInstance().startVision().catch((err) => {
          console.error("Failed to start screen vision from voice command:", err);
        });
        return;
      }

      const isVisionCommand = hasScreenWord;

      const hasSessionDeactivateWord = lowerText.includes("disconnect") ||
                                       lowerText.includes("deactivate") ||
                                       lowerText.includes("go to sleep") ||
                                       lowerText.includes("turn off") ||
                                       lowerText.includes("stop session") ||
                                       lowerText.includes("end session") ||
                                       lowerText.includes("shut down") ||
                                       lowerText.includes("goodbye") ||
                                       (lowerText.includes("stop") && !isVisionCommand && (lowerText.includes("igris") || lowerText.includes("core") || lowerText.includes("session")));

      if (hasSessionDeactivateWord && !isVisionCommand) {
        addLog("Deactivation voice command detected. Terminating IGRIS session...", "system");
        setTimeout(() => {
          sessionRef.current?.disconnect();
          setSession(null);
          sessionRef.current = null;
          StateManager.getInstance().update({ transcription: null, errorMessage: null });
        }, 1000);
        return;
      }

      const currentAuthStatus = StateManager.getInstance().getState().shadowAuthStatus || "idle";

      // 0. If currently in pending authorization state, wait for security code '2112'
      if (currentAuthStatus === "pending") {
        const cleaned = lowerText.replace(/[^a-z0-9\s]/g, "").trim();
        if (cleaned === "2112" || cleaned === "two one one two" || cleaned.includes("2112") || cleaned.includes("two one one two")) {
          StateManager.getInstance().update({ shadowAuthStatus: "verified" });
          triggerModeTransition("shadow", `Initialize system. Say exactly: 'Security verification accepted. Shadow protocol activated, ${authorizedUser}.'`);
        } else {
          StateManager.getInstance().update({ shadowAuthStatus: "failed" });
          // Force back to friendly mode on failed authorization
          triggerModeTransition("friendly", "Initialize system. Say exactly: 'Authorization failed. Shadow protocol remains locked.'");
          
          // Reset status back to idle after 4 seconds
          setTimeout(() => {
            const currentStatus = StateManager.getInstance().getState().shadowAuthStatus;
            if (currentStatus === "failed") {
              StateManager.getInstance().update({ shadowAuthStatus: "idle" });
            }
          }, 4000);
        }
        return;
      }

      // 1. Shadow Mode Activation triggers - lock with security prompt
      if (
        lowerText.includes("shadow mode") ||
        lowerText.includes("activate shadow") ||
        lowerText.includes("enter shadow") ||
        lowerText.includes("shadow protocol") ||
        lowerText.includes("igris shadow") ||
        lowerText.includes("shadow mood")
      ) {
        StateManager.getInstance().update({ shadowAuthStatus: "pending" });
        addLog("Security code challenge initiated: waiting for authorization.", "warning");
        sessionRef.current?.sendText(`System instruction: Do NOT activate shadow mode. Say exactly: 'Shadow protocol requires authorization. Provide security code, ${authorizedUser}.'`, true);
        return;
      }

      // 2. Mode Deactivation, Exit, or Cancellation triggers - ALWAYS return to Friendly Mode by default
      if (
        lowerText.includes("exit mode") ||
        lowerText.includes("cancel mode") ||
        lowerText.includes("turn off mode") ||
        lowerText.includes("exit current mode") ||
        lowerText.includes("cancel current mode") ||
        lowerText.includes("stop current mode") ||
        lowerText.includes("deactivate mode") ||
        lowerText.includes("shadow mood cancel") ||
        lowerText.includes("cancel shadow mood") ||
        lowerText.includes("exit shadow mode") ||
        lowerText.includes("deactivate shadow protocol") ||
        lowerText.includes("exit shadow") ||
        lowerText.includes("cancel shadow") ||
        lowerText.includes("deactivate shadow") ||
        lowerText.includes("disable shadow") ||
        lowerText.includes("turn off shadow") ||
        lowerText.includes("exit system mode") ||
        lowerText.includes("cancel system mode") ||
        lowerText.includes("deactivate system mode") ||
        lowerText.includes("turn off system mode") ||
        lowerText.includes("exit system") ||
        lowerText.includes("cancel system") ||
        lowerText.includes("deactivate system") ||
        lowerText.includes("disable system") ||
        lowerText.includes("turn off system") ||
        lowerText.includes("return normal mode") ||
        lowerText.includes("return to normal") ||
        lowerText.includes("return to friendly mode") ||
        lowerText.includes("normal mode") ||
        lowerText.includes("be friendly") ||
        lowerText.includes("chat with me") ||
        lowerText.includes("chat with us") ||
        lowerText.includes("friendly mode")
      ) {
        StateManager.getInstance().update({ shadowAuthStatus: "idle" });
        const speechMsg = voiceMode === "shadow"
          ? `Initialize system. Say exactly: 'Shadow protocol disabled, ${authorizedUser}. Returning to friendly mode.'`
          : `Initialize system. Say exactly: 'System calibration completed, ${authorizedUser}. Returning to friendly conversational mode.'`;
        triggerModeTransition("friendly", speechMsg);
        return;
      }

      // 3. System Mode / Standard Operating Mode triggers
      if (
        lowerText.includes("system mode") ||
        lowerText.includes("standard mode") ||
        lowerText.includes("standard operating mode") ||
        lowerText.includes("activate system mode") ||
        lowerText.includes("calibrate system mode")
      ) {
        StateManager.getInstance().update({ shadowAuthStatus: "idle" });
        triggerModeTransition("system", `Initialize system. Say exactly: 'Returning to standard system operation, ${authorizedUser}.'`);
        return;
      }

      // 4. Persistent Memory Preference trigger
      if (lowerText.includes("remember shadow mode")) {
        VoiceManager.getInstance().enableRememberPreference();
        addLog("Saving user operational preference to system cognitive archive.", "success");
        sessionRef.current?.sendText(`System instruction: Acknowledge that the ${authorizedUser} has persistently set your default profile to Shadow Mode. Confirm that this preference is now logged.`, true);
        return;
      }

      const themeKeywords = ["theme", "protocol", "mode", "interface", "rgb", "emerald", "crimson", "stealth", "shadow", "cyber", "purple", "white", "gold", "neon", "surprise me", "random"];
      const matchesKeyword = themeKeywords.some(keyword => lowerText.includes(keyword));
      if (matchesKeyword) {
        const manager = ThemeManager.getInstance();
        const resolvedId = manager.resolveThemeId(lowerText);
        if (resolvedId) {
          changeThemeRef.current(resolvedId);
        }
      }
    }
  };

  // Initialize and clean up LiveSession
  const toggleConnection = async () => {
    if (state !== "disconnected") {
      addLog("Disconnecting communications with IGRIS...", "info");
      session?.disconnect();
      setSession(null);
      sessionRef.current = null;
      StateManager.getInstance().update({ transcription: null, errorMessage: null });
      return;
    }

    StateManager.getInstance().update({ errorMessage: null });
    StateManager.getInstance().update({ 
      transcription: { text: `IGRIS online. System initialized. Welcome back, ${authorizedUser}.`, isUser: false } 
    });

    const callbacks = {
      onStateChange: (newState: SessionState) => {
        StateManager.getInstance().update({ state: newState });
      },
      onTranscription: (text: string, isUser: boolean) => {
        handleVoiceTranscription(text, isUser);
      },
      onToolCall: (name: string, args: any) => {
        addLog(`IGRIS requested local sub-routine: ${name}`, "info");
      },
      onLog: (text: string, type: LogEntry["type"]) => {
        addLog(text, type);
      },
      onError: (err: string) => {
        StateManager.getInstance().update({ errorMessage: err });
        addLog(`SYSTEM FAILURE: ${err}`, "error");
      },
      onAudioInputLevel: (level: number) => {
        if (audioLevelRingRef.current) {
          const scale = 1 + (level / 100) * 0.35;
          const opacity = level > 2 ? 0.3 + (level / 100) * 0.7 : 0;
          audioLevelRingRef.current.style.transform = `scale(${scale})`;
          audioLevelRingRef.current.style.opacity = `${opacity}`;
        }
        if (audioLevelPulseRef.current) {
          const scale = 1 + (level / 100) * 0.8;
          const opacity = level > 2 ? 0.15 + (level / 100) * 0.65 : 0;
          audioLevelPulseRef.current.style.transform = `scale(${scale})`;
          audioLevelPulseRef.current.style.opacity = `${opacity}`;
        }
      }
    };

    const newSession = new LiveSession(toolManagerRef.current, callbacks);
    setSession(newSession);
    sessionRef.current = newSession;
    
    // Pass current mute state to the newly initialized session
    newSession.setMute(isMuted);
    
    try {
      await newSession.connect();
    } catch (e: any) {
      addLog(`Failed to connect to core service: ${e.message}`, "error");
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    StateManager.getInstance().update({ isMuted: nextMuted });
    if (session) {
      session.setMute(nextMuted);
    }
    addLog(nextMuted ? `Microphone input paused, ${authorizedUser}.` : `Microphone input restored, ${authorizedUser}.`, "system");
  };

  const requestMicPermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        StateManager.getInstance().update({ errorMessage: null });
        addLog("Microphone access verified. Starting IGRIS...", "success");
        toggleConnection();
      }
    } catch (err: any) {
      addLog("Microphone access is still blocked. Please allow microphone permissions in your browser URL bar.", "warning");
    }
  };

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      session?.disconnect();
    };
  }, [session]);

  // Keep a stable ref to toggleConnection to avoid infinite SpeechRecognition restart loops
  const toggleConnectionRef = useRef(toggleConnection);
  useEffect(() => {
    toggleConnectionRef.current = toggleConnection;
  }, [toggleConnection]);

  // Background Speech Recognition for Wake Word when IGRIS is disconnected
  useEffect(() => {
    let recognition: any = null;
    let shouldRestart = true;
    let isCancelled = false;

    if (state === "disconnected") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onstart = () => {
            if (!isCancelled) {
              StateManager.getInstance().addLog("Voice trigger engine online. Say 'Igris' or 'Boot System' to activate.", "system");
            }
          };

          recognition.onresult = (event: any) => {
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }

            const lowerTranscript = (finalTranscript + interimTranscript).toLowerCase().trim();
            console.log("[Wake Word Detector] Heard:", lowerTranscript);

            const hasWakeWord = lowerTranscript.includes("igris") || 
                                lowerTranscript.includes("activate core") || 
                                lowerTranscript.includes("boot system") || 
                                lowerTranscript.includes("wake up") ||
                                lowerTranscript.includes("start assistant") ||
                                lowerTranscript.includes("start igris") ||
                                lowerTranscript.includes("connect igris");

            if (hasWakeWord) {
              StateManager.getInstance().addLog("Voice activation pattern matched. Activating core session...", "success");
              shouldRestart = false;
              try {
                recognition.stop();
              } catch (e) {
                // ignore
              }
              toggleConnectionRef.current();
            }
          };

          recognition.onerror = (event: any) => {
            const err = event.error;
            // Ignore benign lifecycle errors like "no-speech" or "aborted"
            if (err === "no-speech" || err === "aborted") {
              return;
            }

            // If microphone permission is pending, denied, or restricted in the current context
            if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
              shouldRestart = false;
              console.warn(`[Wake Word Detector] Speech recognition inactive (${err}). Click the power button to initialize.`);
              return;
            }

            console.warn("[Wake Word Detector] Notice:", err);
          };

          recognition.onend = () => {
            if (shouldRestart && !isCancelled && state === "disconnected") {
              try {
                recognition.start();
              } catch (e) {
                console.warn("[Wake Word Detector] Restart deferred:", e);
              }
            }
          };

          try {
            recognition.start();
          } catch (startErr) {
            shouldRestart = false;
            console.warn("[Wake Word Detector] Initial start deferred:", startErr);
          }
        } catch (err) {
          console.warn("Failed to initialize background wake-word recognition:", err);
        }
      } else {
        console.warn("Web Speech Recognition is not supported in this browser. Voice activation requires manual boot.");
      }
    }

    return () => {
      isCancelled = true;
      shouldRestart = false;
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [state]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // UI status colors
  const getStatusLabel = () => {
    switch (state) {
      case "disconnected": return "STANDBY";
      case "connecting": return "SYNCING CORES";
      case "listening": return "IGRIS LISTENING";
      case "speaking": return "IGRIS SPEAKING";
      case "muted": return "MICROPHONE MUTED";
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case "disconnected": return "text-slate-400";
      case "connecting": return "text-amber-400 animate-pulse";
      case "listening": return `${activeTheme.primaryAccent} font-semibold`;
      case "speaking": return `${activeTheme.primaryAccent} font-semibold`;
      case "muted": return "text-red-400 font-semibold";
    }
  };

  const getCoreGlowClass = () => {
    switch (state) {
      case "disconnected": return "neon-glow-inactive border-slate-700 bg-slate-900/60";
      case "connecting": return "neon-glow-amber border-amber-500/80 bg-amber-950/20";
      case "listening": return "neon-glow-cyan border-cyan-500/80 bg-cyan-950/25";
      case "speaking": return "neon-glow-purple border-purple-500/80 bg-purple-950/25";
      case "muted": return "neon-glow-red border-red-500/80 bg-red-950/20";
    }
  };

  // Preset commands for user to test tool execution easily
  const triggerPreset = (command: string) => {
    if (state === "disconnected" || !session) {
      addLog("Please initialize IGRIS connection before executing verbal queries.", "warning");
      return;
    }
    addLog(`Transmitting voice query: "${command}"`, "info");
    session.sendText(command);
  };

  return (
    <div className="relative min-h-screen w-full text-white font-sans flex flex-col justify-between overflow-hidden scanline bg-black">
      
      {/* Seamless Ambient Background Layers for Beautiful Cross-Fade */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Shadow Mode Theme Layer */}
        <motion.div
          initial={false}
          animate={{ opacity: voiceMode === "shadow" ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 bg-[#020204]"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-950/20 blur-[130px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-950/15 blur-[130px]" />
          <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(#1e3a8a 1.5px, transparent 1.5px)", backgroundSize: "32px 32px" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-1/2 w-full animate-scanline pointer-events-none" style={{ animationDuration: '6s' }} />

          {/* Glitch UI Grid and Lines */}
          <div className="absolute inset-0 cyber-grid-overlay opacity-40 pointer-events-none" />

          {/* Moving Binary Matrix Digital Rain */}
          <BinaryMatrixRain isActive={voiceMode === "shadow"} />
          
          {/* Animated Glitch Bars */}
          <div className="absolute top-[15%] left-0 w-full h-[1px] bg-cyan-500/10 animate-glitch-horizontal pointer-events-none" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-[45%] left-0 w-full h-[2px] bg-blue-500/5 animate-glitch-horizontal pointer-events-none" style={{ animationDelay: '2.2s' }} />
          <div className="absolute top-[75%] left-0 w-full h-[1px] bg-cyan-400/10 animate-glitch-horizontal pointer-events-none" style={{ animationDelay: '1.1s' }} />
          <div className="absolute top-[28%] left-[10%] w-[80%] h-[1px] bg-purple-500/5 animate-glitch-horizontal pointer-events-none" style={{ animationDelay: '3.4s' }} />

          {/* Glitch Data Overlays (Monarch / Shadow Matrix details with live-updating Threat & Integrity HUDs) */}
          <div className="absolute top-28 left-12 opacity-80 font-mono text-[9px] text-cyan-400 select-none hidden lg:flex flex-col gap-3 p-4 border border-cyan-500/20 bg-slate-950/80 backdrop-blur-md rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.1)] w-56 animate-glitch-flicker">
            <div className="border-b border-cyan-500/20 pb-1.5 flex justify-between items-center">
              <span className="font-bold tracking-widest text-cyan-300">TACTICAL METRICS</span>
              <span className="text-[7px] bg-cyan-950 px-1 py-0.5 rounded border border-cyan-500/30 text-cyan-400 uppercase animate-pulse">LIVE</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[8px]">
                <span className="text-slate-500">SYS_MODEL:</span>
                <span className="text-slate-200">IGRIS.SHADOW.v3.1</span>
              </div>
              <div className="flex justify-between items-center text-[8px]">
                <span className="text-slate-500">STATUS:</span>
                <span className="text-cyan-300">SHADOW_ENGAGED</span>
              </div>
              <div className="flex justify-between items-center text-[8px]">
                <span className="text-slate-500">ALIGNMENT:</span>
                <span className="text-slate-200">{authorizedUser.toUpperCase()}_AUTH</span>
              </div>
            </div>

            <div className="border-t border-cyan-500/10 pt-2 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold tracking-wider">THREAT ASSESSMENT:</span>
                <span className={`font-bold ${
                  tacticalMetrics.threatLevel > 80 
                    ? "text-red-400 animate-pulse" 
                    : tacticalMetrics.threatLevel > 50 
                    ? "text-amber-400" 
                    : "text-emerald-400"
                }`}>
                  {tacticalMetrics.threatLevel}%
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="w-full bg-cyan-950/60 h-1.5 rounded-full overflow-hidden border border-cyan-500/20">
                <div 
                  className={`h-full transition-all duration-300 ${
                    tacticalMetrics.threatLevel > 80 
                      ? "bg-red-500" 
                      : tacticalMetrics.threatLevel > 50 
                      ? "bg-amber-500" 
                      : "bg-emerald-500"
                  }`} 
                  style={{ width: `${tacticalMetrics.threatLevel}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[7px] text-slate-500">
                <span>SECTOR: ACTIVE</span>
                <span className="uppercase font-semibold">
                  {tacticalMetrics.threatLevel > 80 
                    ? "CRITICAL ALERT" 
                    : tacticalMetrics.threatLevel > 50 
                    ? "ELEVATED THREAT" 
                    : "STABLE CONTEXT"}
                </span>
              </div>
            </div>
          </div>

          <div className="absolute top-28 right-12 opacity-80 font-mono text-[9px] text-blue-400 select-none hidden lg:flex flex-col gap-3 p-4 border border-blue-500/20 bg-slate-950/80 backdrop-blur-md rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.1)] w-56 animate-glitch-flicker" style={{ animationDelay: '1.2s' }}>
            <div className="border-b border-blue-500/20 pb-1.5 flex justify-between items-center">
              <span className="font-bold tracking-widest text-blue-300">CORE INTEGRITY</span>
              <span className="text-[7px] bg-blue-950 px-1 py-0.5 rounded border border-blue-500/30 text-blue-400 uppercase">ONLINE</span>
            </div>

            <div className="flex flex-col gap-1 text-[8px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">INGRESS PORT:</span>
                <span className="text-slate-200">SECURE_3000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">CRYPTO LAYER:</span>
                <span className="text-emerald-400 font-semibold">VERIFIED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">SOLDIERS COUNT:</span>
                <span className="text-cyan-300 animate-pulse font-bold">44,912 / 45,000</span>
              </div>
            </div>

            <div className="border-t border-blue-500/10 pt-2 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold tracking-wider">OPERATIONAL INTEGRITY:</span>
                <span className={`font-bold ${
                  tacticalMetrics.operationalIntegrity < 60 
                    ? "text-red-400 animate-pulse" 
                    : tacticalMetrics.operationalIntegrity < 90 
                    ? "text-amber-400" 
                    : "text-cyan-400"
                }`}>
                  {tacticalMetrics.operationalIntegrity}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-blue-950/60 h-1.5 rounded-full overflow-hidden border border-blue-500/20">
                <div 
                  className={`h-full transition-all duration-300 ${
                    tacticalMetrics.operationalIntegrity < 60 
                      ? "bg-red-500" 
                      : tacticalMetrics.operationalIntegrity < 90 
                      ? "bg-amber-500" 
                      : "bg-cyan-500"
                  }`} 
                  style={{ width: `${tacticalMetrics.operationalIntegrity}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[7px] text-slate-500">
                <span>DAMPENER: OPTIMAL</span>
                <span className="uppercase font-semibold">
                  {tacticalMetrics.operationalIntegrity < 60 
                    ? "SYSTEM DEGRADATION" 
                    : tacticalMetrics.operationalIntegrity < 90 
                    ? "MODERATE WEAR" 
                    : "STABLE SHIELD"}
                </span>
              </div>
            </div>
          </div>

          {/* Random floating binary grid block */}
          <div className="absolute top-1/4 right-[8%] opacity-[0.06] font-mono text-[10px] tracking-widest leading-normal text-cyan-400 select-none pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}>
            <div>01001001 01000111</div>
            <div>01010010 01001001</div>
            <div>01010011 00100000</div>
            <div>01010011 01001000</div>
            <div>01000001 01000100</div>
            <div>01001111 01010111</div>
          </div>

          {/* Diagonal laser-line swipe or high-tech frame elements */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_45%,rgba(6,182,212,0.02)_48%,rgba(6,182,212,0.05)_50%,rgba(6,182,212,0.02)_52%,transparent_55%)] bg-[size:200%_200%] animate-[pulse_10s_ease-in-out_infinite] pointer-events-none" />
        </motion.div>

        {/* 1. Dark Theme Layer */}
        <motion.div
          initial={false}
          animate={{ opacity: (theme === "dark" && voiceMode !== "shadow") ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 bg-[#050507]"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-900/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </motion.div>

        {/* 2. Matrix Theme Layer */}
        <motion.div
          initial={false}
          animate={{ opacity: (theme === "matrix" && voiceMode !== "shadow") ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 bg-[#010902]"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-950/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-green-950/20 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </motion.div>

        {/* 3. Holographic Theme Layer */}
        <motion.div
          initial={false}
          animate={{ opacity: (theme === "holographic" && voiceMode !== "shadow") ? 1 : 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 bg-[#080916]"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-pink-900/15 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/15 blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: "radial-gradient(#ec4899 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </motion.div>

        {/* Dynamic Interactive Starfield Layer */}
        <StarfieldBackground isShadowMode={voiceMode === "shadow"} />
      </div>

      {/* 1. Decorative Frame Corners */}
      <div className="absolute top-4 left-4 w-12 h-12 border-l border-t border-white/10 z-0 pointer-events-none"></div>
      <div className="absolute top-4 right-4 w-12 h-12 border-r border-t border-white/10 z-0 pointer-events-none"></div>
      <div className="absolute bottom-4 left-4 w-12 h-12 border-l border-b border-white/10 z-0 pointer-events-none"></div>
      <div className="absolute bottom-4 right-4 w-12 h-12 border-r border-b border-white/10 z-0 pointer-events-none"></div>

      {/* 2. Futuristic Overlays for Gemini Live Tool Actions */}
      <AnimatePresence>
        {activeEffect === "matrix_glitch" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-[radial-gradient(rgba(16,185,129,0.3)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-4 py-1.5 rounded text-xs font-mono tracking-widest uppercase">
              MATRIX_GLITCH ROUTINE INJECTED
            </div>
          </motion.div>
        )}

        {activeEffect === "overload_core" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.1, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute inset-0 z-40 bg-red-600 pointer-events-none"
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/30 text-red-200 border border-red-500/60 px-4 py-1.5 rounded text-xs font-mono tracking-widest uppercase animate-bounce">
              CRITICAL CORE OVERLOAD INITIATED
            </div>
          </motion.div>
        )}

        {activeEffect === "calibrate_sensors" && (
          <motion.div 
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: [0, 1, 1, 0], opacity: [0, 0.4, 0.4, 0], y: ["0%", "100%", "100%", "0%"] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-4 bg-gradient-to-b from-cyan-400 to-transparent z-40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* 3. Sleek Sophisticated Dark Header */}
      <header className="relative w-full max-w-7xl mx-auto px-12 py-8 flex flex-col md:flex-row gap-6 items-center justify-between z-10 border-b border-white/5">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <span className={`text-[10px] tracking-[0.3em] font-bold uppercase mb-1 transition-colors duration-500 ${getSystemLabelColor()}`}>
            System Identity
          </span>
          <h1 className="text-3xl font-light tracking-tighter text-white">
            IGRIS <span className={`font-bold transition-colors duration-500 ${getVersionColor()}`}>V1.0</span>
          </h1>
        </div>

        {/* Dynamic Theme Selection Segmented Controller */}
        <div className="flex items-center gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider z-20 transition-all duration-500 hover:border-white/20">
          <span className="text-white/40 uppercase tracking-widest text-[8px] pl-1 select-none">Interface Protocol:</span>
          <select 
            value={activeTheme.id} 
            onChange={(e) => changeTheme(e.target.value)}
            className="bg-transparent text-white border-0 focus:outline-none focus:ring-0 cursor-pointer pr-4 font-mono text-[10px] uppercase font-medium tracking-widest"
          >
            {availableThemes.map((t) => (
              <option key={t.id} value={t.id} className="bg-zinc-950 text-white font-mono uppercase text-[10px]">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Authorized User Profile Block */}
        <div className="flex gap-4 items-center bg-white/5 backdrop-blur-xl border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-all duration-300">
          {isEditingUser ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingUserName}
                onChange={(e) => setEditingUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = editingUserName.trim();
                    if (val) {
                      setAuthorizedUserState(val);
                      saveAuthorizedUser(val);
                      addLog(`Authorized User designation manually updated to ${val}.`, "success");
                    }
                    setIsEditingUser(false);
                  } else if (e.key === "Escape") {
                    setIsEditingUser(false);
                  }
                }}
                className="bg-black/40 text-white text-xs px-2.5 py-1 rounded border border-white/20 focus:outline-none focus:border-amber-500/50 w-28 text-right font-medium"
                autoFocus
                placeholder="Name"
              />
              <button
                onClick={() => {
                  const val = editingUserName.trim();
                  if (val) {
                    setAuthorizedUserState(val);
                    saveAuthorizedUser(val);
                    addLog(`Authorized User designation manually updated to ${val}.`, "success");
                  }
                  setIsEditingUser(false);
                }}
                className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                title="Save designation"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditingUser(false)}
                className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                setEditingUserName(authorizedUser);
                setIsEditingUser(true);
              }}
              title="Click to edit Authorized User name"
            >
              <div className="flex flex-col items-end">
                <span className="text-[8px] uppercase tracking-[0.2em] text-white/40 leading-none mb-1 flex items-center gap-1">
                  Authorized User <Edit3 className="w-2 h-2 opacity-50 group-hover:opacity-100 transition-opacity" />
                </span>
                <span className="text-xs font-semibold tracking-wide leading-none text-white group-hover:text-amber-300 transition-colors">
                  {authorizedUser.toUpperCase()}
                </span>
              </div>
            </div>
          )}
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse transition-all duration-500 bg-current shadow-[0_0_10px_currentColor] ${activeTheme.primaryAccent}`} />
        </div>
      </header>

      {/* 4. Main Central AI Interaction Hub */}
      <main className="relative flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col items-center justify-center z-10">
        
        {/* Core Control Sphere Card (Centered) */}
        <div className="flex flex-col items-center justify-center w-full max-w-xl h-full relative">
          
          {/* Technical Outer Rings (Sophisticated Dark / Matrix / Holo) */}
          <div className={`absolute w-[340px] h-[340px] md:w-[460px] md:h-[460px] rounded-full border pointer-events-none transition-all duration-500 border-current opacity-5 ${activeTheme.primaryAccent}`} />
          <div className={`absolute w-[300px] h-[300px] md:w-[420px] md:h-[420px] rounded-full border border-dashed animate-spin-slow pointer-events-none transition-all duration-500 border-current opacity-10 ${activeTheme.primaryAccent}`} />
          <div className={`absolute w-[260px] h-[260px] md:w-[380px] md:h-[380px] rounded-full border-2 pointer-events-none transition-all duration-500 border-current opacity-5 ${activeTheme.primaryAccent}`} />

          <div className="relative w-full aspect-square max-w-[340px] md:max-w-[400px] flex items-center justify-center">
            
            {/* Ambient glows inside orb area */}
            <div className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-500 ${
              currentEmotion.currentMood === "happy" || currentEmotion.currentMood === "excited"
                ? "blur-[80px] scale-110 opacity-60" // Happy: Brighter AI core glow
                : currentEmotion.currentMood === "focused" || currentEmotion.currentMood === "protective" || currentEmotion.currentMood === "analytical"
                ? "blur-[40px] scale-90 opacity-20"  // Focused: Stable pulse, lower size
                : "blur-[60px] opacity-30"
            } ${isMuted ? "bg-red-500/15" : activeTheme.orbGlow.includes("red") ? "bg-red-500/15" : activeTheme.orbGlow.includes("emerald") || activeTheme.orbGlow.includes("green") ? "bg-emerald-500/15" : activeTheme.orbGlow.includes("purple") ? "bg-purple-500/15" : activeTheme.orbGlow.includes("gold") ? "bg-amber-500/15" : activeTheme.orbGlow.includes("sky") ? "bg-sky-500/15" : activeTheme.orbGlow.includes("pink") ? "bg-pink-500/15" : "bg-cyan-500/15"}`} />
            <div className={`absolute inset-4 rounded-full pointer-events-none transition-all duration-500 ${
              currentEmotion.currentMood === "happy" || currentEmotion.currentMood === "excited"
                ? "blur-[50px] scale-110 opacity-70"
                : currentEmotion.currentMood === "focused" || currentEmotion.currentMood === "protective" || currentEmotion.currentMood === "analytical"
                ? "blur-[25px] scale-90 opacity-25"
                : "blur-[30px] opacity-40"
            } ${isMuted ? "bg-red-600/20" : activeTheme.orbGlow.includes("red") ? "bg-red-600/20" : activeTheme.orbGlow.includes("emerald") || activeTheme.orbGlow.includes("green") ? "bg-green-600/20" : activeTheme.orbGlow.includes("purple") ? "bg-purple-600/20" : activeTheme.orbGlow.includes("gold") ? "bg-yellow-600/20" : activeTheme.orbGlow.includes("sky") ? "bg-sky-600/20" : activeTheme.orbGlow.includes("pink") ? "bg-pink-600/20" : "bg-cyan-600/20"}`} />

            {/* Rotating Tech Dash Ring */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ 
                repeat: Infinity, 
                duration: voiceMode === "shadow"
                  ? 96 // Shadow Mode: Ultra-slow tactical system rotation
                  : currentEmotion.currentMood === "analytical" 
                  ? 48 // Thinking: Slow rotating energy ring
                  : currentEmotion.currentMood === "happy" || currentEmotion.currentMood === "excited"
                  ? 8  // Happy: Faster waveform/core rotation
                  : state === "connecting" 
                  ? 3 
                  : 24, 
                ease: "linear" 
              }}
              className={`absolute inset-4 rounded-full border border-dashed transition-colors duration-500 ${
                state === "connecting" ? "border-amber-500/40" : 
                state === "muted" ? "border-red-500/40" :
                state === "listening" ? `border-current opacity-30 ${activeTheme.primaryAccent}` : 
                state === "speaking" ? `border-current opacity-30 ${activeTheme.primaryAccent}` : "border-slate-700/20"
              }`}
            />

            {/* Real-time Dynamic Audio Input Level Halo */}
            <div 
              ref={audioLevelRingRef}
              className={`absolute w-44 h-44 md:w-52 md:h-52 rounded-full border border-current pointer-events-none transition-all duration-[30ms] ease-out opacity-0 z-0 bg-current/5 shadow-[0_0_20px_currentColor] ${activeTheme.primaryAccent}`}
              style={{ transform: "scale(1)", transformOrigin: "center" }}
            />

            {/* Floating digital particles inside orb container (Shadow Mode only) */}
            {voiceMode === "shadow" && (
              <div className="absolute inset-8 rounded-full overflow-hidden pointer-events-none opacity-40 z-0">
                <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute top-2/3 left-1/3 w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
                <div className="absolute top-1/3 left-2/3 w-2 h-2 bg-cyan-500/50 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
                <div className="absolute top-3/4 left-3/4 w-1 h-1 bg-cyan-300 rounded-full animate-pulse" style={{ animationDuration: '5s' }} />
              </div>
            )}

            {/* System Boot Flash Shockwave */}
            <AnimatePresence>
              {showBootFlash && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 1, borderWidth: "4px" }}
                  animate={{ scale: 2.2, opacity: 0, borderWidth: "1px" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`absolute w-44 h-44 md:w-52 md:h-52 rounded-full border pointer-events-none z-20 ${
                    voiceMode === "shadow" ? "border-cyan-400 shadow-[0_0_50px_#22d3ee]" : "border-white shadow-[0_0_50px_rgba(255,255,255,1)]"
                  }`}
                />
              )}
            </AnimatePresence>

            {/* Primary Interactive AI Core Sphere */}
            <motion.button
              initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 90,
                damping: 15,
                delay: 0.2
              }}
              whileHover={{ scale: voiceMode === "shadow" ? 1.18 : 1.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={toggleConnection}
              id="ai-core-trigger"
              className={`relative z-10 w-44 h-44 md:w-52 md:h-52 rounded-full border backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ${
                voiceMode === "shadow"
                  ? `border-cyan-500/40 bg-gradient-to-tr from-slate-950 via-black to-blue-950/80 animate-shadow-high-load animate-glitch-skew animate-glitch-filter`
                  : state === "disconnected" 
                    ? `border-white/10 bg-gradient-to-tr from-slate-900/40 via-black to-slate-800/40 hover:border-white/40 ${activeTheme.orbGlow} animate-pulse-slow`
                    : state === "connecting" ? "border-amber-500/30 bg-gradient-to-tr from-amber-950/45 via-black to-amber-900/45 neon-glow-amber animate-pulse" :
                  state === "muted" ? "border-red-500/45 bg-gradient-to-tr from-red-950/45 via-black to-red-900/45 neon-glow-red animate-glow-red" :
                  state === "listening" 
                    ? `border-white/30 bg-gradient-to-tr from-slate-950 via-black to-slate-900 ${activeTheme.orbGlow} animate-pulse`
                    : `border-white/45 bg-gradient-to-tr from-slate-950 via-black to-slate-900 ${activeTheme.orbGlow} animate-pulse`
              }`}
            >
              {/* Inner Boot Flash Lens Flare / Overlay */}
              <AnimatePresence>
                {showBootFlash && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-white z-20 mix-blend-overlay"
                  />
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {state === "disconnected" ? (
                  <motion.div 
                    key="power-off"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    {/* Pulsing Core Element */}
                    <div className={`w-12 h-12 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.8)] flex items-center justify-center transition-colors duration-500 bg-white/90`}>
                      <Power className="w-5 h-5 text-black" />
                    </div>
                    <span className={`text-[10px] font-mono tracking-[0.2em] font-bold mt-2 transition-all duration-500 ${
                      activeTheme.primaryAccent
                    }`}>BOOT SYSTEM</span>
                    <span className="text-[8px] font-mono tracking-wider text-slate-500 animate-pulse mt-1">🎙️ OR SAY "IGRIS" TO WAKE</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="active-orb"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    {state === "connecting" ? (
                      <div className="w-12 h-12 rounded-full bg-amber-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                        <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      </div>
                    ) : state === "listening" ? (
                      <div className="relative flex items-center justify-center w-12 h-12">
                        {/* Dynamic voice energy waves radiating from mic */}
                        <div 
                          ref={audioLevelPulseRef}
                          className={`absolute w-full h-full rounded-full bg-current opacity-0 pointer-events-none transition-all duration-[30ms] ease-out ${activeTheme.primaryAccent}`}
                          style={{ transform: "scale(1)" }}
                        />
                        <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-white/10 transition-all duration-500 z-10`}>
                          <Mic className={`w-5 h-5 text-white ${activeTheme.primaryAccent}`} />
                        </div>
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-white/10 transition-all duration-500`}>
                        <Sliders className={`w-5 h-5 text-white ${activeTheme.primaryAccent}`} />
                      </div>
                    )}
                    <span className="text-[9px] font-mono tracking-[0.2em] text-white/70 mt-3 uppercase">
                      {state === "connecting" ? "SYNCING..." : "DISCONNECT"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Glowing internal fluid breathing dot */}
              <div className={`absolute bottom-6 w-2.5 h-2.5 rounded-full transition-all duration-500 bg-current shadow-[0_0_8px_currentColor] ${
                state === "disconnected" ? "text-slate-600 shadow-none" :
                state === "connecting" ? "text-amber-400 animate-ping" :
                state === "muted" ? "text-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" :
                state === "listening" ? `animate-pulse ${activeTheme.primaryAccent}` : 
                `animate-bounce ${activeTheme.primaryAccent}`
              }`} />
            </motion.button>

            {/* Futuristic Mute Companion Control Node */}
            {state !== "disconnected" && (
              <motion.button
                initial={{ scale: 0, opacity: 0, x: 20 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0, opacity: 0, x: 20 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                className={`absolute z-20 bottom-2 right-2 w-12 h-12 rounded-full border backdrop-blur-2xl shadow-xl flex items-center justify-center cursor-pointer transition-all duration-500 ${
                  isMuted 
                    ? "border-red-500/50 bg-gradient-to-tr from-red-950/30 via-black to-red-900/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" 
                    : `border-white/10 bg-white/5 text-white hover:border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)] ${activeTheme.primaryAccent}`
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </motion.button>
            )}
          </div>

          {/* Status Display below core */}
          <div className="mt-6 text-center">
            {/* Active Mode Indicator above CURRENT STATE */}
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className={`text-[9px] font-mono uppercase tracking-[0.2em] px-3 py-1 rounded-full border transition-all duration-500 ${
                voiceMode === "shadow" 
                  ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-400 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  : voiceMode === "friendly"
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                  : "bg-blue-950/40 border-blue-500/30 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.05)]"
              }`}>
                ● {voiceMode === "shadow" ? "SHADOW MODE ACTIVE" : voiceMode === "friendly" ? "FRIENDLY MODE ACTIVE" : "SYSTEM MODE ACTIVE"}
              </span>
            </div>

            {shadowAuthStatus === "pending" && (
              <div className="mb-3 animate-pulse">
                <span className="bg-amber-950/40 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-[0.15em] px-3 py-1 rounded shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  ⚠ Waiting for security code...
                </span>
              </div>
            )}

            {shadowAuthStatus === "failed" && (
              <div className="mb-3">
                <span className="bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] font-mono uppercase tracking-[0.15em] px-3 py-1 rounded shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                  ⛔ Authorization failed. Shadow protocol remains locked.
                </span>
              </div>
            )}

            <div className="text-[10px] uppercase tracking-[0.5em] text-white/50 mb-2 font-mono">CURRENT STATE</div>
            <div className="text-xl md:text-2xl font-light tracking-[0.2em] flex items-center justify-center gap-3">
              <span className={`uppercase transition-all duration-500 ${state === "listening" ? `${activeTheme.primaryAccent} font-normal` : "opacity-20 text-white/40"}`}>Listening</span>
              <span className="text-white/20">•</span>
              <span className={`uppercase transition-all duration-500 ${state === "speaking" ? `${activeTheme.primaryAccent} font-normal` : "opacity-20 text-white/40"}`}>Speaking</span>
              <span className="text-white/20">•</span>
              <span className={`uppercase transition-all duration-500 ${state === "muted" ? "text-red-400 font-normal" : "opacity-20 text-white/40"}`}>Muted</span>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Fluid Transcription and Holographic Subtitles Panel */}
      <section className="relative w-full max-w-4xl mx-auto px-6 mb-4 z-10">
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-red-950/60 border border-red-500/30 backdrop-blur-md px-5 py-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 shadow-lg shadow-red-950/20"
            >
              <div className="flex items-center gap-3 text-left">
                {errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("microphone") ? (
                  <MicOff className="w-5 h-5 text-red-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-mono text-red-200">
                    {errorMessage}
                  </p>
                  {errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("microphone") ? (
                    <p className="text-[11px] font-sans text-red-300/80 mt-0.5">
                      Click the lock or site settings icon in your browser's address bar to allow Microphone access.
                    </p>
                  ) : (
                    <p className="text-[11px] font-sans text-red-300/80 mt-0.5">
                      Please verify network connectivity and system configuration.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {(errorMessage.toLowerCase().includes("permission") || errorMessage.toLowerCase().includes("microphone")) && (
                  <button
                    onClick={requestMicPermission}
                    className="px-3 py-1 bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-200 text-xs font-mono rounded-lg transition-colors cursor-pointer"
                  >
                    Grant Microphone
                  </button>
                )}
                <button
                  onClick={() => StateManager.getInstance().update({ errorMessage: null })}
                  className="p-1 text-red-400 hover:text-white transition-colors cursor-pointer text-xs"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 5.5 Tactical Cockpit Dashboard Tab Switcher */}
      <section className="relative w-full max-w-4xl mx-auto px-6 mb-8 z-10 flex flex-col gap-5">

        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-white/[0.03] border border-white/5 p-1 rounded-xl max-w-md mx-auto w-full">
          <button
            onClick={() => setActiveDashboardTab("memory")}
            className={`flex-1 min-w-[100px] py-2 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer text-center ${
              activeDashboardTab === "memory"
                ? `bg-white/10 border border-white/10 text-white font-medium`
                : "text-slate-400 hover:text-white"
            }`}
          >
            Memory Matrix
          </button>
          <button
            onClick={() => setActiveDashboardTab("vision")}
            className={`flex-1 min-w-[100px] py-2 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer text-center ${
              activeDashboardTab === "vision"
                ? `bg-white/10 border border-white/10 text-white font-medium`
                : "text-slate-400 hover:text-white"
            }`}
          >
            Screen Vision
          </button>
        </div>

        {/* Tab Content Renderer */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {activeDashboardTab === "memory" && (
              <motion.div
                key="memory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MemoryPanel primaryAccentClass={activeTheme.primaryAccent} />
              </motion.div>
            )}
            {activeDashboardTab === "vision" && (
              <motion.div
                key="vision"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <VisionPanel primaryAccentClass={activeTheme.primaryAccent} session={session} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 6. Seamless Fullwidth Ambient Waveform Bar (Bottom) */}
      <footer className="relative w-full p-12 z-10 grid grid-cols-1 md:grid-cols-3 items-end gap-6 border-t border-white/5 bg-slate-950/45 backdrop-blur-md">
        
        {/* Left: Telemetry */}
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center w-52 border-b border-white/10 pb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-white/40">Latency</span>
            <span className={`text-[11px] font-mono transition-colors duration-500 ${getMetricValueColor()}`}>24ms</span>
          </div>
          <div className="flex justify-between items-center w-52 border-b border-white/10 pb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-white/40">Stream</span>
            <span className={`text-[11px] font-mono transition-colors duration-500 ${getMetricValueColor()}`}>{isMuted ? "MUTED" : "16.0 kHz"}</span>
          </div>
          <div className="flex justify-between items-center w-52 border-b border-white/10 pb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-white/40">Uptime</span>
            <span className={`text-[11px] font-mono transition-colors duration-500 uppercase ${getMetricValueColor()}`}>{isMuted ? "PAUSED" : "ACTIVE"}</span>
          </div>
          <div className="flex justify-between items-center w-52 border-b border-white/10 pb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-white/40">Duration</span>
            <span className={`text-[11px] font-mono transition-colors duration-500 uppercase ${getMetricValueColor()}`}>
              {formatDuration(sessionDuration)}
            </span>
          </div>
          <button
            onClick={handleResetSession}
            className="flex items-center justify-between w-52 mt-2 px-3 py-1.5 border border-white/10 hover:border-red-500/30 bg-white/5 hover:bg-red-500/5 text-white/60 hover:text-red-400 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.02)] hover:shadow-[0_0_15px_rgba(239,68,68,0.08)]"
            title="Clear duration and restart IGRIS voice link immediately"
          >
            <span>Reset Session</span>
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Center: Interactive Waveform Canvas */}
        <div className="relative h-24 w-full flex items-center justify-center">
          <WaveformCanvas state={state} />
        </div>

        {/* Right: Active Modules / State status */}
        

      </footer>
    </div>
  );
}
