"use client";
import { useEffect, useState } from "react";
import { PencilLine, BookOpen, Users, ChevronDown, Plus } from "lucide-react";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import Spinner from "../../../components/shared/Spinner";
import TeacherDashboard from "../../../components/teacher/Dashboard";
import { useAuth } from "../../../hooks/useAuth";
import { getTeacherClasses } from "../../../lib/firestore";
import { createClass, deleteClass } from "../../../lib/api";
import type { Class } from "../../../types";

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <AuthGuard requiredRole="teacher">
      {user && (
        <div className="flex flex-col h-screen overflow-hidden">
          <Navbar uid={user.uid} displayName={user.displayName ?? "Teacher"} role="teacher" />
          <div className="flex-1 overflow-hidden">
            <BatchedDashboard teacherUid={user.uid} />
          </div>
        </div>
      )}
    </AuthGuard>
  );
}

const BATCH_DOTS = ["bg-green-500", "bg-purple-500", "bg-amber-400", "bg-sky-500", "bg-rose-500", "bg-teal-500"];

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-3.5 h-3.5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-3.5 h-3.5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}

function BatchPill({
  cls, idx, active, size,
  onClick, onDelete,
}: {
  cls: { id: string; name: string };
  idx: number;
  active: boolean;
  size: "sm" | "xs";
  onClick: () => void;
  onDelete: () => void;
}) {
  const dot = BATCH_DOTS[idx % BATCH_DOTS.length];
  return size === "sm" ? (
    <div className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 ${
      active ? "bg-green-500/10" : "hover:bg-white/5"
    }`}>
      <button onClick={onClick} className="flex-1 flex items-center gap-2.5 text-sm font-semibold text-left min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className={`truncate ${active ? "text-green-400" : "text-mist group-hover:text-ink"}`}>{cls.name}</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-mist hover:text-brick transition-all shrink-0"
        title="Delete batch"
      >
        <TrashIcon className="w-3 h-3" />
      </button>
    </div>
  ) : (
    <div className={`flex-shrink-0 flex items-center gap-1 rounded-lg text-xs font-bold transition-all border ${
      active ? "bg-white/10 border-white/20 text-ink shadow-glass-sm" : "bg-white/[0.03] border-transparent text-mist hover:text-ink"
    }`}>
      <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {cls.name}
      </button>
      {active && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="pr-2 text-mist hover:text-brick transition-colors"
          title="Delete batch"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

const CLASS_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function NewBatchModal({
  open, creating, createError, onSubmit, onClose,
}: {
  open: boolean;
  creating: boolean;
  createError: string | null;
  onSubmit: (data: { name: string; classType: "solo"|"group"; classDay: string; classTime: string }) => void;
  onClose: () => void;
}) {
  const [name, setName]           = useState("");
  const [classType, setClassType] = useState<"solo"|"group">("group");
  const [classDay, setClassDay]   = useState("Monday");
  const [classTime, setClassTime] = useState("09:00");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), classType, classDay, classTime });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex sm:items-center items-end justify-center bg-ink/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-glass-lg border border-white/10 animate-fade-in backdrop-blur-xl bg-slate-950/95">
        <div className="w-10 h-1 bg-sand rounded-full mx-auto mb-4 sm:hidden" />
        <h2 className="font-heading text-xl font-semibold text-ink mb-5">New Batch</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Batch Name</label>
            <input
              autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 5 — Morning"
              className="input-field" required
            />
          </div>

          {/* Class Type */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Class Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["solo","group"] as const).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setClassType(t)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    classType === t
                      ? t === "solo"
                        ? "bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-glass-sm"
                        : "bg-sky-500/15 border-sky-500/30 text-sky-300 shadow-glass-sm"
                      : "bg-white/[0.03] border-transparent text-mist hover:border-white/20 hover:text-ink"
                  }`}
                >
                  {t === "solo" ? "Solo" : "Group"}
                </button>
              ))}
            </div>
          </div>

          {/* Day + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Class Day</label>
              <select value={classDay} onChange={(e) => setClassDay(e.target.value)} className="input-field">
                {CLASS_DAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">Time</label>
              <input type="time" value={classTime} onChange={(e) => setClassTime(e.target.value)} className="input-field" />
            </div>
          </div>

          {createError && <p className="text-brick text-xs font-semibold">{createError}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={creating} className="btn-primary flex-1">
              {creating ? "Creating…" : "Create Batch"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BatchedDashboard({ teacherUid }: { teacherUid: string }) {
  const [classes, setClasses] = useState<Class[] | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [submissionsRequest, setSubmissionsRequest] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDeleteClass, setConfirmDeleteClass] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({ homework: true, classes: true, students: true });
  const [aiHomeworkReq, setAiHomeworkReq] = useState(0);
  const [fileHomeworkReq, setFileHomeworkReq] = useState(0);
  const [kanbanReq, setKanbanReq] = useState(0);
  const [studentsTabReq, setStudentsTabReq] = useState(0);

  // Persist collapse state
  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
    try {
      const stored = localStorage.getItem("sidebar-sections");
      if (stored) setSectionOpen(JSON.parse(stored));
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  function toggleSection(key: keyof typeof sectionOpen) {
    setSectionOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("sidebar-sections", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  useEffect(() => {
    getTeacherClasses(teacherUid).then((cls) => {
      setClasses(cls);
      if (cls.length > 0) setSelectedId(cls[0].id);
    });
  }, [teacherUid]);

  if (classes === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  const handleCreate = async (data: { name: string; classType: "solo"|"group"; classDay: string; classTime: string }) => {
    setCreating(true);
    setCreateError(null);
    try {
      const { classId } = await createClass(data);
      const newClass: Class = {
        id: classId, name: data.name, teacherId: teacherUid,
        studentIds: [], classType: data.classType,
        classDay: data.classDay, classTime: data.classTime,
        createdAt: null as never,
      };
      setClasses((prev) => [newClass, ...(prev ?? [])]);
      setSelectedId(classId);
      setShowBatchModal(false);
      setCreateError(null);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create batch.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!confirmDeleteClass) return;
    setDeleting(true);
    try {
      await deleteClass({ classId: confirmDeleteClass.id });
      const updated = classes!.filter((c) => c.id !== confirmDeleteClass.id);
      setClasses(updated);
      setSelectedId(updated.length > 0 ? updated[0].id : null);
      setConfirmDeleteClass(null);
    } finally {
      setDeleting(false);
    }
  };

  // Empty state
  if (classes.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 bg-white/[0.04] border-2 border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="font-heading text-3xl text-slate-500">∑</span>
            </div>
            <h2 className="font-heading text-2xl font-semibold text-ink mb-1">Create your first batch</h2>
            <p className="text-mist text-sm mb-6 max-w-xs mx-auto leading-relaxed">
              Give your class a name, pick a day and time to get started.
            </p>
            <button onClick={() => setShowBatchModal(true)} className="btn-primary">Create Batch</button>
          </div>
        </div>
        <NewBatchModal
          open={showBatchModal} creating={creating} createError={createError}
          onSubmit={handleCreate} onClose={() => { setShowBatchModal(false); setCreateError(null); }}
        />
      </>
    );
  }

  // Sidebar content — collapse-aware for desktop, always expanded for tablet
  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden">

      {/* ── 1. Create Homework ────────────────────────────────────────── */}
      <div className="border-b border-white/10">
        {isCollapsed ? (
          <button
            onClick={() => setAiHomeworkReq((n) => n + 1)}
            title="Create Homework"
            className="flex items-center justify-center w-full h-11 text-green-400 hover:bg-green-500/10 transition-colors"
          >
            <PencilLine className="w-4 h-4" />
          </button>
        ) : (
          <>
            <button
              onClick={() => toggleSection("homework")}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
                <PencilLine className="w-3.5 h-3.5 text-green-400" />
              </span>
              <span className="flex-1 text-xs font-bold text-left text-ink truncate">Create Homework</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-mist transition-transform duration-200 ${sectionOpen.homework ? "rotate-180" : ""}`} />
            </button>
            {sectionOpen.homework && (
              <div className="pb-1">
                <button onClick={() => setAiHomeworkReq((n) => n + 1)}
                  className="flex items-center gap-2 w-full px-4 py-1.5 text-xs font-semibold text-mist hover:text-green-400 hover:bg-green-500/5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />AI Worksheet
                </button>
                <button onClick={() => setFileHomeworkReq((n) => n + 1)}
                  className="flex items-center gap-2 w-full px-4 py-1.5 text-xs font-semibold text-mist hover:text-green-400 hover:bg-green-500/5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />File Upload
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 2. Manage Classes ─────────────────────────────────────────── */}
      <div className="border-b border-white/10">
        {isCollapsed ? (
          <button
            onClick={() => setShowBatchModal(true)}
            title="Manage Classes"
            className="flex items-center justify-center w-full h-11 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        ) : (
          <>
            <button
              onClick={() => toggleSection("classes")}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0" style={{ background: 'rgba(6,182,212,0.12)' }}>
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              </span>
              <span className="flex-1 text-xs font-bold text-left text-ink truncate">Manage Classes</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-mist transition-transform duration-200 ${sectionOpen.classes ? "rotate-180" : ""}`} />
            </button>
            {sectionOpen.classes && (
              <div className="pb-1">
                <button onClick={() => setShowBatchModal(true)}
                  className="flex items-center gap-2 w-full px-4 py-1.5 text-xs font-semibold text-mist hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />Create New Class
                </button>
                <a href="/teacher/students"
                  className="flex items-center gap-2 w-full px-4 py-1.5 text-xs font-semibold text-mist hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />View Existing Classes
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 3. Manage Students ────────────────────────────────────────── */}
      <div className="border-b border-white/10">
        {isCollapsed ? (
          <a
            href="/teacher/students"
            title="Manage Students"
            className="flex items-center justify-center w-full h-11 text-purple-400 hover:bg-purple-500/10 transition-colors"
          >
            <Users className="w-4 h-4" />
          </a>
        ) : (
          <>
            <button
              onClick={() => toggleSection("students")}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0" style={{ background: 'rgba(168,85,247,0.12)' }}>
                <Users className="w-3.5 h-3.5 text-purple-400" />
              </span>
              <span className="flex-1 text-xs font-bold text-left text-ink truncate">Manage Students</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-mist transition-transform duration-200 ${sectionOpen.students ? "rotate-180" : ""}`} />
            </button>
            {sectionOpen.students && (
              <div className="pb-1">
                <a href="/teacher/students"
                  className="flex items-center gap-2 w-full px-4 py-1.5 text-xs font-semibold text-mist hover:text-purple-400 hover:bg-purple-500/5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />Create New Student
                </a>
                <a href="/teacher/students"
                  className="flex items-center gap-2 w-full px-4 py-1.5 text-xs font-semibold text-mist hover:text-purple-400 hover:bg-purple-500/5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />View Existing Students
                </a>
                <a href="/teacher/progress"
                  className="flex items-center gap-2 w-full px-4 py-1.5 text-xs font-semibold text-mist hover:text-purple-400 hover:bg-purple-500/5 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />Student Progress
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Desktop sidebar (lg+) — collapsible ──────────────────────── */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-white/10 bg-slate-950/70 backdrop-blur-xl overflow-y-auto transition-all duration-200 ${
        collapsed ? "w-12" : "w-52"
      }`}>
        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className={`flex items-center h-9 border-b border-white/10 text-mist hover:text-ink hover:bg-white/5 transition-colors shrink-0 ${
            collapsed ? "justify-center w-full" : "justify-end px-2.5"
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <SidebarContent isCollapsed={collapsed} />
      </aside>

      {/* ── Tablet sidebar slide-over (md–lg) ────────────────────────── */}
      {tabletSidebarOpen && (
        <div
          className="hidden md:block lg:hidden fixed inset-0 z-30 bg-ink/20"
          onClick={() => setTabletSidebarOpen(false)}
        />
      )}
      <aside className={`hidden md:flex lg:hidden flex-col w-52 shrink-0 bg-slate-950/90 backdrop-blur-xl border-r border-white/10 overflow-y-auto fixed left-0 top-14 bottom-0 z-40 transition-transform duration-300 ${
        tabletSidebarOpen ? "translate-x-0 shadow-glass-lg" : "-translate-x-full"
      }`}>
        <SidebarContent />
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Tablet toolbar: sidebar toggle + selected batch name */}
        <div className="hidden md:flex lg:hidden items-center gap-3 px-4 py-2 border-b border-white/10 bg-slate-900/80 shrink-0">
          <button
            onClick={() => setTabletSidebarOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-semibold text-ink"
          >
            <svg className="w-4 h-4 text-mist" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            Batches
          </button>
          <span className="text-sm font-semibold text-ink">
            {classes.find((c) => c.id === selectedId)?.name ?? ""}
          </span>
        </div>

        {/* Mobile: horizontal batch pills */}
        <div className="md:hidden flex items-center gap-2 px-4 pt-3 pb-0 overflow-x-auto scrollbar-hide">
          {classes.map((cls, idx) => (
            <BatchPill key={cls.id} cls={cls} idx={idx} size="xs"
              active={selectedId === cls.id} onClick={() => setSelectedId(cls.id)}
              onDelete={() => setConfirmDeleteClass(cls)} />
          ))}
          <button onClick={() => setShowBatchModal(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-green-400 border border-dashed border-green-500/30 hover:bg-green-500/10 transition-colors">
            <PlusIcon className="w-3 h-3" />
            New
          </button>
        </div>

        {/* Dashboard */}
        <div className="flex-1 overflow-y-auto">
          {selectedId && (
            <TeacherDashboard
              classId={selectedId}
              teacherUid={teacherUid}
              classes={classes!}
              submissionsRequest={submissionsRequest}
              aiHomeworkReq={aiHomeworkReq}
              fileHomeworkReq={fileHomeworkReq}
              kanbanReq={kanbanReq}
              studentsTabReq={studentsTabReq}
              onBatchChange={(id) => setSelectedId(id)}
            />
          )}
        </div>
      </div>

      {/* Confirm delete batch modal */}
      {confirmDeleteClass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteClass(null); }}
        >
          <div className="card p-6 w-full max-w-sm animate-fade-in">
            <h3 className="font-heading text-lg font-semibold text-ink mb-1">Delete batch?</h3>
            <p className="text-sm text-mist mb-5">
              <span className="font-semibold text-ink">{confirmDeleteClass.name}</span> and all its assignments will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteClass}
                disabled={deleting}
                className="flex-1 bg-brick hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setConfirmDeleteClass(null)} className="flex-1 btn-secondary" disabled={deleting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <NewBatchModal
        open={showBatchModal} creating={creating} createError={createError}
        onSubmit={handleCreate} onClose={() => { setShowBatchModal(false); setCreateError(null); }}
      />
    </div>
  );
}
