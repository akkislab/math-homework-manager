"use client";
import { useEffect, useState } from "react";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import TeacherDashboard from "../../../components/teacher/Dashboard";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClasses } from "../../../lib/firestore";
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
            <BatchedDashboard teacherUid={user.uid} />
          </main>
        </>
      )}
    </AuthGuard>
  );
}

function BatchedDashboard({ teacherUid }: { teacherUid: string }) {
  const [classes, setClasses] = useState<Class[] | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    getTeacherClasses(teacherUid).then((cls) => {
      setClasses(cls);
      if (cls.length > 0) setSelectedId(cls[0].id);
    });
  }, [teacherUid]);

  if (classes === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const { classId } = await createClass({ name: newName.trim() });
      const newClass: Class = {
        id: classId,
        name: newName.trim(),
        teacherId: teacherUid,
        studentIds: [],
        createdAt: null as never,
      };
      setClasses((prev) => [newClass, ...(prev ?? [])]);
      setSelectedId(classId);
      setNewName("");
      setShowNewForm(false);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create batch.");
    } finally {
      setCreating(false);
    }
  };

  // No classes yet — prompt to create the first one
  if (classes.length === 0 && !showNewForm) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-5xl mb-4">🏫</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your first batch</h2>
        <p className="text-gray-500 mb-6 text-sm">
          Give your class a name to get started — you can add students after.
        </p>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 px-6 rounded-xl transition-colors text-sm"
        >
          Create Batch
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4">
      {/* Batch pill selector */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedId(cls.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedId === cls.id
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cls.name}
          </button>
        ))}

        {/* Add new batch button / inline form */}
        {showNewForm ? (
          <form onSubmit={handleCreate} className="flex items-center gap-2 flex-shrink-0">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Batch name…"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {creating ? "…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setNewName(""); setCreateError(null); }}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Cancel
            </button>
            {createError && (
              <p className="text-red-500 text-xs">{createError}</p>
            )}
          </form>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium text-brand-600 border border-brand-200 hover:bg-brand-50 transition-colors"
          >
            + New Batch
          </button>
        )}
      </div>

      {/* Dashboard for selected batch */}
      {selectedId && (
        <TeacherDashboard classId={selectedId} teacherUid={teacherUid} />
      )}
    </div>
  );
}
