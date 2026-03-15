"use client";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import Spinner from "../../../components/shared/Spinner";
import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { getStudentsByClass, getTeacherClasses } from "../../../lib/firestore";
import { addStudentToClass, removeStudentFromClass } from "../../../lib/api";
import type { Class, UserProfile } from "../../../types";

export default function StudentsPage() {
  const { user } = useAuth();
  return (
    <AuthGuard requiredRole="teacher">
      {user && (
        <>
          <Navbar uid={user.uid} displayName={user.displayName ?? "Teacher"} role="teacher" />
          <main><StudentsContent teacherUid={user.uid} /></main>
        </>
      )}
    </AuthGuard>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function StudentsContent({ teacherUid }: { teacherUid: string }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserProfile | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    getTeacherClasses(teacherUid).then((cls) => {
      setClasses(cls);
      if (cls.length > 0) setSelectedClassId(cls[0].id);
      setLoading(false);
    });
  }, [teacherUid]);

  useEffect(() => {
    if (!selectedClassId) return;
    setStudentsLoading(true);
    getStudentsByClass(selectedClassId).then((s) => {
      setStudents(s);
      setStudentsLoading(false);
    });
  }, [selectedClassId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !email.trim()) return;
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      await addStudentToClass({ email: email.trim(), classId: selectedClassId });
      setSuccess(`Invitation sent to ${email.trim()}.`);
      setEmail("");
      const studs = await getStudentsByClass(selectedClassId);
      setStudents(studs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add student.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (student: UserProfile) => {
    if (!selectedClassId) return;
    setDeletingId(student.uid);
    setConfirmDelete(null);
    try {
      await removeStudentFromClass({ studentId: student.uid, classId: selectedClassId });
      setStudents((prev) => prev.filter((s) => s.uid !== student.uid));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove student.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMove = async (student: UserProfile, targetClassId: string) => {
    if (!selectedClassId || targetClassId === selectedClassId) return;
    setMovingId(student.uid);
    setError(null);
    try {
      await removeStudentFromClass({ studentId: student.uid, classId: selectedClassId });
      await addStudentToClass({ email: student.email, classId: targetClassId });
      setStudents((prev) => prev.filter((s) => s.uid !== student.uid));
      setSuccess(`${student.displayName} moved to ${classes.find((c) => c.id === targetClassId)?.name ?? "batch"}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to move student.");
    } finally {
      setMovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-mist">
        <p className="text-4xl mb-2">🏫</p>
        <p className="font-medium">Create a batch first from the dashboard.</p>
      </div>
    );
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">Students</h1>
          <p className="text-sm text-mist">{students.length} enrolled</p>
        </div>

        {/* Batch selector */}
        {classes.length > 1 && (
          <select
            value={selectedClassId ?? ""}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="input-field w-auto text-sm py-2"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Add student */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-ink mb-3">
          Add Student to {selectedClass?.name ?? "Batch"}
        </h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            className="input-field flex-1"
          />
          <button type="submit" disabled={adding} className="btn-primary whitespace-nowrap">
            {adding ? "Adding…" : "Add"}
          </button>
        </form>
        {error && <p className="text-brick text-xs font-semibold mt-2">{error}</p>}
        {success && <p className="text-green-400 text-xs font-semibold mt-2">{success}</p>}
      </div>

      {/* Student list */}
      {studentsLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-mist">
          <p className="text-4xl mb-2">🎒</p>
          <p className="font-medium">No students yet. Add one above.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-mist text-xs font-bold uppercase tracking-widest border-b border-white/10">
              <tr>
                <th className="text-left px-5 py-3">Student</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">Email</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {students.map((s) => {
                const otherClasses = classes.filter((c) => c.id !== selectedClassId);
                return (
                  <tr key={s.uid} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-xs shrink-0">
                          {s.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{s.displayName}</p>
                          <p className="text-xs text-mist sm:hidden">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-mist hidden sm:table-cell">{s.email}</td>
                    <td className="px-5 py-3 text-right">
                      {(deletingId === s.uid || movingId === s.uid) ? (
                        <Spinner size="xs" />
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {/* Move to batch */}
                          {otherClasses.length > 0 && (
                            <div className="relative group">
                              <button
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-mist hover:text-green-400 hover:bg-green-500/10 transition-colors border border-transparent hover:border-green-500/30"
                                title="Move to another batch"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                                <span className="hidden sm:inline">Move</span>
                              </button>
                              <div className="absolute right-0 top-full mt-1 z-20 hidden group-hover:block rounded-xl shadow-glass-lg min-w-[140px] py-1 backdrop-blur-xl border border-white/10" style={{ background: 'rgba(15,23,42,0.97)' }}>
                                <p className="text-[10px] font-bold text-mist uppercase tracking-widest px-3 py-1.5">Move to</p>
                                {otherClasses.map((cls) => (
                                  <button
                                    key={cls.id}
                                    onClick={() => handleMove(s, cls.id)}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-ink hover:bg-green-500/10 hover:text-green-400 transition-colors"
                                  >
                                    {cls.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Remove */}
                          <button
                            onClick={() => setConfirmDelete(s)}
                            className="p-1.5 rounded-lg text-mist hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove student"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div className="card p-6 w-full max-w-sm animate-fade-in">
            <h3 className="font-heading text-lg font-semibold text-ink mb-1">Remove student?</h3>
            <p className="text-sm text-mist mb-5">
              <span className="font-semibold text-ink">{confirmDelete.displayName}</span> will be removed from{" "}
              <span className="font-semibold text-ink">{selectedClass?.name}</span>. Their submissions will be kept.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRemove(confirmDelete)}
                className="flex-1 bg-brick hover:bg-red-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                Remove
              </button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
