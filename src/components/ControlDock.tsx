import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sliders,
  Layers,
  Activity,
  Grid,
  Video,
  Cpu,
  BookOpen,
} from "lucide-react";

interface ControlDockProps {
  activeCameraView: "overview" | "CAM_A" | "CAM_B" | "CAM_C" | "CAM_D" | "chase";
  onSelectCameraView: (view: "overview" | "CAM_A" | "CAM_B" | "CAM_C" | "CAM_D" | "chase") => void;
  showFrustums: boolean;
  onToggleFrustums: () => void;
  showTrajectories?: boolean;
  onToggleTrajectories?: () => void;
  showCalibration?: boolean;
  onToggleCalibration?: () => void;
  congestionSpeedFactor: number;
  onChangeSpeedFactor: (val: number) => void;
  onOpenArchitecture?: () => void;
  onOpenHeatmap?: () => void;
  onResetSimulation: () => void;
  onOpenLab?: () => void;
  onOpenDashboard?: () => void;
  onOpenAiReasoner?: () => void;
  isAiLoading?: boolean;
  isNightMode?: boolean;
  onOpenNightMode?: () => void;
  onOpenOutage?: () => void;
  hasActiveOutage?: boolean;
  onOpenAdaptation?: () => void;
  adaptationStatus?: string;
  onOpenPrivacy?: () => void;
  onOpenVisionModels?: () => void;
  activeDetector?: string;
  isCpuMode?: boolean;
  onToggleCpuMode?: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  activeCameraView,
  onSelectCameraView,
  showFrustums,
  onToggleFrustums,
  showTrajectories = true,
  onToggleTrajectories,
  showCalibration = false,
  onToggleCalibration,
  congestionSpeedFactor,
  onChangeSpeedFactor,
  onOpenArchitecture,
  onOpenHeatmap,
  onResetSimulation,
  onOpenLab,
  onOpenVisionModels,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTactical, setActiveTactical] = useState<string | null>(null);

  // Dynamic live event logs matching the screenshot
  const [eventLogs, setEventLogs] = useState<Array<{ id: number; time: string; title: string; subtitle: string; iconType: "yellow" | "dark" | "orange" }>>([
    { id: 1, time: "10:45", title: "Lights Synced", subtitle: "Auto-mode", iconType: "yellow" },
    { id: 2, time: "10:44", title: "Police Dispatched", subtitle: "ETA 2 min", iconType: "dark" },
    { id: 3, time: "10:42", title: "Accident Detected", subtitle: "Sector 4", iconType: "orange" },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const sampleEvents = [
        { title: "Re-ID Confirmed", subtitle: "Rank-1 Match 94.2%", iconType: "yellow" as const },
        { title: "Flow Diverted", subtitle: "Alternate Arterial", iconType: "dark" as const },
        { title: "Queue Spike", subtitle: "Koramangala Link", iconType: "orange" as const },
        { title: "Signal Cycle Synced", subtitle: "Waveform 120s", iconType: "yellow" as const },
      ];
      const pick = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      setEventLogs((prev) => [
        { id: Date.now(), time: timeStr, title: pick.title, subtitle: pick.subtitle, iconType: pick.iconType },
        ...prev.slice(0, 2),
      ]);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // Compute Traffic Load Percentage & Efficiency
  const trafficLoadPct = Math.min(
    92,
    Math.max(28, Math.round(100 - congestionSpeedFactor * 48))
  );
  const efficiencyPct = 46;

  // Tactical Controls handlers
  const handleTactical = (action: string) => {
    setActiveTactical(action);
    setTimeout(() => setActiveTactical(null), 1500);

    switch (action) {
      case "accelerate":
        onChangeSpeedFactor(1.8);
        break;
      case "rerouting":
        if (onOpenLab) onOpenLab();
        break;
      case "monitoring":
        onSelectCameraView(
          activeCameraView === "CAM_A"
            ? "CAM_B"
            : activeCameraView === "CAM_B"
            ? "CAM_C"
            : "CAM_A"
        );
        break;
      case "restriction":
        onChangeSpeedFactor(0.35);
        break;
      case "deviation":
        if (onOpenLab) onOpenLab();
        break;
      case "deactivate":
        onResetSimulation();
        onChangeSpeedFactor(1.0);
        break;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: isCollapsed ? "-140px" : "14px",
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "min(1360px, 98vw)",
        zIndex: 35,
        transition: "bottom 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className="w-full flex flex-col items-center select-none font-gilroy"
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="mb-1.5 px-3.5 py-1 bg-white/80 hover:bg-white text-[#374151] border border-white/80 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] cursor-pointer backdrop-blur-md transition-all"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Show Command Deck</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Minimize</span>
          </>
        )}
      </button>

      {/* Main Container */}
      <div className="w-full glass-panel-light rounded-3xl p-3.5 shadow-[0_24px_70px_rgba(0,0,0,0.1)] space-y-2.5 text-[#111827]">
        {/* Top Mini Control Strip: Camera Perspectives & Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/60 pb-2 text-xs">
          {/* Camera Buttons */}
          <div className="flex items-center gap-1 bg-white/60 p-1 rounded-2xl border border-white/80 overflow-x-auto shadow-xs">
            <span className="text-[11px] font-semibold text-[#6b7280] px-2 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#ea580c]" />
              <span className="hidden sm:inline">Camera:</span>
            </span>
            {[
              { id: "overview", label: "3D God View" },
              { id: "CAM_A", label: "Cam 01 Entry" },
              { id: "CAM_B", label: "Cam 02 Flyover" },
              { id: "CAM_C", label: "Cam 03 Exit" },
              { id: "CAM_D", label: "Cam 04 HSR" },
              { id: "chase", label: "Chase Cam" },
            ].map((cam) => {
              const isActive = activeCameraView === cam.id;
              return (
                <button
                  key={cam.id}
                  onClick={() => onSelectCameraView(cam.id as any)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#111827] text-white shadow-xs"
                      : "text-[#4b5563] hover:bg-gray-100/70"
                  }`}
                >
                  {cam.label}
                </button>
              );
            })}
          </div>

          {/* Overlays & Speed Slider */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFrustums}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showFrustums
                  ? "bg-amber-100/80 text-amber-900 border-amber-300 shadow-xs"
                  : "bg-white/60 text-[#6b7280] border-transparent hover:bg-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#ea580c]" />
              <span className="hidden md:inline">Frustums</span>
            </button>

            {onToggleTrajectories && (
              <button
                onClick={onToggleTrajectories}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showTrajectories
                    ? "bg-amber-100/80 text-amber-900 border-amber-300 shadow-xs"
                    : "bg-white/60 text-[#6b7280] border-transparent hover:bg-white"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="hidden md:inline">Trajectories</span>
              </button>
            )}

            {onToggleCalibration && (
              <button
                onClick={onToggleCalibration}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showCalibration
                    ? "bg-amber-100/80 text-amber-900 border-amber-300 shadow-xs"
                    : "bg-white/60 text-[#6b7280] border-transparent hover:bg-white"
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="hidden md:inline">Grid</span>
              </button>
            )}

            {/* Speed Pace */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
              <span className="text-[11px] text-[#6b7280] flex items-center gap-1 font-medium">
                <Sliders className="w-3 h-3 text-[#ea580c]" />
                Pace:
              </span>
              <input
                type="range"
                min="0.1"
                max="2.2"
                step="0.05"
                value={congestionSpeedFactor}
                onChange={(e) => onChangeSpeedFactor(parseFloat(e.target.value))}
                className="w-16 accent-[#ea580c] h-1.5 bg-gray-200 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-bold text-[#111827] w-9">
                {congestionSpeedFactor.toFixed(2)}x
              </span>
            </div>

            {onOpenVisionModels && (
              <button
                onClick={onOpenVisionModels}
                className="px-2.5 py-1 bg-white hover:bg-gray-50 text-[#1f2937] text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-gray-200 shadow-xs cursor-pointer transition-all"
              >
                <Cpu className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="hidden lg:inline">8 Models</span>
              </button>
            )}

            {onOpenArchitecture && (
              <button
                onClick={onOpenArchitecture}
                className="px-2.5 py-1 bg-white hover:bg-gray-50 text-[#1f2937] text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-gray-200 shadow-xs cursor-pointer transition-all"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="hidden lg:inline">Architecture</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Segmented Columns (Matching the uploaded reference image) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          {/* SECTOR 1: Tactical Controls (Cols 5) */}
          <div className="md:col-span-5 bg-white/70 rounded-2xl border border-gray-200/60 p-2 overflow-hidden shadow-xs">
            <div className="grid grid-cols-3 divide-x divide-gray-200/60 border-b border-gray-200/60 pb-2">
              {/* Accelerate */}
              <button
                onClick={() => handleTactical("accelerate")}
                className={`flex flex-col items-center justify-between p-2 h-20 transition-all rounded-xl cursor-pointer ${
                  activeTactical === "accelerate" ? "bg-amber-100" : "hover:bg-gray-50/80"
                }`}
              >
                <span className="text-[11px] font-semibold text-[#1f2937]">Accelerate</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 rotate-45">
                  <div className="-rotate-45">
                    <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-[#ea580c] fill-current">
                      <polygon points="6,1 11,9 1,9" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Rerouting */}
              <button
                onClick={() => handleTactical("rerouting")}
                className={`flex flex-col items-center justify-between p-2 h-20 transition-all rounded-xl cursor-pointer ${
                  activeTactical === "rerouting" ? "bg-amber-100" : "hover:bg-gray-50/80"
                }`}
              >
                <span className="text-[11px] font-semibold text-[#1f2937]">Rerouting</span>
                <div className="w-12 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 36 24" className="w-9 h-6 text-[#111827]">
                    <path d="M 4 22 C 4 12, 10 10, 18 10 C 26 10, 32 6, 32 2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M 18 10 C 22 10, 26 14, 30 22" fill="none" stroke="#ea580c" strokeWidth="2" />
                    <polygon points="32,0 35,5 29,4" fill="currentColor" />
                  </svg>
                </div>
              </button>

              {/* Monitoring */}
              <button
                onClick={() => handleTactical("monitoring")}
                className={`flex flex-col items-center justify-between p-2 h-20 transition-all rounded-xl cursor-pointer ${
                  activeTactical === "monitoring" ? "bg-amber-100" : "hover:bg-gray-50/80"
                }`}
              >
                <span className="text-[11px] font-semibold text-[#1f2937]">Monitoring</span>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                  <div className="w-3 h-3 rounded-full bg-[#111827] flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                </div>
              </button>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-3 divide-x divide-gray-200/60 pt-2">
              {/* Restriction */}
              <button
                onClick={() => handleTactical("restriction")}
                className={`flex flex-col items-center justify-between p-2 h-20 transition-all rounded-xl cursor-pointer ${
                  activeTactical === "restriction" ? "bg-amber-100" : "hover:bg-gray-50/80"
                }`}
              >
                <span className="text-[11px] font-semibold text-[#1f2937]">Restriction</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 rotate-45">
                  <div className="-rotate-45">
                    <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-[#111827] fill-current">
                      <polygon points="6,11 11,3 1,3" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Deviation */}
              <button
                onClick={() => handleTactical("deviation")}
                className={`flex flex-col items-center justify-between p-2 h-20 transition-all rounded-xl cursor-pointer ${
                  activeTactical === "deviation" ? "bg-amber-100" : "hover:bg-gray-50/80"
                }`}
              >
                <span className="text-[11px] font-semibold text-[#1f2937]">Deviation</span>
                <div className="w-12 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 36 24" className="w-9 h-6">
                    <path d="M 6 22 L 6 8" stroke="#9ca3af" strokeWidth="2" strokeDasharray="2 2" />
                    <path d="M 18 22 C 18 14, 24 10, 28 6" fill="none" stroke="#ea580c" strokeWidth="2" />
                    <polygon points="29,4 32,9 26,8" fill="#ea580c" />
                    <path d="M 30 22 L 30 14" stroke="#9ca3af" strokeWidth="2" strokeDasharray="2 2" />
                  </svg>
                </div>
              </button>

              {/* Deactivate */}
              <button
                onClick={() => handleTactical("deactivate")}
                className={`flex flex-col items-center justify-between p-2 h-20 transition-all rounded-xl cursor-pointer ${
                  activeTactical === "deactivate" ? "bg-amber-100" : "hover:bg-gray-50/80"
                }`}
              >
                <span className="text-[11px] font-semibold text-[#1f2937]">Deactivate</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 rotate-45">
                  <div className="-rotate-45 w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
                </div>
              </button>
            </div>
          </div>

          {/* SECTOR 2: Traffic Load (Cols 2) */}
          <div className="md:col-span-2 bg-white/70 rounded-2xl border border-gray-200/60 p-3.5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-xs font-bold text-[#111827]">Traffic Load</div>
              <div className="text-[10px] text-[#6b7280]">Sector 4</div>
            </div>

            <div className="my-1">
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111827]">
                {trafficLoadPct}
                <span className="text-lg font-bold text-[#6b7280] ml-0.5">%</span>
              </div>
            </div>

            {/* Arc / Tick Marks Scale */}
            <div className="space-y-1">
              <div className="relative w-full h-2">
                <div className="absolute inset-0 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${trafficLoadPct}%` }}
                    className="h-full bg-[#ea580c] rounded-full transition-all duration-300"
                  />
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-[#9ca3af] font-mono">
                <span>40%</span>
                <span>45%</span>
                <span>50%</span>
                <span>55%</span>
              </div>
            </div>
          </div>

          {/* SECTOR 3: Efficiency (Cols 2) */}
          <div className="md:col-span-2 bg-white/70 rounded-2xl border border-gray-200/60 p-3.5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-xs font-bold text-[#111827]">Efficiency</div>
              <div className="text-[10px] text-[#6b7280]">System Status</div>
            </div>

            <div className="my-1">
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111827]">
                {efficiencyPct}
                <span className="text-lg font-bold text-[#6b7280] ml-0.5">%</span>
              </div>
            </div>

            {/* Colored Tick Marks Scale */}
            <div className="space-y-1">
              <div className="relative w-full h-2">
                <div className="absolute inset-0 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${efficiencyPct}%` }}
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  />
                </div>
              </div>
              <div className="flex justify-between text-[9px] text-[#9ca3af] font-mono">
                <span>40%</span>
                <span>45%</span>
                <span>50%</span>
                <span>55%</span>
                <span>60%</span>
              </div>
            </div>
          </div>

          {/* SECTOR 4: Event Log (Cols 3) */}
          <div className="md:col-span-3 bg-white/70 rounded-2xl border border-gray-200/60 p-3 flex flex-col justify-between shadow-xs">
            <div className="border-b border-gray-200/60 pb-1.5 mb-1.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#111827]">Event Log</span>
                <span className="text-[10px] text-[#6b7280] block">Sector 4</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
            </div>

            <div className="space-y-1.5">
              {eventLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between gap-2 text-xs py-0.5"
                >
                  <span className="text-[11px] font-mono text-[#6b7280] w-10">
                    {log.time}
                  </span>
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-[#111827] block truncate text-[11px] leading-tight">
                      {log.title}
                    </span>
                    <span className="text-[10px] text-[#6b7280] block truncate leading-none">
                      {log.subtitle}
                    </span>
                  </div>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      log.iconType === "yellow"
                        ? "bg-amber-400"
                        : log.iconType === "dark"
                        ? "bg-[#111827]"
                        : "bg-[#ea580c]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
