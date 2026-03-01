"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { setUserRole } from "../../lib/api";
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
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to MathClass!</h1>
          <p className="text-sm text-gray-500 mt-1">Tell us who you are to get started</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {(["teacher", "student"] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                role === r
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-4xl">{r === "teacher" ? "👩‍🏫" : "🎒"}</span>
              <span className={`font-semibold capitalize ${role === r ? "text-brand-600" : "text-gray-700"}`}>
                {r}
              </span>
              <span className="text-xs text-gray-400 text-center">
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
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? "Setting up..." : "Continue as " + role.charAt(0).toUpperCase() + role.slice(1)}
        </button>
      </div>
    </div>
  );
}
