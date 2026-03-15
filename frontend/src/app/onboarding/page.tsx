"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { setUserRole } from "../../lib/api";
import AssignSmartLogo from "../../components/shared/AssignSmartLogo";
import type { UserRole } from "../../types";

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await setUserRole({ targetUid: user.uid, role });
      // Force token refresh so claim is available immediately
      await user.getIdToken(true);
      router.replace(role === "teacher" ? "/teacher/dashboard" : "/student/portal");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to set role.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl shadow-glass-lg p-8 backdrop-blur-xl border border-white/10" style={{ background: 'rgba(15,23,42,0.96)' }}>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <AssignSmartLogo size={40} className="rounded-xl" />
            <span className="font-heading text-xl font-bold text-ink tracking-tight">AssignSmart</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Welcome aboard! 👋</h1>
          <p className="text-sm text-mist mt-1">Tell us who you are to get started</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {(["teacher", "student"] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                role === r
                  ? "border-green-500 bg-green-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <span className="text-4xl">{r === "teacher" ? "👩‍🏫" : "🎒"}</span>
              <span className={`font-semibold capitalize ${role === r ? "text-green-400" : "text-slate-300"}`}>
                {r}
              </span>
              <span className="text-xs text-slate-500 text-center">
                {r === "teacher"
                  ? "Create worksheets & manage students"
                  : "View assignments & submit work"}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-xs text-center mb-4">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? "Setting up..." : "Continue as " + role.charAt(0).toUpperCase() + role.slice(1)}
        </button>
      </div>
    </div>
  );
}
