"use client";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { getWorksheetsByClass, getTeacherClass } from "../../../lib/firestore";
import type { Worksheet } from "../../../types";

export default function WorksheetsPage() {
  const { user } = useAuth();
  return (
    <AuthGuard requiredRole="teacher">
      {user && (
        <>
          <Navbar uid={user.uid} displayName={user.displayName ?? "Teacher"} role="teacher" />
          <main><WorksheetsContent teacherUid={user.uid} /></main>
        </>
      )}
    </AuthGuard>
  );
}

function WorksheetsContent({ teacherUid }: { teacherUid: string }) {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherClass(teacherUid).then(async (cls) => {
      if (cls) {
        const ws = await getWorksheetsByClass(cls.id);
        setWorksheets(ws);
      }
      setLoading(false);
    });
  }, [teacherUid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Worksheets</h1>
          <p className="text-sm text-gray-500">{worksheets.length} generated</p>
        </div>
        <a
          href="/teacher/dashboard"
          className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + Generate New
        </a>
      </div>

      {worksheets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📄</p>
          <p className="font-medium">No worksheets yet.</p>
          <p className="text-sm mt-1">Generate one from the dashboard.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {worksheets.map((w) => (
            <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{w.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {w.grade} · {w.topic} · {w.problems.length} problems
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {w.createdAt?.toDate().toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                {w.answerKeyUrl && (
                  <a
                    href={w.answerKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-500 hover:underline flex items-center gap-1"
                  >
                    📥 Answer Key
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
