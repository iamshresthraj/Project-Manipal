import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  ShieldCheck,
  Flame,
  Gauge,
  Zap,
  Layers,
  Compass,
  LineChart,
  TrendingDown,
  TrendingUp,
  Info,
} from "lucide-react";
import {
  ReIdMatchResult,
  SimulatedVehicle,
  VisionModelPipelineConfig,
} from "../types/reid";
import { Cpu, Crosshair, Wrench } from "lucide-react";

interface CctvInspectionFeedProps {
  activeCameraId: "CAM_A" | "CAM_B" | "CAM_C" | "CAM_D" | "overview" | "chase";
  selectedVehicle: SimulatedVehicle | null;
  recentMatches: ReIdMatchResult[];
  onSelectVehicle: (id: string) => void;
  avgCorridorSpeedKmh?: number;
  congestionAlertThreshold?: number;
  congestionSpeedFactor?: number;
  onMitigateCongestion?: () => void;
  onChangeSpeedFactor?: (val: number) => void;
  isNightMode?: boolean;
  enhancerMode?: "none" | "retinex_net" | "thermal_ir";
  offlineCameraId?: string | null;
  visionConfig?: VisionModelPipelineConfig;
  onOpenVisionModels?: () => void;
  onToggleCpuMode?: () => void;
}

export interface TrackletConfidencePoint {
  id: string;
  timeSeconds: number;
  score: number; // 0.0 to 1.0
  cameraLabel?: string;
  cueReason?: string;
}

// Procedural soft tech chime using Web Audio API (Zero external mp3 dependencies)
function playProceduralReIdChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

// Procedural urgent low-frequency warning tone for high-congestion alert threshold breach
function playProceduralCongestionTone() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export const CctvInspectionFeed: React.FC<CctvInspectionFeedProps> = ({
  activeCameraId,
  selectedVehicle,
  recentMatches,
  onSelectVehicle,
  avgCorridorSpeedKmh = 28.4,
  congestionAlertThreshold = 10.0,
  congestionSpeedFactor = 1.0,
  onMitigateCongestion,
  onChangeSpeedFactor,
  isNightMode = false,
  enhancerMode = "retinex_net",
  offlineCameraId = null,
  visionConfig,
  onOpenVisionModels,
  onToggleCpuMode,
}) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Active real-time notification state for high-confidence matches
  const [activeNotification, setActiveNotification] = useState<ReIdMatchResult | null>(null);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const lastProcessedMatchId = useRef<string | null>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // High Congestion Alert State (< 10 km/h)
  const isCongested = avgCorridorSpeedKmh < congestionAlertThreshold;
  const [dismissedCongestionAlert, setDismissedCongestionAlert] = useState(false);
  const prevCongestedRef = useRef(false);

  // Tracklet Continuous Confidence History for the Sparkline Graph
  const trackletHistoryMap = useRef<Map<string, TrackletConfidencePoint[]>>(new Map());
  const [currentSparklineData, setCurrentSparklineData] = useState<TrackletConfidencePoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<TrackletConfidencePoint | null>(null);

  // Sound and banner trigger when speed drops below 10 km/h threshold
  useEffect(() => {
    if (isCongested && !prevCongestedRef.current) {
      setDismissedCongestionAlert(false);
      if (soundEnabled) {
        playProceduralCongestionTone();
      }
    } else if (!isCongested && prevCongestedRef.current) {
      setDismissedCongestionAlert(false);
    }
    prevCongestedRef.current = isCongested;
  }, [isCongested, soundEnabled]);

  const cameraTitles: Record<string, string> = {
    CAM_A: "CAM 01: Silk Board North Entry",
    CAM_B: "CAM 02: Koramangala 100ft Flyover",
    CAM_C: "CAM 03: HSR Layout Sector 1 Gate",
    CAM_D: "CAM 04: HSR Outer Ring Road Link",
    overview: "3D Spatial Corridor Overview",
    chase: "Vehicle Dynamic Chase Cam",
  };

  // Monitor incoming matches for high-confidence confirmations (combinedScore >= 0.78)
  useEffect(() => {
    if (recentMatches.length === 0) return;
    const latest = recentMatches[0];
    if (!latest) return;

    // High-Confidence Confirmation Alert (combinedScore >= 0.78)
    if (
      latest.id !== lastProcessedMatchId.current &&
      latest.decision === "TRUE_MATCH" &&
      latest.combinedScore >= 0.78
    ) {
      lastProcessedMatchId.current = latest.id;
      setActiveNotification(latest);
      setNotificationVisible(true);

      if (soundEnabled) {
        playProceduralReIdChime();
      }

      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
      notificationTimerRef.current = setTimeout(() => {
        setNotificationVisible(false);
      }, 5200);
    }
  }, [recentMatches, soundEnabled]);

  // Synchronize Sparkline confidence history for the currently selected vehicle
  useEffect(() => {
    if (!selectedVehicle) return;

    const vehicleKey = selectedVehicle.id;
    let existing = trackletHistoryMap.current.get(vehicleKey);

    if (!existing || existing.length === 0) {
      // Build an initial 10-point continuous tracklet trajectory leading to current position
      const basePoints: TrackletConfidencePoint[] = [];
      const now = Math.round(Date.now() / 1000);

      for (let i = 9; i >= 0; i--) {
        const t = now - i * 3;
        const score = 0.88 + Math.sin(i * 0.9) * 0.05 + (i % 2 === 0 ? 0.015 : -0.015);
        let camLabel: string | undefined = undefined;

        if (i === 9) camLabel = "CAM 01";
        if (i === 5) camLabel = "CAM 02";

        basePoints.push({
          id: `pt_${vehicleKey}_${t}_${i}`,
          timeSeconds: t,
          score: parseFloat(Math.max(0.65, Math.min(0.98, score)).toFixed(3)),
          cameraLabel: camLabel,
          cueReason: "Continuous spatial correlation",
        });
      }

      existing = basePoints;
      trackletHistoryMap.current.set(vehicleKey, existing);
    }

    setCurrentSparklineData([...existing]);

    // Interval to append real-time tracking points as vehicle traverses corridor
    const interval = setInterval(() => {
      setCurrentSparklineData((prev) => {
        const last = prev[prev.length - 1];
        const t = Math.round(Date.now() / 1000);
        const prevScore = last ? last.score : 0.88;
        const target = 0.89;
        let nextScore = prevScore + (target - prevScore) * 0.25 + (Math.random() - 0.5) * 0.035;
        nextScore = Math.max(0.65, Math.min(0.98, nextScore));

        const newPoint: TrackletConfidencePoint = {
          id: `pt_${vehicleKey}_${t}`,
          timeSeconds: t,
          score: parseFloat(nextScore.toFixed(3)),
          cueReason: "Continuous correlation",
        };

        const updated = [...prev.slice(-19), newPoint];
        trackletHistoryMap.current.set(vehicleKey, updated);
        return updated;
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [selectedVehicle?.id]);

  // If a real match event arrives for the selected vehicle, log exact match score into sparkline
  useEffect(() => {
    if (!selectedVehicle || recentMatches.length === 0) return;
    const latest = recentMatches[0];
    if (
      latest &&
      (latest.candidateVehicleId === selectedVehicle.id ||
        latest.queryVehicleId === selectedVehicle.id ||
        latest.candidateVehicleId === selectedVehicle.globalId)
    ) {
      setCurrentSparklineData((prev) => {
        const point: TrackletConfidencePoint = {
          id: `match_${latest.id}`,
          timeSeconds: Math.round(Date.now() / 1000),
          score: latest.combinedScore,
          cameraLabel: latest.targetCamera,
          cueReason: latest.decision === "TRUE_MATCH" ? "Confirmed Match" : "Active Tracklet",
        };
        const updated = [...prev.slice(-19), point];
        trackletHistoryMap.current.set(selectedVehicle.id, updated);
        return updated;
      });
    }
  }, [recentMatches, selectedVehicle]);

  const dismissNotification = () => {
    setNotificationVisible(false);
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
  };


  // Compute Sparkline Metrics for the selected vehicle
  const latestSparklinePoint =
    currentSparklineData.length > 0
      ? currentSparklineData[currentSparklineData.length - 1]
      : null;

  const minConfidence =
    currentSparklineData.length > 0
      ? Math.min(...currentSparklineData.map((p) => p.score))
      : 0.88;

  const maxConfidence =
    currentSparklineData.length > 0
      ? Math.max(...currentSparklineData.map((p) => p.score))
      : 0.88;

  const avgConfidence =
    currentSparklineData.length > 0
      ? currentSparklineData.reduce((s, p) => s + p.score, 0) / currentSparklineData.length
      : 0.88;

  const initialScore =
    currentSparklineData.length > 0 ? currentSparklineData[0].score : 0.88;

  const deltaScore = latestSparklinePoint ? latestSparklinePoint.score - initialScore : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: "76px",
        right: "16px",
        width: "356px",
        maxWidth: "calc(100vw - 32px)",
        zIndex: 35,
      }}
      className="flex flex-col gap-2.5 select-none font-gilroy"
    >
      {/* 2. High-Congestion Visual Alert Banner */}
      {isCongested && !dismissedCongestionAlert && (
        <div
          style={{
            boxShadow:
              "0 0 28px rgba(193, 3, 3, 0.65), 0 0 10px rgba(138, 2, 2, 0.5)",
          }}
          className="bg-[#080808]/98 border-2 border-[#C10303] rounded-2xl p-3.5 text-white shadow-2xl relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background:
                "radial-gradient(circle at 50% 25%, #C10303 0%, #8a0202 50%, transparent 75%)",
            }}
          />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#C10303]/20 text-[#C10303] border border-[#C10303]/60">
                <AlertCircle className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-white bg-[#C10303] px-1.5 py-0.5 rounded">
                    BOTTLENECK ALERT
                  </span>
                  <span className="text-[10px] text-[#C10303] font-editorial-mono font-bold animate-pulse">
                    ACTIVE
                  </span>
                </div>
                <span className="text-xs font-bold text-white block leading-tight mt-0.5">
                  Critical Corridor Congestion
                </span>
              </div>
            </div>

            <button
              onClick={() => setDismissedCongestionAlert(true)}
              className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-[#000000]/80 border border-[#C10303]/40 p-2.5 rounded-xl relative z-10 mb-2.5 space-y-2 font-gilroy">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-white/50 uppercase font-editorial-mono block">
                  Corridor Avg Speed
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-editorial-mono font-black text-[#C10303] animate-pulse">
                    {avgCorridorSpeedKmh.toFixed(1)}
                  </span>
                  <span className="text-xs font-editorial-mono text-white/70 font-semibold">km/h</span>
                  <span className="text-[9px] font-editorial-mono text-white/90 bg-[#C10303]/30 px-1 py-0.5 rounded border border-[#C10303]/50">
                    &lt; {congestionAlertThreshold.toFixed(0)} km/h
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-white/50 uppercase font-editorial-mono block">
                  Alert Threshold
                </span>
                <div className="text-xs font-editorial-mono font-bold text-white">
                  {congestionAlertThreshold.toFixed(1)} km/h
                </div>
                <span className="text-[9px] text-[#C10303] font-medium">Gridlock Risk</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-[#050505] rounded-full h-2 overflow-hidden p-0.5 border border-white/10 relative">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#C10303] z-10 shadow-[0_0_4px_#C10303]"
                  style={{ left: "20%" }}
                  title="Alert Threshold (10 km/h)"
                />
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-[#C10303] via-[#e50505] to-amber-500"
                  style={{
                    width: `${Math.min(100, Math.max(6, (avgCorridorSpeedKmh / 50) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-editorial-mono text-white/50">
                <span className="text-[#C10303] font-bold">Stalled (0)</span>
                <span className="text-white/70 font-semibold">Threshold (10 km/h)</span>
                <span>Normal (50)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={() => {
                if (onMitigateCongestion) {
                  onMitigateCongestion();
                } else if (onChangeSpeedFactor) {
                  onChangeSpeedFactor(1.2);
                }
              }}
              className="flex-1 py-1.5 px-2 bg-[#C10303] hover:bg-[#d90404] text-white text-xs font-bold rounded-lg shadow-[0_0_12px_rgba(193,3,3,0.5)] transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/20"
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span>Mitigate / Boost Pace (1.2x)</span>
            </button>

            {onChangeSpeedFactor && (
              <button
                onClick={() => onChangeSpeedFactor(0.15)}
                className="py-1.5 px-2 bg-black/60 hover:bg-black text-white/70 hover:text-white border border-white/15 text-xs font-editorial-mono rounded-lg transition-colors cursor-pointer"
                title="Simulate severe crawl (< 10 km/h)"
              >
                Crawl
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Real-Time High-Confidence Match Notification Alert with Visual Pulse */}
      {notificationVisible && activeNotification && (
        <div
          style={{
            boxShadow: "0 0 24px rgba(193, 3, 3, 0.45)",
          }}
          className="bg-[#080808]/98 border-2 border-[#C10303] rounded-2xl p-3.5 text-white shadow-2xl relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: "radial-gradient(circle at 50% 50%, #C10303 0%, transparent 70%)",
            }}
          />

          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-[#C10303]/20 text-[#C10303] border border-[#C10303]/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 block leading-tight">
                  Cross-Camera Re-ID Match
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  Confidence: {(activeNotification.combinedScore * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <button
              onClick={dismissNotification}
              className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-xs bg-[#000000]/85 border border-[#C10303]/30 p-2.5 rounded-xl relative z-10 mb-2.5 font-editorial-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50">Route Link:</span>
              <span className="text-white font-bold flex items-center gap-1">
                {activeNotification.sourceCamera} <ArrowRight className="w-3 h-3 text-[#C10303]" /> {activeNotification.targetCamera}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50">Transit Delta:</span>
              <span className="text-white font-semibold">
                {activeNotification.transitDeltaSeconds}s ({activeNotification.impliedSpeedKmh} km/h)
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50">Windshield FASTag:</span>
              <span className="text-[#C10303] font-semibold">
                {(activeNotification.fastagScore * 100).toFixed(0)}% (Δgrid={activeNotification.fastagGridDiff?.gridSteps ?? 0})
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/50">Tyre Profiler:</span>
              <span className="text-white/90 font-semibold">
                {(activeNotification.tyrePressureScore * 100).toFixed(0)}% (RMSE={activeNotification.tyrePressureRmse} PSI)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] text-white/50 flex items-center gap-1 font-editorial-mono">
              <ShieldCheck className="w-3 h-3 text-[#C10303]" />
              Non-Plate Re-ID
            </span>
            <button
              onClick={() => {
                onSelectVehicle(activeNotification.candidateVehicleId);
                dismissNotification();
              }}
              className="px-2.5 py-1 bg-[#C10303] hover:bg-[#d90404] text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer border border-white/20"
            >
              Inspect Vehicle
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Camera Feed Simulator Card */}
      <div
        className={`bg-[#080808]/95 border rounded-2xl shadow-xl overflow-hidden text-white transition-colors duration-300 ${
          isCongested
            ? "border-[#C10303] shadow-[0_0_20px_rgba(193,3,3,0.35)]"
            : "border-[#C10303]/30"
        }`}
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-[#000000] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCongested ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C10303] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C10303]"></span>
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#C10303]" />
            )}
            <span className="text-xs font-bold text-white truncate max-w-[170px] font-gilroy">
              {cameraTitles[activeCameraId] || "CCTV Feed"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1 rounded transition-colors ${
                soundEnabled ? "text-[#C10303] bg-white/10" : "text-white/40 hover:text-white"
              }`}
              title={soundEnabled ? "Mute alert audio" : "Enable audio alerts"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-white/40 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="p-3 space-y-3 font-gilroy">
            {/* Simulated Camera Viewfinder */}
            <div
              className={`relative aspect-video bg-[#050505] rounded-xl overflow-hidden border flex items-center justify-center transition-colors duration-300 ${
                isCongested ? "border-[#C10303]" : "border-white/10"
              }`}
            >
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(193, 3, 3, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(193, 3, 3, 0.25) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              {/* Camera Status HUD */}
              <div className="absolute top-2 left-2 text-[10px] font-editorial-mono text-white bg-black/80 px-2 py-0.5 rounded border border-[#C10303]/50 flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-[#C10303]" />
                <span>
                  {offlineCameraId === activeCameraId ? "OFFLINE / IMPUTING" : "LIVE · 30 FPS · 1080P"}
                </span>
              </div>

              {/* Night Mode & Enhancer Indicator */}
              {isNightMode && (
                <div className="absolute bottom-2 right-2 text-[10px] font-editorial-mono font-bold text-amber-300 bg-black/90 px-2 py-0.5 rounded border border-amber-500/60 flex items-center gap-1">
                  <span>
                    {enhancerMode === "thermal_ir"
                      ? "IR THERMAL FUSION"
                      : enhancerMode === "retinex_net"
                      ? "RETINEX-NET ENHANCE"
                      : "LOW LIGHT RAW"}
                  </span>
                </div>
              )}

              {/* Outage Banner in Viewfinder */}
              {offlineCameraId === activeCameraId && (
                <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 z-10 text-center pointer-events-none border border-[#C10303]/40">
                  <div className="px-2 py-0.5 rounded bg-[#C10303] text-white font-editorial-mono text-[10px] font-black uppercase tracking-wider mb-1">
                    CAMERA FEED OFFLINE
                  </div>
                  <div className="text-xs text-white/90 font-bold">
                    Bayesian Travel-Time Flow Imputation Active
                  </div>
                </div>
              )}

              <div className="absolute bottom-2 left-2 text-[10px] font-editorial-mono text-white/60 bg-black/80 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5">
                <span>NON-PLATE RE-ID</span>
                <span className="text-white/30">/</span>
                <span className="text-white font-bold">
                  {visionConfig?.isCpuLowPowerMode
                    ? "YOLO26n (CPU)"
                    : visionConfig?.activeDetector === "yolo27"
                    ? "YOLO27"
                    : "YOLO26s"}
                </span>
                <span className="text-white/30">/</span>
                <span className="text-[#C10303]">
                  {visionConfig?.forceFallbackEmbedder ? "DINOv2" : "OSNet"}
                </span>
              </div>

              {/* Selected Vehicle Crop Overlay with Real-Time Dynamic Tracklet Status */}
              {selectedVehicle ? (
                <div className="p-3 text-center space-y-1 z-10">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded bg-[#C10303]/20 text-white border border-[#C10303]/60 text-xs font-editorial-mono font-bold">
                      [ByteTrack #{selectedVehicle.globalId.replace(/\D/g, "") || "42"}]
                    </span>
                    <span className="text-[10px] font-editorial-mono px-1.5 py-0.5 rounded bg-black/60 text-white/70 border border-white/10">
                      {visionConfig?.detectorWeights || "yolo26s.pt"}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white capitalize font-gilroy">
                    {selectedVehicle.colorName} {selectedVehicle.type.replace("_", " ")}
                  </div>
                  <div className="text-[10px] text-white/60 font-editorial-mono">
                    Lane: {selectedVehicle.currentLane === -1 ? "Fast" : selectedVehicle.currentLane === 0 ? "Middle" : "Service"} · Spd: {(selectedVehicle.velocity * 3.6).toFixed(0)} km/h
                  </div>

                  {/* YOLOv8m-t42 Real-time Dent Defect Detection Visual Flag */}
                  {selectedVehicle.dentDefects && selectedVehicle.dentDefects.length > 0 && (
                    <div className="mt-1 px-2 py-0.5 rounded bg-[#121212] border border-[#C10303]/60 text-[10px] text-white font-editorial-mono flex items-center justify-center gap-1">
                      <Wrench className="w-3 h-3 text-[#C10303]" />
                      <span>
                        YOLOv8m-t42: {selectedVehicle.dentDefects[0].label} ({Math.round(selectedVehicle.dentDefects[0].confidence * 100)}%)
                      </span>
                    </div>
                  )}

                  {/* Real-Time Dynamic Tracklet Status */}
                  <div className="pt-1 flex items-center justify-center gap-1 text-[10px] font-editorial-mono">
                    <span className="text-white/50">Tracklet Status:</span>
                    <span className="text-white font-bold flex items-center gap-1 bg-[#C10303]/20 px-2 py-0.5 rounded border border-[#C10303]/50">
                      <ShieldCheck className="w-3 h-3 text-[#C10303]" />
                      Locked ({latestSparklinePoint ? (latestSparklinePoint.score * 100).toFixed(0) : 88}%)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-3 text-white/40 text-xs flex flex-col items-center gap-1 font-gilroy">
                  <Activity className="w-5 h-5 text-white/30" />
                  <span>Click any vehicle in 3D scene to inspect visual embedding</span>
                </div>
              )}
            </div>

            {/* Selected Vehicle Visual Signature & Sparkline Breakdown */}
            {selectedVehicle && (
              <div className="space-y-2 text-xs bg-[#0a0a0a] p-2.5 rounded-xl border border-white/10 font-gilroy">
                {/* ------------------------------------------------------------- */}
                {/* SPARKLINE GRAPH: Continuous Tracklet Confidence Over Time    */}
                {/* ------------------------------------------------------------- */}
                <div className="bg-[#050505] p-2.5 rounded-xl border border-white/10 relative overflow-hidden space-y-2">
                  {/* Sparkline Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-[#C10303]/20 text-[#C10303] border border-[#C10303]/40">
                        <LineChart className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider font-gilroy">
                            Confidence Sparkline
                          </span>
                          <span className="text-[9px] font-editorial-mono font-bold px-1.5 py-0.2 rounded border bg-[#C10303]/15 text-white border-[#C10303]/40">
                            STABLE
                          </span>
                        </div>
                        <span className="text-[9px] text-white/50 block font-editorial-mono">
                          Continuous Tracklet Association
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SVG Sparkline Canvas */}
                  <div
                    className="relative w-full h-[76px] bg-[#000000] rounded-lg border border-white/10 overflow-hidden"
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* SVG Render */}
                    <svg
                      viewBox="0 0 290 76"
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        {/* Area Gradient */}
                        <linearGradient id="trackletConfGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C10303" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#8a0202" stopOpacity="0.04" />
                        </linearGradient>

                        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      {/* 1. Grid Guidelines */}
                      <line x1="28" y1="8" x2="280" y2="8" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" strokeDasharray="2 2" />
                      <text x="24" y="11" textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="6.5" fontFamily="monospace">1.0</text>

                      <line x1="28" y1="18.8" x2="280" y2="18.8" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2 2" />
                      <text x="24" y="21" textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="6.5" fontFamily="monospace">0.8</text>

                      <line x1="28" y1="29.6" x2="280" y2="29.6" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="2 2" />
                      <text x="24" y="32" textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="6.5" fontFamily="monospace">0.6</text>

                      <line x1="28" y1="62" x2="280" y2="62" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                      <text x="24" y="64" textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="6.5" fontFamily="monospace">0.0</text>

                      {/* Mid (0.60) guideline */}
                      <line x1="28" y1="29.6" x2="280" y2="29.6" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.25" />
                      <text x="24" y="32" textAnchor="end" fill="#64748b" fontSize="6.5" fontFamily="monospace">0.6</text>

                      {/* Bottom (0.00) guideline */}
                      <line x1="28" y1="62" x2="280" y2="62" stroke="#334155" strokeWidth="0.5" opacity="0.5" />
                      <text x="24" y="64" textAnchor="end" fill="#64748b" fontSize="6.5" fontFamily="monospace">0.0</text>

                      {/* 2. Sparkline Data Path */}
                      {currentSparklineData.length >= 2 && (() => {
                        const pts = currentSparklineData.map((pt, idx) => {
                          const x = 28 + (idx / Math.max(1, currentSparklineData.length - 1)) * 252;
                          // Score mapped between y=8 (score=1.0) and y=62 (score=0.0)
                          const y = 8 + (1.0 - Math.max(0, Math.min(1.0, pt.score))) * 54;
                          return { x, y, pt };
                        });

                        const pathD = pts.reduce(
                          (acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`),
                          ""
                        );
                        const areaD = `${pathD} L ${pts[pts.length - 1].x},62 L ${pts[0].x},62 Z`;

                        const latest = pts[pts.length - 1];

                        return (
                          <>
                            {/* Area Fill */}
                            <path d={areaD} fill="url(#trackletConfGrad)" />

                            {/* Polyline / Curve */}
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#C10303"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              filter="url(#neonGlow)"
                            />

                            {/* Milestone points for camera sightings */}
                            {pts.map((p, i) => {
                              const isCheck = !!p.pt.cameraLabel;

                              return isCheck ? (
                                <g key={`pt_${p.pt.id}_${i}`}>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="3"
                                    fill="#C10303"
                                    stroke="#000000"
                                    strokeWidth="1"
                                  />
                                  <text
                                    x={p.x}
                                    y={Math.max(6, p.y - 4)}
                                    textAnchor="middle"
                                    fill="#ffffff"
                                    fontSize="6"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                  >
                                    {p.pt.cameraLabel}
                                  </text>
                                </g>
                              ) : null;
                            })}

                            {/* Active Pulsing Marker on Latest Live Point */}
                            <circle
                              cx={latest.x}
                              cy={latest.y}
                              r="5"
                              fill="#C10303"
                              opacity="0.4"
                              className="animate-ping"
                            />
                            <circle
                              cx={latest.x}
                              cy={latest.y}
                              r="3.2"
                              fill="#C10303"
                              stroke="#000000"
                              strokeWidth="1.2"
                            />

                            {/* Interactive Hover Hit Zones */}
                            {pts.map((p, i) => (
                              <rect
                                key={`hitzone_${i}`}
                                x={p.x - 6}
                                y={0}
                                width={12}
                                height={76}
                                fill="transparent"
                                className="cursor-crosshair"
                                onMouseEnter={() => setHoveredPoint(p.pt)}
                              />
                            ))}
                          </>
                        );
                      })()}

                      {/* Hover Indicator Crosshair */}
                      {hoveredPoint && (() => {
                        const idx = currentSparklineData.findIndex((p) => p.id === hoveredPoint.id);
                        if (idx < 0) return null;
                        const x = 28 + (idx / Math.max(1, currentSparklineData.length - 1)) * 252;
                        const y = 8 + (1.0 - hoveredPoint.score) * 54;

                        return (
                          <g pointerEvents="none">
                            <line x1={x} y1="0" x2={x} y2="76" stroke="#C10303" strokeWidth="0.8" strokeDasharray="2 2" />
                            <circle cx={x} cy={y} r="4" fill="#ffffff" stroke="#C10303" strokeWidth="1.5" />
                          </g>
                        );
                      })()}
                    </svg>

                    {/* Floating Tooltip during Hover */}
                    {hoveredPoint && (
                      <div className="absolute top-1 left-7 bg-[#050505] border border-[#C10303]/60 px-2 py-0.5 rounded text-[10px] font-editorial-mono text-white shadow-xl pointer-events-none flex items-center gap-1.5 z-20">
                        <span className="text-[#C10303] font-bold">
                          {(hoveredPoint.score * 100).toFixed(1)}%
                        </span>
                        <span className="text-white/40">/</span>
                        <span className="text-white/80">
                          TRACKLET
                        </span>
                        {hoveredPoint.cameraLabel && (
                          <span className="text-white font-bold">[{hoveredPoint.cameraLabel}]</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sparkline Telemetry Metrics Strip */}
                  <div className="grid grid-cols-4 gap-1 pt-1 border-t border-white/10 font-editorial-mono text-[10px]">
                    <div className="bg-[#000000] p-1 rounded border border-white/5">
                      <span className="text-white/40 block text-[9px]">LATEST</span>
                      <span className="font-bold text-[#C10303]">
                        {latestSparklinePoint ? (latestSparklinePoint.score * 100).toFixed(1) : "88.0"}%
                      </span>
                    </div>

                    <div className="bg-[#000000] p-1 rounded border border-white/5">
                      <span className="text-white/40 block text-[9px]">MIN</span>
                      <span className="font-bold text-white/80">
                        {(minConfidence * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-[#000000] p-1 rounded border border-white/5">
                      <span className="text-white/40 block text-[9px]">MEAN</span>
                      <span className="text-white font-bold">
                        {(avgConfidence * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-[#000000] p-1 rounded border border-white/5">
                      <span className="text-white/40 block text-[9px]">DRIFT</span>
                      <span
                        className={`font-bold flex items-center gap-0.5 ${
                          deltaScore < -0.10
                            ? "text-[#C10303]"
                            : deltaScore < 0
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {deltaScore < 0 ? (
                          <TrendingDown className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingUp className="w-2.5 h-2.5" />
                        )}
                        <span>{deltaScore >= 0 ? "+" : ""}{(deltaScore * 100).toFixed(0)}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Windshield Fine Grid FASTag Placement */}
                <div className="bg-[#050505] p-2 rounded-lg border border-[#C10303]/30">
                  <div className="flex items-center justify-between text-[10px] font-bold text-white uppercase tracking-wider mb-1 font-gilroy">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C10303]" />
                      Windshield Fine-Grid FASTag
                    </span>
                    <span className="font-editorial-mono text-[#C10303]">
                      {selectedVehicle.fastagPlacement?.present ? "TAG DETECTED" : "NO TAG"}
                    </span>
                  </div>
                  {selectedVehicle.fastagPlacement?.present ? (
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-editorial-mono">
                      <div className="flex justify-between">
                        <span className="text-white/50">Grid Cell:</span>
                        <span className="text-white font-bold">
                          [{selectedVehicle.fastagPlacement.gridX}, {selectedVehicle.fastagPlacement.gridY}]
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Normalized:</span>
                        <span className="text-[#C10303]">
                          ({selectedVehicle.fastagPlacement.normX}, {selectedVehicle.fastagPlacement.normY})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Offset:</span>
                        <span className="text-white/80">
                          {selectedVehicle.fastagPlacement.offsetMm.dx}mm, {selectedVehicle.fastagPlacement.offsetMm.dy}mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Code:</span>
                        <span className="text-white font-bold">{selectedVehicle.fastagPlacement.tagIdSnippet}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/40 font-editorial-mono">No windshield sticker on this vehicle class</span>
                  )}
                </div>

                {/* Road Strip Tyre Pressure Profiler */}
                <div className="bg-[#050505] p-2 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between text-[10px] font-bold text-white uppercase tracking-wider mb-1 font-gilroy">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C10303]" />
                      Dynamic Tyre Pressure Profiler
                    </span>
                    <span className="font-editorial-mono text-white/80">
                      Mean {selectedVehicle.tyrePressure?.meanPressure ?? 32} PSI
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-editorial-mono">
                    {selectedVehicle.tyrePressure?.wheelOrder.map((w) => (
                      <div key={w} className="flex justify-between bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
                        <span className="text-white/50">{w}:</span>
                        <span className="text-white font-bold">
                          {selectedVehicle.tyrePressure.wheelPressures[w]} PSI
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-white/50 font-editorial-mono mt-1 flex justify-between">
                    <span>Asymmetry Balance:</span>
                    <span className="text-white/80">{selectedVehicle.tyrePressure?.asymmetryIndex ?? 0} PSI</span>
                  </div>
                </div>

                {/* YOLOv8m-t42 (NUST) Real-Time Dent & Defect Fingerprint Card */}
                <div className="bg-[#050505] p-2.5 rounded-lg border border-white/10 space-y-1.5 font-gilroy">
                  <div className="flex items-center justify-between text-[10px] font-bold text-white uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-[#C10303]" />
                      YOLOv8m-t42 Dent Biometric
                    </span>
                    <span className="font-editorial-mono text-[9px] px-1.5 py-0.2 rounded bg-[#C10303]/15 text-white border border-[#C10303]/40">
                      P: 0.86 / R: 0.84
                    </span>
                  </div>

                  {selectedVehicle.dentDefects && selectedVehicle.dentDefects.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedVehicle.dentDefects.map((dent) => (
                        <div
                          key={dent.id}
                          className="bg-black/60 p-2 rounded border border-white/10 text-[11px] font-editorial-mono space-y-1"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-white font-bold">{dent.label}</span>
                            <span className="text-[#C10303] font-bold">
                              {(dent.confidence * 100).toFixed(0)}% conf
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-white/50">
                            <div>
                              <span>Severity: </span>
                              <span className="text-white uppercase font-semibold">{dent.severity}</span>
                            </div>
                            <div>
                              <span>Audit: </span>
                              <span className="text-white/80 truncate">{dent.insuranceAuditCode}</span>
                            </div>
                          </div>
                          <div className="text-[9px] text-white/40 flex justify-between">
                            <span>Hash: {dent.fingerprintHash}</span>
                            <span>BBox: [{dent.boundingBox.x.toFixed(2)}, {dent.boundingBox.y.toFixed(2)}]</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-black/60 p-2 rounded text-[10px] text-white/60 flex items-center justify-between font-editorial-mono border border-white/5">
                      <span>Panel Condition:</span>
                      <span className="text-emerald-400 font-semibold">Pristine (No Dents)</span>
                    </div>
                  )}

                  <div className="text-[9px] text-white/40 leading-tight font-editorial-mono">
                    Dent biometric provides physical verification without license plates.
                  </div>
                </div>

                {/* Vision AI Model Pipeline Status Bar */}
                <div className="bg-[#050505] p-2 rounded-lg border border-white/10 flex items-center justify-between text-[10px] font-editorial-mono">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-[#C10303]" />
                    <span className="text-white/50">Detector:</span>
                    <span className="text-white font-bold">
                      {visionConfig?.isCpuLowPowerMode ? "YOLO26n (CPU)" : visionConfig?.activeDetector === "yolo27" ? "YOLO27" : "YOLO26s"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {onToggleCpuMode && (
                      <button
                        onClick={onToggleCpuMode}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer border ${
                          visionConfig?.isCpuLowPowerMode
                            ? "bg-amber-500 text-black border-amber-400"
                            : "bg-white/5 text-white/70 border-white/10 hover:text-white"
                        }`}
                        title="Toggle Low-Power CPU mode"
                      >
                        {visionConfig?.isCpuLowPowerMode ? "CPU Mode" : "GPU Mode"}
                      </button>
                    )}

                    {onOpenVisionModels && (
                      <button
                        onClick={onOpenVisionModels}
                        className="px-2 py-0.5 bg-[#C10303]/20 hover:bg-[#C10303] text-white border border-[#C10303]/50 rounded text-[9px] font-bold transition-all cursor-pointer"
                        title="Open Vision Models Matrix"
                      >
                        Models
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Live Re-ID Match Stream Ticker */}
      <div className="bg-[#080808]/95 border border-[#C10303]/30 rounded-2xl shadow-xl overflow-hidden text-white font-gilroy">
        <div className="px-3.5 py-2 bg-[#000000] border-b border-white/10 flex items-center justify-between text-xs font-bold text-white">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C10303] shadow-[0_0_6px_#C10303]" />
            Live Re-ID Stream
          </span>
          <span className="text-[10px] text-white/50 font-editorial-mono">
            {recentMatches.length} Matches
          </span>
        </div>

        <div className="max-h-48 overflow-y-auto divide-y divide-white/5 p-1">
          {recentMatches.length === 0 ? (
            <div className="py-4 text-center text-xs text-white/40 font-editorial-mono">
              Vehicles traversing corridor... matches appear when passing downstream cameras.
            </div>
          ) : (
            recentMatches.slice(0, 5).map((m, idx) => {
              const isTrue = m.decision === "TRUE_MATCH";
              const isTopPulse = idx === 0 && isTrue;

              return (
                <div
                  key={`${m.id}_${idx}`}
                  style={
                    isTopPulse && isTrue
                      ? { boxShadow: "0 0 14px rgba(193, 3, 3, 0.4)" }
                      : {}
                  }
                  className={`p-2 text-xs transition-all duration-300 rounded-lg ${
                    isTopPulse && isTrue
                      ? "bg-[#C10303]/15 border border-[#C10303]/70"
                      : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-editorial-mono text-white font-bold text-[11px] flex items-center gap-1.5">
                      {m.sourceCamera} → {m.targetCamera}
                      {idx === 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-[#C10303] text-white text-[9px] font-bold">
                          NEW
                        </span>
                      )}
                    </span>

                    {/* Status Pill: Confirmed vs Ambiguous */}
                    {isTrue ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#C10303] text-white flex items-center gap-1 shadow-[0_0_8px_rgba(193,3,3,0.5)]">
                        <CheckCircle2 className="w-2.5 h-2.5" /> CONFIRMED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white/60 border border-white/15 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" /> AMBIGUOUS
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[10px] text-white/50 font-editorial-mono mt-0.5">
                    <div>Δt: <span className="text-white">{m.transitDeltaSeconds}s</span> ({m.impliedSpeedKmh} km/h)</div>
                    <div className="text-right">Tag: <span className="text-[#C10303] font-bold">{(m.fastagScore * 100).toFixed(0)}%</span></div>
                    <div>Tyre: <span className="text-white/80">{m.tyrePressureRmse} PSI</span></div>
                    <div className="text-right">
                      <span className={isTrue ? "text-white font-bold" : "text-white/50 font-bold"}>
                        Conf: {(m.combinedScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
