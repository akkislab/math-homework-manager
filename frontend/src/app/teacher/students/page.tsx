"use client";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { getStudentsByClass, getTeacherClass } from "../../../lib/firestore";
import { addStudentToClass } from "../../../lib/api";
import type { UserProfile } from "../../../types";

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

function StudentsContent({ teacherUid }: { teacherUid: string }) {
  const [classId, setClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    getTeacherClass(teacherUid).then(async (cls) => {
      if (cls) {
        setClassId(cls.id);
        const studs = await getStudentsByClass(cls.id);
        setStudents(studs);
      }
      setLoading(false);
    });
  }, [teacherUid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !email.trim()) return;
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      await addStudentToClass({ email: email.trim(), classId });
      setSuccess(`Invitation sent to ${email.trim()}.`);
      setEmail("");
      // Refresh list
      const studs = await getStudentsByClass(classId);
      setStudents(studs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add student.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-gray-400">
        <p className="text-4xl mb-2">🏫</p>
        <p className="font-medium">Create a class first from the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">{students.length} enrolled</p>
        </div>
      </div>

      {/* Add student */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Add Student by Email</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </form>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        {success && <p className="text-green-600 text-xs mt-2">{success}</p>}
      </div>

      {/* Student list */}
      {students.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🎒</p>
          <p className="font-medium">No students yet. Add one above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Student</th>
                <th className="text-left px-5 py-3">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s.uid} className="hover:bg-gray-50">
                  <td className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                      {s.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{s.displayName}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{s.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
