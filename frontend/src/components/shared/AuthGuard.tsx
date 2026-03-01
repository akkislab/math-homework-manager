"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types";

interface Props {
  requiredRole: UserRole;
  children: React.ReactNode;
}

/**
 * Wrap any page that requires authentication.
 * Redirects unauthenticated users to /login.
 * Redirects wrong-role users to their correct home.
 */
export default function AuthGuard({ requiredRole, children }: Props) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (role && role !== requiredRole) {
      router.replace(role === "teacher" ? "/teacher/dashboard" : "/student/portal");
    }
  }, [user, role, loading, requiredRole, router]);

  if (loading || !user || role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
