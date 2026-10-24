import React, { useState } from "react";
import {
  X,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  Activity,
  Maximize2,
  Eye,
  Crosshair,
  FileText,
  Gauge,
  Workflow,
  Radio,
  Grid,
  TrendingUp,
} from "lucide-react";
import {
  VisionModelPipelineConfig,
  NETRAFLOW_VISION_MODELS,
  AiModelSpec,
  SimulatedVehicle,
} from "../types/reid";

interface VisionPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VisionModelPipelineConfig;
  onChangeConfig: (updated: Partial<VisionModelPipelineConfig>) => void;
  selectedVehicle?: SimulatedVehicle | null;
  vehicles?: SimulatedVehicle[];
}

export const VisionPipelineModal: React.FC<VisionPipelineModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  selectedVehicle,
  vehicles = [],
}) => {
  const [activeTab, setActiveTab] = useState<
    "matrix" | "detectors" | "embedders" | "tracker" | "disambiguation"
  >("matrix");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none backdrop-blur-xs font-gilroy">
      <div className="bg-[#080808] border border-[#C10303]/35 w-full max-w-5xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C10303]/20 text-[#C10303] border border-[#C10303]/40">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-gilroy">
                  Vision AI Model Matrix &amp; Operational Scenarios
                </h2>
                <span className="text-[10px] font-editorial-mono font-bold px-2 py-0.5 rounded bg-[#C10303] text-white">
                  8 ITS MODELS ACTIVE
                </span>
              </div>
              <p className="text-xs text-white/50 font-editorial-mono">
                YOLO26x · YOLO26n · UVH-26 YOLO11-S · ByteTrack · OSNet x1.0 · OSNet-Grid · DINOv2-small · YOLO27 Fingerprint
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#000000]/60 px-6 gap-2 pt-2 overflow-x-auto">
          {[
            { id: "matrix", label: "Full 8-Model Matrix", icon: Workflow },
            { id: "detectors", label: "Detectors (YOLO26x / 26n / UVH-26)", icon: Crosshair },
            { id: "embedders", label: "Embedders (OSNet x1.0 / Grid / DINOv2)", icon: Layers },
            { id: "tracker", label: "Tracker (ByteTrack)", icon: Activity },
            { id: "disambiguation", label: "Fingerprint Engine (YOLO27)", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg flex items-center gap-1.5 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-[#C10303] text-white bg-[#0e0e0e] font-bold"
                    : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#C10303]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: FULL 8-MODEL MATRIX (Matching uploaded Image 1 directly) */}
          {activeTab === "matrix" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">
                  Deployed Model Catalog &amp; Operational Purpose (Reference: NetraFlow Architecture Specification)
                </span>
                <span className="font-editorial-mono text-[11px] text-[#C10303] font-bold">
                  8/8 MODELS OPERATIONAL
                </span>
              </div>

              {/* Table / Grid representing the exact list from Image 1 */}
              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#050505]">
                <div className="grid grid-cols-12 bg-[#000000] px-4 py-2.5 border-b border-white/10 text-[11px] font-bold uppercase text-white/60 font-editorial-mono">
                  <div className="col-span-3">Model &amp; Weights</div>
                  <div className="col-span-3">Component</div>
                  <div className="col-span-4">Operational Scenario</div>
                  <div className="col-span-2 text-right">Benchmark / Status</div>
                </div>

                <div className="divide-y divide-white/5">
                  {NETRAFLOW_VISION_MODELS.map((item, idx) => (
                    <div
                      key={item.model}
                      className="grid grid-cols-12 px-4 py-3 text-xs items-center hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Col 1: Model */}
                      <div className="col-span-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C10303]" />
                          <span>{item.model}</span>
                        </div>
                        <div className="text-[10px] font-editorial-mono text-[#C10303] mt-0.5">
                          {item.weightFile}
                        </div>
                      </div>

                      {/* Col 2: Component */}
                      <div className="col-span-3">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-medium text-white/90">
                          {item.component}
                        </span>
                      </div>

                      {/* Col 3: Scenario */}
                      <div className="col-span-4 pr-3">
                        <p className="text-[11px] text-white/70 leading-relaxed">
                          {item.scenario}
                        </p>
                      </div>

                      {/* Col 4: Benchmark Stat */}
                      <div className="col-span-2 text-right">
                        <span className="text-[11px] font-editorial-mono text-emerald-400 font-semibold">
                          {item.benchmarkStat || "Active"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Interactive Execution Bar */}
              <div className="bg-[#000000] border border-white/10 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#C10303]" />
                  <span className="font-bold text-white">Runtime Detector Profile:</span>
                  <span className="font-editorial-mono text-white/60">
                    {config.isCpuLowPowerMode ? "YOLO26n (Pure CPU 28 FPS)" : "YOLO26x (GPU High-Accuracy 54.7 mAP)"}
                  </span>
                </div>

                <button
                  onClick={() => {
                    const nextCpu = !config.isCpuLowPowerMode;
                    onChangeConfig({
                      isCpuLowPowerMode: nextCpu,
                      activeDetector: nextCpu ? "yolo26n" : "yolo26x",
                      detectorWeights: nextCpu ? "yolo26n.pt" : "yolo26x.pt",
                      targetFps: nextCpu ? 28 : 60,
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    config.isCpuLowPowerMode
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-[#C10303] text-white border-white/20 shadow-[0_0_12px_rgba(193,3,3,0.4)]"
                  }`}
                >
                  {config.isCpuLowPowerMode ? "Switch to GPU (YOLO26x)" : "Switch to CPU (YOLO26n)"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DETECTORS */}
          {activeTab === "detectors" && (
            <div className="space-y-4">
              <div className="text-xs text-white/60">
                Configure primary front-line vehicle detector models. Trained on mixed traffic datasets (cars, buses, trucks, motorcycles, auto-rickshaws).
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* YOLO26x */}
                <div
                  onClick={() =>
                    onChangeConfig({
                      primaryDetector: "yolo26x",
                      activeDetector: "yolo26x",
                      detectorWeights: "yolo26x.pt",
                      isCpuLowPowerMode: false,
                    })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    config.activeDetector === "yolo26x" && !config.isCpuLowPowerMode
                      ? "bg-[#140202] border-[#C10303] shadow-[0_0_15px_rgba(193,3,3,0.4)] ring-1 ring-[#C10303]"
                      : "bg-[#050505] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">YOLO26x (yolo26x.pt)</span>
                    <span className="text-[9px] font-editorial-mono px-2 py-0.5 rounded bg-[#C10303] text-white font-bold">
                      GPU PRIORITY
                    </span>
                  </div>
                  <div className="text-xs text-[#C10303] font-editorial-mono mb-2">54.7 mAP · 3.8ms Latency</div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Roadway Vehicle Detector for dense roadways. Extracts vehicle bounding boxes for cars, buses, trucks, and motorcycles with highest detection fidelity.
                  </p>
                </div>

                {/* YOLO26n */}
                <div
                  onClick={() =>
                    onChangeConfig({
                      activeDetector: "yolo26n",
                      detectorWeights: "yolo26n.pt",
                      isCpuLowPowerMode: true,
                    })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    config.isCpuLowPowerMode || config.activeDetector === "yolo26n"
                      ? "bg-[#140202] border-[#C10303] shadow-[0_0_15px_rgba(193,3,3,0.4)] ring-1 ring-[#C10303]"
                      : "bg-[#050505] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">YOLO26n (yolo26n.pt)</span>
                    <span className="text-[9px] font-editorial-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      CPU / EDGE
                    </span>
                  </div>
                  <div className="text-xs text-amber-400 font-editorial-mono mb-2">25.8–39.1 FPS Pure CPU</div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Low-Power Edge Detector targeting real-time inference on edge devices or roadside camera compute modules without a discrete GPU.
                  </p>
                </div>

                {/* UVH-26 YOLO11-S */}
                <div
                  onClick={() =>
                    onChangeConfig({
                      primaryDetector: "uvh26_yolo11s",
                      activeDetector: "uvh26_yolo11s",
                      detectorWeights: "UVH-26-MV-YOLOv11-S.pt",
                    })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    config.activeDetector === "uvh26_yolo11s"
                      ? "bg-[#140202] border-[#C10303] shadow-[0_0_15px_rgba(193,3,3,0.4)] ring-1 ring-[#C10303]"
                      : "bg-[#050505] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">UVH-26 YOLO11-S</span>
                    <span className="text-[9px] font-editorial-mono px-2 py-0.5 rounded bg-[#C10303]/30 text-white font-bold">
                      INDIAN DOMAIN
                    </span>
                  </div>
                  <div className="text-xs text-[#C10303] font-editorial-mono mb-2">UVH-26-MV-YOLOv11-S.pt</div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Indian Traffic Domain Model specifically targeted at Indian auto-rickshaws (three-wheelers) and unorganized lane clustering that general COCO detectors miss.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EMBEDDERS */}
          {activeTab === "embedders" && (
            <div className="space-y-4">
              <div className="text-xs text-white/60">
                Visual Re-ID feature extraction models creating high-dimensional appearance embeddings for non-plate cross-camera matching.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* OSNet x1.0 */}
                <div className="p-4 rounded-xl border border-[#C10303]/50 bg-[#120404] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">OSNet x1.0 (osnet_v1)</span>
                    <span className="text-[9px] font-editorial-mono px-2 py-0.5 rounded bg-[#C10303] text-white">
                      PRIMARY
                    </span>
                  </div>
                  <div className="text-xs font-editorial-mono text-[#C10303]">512-dim Vector · Rank-1: 91.5%</div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Converts vehicle crops into 512-dimensional appearance embeddings to match the same vehicle across disparate camera angles.
                  </p>
                </div>

                {/* OSNet-Grid */}
                <div className="p-4 rounded-xl border border-white/10 bg-[#050505] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">OSNet-Grid (osnet_grid_v1)</span>
                    <span className="text-[9px] font-editorial-mono px-2 py-0.5 rounded bg-white/10 text-white">
                      PATCH GRID
                    </span>
                  </div>
                  <div className="text-xs font-editorial-mono text-white/70">4,608-dim Spatial Grid</div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Extracts 4,608-dimensional local spatial patch embeddings for detailed appearance heatmap verification.
                  </p>
                </div>

                {/* DINOv2-small */}
                <div className="p-4 rounded-xl border border-white/10 bg-[#050505] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">DINOv2-small (dinov2_vits14)</span>
                    <span className="text-[9px] font-editorial-mono px-2 py-0.5 rounded bg-purple-900/40 text-purple-300">
                      FOUNDATION
                    </span>
                  </div>
                  <div className="text-xs font-editorial-mono text-purple-300">384-dim ViT Foundation</div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Zero-shot fallback providing general-purpose visual embeddings when dedicated vehicle Re-ID weights encounter ambiguous matches.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRACKER */}
          {activeTab === "tracker" && (
            <div className="space-y-4">
              <div className="bg-[#050505] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#C10303]" />
                    ByteTrack: Multi-Object Single-Camera Tracker
                  </h3>
                  <span className="text-[10px] font-editorial-mono px-2 py-0.5 rounded bg-[#C10303]/20 text-[#C10303] border border-[#C10303]/40">
                    MOTA 78.2% · IDF1 81.4%
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Associates detections across consecutive frames, maintains tracklet IDs through temporary occlusions, and eliminates duplicate tracking across the entire corridor.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: DISAMBIGUATION ENGINE */}
          {activeTab === "disambiguation" && (
            <div className="space-y-4">
              <div className="bg-[#050505] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#C10303]" />
                    YOLO27 Visual Fingerprint Engine (Disambiguation)
                  </h3>
                  <span className="text-[10px] font-editorial-mono px-2 py-0.5 rounded bg-[#C10303]/20 text-[#C10303] border border-[#C10303]/40">
                    yolo27_fingerprint.pt
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Near-Identical Vehicles &amp; Harsh Lighting Disambiguation: Solves ties between vehicles sharing the exact same make, model, and paint by localizing FASTag placement on windshield fine-grids, scratches, panel dents, dust accumulation, dynamic tyre compression, roof carriers, side mirror types, and two-wheeler rider clothing colours.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#000000] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-editorial-mono text-white/50">
            <span>Primary: YOLO26x (yolo26x.pt)</span>
            <span>·</span>
            <span>Embedder: OSNet x1.0 (512-d)</span>
            <span>·</span>
            <span>Tracker: ByteTrack</span>
            <span>·</span>
            <span className="text-[#C10303]">Disambiguation: YOLO27 Fingerprint</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#C10303] hover:bg-[#a00202] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Confirm &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
