"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
} from "../../hooks/useAuth";
import AssignSmartLogo from "../../components/shared/AssignSmartLogo";
import type { UserRole } from "../../types";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name, role);
      }
      router.replace(role === "teacher" ? "/teacher/dashboard" : "/student/portal");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      router.replace("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">

      {/* ── Left decorative panel (desktop only) ───────────────────────── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between p-14 select-none" style={{ background: 'linear-gradient(135deg, #052e16 0%, #0f2d1f 50%, #0a1f30 100%)' }}>

        {/* Floating math symbols — atmosphere layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <span className="absolute top-[8%]  left-[6%]  font-heading text-[9rem]  text-green-400 leading-none opacity-20 rotate-[-10deg] animate-float" style={{ animationDelay: "0s" }}>π</span>
          <span className="absolute top-[42%] left-[46%] font-heading text-[22rem] text-green-400 leading-none opacity-[0.06] -translate-x-1/2 -translate-y-1/2">Σ</span>
          <span className="absolute bottom-[12%] left-[10%] font-heading text-8xl  text-green-500 leading-none opacity-15 rotate-[8deg]  animate-float" style={{ animationDelay: "1.2s" }}>∫</span>
          <span className="absolute top-[18%] right-[8%]  font-heading text-9xl  text-green-400 leading-none opacity-15 rotate-12   animate-float" style={{ animationDelay: "0.6s" }}>√</span>
          <span className="absolute bottom-[28%] right-[6%] font-heading text-7xl  text-green-400 leading-none opacity-12 -rotate-6  animate-float" style={{ animationDelay: "2s" }}>Δ</span>
          <span className="absolute top-[62%]  right-[22%] font-heading text-5xl  text-cyan-400 leading-none opacity-10 rotate-3">∞</span>
          <span className="absolute top-[30%]  left-[20%]  font-heading text-4xl  text-cyan-500 leading-none opacity-10 -rotate-12">÷</span>
        </div>

        {/* Main tagline */}
        <div className="relative z-10">
          <h2 className="font-heading text-5xl xl:text-6xl font-semibold text-white leading-tight mb-5">
            Where numbers<br />come alive.
          </h2>
          <p className="text-green-200/70 text-base leading-relaxed max-w-sm">
            AI-generated worksheets, instant grading, and real-time progress tracking — built for modern math classrooms.
          </p>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex gap-10">
          {[
            { value: "500+", label: "Students per teacher" },
            { value: "<10s", label: "AI response time" },
            { value: "6+",   label: "Achievement badges" },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-heading text-4xl font-semibold text-white">{s.value}</p>
              <p className="text-green-300/60 text-sm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-14" style={{ background: 'rgba(15,23,42,0.95)' }}>
        <div className="w-full max-w-[380px] animate-fade-in">

          {/* Logo — always visible at top of form panel */}
          <div className="flex items-center gap-3 mb-8">
            <AssignSmartLogo size={48} variant="icon" />
            <span className="font-heading text-2xl font-bold text-ink tracking-tight">AssignSmart</span>
          </div>

          <h1 className="font-heading text-[2.4rem] font-semibold text-ink leading-tight mb-1">
            {mode === "login" ? "Welcome back." : "Get started."}
          </h1>
          <p className="text-mist text-sm mb-7">
            {mode === "login"
              ? "Sign in to your classroom."
              : "Create your teacher or student account."}
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold text-slate-200 transition-all duration-200 mb-5 disabled:opacity-60" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-sand" />
            <span className="text-xs text-mist font-bold tracking-widest">OR</span>
            <div className="flex-1 h-px bg-sand" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {mode === "register" && (
              <>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="input-field"
                />
                <div className="grid grid-cols-2 gap-2">
                  {(["student", "teacher"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${
                        role === r
                          ? "bg-green-500 text-white border-green-500 shadow-glass-sm"
                          : "bg-white/5 text-mist border-white/10 hover:border-green-500/40 hover:text-ink"
                      }`}
                    >
                      {r === "teacher" ? "Teacher" : "Student"}
                    </button>
                  ))}
                </div>
              </>
            )}

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="input-field"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input-field"
            />

            {error && (
              <p className="text-red-400 text-xs font-semibold rounded-xl px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-1"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs text-mist mt-6">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
              className="text-green-400 font-bold hover:underline underline-offset-2"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
