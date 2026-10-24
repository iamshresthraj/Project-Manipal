import React from "react";
import { X, Brain, ShieldCheck, CheckCircle2 } from "lucide-react";

interface AiReasonerModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisText: string | null;
  isLoading: boolean;
  onSaveToStudy?: () => void;
}

export const AiReasonerModal: React.FC<AiReasonerModalProps> = ({
  isOpen,
  onClose,
  analysisText,
  isLoading,
  onSaveToStudy,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none backdrop-blur-xs font-gilroy">
      <div className="bg-[#080808] border border-[#C10303]/35 w-full max-w-4xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#000000]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C10303]/20 text-[#C10303] border border-[#C10303]/40">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Gemini 4 Argon Deep Reasoning Audit
                <span className="text-[10px] font-editorial-mono px-2 py-0.5 rounded bg-[#C10303] text-white">
                  THINKING_LEVEL.HIGH
                </span>
              </h2>
              <p className="text-xs text-white/50 font-editorial-mono">
                Mathematical & spatio-temporal Bayesian proof resolving identical vehicle confusion
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#C10303] border-t-transparent animate-spin" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white font-gilroy">
                  Executing High-Thinking Spatio-Temporal Inference...
                </h3>
                <p className="text-xs text-white/60 max-w-md font-gilroy">
                  Gemini 4 is synthesizing the joint probability distribution, evaluating velocity bounds across 500m arterial road geometry, and auditing micro-feature discriminators.
                </p>
              </div>
            </div>
          ) : analysisText ? (
            <div className="space-y-4">
              <div className="bg-[#000000] border border-[#C10303]/30 p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-white/70 font-editorial-mono pb-2 border-b border-white/10">
                  <span>Engine: Gemini 4 Argon · Thinking Mode: Active</span>
                  <span className="text-[#C10303] flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Diagnostic Verified
                  </span>
                </div>
                <div className="text-xs text-white/90 leading-relaxed whitespace-pre-wrap font-gilroy">
                  {analysisText}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-white/50 text-xs font-gilroy">
              No audit report generated yet. Run the analysis from the Disambiguation Lab or click "Deep AI" in the header.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#000000] flex items-center justify-between">
          <span className="text-[11px] text-white/50 flex items-center gap-1 font-editorial-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C10303]" />
            Rigorous Bayesian proof without reading license plates.
          </span>
          <div className="flex items-center gap-2">
            {analysisText && onSaveToStudy && (
              <button
                onClick={onSaveToStudy}
                className="px-4 py-1.5 bg-[#C10303] hover:bg-[#d90404] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-[0_0_12px_rgba(193,3,3,0.4)] border border-white/20"
              >
                Save Insight to Firestore
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
