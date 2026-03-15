"use client";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import Spinner from "../../../components/shared/Spinner";
import { useAuth } from "../../../hooks/useAuth";
import {
  getTeacherClasses,
  getStudentsByClass,
  listenBatchAssignments,
  listenStudentSubmissions,
} from "../../../lib/firestore";
import type { BatchAssignment, Class, Submission, UserProfile } from "../../../types";

// ── Types ─────────────────────────────────────────────────────────────────────
type RowStatus = "not_submitted" | "submitted" | "needs_grading" | "graded" | "late";

interface AssignmentRow {
  assignment: BatchAssignment;
  submission?: Submission;
  status: RowStatus;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts) return "—";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as string);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "—"; }
}

function rowStatusFor(sub: Submission | undefined, ba: BatchAssignment): RowStatus {
  const dueDate = ba.dueDate?.toDate?.() ?? new Date(0);
  const now = new Date();
  if (!sub) return dueDate < now ? "late" : "not_submitted";
  if (sub.status === "verified") return "graded";
  if (sub.suggestedGrade != null) return "needs_grading";
  const subAt = sub.submittedAt?.toDate?.() ?? new Date();
  return subAt > dueDate ? "late" : "submitted";
}

// ── Status pill ───────────────────────────────────────────────────────────────
const STATUS_CFG: Record<RowStatus, { bg: string; text: string; dot: string; label: string }> = {
  not_submitted: { bg: "bg-slate-500/10",  text: "text-slate-400",  dot: "bg-slate-400",  label: "Not Submitted" },
  submitted:     { bg: "bg-sky-500/10",    text: "text-sky-400",    dot: "bg-sky-400",    label: "Submitted" },
  needs_grading: { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400", label: "Needs Grading" },
  graded:        { bg: "bg-emerald-500/10",text: "text-emerald-400",dot: "bg-emerald-400",label: "Graded" },
  late:          { bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400",    label: "Late" },
};

function StatusPill({ status }: { status: RowStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string;
  color: "default" | "sky" | "orange" | "emerald" | "purple" | "red";
}) {
  const cfg = {
    default:  { border: "border-white/10",          bg: "bg-white/[0.02]",   text: "text-slate-100",   label: "text-slate-500" },
    sky:      { border: "border-sky-500/20",         bg: "bg-sky-500/10",     text: "text-sky-300",     label: "text-sky-400" },
    orange:   { border: "border-orange-500/20",      bg: "bg-orange-500/10",  text: "text-orange-300",  label: "text-orange-400" },
    emerald:  { border: "border-emerald-500/20",     bg: "bg-emerald-500/10", text: "text-emerald-300", label: "text-emerald-400" },
    purple:   { border: "border-purple-500/20",      bg: "bg-purple-500/10",  text: "text-purple-300",  label: "text-purple-400" },
    red:      { border: "border-red-500/20",         bg: "bg-red-500/10",     text: "text-red-300",     label: "text-red-400" },
  }[color];
  return (
    <div className={`border rounded-xl px-3 py-2 ${cfg.border} ${cfg.bg}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${cfg.label}`}>{label}</p>
      <div className="flex items-baseline gap-1">
        <p className={`text-xl font-bold leading-none ${cfg.text}`}>{value}</p>
        {sub && <span className={`text-xs ${cfg.label}`}>{sub}</span>}
      </div>
    </div>
  );
}

// ── Custom chart tooltip ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number; name: string}[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 shadow-glass-lg border border-white/10 text-xs" style={{ background: 'rgba(13,18,30,0.97)' }}>
      <p className="font-bold text-slate-200 mb-1 truncate max-w-[140px]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-400">
          {p.name}: <span className="font-bold text-white">{p.value ?? "—"}</span>
        </p>
      ))}
    </div>
  );
}

// ── Page entry ─────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { user } = useAuth();
  return (
    <AuthGuard requiredRole="teacher">
      {user && (
        <div className="flex flex-col h-screen overflow-hidden">
          <Navbar uid={user.uid} displayName={user.displayName ?? "Teacher"} role="teacher" />
          <div className="flex-1 overflow-y-auto">
            <ProgressContent teacherUid={user.uid} />
          </div>
        </div>
      )}
    </AuthGuard>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────
function ProgressContent({ teacherUid }: { teacherUid: string }) {
  const [classes, setClasses]               = useState<Class[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [students, setStudents]             = useState<UserProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [batchAssignments, setBatchAssignments] = useState<BatchAssignment[]>([]);
  const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [statusFilter, setStatusFilter]     = useState<RowStatus | "all">("all");
  const [search, setSearch]                 = useState("");

  // Load classes once
  useEffect(() => {
    getTeacherClasses(teacherUid).then((cls) => {
      setClasses(cls);
      if (cls.length > 0) setSelectedBatchId(cls[0].id);
      setLoadingClasses(false);
    });
  }, [teacherUid]);

  // Load students when batch changes
  useEffect(() => {
    if (!selectedBatchId) return;
    setLoadingStudents(true);
    setSelectedStudentId("");
    setStudentSubmissions([]);
    getStudentsByClass(selectedBatchId).then((s) => {
      setStudents(s);
      if (s.length > 0) setSelectedStudentId(s[0].uid);
      setLoadingStudents(false);
    });
  }, [selectedBatchId]);

  // Real-time batch assignments
  useEffect(() => {
    if (!selectedBatchId) return;
    return listenBatchAssignments(selectedBatchId, setBatchAssignments);
  }, [selectedBatchId]);

  // Real-time student submissions
  useEffect(() => {
    if (!selectedStudentId) return;
    return listenStudentSubmissions(selectedStudentId, setStudentSubmissions);
  }, [selectedStudentId]);

  // Build assignment rows
  const assignmentRows = useMemo<AssignmentRow[]>(() => {
    if (!selectedStudentId) return [];
    return batchAssignments.map((ba) => {
      const sub = studentSubmissions.find((s) => s.batchAssignmentId === ba.id);
      return { assignment: ba, submission: sub, status: rowStatusFor(sub, ba) };
    });
  }, [batchAssignments, studentSubmissions, selectedStudentId]);

  // Summary metrics
  const metrics = useMemo(() => {
    const total     = assignmentRows.length;
    const submitted = assignmentRows.filter((r) => r.submission).length;
    const missing   = assignmentRows.filter((r) => !r.submission).length;
    const late      = assignmentRows.filter((r) => r.status === "late").length;
    const gradedRows = assignmentRows.filter((r) => r.submission?.grade != null);
    const grades = gradedRows.map((r) => r.submission!.grade!);
    const avg = grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
    return { total, submitted, missing, late, avg };
  }, [assignmentRows]);

  // Chart data — scored assignments sorted by creation date
  const chartData = useMemo(() => {
    return [...assignmentRows]
      .filter((r) => r.submission?.grade != null)
      .sort((a, b) => (a.assignment.createdAt?.toDate?.().getTime() ?? 0) - (b.assignment.createdAt?.toDate?.().getTime() ?? 0))
      .map((r) => ({
        name: r.assignment.title.length > 14 ? r.assignment.title.slice(0, 14) + "…" : r.assignment.title,
        Score: r.submission!.grade,
        "AI Grade": r.submission!.suggestedGrade ?? null,
      }));
  }, [assignmentRows]);

  // Class average for reference line
  const classAvg = useMemo(() => {
    const grades = chartData.map((d) => d.Score).filter((g): g is number => g != null);
    return grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
  }, [chartData]);

  // Filtered table rows
  const filteredRows = useMemo(() => {
    let rows = [...assignmentRows];
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (search.trim()) rows = rows.filter((r) => r.assignment.title.toLowerCase().includes(search.toLowerCase()));
    return rows.sort((a, b) => (b.assignment.createdAt?.toDate?.().getTime() ?? 0) - (a.assignment.createdAt?.toDate?.().getTime() ?? 0));
  }, [assignmentRows, statusFilter, search]);

  const selectedStudent = students.find((s) => s.uid === selectedStudentId);
  const selectedBatch   = classes.find((c) => c.id === selectedBatchId);

  const STATUS_PILLS: { key: RowStatus | "all"; label: string }[] = [
    { key: "all",           label: "All" },
    { key: "not_submitted", label: "Not Submitted" },
    { key: "submitted",     label: "Submitted" },
    { key: "needs_grading", label: "Needs Grading" },
    { key: "graded",        label: "Graded" },
    { key: "late",          label: "Late" },
  ];

  if (loadingClasses) {
    return <div className="flex items-center justify-center h-64"><Spinner size="md" /></div>;
  }

  if (classes.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-white/[0.04] border-2 border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
        <p className="font-semibold text-slate-300 mb-1">No batches found</p>
        <p className="text-sm text-slate-500">Create a batch from the dashboard first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">

      {/* ── Page header + selectors ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-5">
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-ink leading-none mb-0.5">Student Progress</h1>
          <p className="text-sm text-mist">Track individual performance, submission history, and grade trends.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Batch selector */}
          <div className="relative">
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="input-field text-sm py-1.5 pl-3 pr-8 appearance-none cursor-pointer min-w-[150px]"
            >
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mist pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>

          {/* Student selector */}
          <div className="relative">
            {loadingStudents ? (
              <div className="flex items-center gap-2 px-3 py-1.5 input-field min-w-[150px]">
                <Spinner size="xs" /><span className="text-sm text-mist">Loading…</span>
              </div>
            ) : students.length === 0 ? (
              <select disabled className="input-field text-sm py-1.5 pl-3 pr-8 min-w-[150px] opacity-50">
                <option>No students</option>
              </select>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="input-field text-sm py-1.5 pl-3 pr-8 appearance-none cursor-pointer min-w-[150px]"
              >
                {students.map((s) => <option key={s.uid} value={s.uid}>{s.displayName}</option>)}
              </select>
            )}
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mist pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {!selectedStudentId ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-white/[0.04] border-2 border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <p className="font-semibold text-slate-300 mb-1">Select a student</p>
          <p className="text-sm text-slate-500">Choose a batch and student to view their progress.</p>
        </div>
      ) : (
        <>
          {/* ── Student identity strip ───────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-10 h-10 rounded-full bg-green-500/15 border-2 border-green-500/25 flex items-center justify-center text-green-400 font-bold text-sm shrink-0">
              {selectedStudent?.displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-none mb-0.5">{selectedStudent?.displayName}</p>
              <p className="text-xs text-slate-500">{selectedStudent?.email} · <span className="text-slate-400">{selectedBatch?.name}</span></p>
            </div>
            {metrics.avg != null && (
              <div className={`ml-auto shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${
                metrics.avg >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : metrics.avg >= 60 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                Avg {metrics.avg}%
              </div>
            )}
          </div>

          {/* ── Summary stat cards ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
            <StatCard label="Total Assignments" value={metrics.total}     color="default" />
            <StatCard label="Submitted"         value={metrics.submitted} color="sky" />
            <StatCard label="Missing"           value={metrics.missing}   color="orange" />
            <StatCard label="Late"              value={metrics.late}      color="red" />
            <StatCard
              label="Avg Score"
              value={metrics.avg ?? "—"}
              sub={metrics.avg != null ? "/100" : undefined}
              color="purple"
            />
          </div>

          {/* ── Score trend chart ────────────────────────────────────────────── */}
          <div className="rounded-xl border border-white/8 p-4 mb-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-200">Score Trend</h2>
                <p className="text-[11px] text-slate-500">{chartData.length} graded assignment{chartData.length !== 1 ? "s" : ""}</p>
              </div>
              {classAvg != null && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-5 border-t border-dashed border-slate-500" />
                  avg {classAvg}%
                </div>
              )}
            </div>

            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-28 text-slate-500 text-sm">No graded data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barSize={20} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  {classAvg != null && (
                    <ReferenceLine y={classAvg} stroke="#64748b" strokeDasharray="4 3" strokeWidth={1} />
                  )}
                  <Bar dataKey="Score" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Assignment history ───────────────────────────────────────────── */}
          <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>

            {/* Table toolbar */}
            <div className="px-4 pt-3 pb-2 border-b border-white/8">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="text-sm font-bold text-slate-200">Assignment History</h2>
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg min-w-[180px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search assignments…"
                    className="flex-1 bg-transparent text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-300">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_PILLS.map(({ key, label }) => {
                  const isActive = statusFilter === key;
                  const count = key === "all" ? assignmentRows.length : assignmentRows.filter(r => r.status === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key as RowStatus | "all")}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        isActive ? "bg-white/15 text-slate-100" : "bg-white/[0.05] text-slate-400 hover:bg-white/[0.09]"
                      }`}
                    >
                      {label}
                      {count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            {filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-12 h-12 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <p className="font-semibold text-slate-400 text-sm mb-0.5">
                  {assignmentRows.length === 0 ? "No assignment data available yet." : "No results for this filter."}
                </p>
                {assignmentRows.length > 0 && (
                  <button onClick={() => { setStatusFilter("all"); setSearch(""); }} className="text-xs text-green-400 hover:underline mt-1">Clear filters</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="border-collapse text-sm" style={{ minWidth: "760px", width: "100%" }}>
                  <thead>
                    <tr className="border-b border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th className="px-4 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assignment</th>
                      <th className="px-4 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-4 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Submitted</th>
                      <th className="px-4 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teacher Grade</th>
                      <th className="px-4 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Grade</th>
                      <th className="px-4 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, i) => {
                      const { assignment: ba, submission: sub, status } = row;
                      const rowBg = i % 2 === 1 ? "bg-white/[0.015]" : "bg-transparent";
                      return (
                        <tr key={ba.id} className={`border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors ${rowBg}`}>
                          {/* Assignment name */}
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ba.type === "ai" ? "bg-green-400" : "bg-sky-400"}`} />
                              <span className="font-semibold text-slate-200 text-xs truncate max-w-[160px]" title={ba.title}>{ba.title}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${ba.type === "ai" ? "bg-green-500/10 text-green-400" : "bg-sky-500/10 text-sky-400"}`}>
                                {ba.type === "ai" ? "AI" : "File"}
                              </span>
                            </div>
                          </td>

                          {/* Due date */}
                          <td className="px-4 py-2">
                            <span className={`text-xs font-semibold ${ba.dueDate && ba.dueDate.toDate() < new Date() && !sub ? "text-red-400" : "text-slate-500"}`}>
                              {fmtDate(ba.dueDate)}
                            </span>
                          </td>

                          {/* Submitted date */}
                          <td className="px-4 py-2">
                            <span className="text-xs text-slate-500">{sub ? fmtDate(sub.submittedAt) : "—"}</span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-2"><StatusPill status={status} /></td>

                          {/* Teacher grade */}
                          <td className="px-4 py-2">
                            {sub?.grade != null ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${
                                sub.grade >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : sub.grade >= 60 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                              }`}>
                                {sub.grade}/100
                              </span>
                            ) : <span className="text-slate-600 text-xs">—</span>}
                          </td>

                          {/* AI grade */}
                          <td className="px-4 py-2">
                            {sub?.suggestedGrade != null ? (
                              <span className="font-mono text-xs font-semibold text-sky-400">
                                {sub.suggestedGrade}<span className="text-sky-600 font-normal">/100</span>
                              </span>
                            ) : <span className="text-slate-600 text-xs">—</span>}
                          </td>

                          {/* Comments */}
                          <td className="px-4 py-2 max-w-[180px]">
                            <span className="text-xs text-slate-500 truncate block" title={sub?.feedback ?? sub?.aiFeedback ?? ""}>
                              {sub?.feedback ?? sub?.aiFeedback ?? "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
