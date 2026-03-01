"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export default function RootPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (role === "teacher") router.replace("/teacher/dashboard");
    else if (role === "student") router.replace("/student/portal");
    else router.replace("/onboarding");
  }, [user, role, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  );
}
