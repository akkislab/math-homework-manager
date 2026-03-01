"use client";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import StudentPortal from "../../../components/student/Portal";
import { useAuth } from "../../../hooks/useAuth";

export default function PortalPage() {
  const { user } = useAuth();

  return (
    <AuthGuard requiredRole="student">
      {user && (
        <>
          <Navbar
            uid={user.uid}
            displayName={user.displayName ?? "Student"}
            role="student"
          />
          <main>
            <StudentPortal
              studentId={user.uid}
              displayName={user.displayName ?? "Student"}
            />
          </main>
        </>
      )}
    </AuthGuard>
  );
}
