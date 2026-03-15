"use client";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import Spinner from "../../../components/shared/Spinner";
import WorksheetGenerator from "../../../components/teacher/WorksheetGenerator";
import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { getWorksheetsByClass, getTeacherClass } from "../../../lib/firestore";
import type { Class, Worksheet } from "../../../types";

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
  const [cls, setCls] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function loadWorksheets(classId: string) {
    const ws = await getWorksheetsByClass(classId);
    setWorksheets(ws);
  }

  useEffect(() => {
    getTeacherClass(teacherUid).then(async (c) => {
      if (c) {
        setCls(c);
        await loadWorksheets(c.id);
      }
      setLoading(false);
    });
  }, [teacherUid]);

  const handleSuccess = async () => {
    setShowGenerator(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    if (cls) await loadWorksheets(cls.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Worksheets</h1>
          <p className="text-sm text-slate-500">{worksheets.length} generated</p>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-glass-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Generate New
        </button>
      </div>

      {worksheets.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-white/[0.04] border-2 border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <p className="font-semibold text-slate-300 mb-1">No worksheets yet</p>
          <p className="text-sm text-slate-500 mb-4">Generate your first AI worksheet to get started.</p>
          <button
            onClick={() => setShowGenerator(true)}
            className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Generate First Worksheet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {worksheets.map((w) => (
            <div key={w.id} className="rounded-2xl p-5 shadow-glass-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">{w.title}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {w.grade} · {w.topic} · {w.problems.length} problems
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {w.createdAt?.toDate?.().toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                {w.answerKeyUrl && (
                  <a
                    href={w.answerKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors font-semibold"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Answer Key
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Generate Worksheet Modal ── */}
      {showGenerator && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex sm:items-center items-end justify-center z-50 sm:p-4 p-0"
          onClick={(e) => { if (e.target === e.currentTarget) setShowGenerator(false); }}
        >
          <div className="sm:rounded-2xl rounded-t-2xl shadow-glass-lg w-full sm:max-w-2xl max-h-[92vh] flex flex-col border border-white/10 animate-slide-up" style={{ background: 'rgba(15,23,42,0.97)' }}>
            <div className="sm:hidden w-10 h-1 bg-sand rounded-full mx-auto mt-3 mb-1 shrink-0" />
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
              <h2 className="font-heading text-xl font-semibold text-ink">Generate Worksheet</h2>
              <button onClick={() => setShowGenerator(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-mist hover:text-ink hover:bg-white/10 transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {cls ? (
                <WorksheetGenerator
                  classId={cls.id}
                  studentIds={cls.studentIds ?? []}
                  onSuccess={handleSuccess}
                />
              ) : (
                <p className="text-sm text-mist text-center py-8">No class found. Create a class from the dashboard first.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm animate-fade-in">
          <div className="rounded-2xl shadow-glass-lg border border-white/10 p-8 max-w-sm w-full mx-4 text-center animate-slide-up" style={{ background: 'rgba(15,23,42,0.96)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.30)' }}>
              <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="font-heading text-xl font-semibold text-ink mb-1">Worksheet Created!</h3>
            <p className="text-sm text-mist">Your AI worksheet has been generated and assigned.</p>
            <p className="text-xs text-mist/60 mt-3">This will close automatically…</p>
          </div>
        </div>
      )}
    </div>
  );
}
