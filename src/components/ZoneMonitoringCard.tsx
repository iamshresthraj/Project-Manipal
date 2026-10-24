import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Layers,
  TrendingUp,
} from "lucide-react";

interface ZoneMonitoringCardProps {
  congestionSpeedFactor: number;
  avgCorridorSpeedKmh: number;
  vehicleCount: number;
  activeCameraId: string;
  hasOutage?: boolean;
}

export const ZoneMonitoringCard: React.FC<ZoneMonitoringCardProps> = ({
  congestionSpeedFactor,
  avgCorridorSpeedKmh,
  vehicleCount,
  hasOutage = false,
}) => {
  const isCongested = congestionSpeedFactor < 0.6;
  const queueLengthDisplay = isCongested
    ? `${(2.4 - (congestionSpeedFactor - 0.1) * 1.2).toFixed(1)}km`
    : `${(0.4 + (1.2 - Math.min(1.2, congestionSpeedFactor)) * 0.4).toFixed(1)}km`;

  const estDelayDisplay = isCongested
    ? `+${Math.round(18 - (congestionSpeedFactor - 0.1) * 15)}m`
    : `+2m`;

  const velocityDisplay = `${Math.round(avgCorridorSpeedKmh)} km/h ${
    isCongested ? "(Slow)" : "(Flowing)"
  }`;

  // Hourly volume trend bars (08:00 to 18:00) matching reference
  const hourlyData = [
    { time: "08:00", heightPct: 45 },
    { time: "10:00", heightPct: 62 },
    { time: "12:00", heightPct: 52 },
    { time: "14:00", heightPct: 88, tag: "-48", isPeak: true },
    { time: "16:00", heightPct: 68 },
    { time: "18:00", heightPct: 58 },
  ];

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedHour, setSelectedHour] = useState<string | null>("14:00");

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="glass-panel-amber px-4 py-2 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-[#1f2937] shadow-[0_8px_30px_rgba(217,119,6,0.15)] hover:bg-amber-100/60 transition-all cursor-pointer font-gilroy"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isCongested
              ? "bg-[#ea580c] shadow-[0_0_8px_rgba(234,88,12,0.8)] animate-pulse"
              : "bg-emerald-500"
          }`}
        />
        <span>Zone Monitoring (Sec-4)</span>
        <span className="text-[10px] text-[#6b7280] font-normal">· {isCongested ? "Congested" : "Normal"}</span>
        <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900 font-semibold ml-1">Expand</span>
      </button>
    );
  }

  return (
    <div className="w-80 sm:w-88 glass-panel-amber rounded-3xl p-5 shadow-[0_24px_60px_rgba(217,119,6,0.12)] text-[#1f2937] font-gilroy select-none space-y-4 transition-all">
      {/* Header: Zone Monitoring + Minimize Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-tight text-[#374151] uppercase font-gilroy">
          Zone Monitoring
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-xs font-semibold text-[#6b7280] hover:text-[#111827] px-2 py-0.5 rounded-lg hover:bg-amber-200/40 transition-colors cursor-pointer"
          title="Minimize Zone Monitoring card"
        >
          Minimize
        </button>
      </div>

      {/* Status: Congested / Normal */}
      <div className="space-y-1">
        <div className="text-[11px] font-medium text-[#6b7280]">Status</div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isCongested
                ? "bg-[#ea580c] shadow-[0_0_10px_rgba(234,88,12,0.8)] animate-pulse"
                : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            }`}
          />
          <span className="text-2xl font-bold tracking-tight text-[#111827]">
            {isCongested ? "Congested" : "Normal Flow"}
          </span>
        </div>
      </div>

      {/* 2-Column Sector Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-[10px] text-[#6b7280] block font-medium">Current Sector</span>
          <span className="font-semibold text-[#1f2937]">Market St. (Sec-4)</span>
        </div>
        <div>
          <span className="text-[10px] text-[#6b7280] block font-medium">Control Mode</span>
          <span className="font-semibold text-[#1f2937]">Manual Override</span>
        </div>
        <div>
          <span className="text-[10px] text-[#6b7280] block font-medium">Active Incidents</span>
          <span className={`font-semibold ${hasOutage || isCongested ? "text-[#ea580c]" : "text-[#1f2937]"}`}>
            {hasOutage ? "1 Outage" : isCongested ? "1 Detected" : "0 Incidents"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[#6b7280] block font-medium">Avg Velocity</span>
          <span className="font-semibold text-[#1f2937]">{velocityDisplay}</span>
        </div>
      </div>

      {/* Queue Len & Est. Delay Chips */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div className="bg-amber-100/40 border border-amber-200/60 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#4b5563] font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Queue Len</span>
          </div>
          <div className="text-xl font-bold font-gilroy text-[#111827] mt-1">
            {queueLengthDisplay}
          </div>
        </div>

        <div className="bg-amber-100/40 border border-amber-200/60 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#4b5563] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Est. Delay</span>
          </div>
          <div className="text-xl font-bold font-gilroy text-[#111827] mt-1">
            {estDelayDisplay}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-amber-200/50" />

      {/* Section 2: Total Volume - Last 24h Trends */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="text-xs font-bold text-[#1f2937]">Total Volume</div>
            <div className="text-[10px] text-[#6b7280]">Last 24h Trends</div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-[#9ca3af]" />
        </div>

        {/* Big 12.5k and side stats */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-4xl font-extrabold tracking-tight text-[#111827]">
              12.5
            </span>
            <span className="text-lg font-bold text-[#4b5563]">k</span>
          </div>

          <div className="text-right text-[11px] space-y-0.5 font-medium text-[#4b5563]">
            <div className="flex justify-between gap-3">
              <span className="text-[#6b7280]">Capacity</span>
              <span className="font-bold text-[#111827]">94%</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#6b7280]">Avg Speed</span>
              <span className="font-bold text-[#111827]">12 km/h</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#6b7280]">Peak Time</span>
              <span className="font-bold text-[#111827]">08:45 AM</span>
            </div>
          </div>
        </div>

        {/* 24-Hour Volume Histogram with -48 badge */}
        <div className="h-20 flex items-end justify-between gap-2 pt-3 px-1">
          {hourlyData.map((d) => (
            <div key={d.time} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              {d.tag && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500 text-white shadow-xs leading-none">
                  {d.tag}
                </span>
              )}
              <div
                style={{ height: `${d.heightPct}%` }}
                className={`w-full rounded-md transition-all duration-300 ${
                  d.isPeak
                    ? "bg-[#ea580c] shadow-[0_4px_12px_rgba(234,88,12,0.4)]"
                    : "bg-amber-300/60 hover:bg-amber-400"
                }`}
                title={`${d.time}: ${d.heightPct}% volume`}
              />
              <span className="text-[9px] font-medium text-[#6b7280]">
                {d.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
