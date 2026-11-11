import React, { useState, useEffect } from "react";
import { 
  Battery, 
  BatteryCharging, 
  Zap, 
  Thermometer, 
  Activity, 
  Cpu, 
  RefreshCw 
} from "lucide-react";
import { StateManager } from "../state/StateManager";

interface CoreBatteryIndicatorProps {
  state: "disconnected" | "connecting" | "listening" | "speaking" | "muted";
  primaryAccentClass?: string;
}

export const CoreBatteryIndicator: React.FC<CoreBatteryIndicatorProps> = ({ 
  state,
  primaryAccentClass = "text-cyan-400"
}) => {
  const [charge, setCharge] = useState<number>(() => {
    const saved = localStorage.getItem("igris-core-charge");
    return saved ? parseFloat(saved) : 94.2;
  });

  const [integrity, setIntegrity] = useState<number>(() => {
    const saved = localStorage.getItem("igris-core-integrity");
    return saved ? parseFloat(saved) : 99.8;
  });

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [temperature, setTemperature] = useState(36.4);
  const [currentDraw, setCurrentDraw] = useState(1.1);

  // Save charge/integrity state
  useEffect(() => {
    localStorage.setItem("igris-core-charge", charge.toFixed(1));
  }, [charge]);

  useEffect(() => {
    localStorage.setItem("igris-core-integrity", integrity.toFixed(2));
  }, [integrity]);

  // Handle live status fluctuations based on Voice Assistant State
  useEffect(() => {
    if (isCalibrating) return;

    const interval = setInterval(() => {
      // 1. Temperature fluctuations
      let baseTemp = 36.0;
      let draw = 0.5;

      switch (state) {
        case "speaking":
          baseTemp = 42.5;
          draw = 3.8;
          // Discharge faster when speaking
          setCharge(prev => Math.max(2.0, prev - 0.15));
          break;
        case "listening":
          baseTemp = 38.2;
          draw = 1.9;
          // Slowly discharge when listening
          setCharge(prev => Math.max(2.0, prev - 0.05));
          break;
        case "connecting":
          baseTemp = 39.5;
          draw = 2.4;
          setCharge(prev => Math.max(2.0, prev - 0.08));
          break;
        case "muted":
          baseTemp = 35.8;
          draw = 0.8;
          setCharge(prev => Math.max(2.0, prev - 0.02));
          break;
        case "disconnected":
        default:
          baseTemp = 32.2;
          draw = 0.15; // idle trickle charging
          // Recharge when disconnected (trickle charge)
          setCharge(prev => Math.min(100.0, prev + 0.1));
          break;
      }

      // Add slight noise
      const tempNoise = (Math.random() - 0.5) * 0.8;
      const drawNoise = (Math.random() - 0.5) * 0.15;

      setTemperature(parseFloat((baseTemp + tempNoise).toFixed(1)));
      setCurrentDraw(parseFloat(Math.max(0.1, draw + drawNoise).toFixed(2)));

      // Occasional tiny degradation of core integrity
      if (Math.random() < 0.05) {
        setIntegrity(prev => Math.max(85.0, parseFloat((prev - 0.01).toFixed(2))));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [state, isCalibrating]);

  // Initiate power cell calibration routine
  const handleCalibrate = () => {
    if (isCalibrating) return;

    setIsCalibrating(true);
    StateManager.getInstance().addLog("IGRIS CORE: Initiating power cell re-calibration sequence...", "system");

    // Phase 1
    setTimeout(() => {
      StateManager.getInstance().addLog("IGRIS CORE: Balancing cell voltages. Purging residual static feedback...", "system");
    }, 1000);

    // Phase 2: completion
    setTimeout(() => {
      setCharge(100.0);
      setIntegrity(100.0);
      setTemperature(35.0);
      setCurrentDraw(0.1);
      setIsCalibrating(false);
      StateManager.getInstance().addLog("IGRIS CORE: Power core optimization complete. Cellular integrity at 100.0% (Optimal).", "system");
    }, 2500);
  };

  // Determine battery color based on charge levels
  const getBatteryColor = () => {
    if (isCalibrating) return "text-amber-400";
    if (charge > 50) return "text-emerald-400";
    if (charge > 20) return "text-yellow-400";
    return "text-red-500 animate-pulse";
  };

  const getBatteryFillWidth = () => {
    return `${charge}%`;
  };

  return (
    <div id="igris-core-battery-dashboard" className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-5 md:p-6 backdrop-blur-xl relative overflow-hidden transition-all duration-500 hover:border-white/10">
      
      {/* Background Grid Accent */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:16px_16px]" />

      {/* Dynamic Charging Ripple Overlay */}
      {isCalibrating && (
        <div className="absolute inset-0 bg-amber-500/[0.03] animate-pulse pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Cpu className={`w-4 h-4 ${primaryAccentClass}`} />
          </div>
          <div>
            <h3 className="text-xs font-mono font-medium tracking-wider text-white uppercase flex items-center gap-2">
              IGRIS Core Power Matrix
              {isCalibrating && (
                <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 animate-pulse">
                  Calibrating
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono tracking-normal">
              Simulated electrochemical cells tracking live speech & telemetry load
            </p>
          </div>
        </div>

        <button
          onClick={handleCalibrate}
          disabled={isCalibrating}
          id="btn-calibrate-core-battery"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono tracking-wider transition-all cursor-pointer ${
            isCalibrating 
              ? "bg-amber-400/10 text-amber-400 border-amber-400/20" 
              : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:text-white"
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${isCalibrating ? "animate-spin text-amber-400" : ""}`} />
          {isCalibrating ? "recalibrating..." : "Optimize Core"}
        </button>
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
        
        {/* Left column: Battery graphics */}
        <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 pb-5 md:pb-0 md:pr-6">
          <div className="relative flex items-center justify-center mb-3">
            {/* Outer Battery Body */}
            <div className="w-56 h-28 border-2 border-slate-600 rounded-2xl p-1.5 relative flex items-center bg-black/40 shadow-inner">
              {/* Terminal Cap */}
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-2.5 h-10 bg-slate-600 rounded-r-md" />

              {/* Glowing fill */}
              <div 
                className={`h-full rounded-xl transition-all duration-1000 relative flex items-center justify-end overflow-hidden ${
                  charge > 50 
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]" 
                    : charge > 20 
                    ? "bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]" 
                    : "bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.35)]"
                }`}
                style={{ width: getBatteryFillWidth() }}
              >
                {/* Micro tech pattern on fill */}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_45%,rgba(255,255,255,0.15)_50%,transparent_55%)] bg-[size:10px_100%]" />
              </div>

              {/* Dynamic Overlay Text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-mono font-bold tracking-tight text-white select-none">
                    {charge.toFixed(1)}%
                  </span>
                  <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest select-none flex items-center gap-1">
                    {state === "disconnected" ? (
                      <>
                        <BatteryCharging className="w-2.5 h-2.5 text-emerald-400" />
                        TRICKLE CHARGING
                      </>
                    ) : (
                      <>
                        <Zap className="w-2.5 h-2.5 text-yellow-400" />
                        DISCHARGING
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Stats grid */}
        <div className="md:col-span-7 grid grid-cols-2 gap-4">
          
          {/* Stat: Core Health */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Cellular Health</span>
            </div>
            <div>
              <span className="text-lg font-mono font-semibold tracking-tight text-white">
                {integrity.toFixed(2)}%
              </span>
              <p className="text-[8px] font-mono text-emerald-400/80 mt-0.5">
                {integrity > 95 ? "STABLE / OPTIMAL" : "DEGRADED - CYCLE RECOMMENDED"}
              </p>
            </div>
          </div>

          {/* Stat: Current Temp */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Core Temp</span>
            </div>
            <div>
              <span className="text-lg font-mono font-semibold tracking-tight text-white">
                {temperature.toFixed(1)}°C
              </span>
              <p className="text-[8px] font-mono text-slate-400 mt-0.5 uppercase">
                {temperature > 40 ? "Thermal Warning" : "Thermal Stable"}
              </p>
            </div>
          </div>

          {/* Stat: Power Draw */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Current Draw</span>
            </div>
            <div>
              <span className="text-lg font-mono font-semibold tracking-tight text-white">
                {currentDraw.toFixed(2)} A
              </span>
              <p className="text-[8px] font-mono text-slate-400 mt-0.5 uppercase">
                {state === "speaking" ? "Active Stream Load" : "Standby Drain"}
              </p>
            </div>
          </div>

          {/* Stat: Power Output Status */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Battery className={`w-3.5 h-3.5 ${getBatteryColor()}`} />
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Core Status</span>
            </div>
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-white leading-none">
                {isCalibrating ? (
                  <span className="text-amber-400 animate-pulse">RE-CALIBRATING</span>
                ) : state === "disconnected" ? (
                  <span className="text-emerald-400">RECHARGING</span>
                ) : state === "speaking" ? (
                  <span className="text-red-400 animate-pulse">HIGH DRAW</span>
                ) : (
                  <span className="text-blue-400">MONITORING</span>
                )}
              </span>
              <p className="text-[8px] font-mono text-slate-400 mt-1 uppercase">
                SYS: {state}
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
