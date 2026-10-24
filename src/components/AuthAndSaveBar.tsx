import React, { useState, useEffect } from "react";
import {
  User,
  LogIn,
  LogOut,
  Save,
  FolderOpen,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  ShieldCheck,
  X,
  Moon,
  Sun,
  ShieldAlert,
  Cpu,
  Video,
  BarChart3,
  Sliders,
  Sparkles,
  Menu,
  Cloud,
  Bell,
  Settings,
  MoreVertical,
  Maximize,
  Search,
  Globe,
  Clock,
} from "lucide-react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  config,
  AppUser,
} from "../lib/firebase";

export type AppViewMode = "corridor" | "phase2" | "od_matrix" | "disambiguation" | "models";

interface AuthAndSaveBarProps {
  user: AppUser | null;
  onUserChange: (user: AppUser | null) => void;
  onSaveStudy: () => void;
  onLoadSavedStudies: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  currentViewMode?: AppViewMode;
  onSelectViewMode?: (mode: AppViewMode) => void;
  isNightMode?: boolean;
  onToggleNightMode?: () => void;
  hasActiveOutage?: boolean;
  onToggleOutage?: () => void;
  isCpuMode?: boolean;
  onToggleCpuMode?: () => void;
  onOpenAiReasoner?: () => void;
  isAiLoading?: boolean;
}

export const AuthAndSaveBar: React.FC<AuthAndSaveBarProps> = ({
  user,
  onUserChange,
  onSaveStudy,
  onLoadSavedStudies,
  isSaving,
  saveSuccess,
  currentViewMode = "corridor",
  onSelectViewMode,
  isNightMode = false,
  onToggleNightMode,
  hasActiveOutage = false,
  onToggleOutage,
  isCpuMode = false,
  onToggleCpuMode,
  onOpenAiReasoner,
  isAiLoading = false,
}) => {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showDomainNotice, setShowDomainNotice] = useState(false);
  const [copiedHostname, setCopiedHostname] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState("Mon 8 Dec · 18:21");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const dateNum = now.getDate();
      const hours = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      setCurrentTimeStr(`${dayName} ${dateNum} ${monthName} · ${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  const currentHostname =
    typeof window !== "undefined" ? window.location.hostname : "ais-dev.run.app";
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${config.projectId}/authentication/settings`;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onUserChange({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          isDemo: false,
        });
      }
      setIsSignInModalOpen(false);
      setShowDomainNotice(false);
    } catch (err: any) {
      console.warn("Sign-in error intercepted:", err);
      if (
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain")
      ) {
        setShowDomainNotice(true);
        setAuthError(
          `Domain "${currentHostname}" is not yet in Firebase Console's authorized domains list.`
        );
      } else {
        setAuthError(err.message || "Failed to sign in via Google.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDemoOperatorSignIn = () => {
    const demoUser: AppUser = {
      uid: "operator_adrian_cross",
      email: "adrian.cross@civion.com",
      displayName: "Adrian Cross",
      photoURL: null,
      isDemo: true,
    };
    try {
      localStorage.setItem("netraflow_operator_session", JSON.stringify(demoUser));
    } catch {}
    onUserChange(demoUser);
    setIsSignInModalOpen(false);
    setShowDomainNotice(false);
    setAuthError(null);
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("netraflow_operator_session");
      if (!user?.isDemo) {
        await signOut(auth);
      }
      onUserChange(null);
    } catch (err: any) {
      console.error("Sign-out error:", err);
    }
  };

  const handleCopyHostname = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedHostname(true);
      setTimeout(() => setCopiedHostname(false), 2500);
    }
  };

  return (
    <>
      {/* Top Floating Glassmorphic Header (Matching Reference Screenshot) */}
      <header className="fixed top-3 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-3 select-none pointer-events-none font-gilroy">
        {/* Top-Left Capsule: Menu + Location + Time */}
        <div className="glass-pill-light px-3.5 py-2 rounded-2xl flex items-center gap-3 pointer-events-auto shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-[#1f2937]">
          <button className="text-[#6b7280] hover:text-[#111827] transition-colors cursor-pointer">
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 border-l border-gray-200/80 pl-3">
            <Cloud className="w-4 h-4 text-[#6b7280]" />
            <div>
              <div className="text-xs font-bold text-[#111827] leading-none">
                San Francisco, USA
              </div>
              <div className="text-[10px] text-[#6b7280] font-medium leading-tight mt-0.5">
                {currentTimeStr}
              </div>
            </div>
          </div>
        </div>

        {/* Top-Center: App Navigation Switcher (Corridor / Phase 2 / OD / Disambiguation / Models) */}
        {onSelectViewMode && (
          <nav className="glass-pill-light p-1 rounded-2xl flex items-center gap-1 pointer-events-auto text-xs font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <button
              onClick={() => onSelectViewMode("corridor")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                currentViewMode === "corridor"
                  ? "bg-[#111827] text-white shadow-xs"
                  : "text-[#6b7280] hover:text-[#111827] hover:bg-gray-100/60"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>3D Twin</span>
            </button>

            <button
              onClick={() => onSelectViewMode("phase2")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                currentViewMode === "phase2"
                  ? "bg-[#111827] text-white shadow-xs"
                  : "text-[#6b7280] hover:text-[#111827] hover:bg-gray-100/60"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Phase 2</span>
            </button>

            <button
              onClick={() => onSelectViewMode("od_matrix")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                currentViewMode === "od_matrix"
                  ? "bg-[#111827] text-white shadow-xs"
                  : "text-[#6b7280] hover:text-[#111827] hover:bg-gray-100/60"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>OD Flows</span>
            </button>

            <button
              onClick={() => onSelectViewMode("disambiguation")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                currentViewMode === "disambiguation"
                  ? "bg-[#111827] text-white shadow-xs"
                  : "text-[#6b7280] hover:text-[#111827] hover:bg-gray-100/60"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Disambiguation</span>
            </button>

            <button
              onClick={() => onSelectViewMode("models")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                currentViewMode === "models"
                  ? "bg-[#111827] text-white shadow-xs"
                  : "text-[#6b7280] hover:text-[#111827] hover:bg-gray-100/60"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>8 Models</span>
            </button>
          </nav>
        )}

        {/* Top-Right: Traffic 12 Badge + Notifications + User Profile */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Traffic 12 Yellow Badge */}
          <div className="bg-[#fef08a] border border-amber-200 text-amber-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs">
            <span>Traffic</span>
            <span className="bg-amber-950/10 px-1.5 py-0.2 rounded text-[11px]">12</span>
          </div>

          {/* Bell Icon with Red Alert Dot */}
          <button
            onClick={onOpenAiReasoner}
            disabled={isAiLoading}
            className="w-9 h-9 rounded-xl glass-pill-light flex items-center justify-center text-[#4b5563] hover:text-[#111827] transition-all relative cursor-pointer"
            title="Notifications / AI Reasoner"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ea580c]" />
          </button>

          {/* Night / Day Mode Toggle */}
          {onToggleNightMode && (
            <button
              onClick={onToggleNightMode}
              className="w-9 h-9 rounded-xl glass-pill-light flex items-center justify-center text-[#4b5563] hover:text-[#111827] transition-all cursor-pointer"
              title="Toggle Day / Night Enhancement"
            >
              {isNightMode ? (
                <Moon className="w-4 h-4 text-[#ea580c]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>
          )}

          {/* User Profile Pill */}
          <div className="glass-pill-light px-3 py-1.5 rounded-2xl flex items-center gap-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-[#ea580c] flex items-center justify-center font-bold text-xs border border-amber-300">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "AC"}
            </div>

            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-[#111827] leading-none">
                {user ? user.displayName || "Operator" : "Adrian Cross"}
              </div>
              <div className="text-[10px] text-[#6b7280] font-medium leading-none mt-0.5">
                {user ? user.email || "Operator Active" : "adrian.cross@civion.com"}
              </div>
            </div>

            <button
              onClick={() => {
                if (user) {
                  handleSignOut();
                } else {
                  setIsSignInModalOpen(true);
                }
              }}
              className="text-[#9ca3af] hover:text-[#111827] transition-colors cursor-pointer pl-1"
              title={user ? "Sign Out" : "Operator Sign In"}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Floating Tools Pill (Top Right, right under profile) */}
      <div className="fixed top-18 right-4 z-35 flex items-center gap-2 select-none pointer-events-auto">
        <div className="glass-pill-light p-1 rounded-2xl flex items-center gap-1 shadow-[0_8px_30px_rgba(0,0,0,0.06)] text-[#6b7280]">
          <button
            onClick={onLoadSavedStudies}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-[#4b5563] hover:text-[#111827] transition-all cursor-pointer"
            title="Saved Studies & Runs"
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            onClick={onSaveStudy}
            disabled={isSaving}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-[#4b5563] hover:text-[#111827] transition-all cursor-pointer"
            title="Save Current Study"
          >
            {saveSuccess ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Search Pill */}
        <div className="glass-pill-light px-3 py-1.5 rounded-2xl flex items-center gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <Search className="w-3.5 h-3.5 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search Sector / Vehicle..."
            className="bg-transparent text-xs text-[#111827] placeholder-[#9ca3af] outline-none w-36 font-gilroy"
          />
        </div>
      </div>

      {/* Operator Sign-in Modal */}
      {isSignInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm font-gilroy">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.2)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#ea580c] flex items-center justify-center text-white font-bold text-xs">
                  NF
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">
                    Operator Authentication
                  </h3>
                  <span className="text-[11px] text-[#6b7280]">
                    Civion / NetraFlow ITS Station
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSignInModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-2xl text-xs border border-red-200">
                {authError}
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-2xl text-xs font-bold text-[#111827] flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4 text-[#ea580c]" />
                <span>{isSigningIn ? "Signing In..." : "Sign In with Google"}</span>
              </button>

              <button
                onClick={handleDemoOperatorSignIn}
                className="w-full py-2.5 px-4 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Continue as Adrian Cross (Operator Demo)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
