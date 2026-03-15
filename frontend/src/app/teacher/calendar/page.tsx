"use client";
import { useEffect, useState } from "react";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import Spinner from "../../../components/shared/Spinner";
import CalendarView from "../../../components/teacher/CalendarView";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClasses } from "../../../lib/firestore";
import type { Class } from "../../../types";

export default function CalendarPage() {
  const { user } = useAuth();
  return (
    <AuthGuard requiredRole="teacher">
      {user && (
        <div className="flex flex-col h-screen overflow-hidden">
          <Navbar uid={user.uid} displayName={user.displayName ?? "Teacher"} role="teacher" />
          <div className="flex-1 overflow-hidden">
            <CalendarPageInner teacherUid={user.uid} />
          </div>
        </div>
      )}
    </AuthGuard>
  );
}

function CalendarPageInner({ teacherUid }: { teacherUid: string }) {
  const [classes, setClasses] = useState<Class[] | undefined>(undefined);

  useEffect(() => {
    // One-time fetch is sufficient; classes rarely change mid-session
    getTeacherClasses(teacherUid)
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [teacherUid]);

  if (classes === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  return <CalendarView teacherUid={teacherUid} classes={classes} />;
}
