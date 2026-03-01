"use client";
import { useEffect, useState } from "react";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import TeacherDashboard from "../../../components/teacher/Dashboard";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClass } from "../../../lib/firestore";
import { createClass } from "../../../lib/api";
import type { Class } from "../../../types";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AuthGuard requiredRole="teacher">
      {user && (
        <>
          <Navbar
            uid={user.uid}
            displayName={user.displayName ?? "Teacher"}
            role="teacher"
          />
          <main>
            <ClassLoader teacherUid={user.uid} />
          </main>
        </>
      )}
    </AuthGuard>
  );
}

function ClassLoader({ teacherUid }: { teacherUid: string }) {
  const [cls, setCls] = useState<Class | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [className, setClassName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTeacherClass(teacherUid).then(setCls);
  }, [teacherUid]);

  // Loading
  if (cls === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // No class yet — show creation prompt
  if (cls === null) {
    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!className.trim()) return;
      setCreating(true);
      setError(null);
      try {
        const { classId } = await createClass({ name: className.trim() });
        setCls({ id: classId, name: className.trim(), teacherId: teacherUid, studentIds: [] } as Class);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create class.");
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">🏫</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your first class</h2>
        <p className="text-gray-500 mb-6 text-sm">
          Give your class a name to get started — you can add students after.
        </p>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            type="text"
            required
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. Grade 5 Math — Period 2"
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={creating}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            {creating ? "Creating..." : "Create Class"}
          </button>
        </form>
      </div>
    );
  }

  return <TeacherDashboard classId={cls.id} teacherUid={teacherUid} />;
}
