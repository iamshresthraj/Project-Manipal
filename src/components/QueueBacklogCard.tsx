import React from "react";
import { X } from "lucide-react";
import { SimulatedVehicle } from "../types/reid";

interface QueueBacklogCardProps {
  congestionSpeedFactor: number;
  selectedVehicle?: SimulatedVehicle | null;
  onMitigateCongestion: () => void;
  onOpenLab: () => void;
  onClose?: () => void;
}

export const QueueBacklogCard: React.FC<QueueBacklogCardProps> = ({
  congestionSpeedFactor,
  selectedVehicle,
  onMitigateCongestion,
  onOpenLab,
  onClose,
}) => {
  const isCongested = congestionSpeedFactor < 0.6;
  const queueDistance = isCongested
    ? `${(1.2 + (0.6 - congestionSpeedFactor) * 1.5).toFixed(1)}mi`
    : "0.4mi";
  const delayTime = isCongested
    ? `+${Math.round(9 + (0.6 - congestionSpeedFactor) * 14)}min`
    : "+1min";

  return (
    <div className="glass-panel-coral rounded-3xl p-5 text-white font-gilroy w-80 sm:w-88 select-none shadow-[0_24px_60px_rgba(234,88,12,0.38)] space-y-4 transition-all animate-in fade-in zoom-in-95">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-base font-bold tracking-tight text-white leading-tight">
            Queue Backlog
          </h4>
          <span className="text-[11px] text-white/80 font-medium">
            Impacted Sector Reach
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Dismiss backlog alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Stylized Vector Graphic of Incident / Slowdown (Matching Screenshot) */}
      <div className="relative w-full h-28 bg-white/10 rounded-2xl border border-white/20 p-2 flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 200 90"
          className="w-full h-full text-white fill-none stroke-current stroke-[2]"
        >
          {/* Road guidelines */}
          <line
            x1="10"
            y1="75"
            x2="190"
            y2="75"
            stroke="rgba(255,255,255,0.25)"
            strokeDasharray="4 4"
          />

          {/* Vehicle 1 (Left Car angled slightly) */}
          <g transform="translate(35, 28) rotate(-8)">
            {/* Body */}
            <path
              d="M 5 28 C 8 18 18 16 30 16 L 42 16 C 52 16 62 20 68 28 L 70 34 C 70 38 68 40 64 40 L 8 40 C 4 40 2 36 5 28 Z"
              fill="rgba(255,255,255,0.2)"
              stroke="white"
              strokeWidth="2"
            />
            {/* Windshield / Roof */}
            <path
              d="M 22 16 L 30 5 L 48 5 L 56 16 Z"
              fill="rgba(255,255,255,0.4)"
              stroke="white"
              strokeWidth="1.8"
            />
            {/* Wheels */}
            <circle cx="20" cy="40" r="5" fill="white" />
            <circle cx="56" cy="40" r="5" fill="white" />
          </g>

          {/* Impact / Alert Sparks between cars */}
          <g transform="translate(100, 36)">
            <path
              d="M 0 -8 L 3 -2 L 8 -4 L 4 2 L 8 8 L 2 5 L -2 9 L -2 3 L -7 1 L -2 -3 Z"
              fill="#fef08a"
              stroke="none"
              className="animate-pulse"
            />
          </g>

          {/* Vehicle 2 (Right Car angled in collision / queue tail) */}
          <g transform="translate(106, 26) rotate(16)">
            {/* Body */}
            <path
              d="M 5 28 C 8 18 18 16 30 16 L 42 16 C 52 16 62 20 68 28 L 70 34 C 70 38 68 40 64 40 L 8 40 C 4 40 2 36 5 28 Z"
              fill="rgba(255,255,255,0.2)"
              stroke="white"
              strokeWidth="2"
            />
            {/* Windshield / Roof */}
            <path
              d="M 22 16 L 30 5 L 48 5 L 56 16 Z"
              fill="rgba(255,255,255,0.4)"
              stroke="white"
              strokeWidth="1.8"
            />
            {/* Wheels */}
            <circle cx="20" cy="40" r="5" fill="white" />
            <circle cx="56" cy="40" r="5" fill="white" />
          </g>
        </svg>

        {/* Selected Vehicle Sighting Tag overlay */}
        {selectedVehicle && (
          <div className="absolute bottom-1.5 left-2 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-editorial-mono">
            ID: [{selectedVehicle.globalId}] · Grid ({selectedVehicle.fastagPlacement.gridX},{selectedVehicle.fastagPlacement.gridY})
          </div>
        )}
      </div>

      {/* Bottom Metrics: Queue Length & Current Delay with matching badges */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
          <div className="text-[10px] uppercase font-semibold text-white/80 tracking-wider">
            Queue Length
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-white font-gilroy">
              {queueDistance}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ea580c] text-white border border-white/30 shadow-xs">
              +12%
            </span>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
          <div className="text-[10px] uppercase font-semibold text-white/80 tracking-wider">
            Current Delay
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-white font-gilroy">
              {delayTime}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
              -2min
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Functional Flow Mitigation & Telemetry Inspection */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/15">
        <button
          onClick={onMitigateCongestion}
          className="flex-1 py-1.5 px-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/25 shadow-xs"
        >
          <span>Clear & Mitigate (1.5x)</span>
        </button>

        <button
          onClick={onOpenLab}
          className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer border border-white/15"
        >
          <span>Telemetry</span>
        </button>
      </div>
    </div>
  );
};
