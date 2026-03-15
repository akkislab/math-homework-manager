"use client";
import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Search, X } from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { verifySubmission } from "../../lib/api";
import Spinner from "../shared/Spinner";
import type { BatchAssignment, Class, Submission, UserProfile } from "../../types";

// ── Palette (matches sidebar batch dots) ────────────────────────────────────
const BATCH_DOTS = [
  "bg-brand-500", "bg-purple-500", "bg-amber-400",
  "bg-sky-500",   "bg-rose-500",  "bg-teal-500",
];

// ── Types ────────────────────────────────────────────────────────────────────
type SortCol = "student" | "batch" | "submitted" | "dueDate" | "aiGrade" | "finalGrade" | "status";
type SortDir = "asc" | "desc";
type StatusKey = "pending" | "reviewed" | "graded";

// ── Helpers ──────────────────────────────────────────────────────────────────
function subStatus(s: Submission): StatusKey {
  if (s.status === "verified") return "graded";
  if (s.suggestedGrade != null) return "reviewed";
  return "pending";
}

function fmtDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts) return "—";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as string);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return "—"; }
}

function isOverdue(ts: { toDate?: () => Date } | null | undefined): boolean {
  if (!ts) return false;
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts as unknown as string);
    return d < new Date();
  } catch { return false; }
}

function buildCSV(
  rows: Submission[],
  studentMap: Record<string, UserProfile>,
  classMap: Record<string, Class>,
  baMap: Record<string, BatchAssignment>,
): string {
  const headers = ["#", "Student", "Email", "Batch", "Submitted", "Due Date", "AI Grade", "Final Grade", "Status", "AI Feedback"];
  const lines = rows.map((sub, i) => {
    const student = studentMap[sub.studentId];
    const cls = classMap[sub.classId];
    const ba = sub.batchAssignmentId ? baMap[sub.batchAssignmentId] : null;
    const dueTs = ba?.dueDate ?? sub.dueDate;
    return [
      i + 1,
      student?.displayName ?? "Unknown",
      student?.email ?? "",
      cls?.name ?? "",
      fmtDate(sub.submittedAt),
      fmtDate(dueTs),
      sub.suggestedGrade != null ? `${sub.suggestedGrade}/100` : "",
      sub.grade != null ? `${sub.grade}/100` : "",
      subStatus(sub),
      (sub.aiFeedback ?? "").replace(/[\r\n]+/g, " "),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  return [headers.join(","), ...lines].join("\r\n");
}

function triggerDownload(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SortTh({
  label, col, sortCol, sortDir, onSort, className,
}: {
  label: string; col: SortCol; sortCol: SortCol; sortDir: SortDir;
  onSort: (c: SortCol) => void; className?: string;
}) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`select-none cursor-pointer px-3 py-2.5 text-left text-[11px] font-bold text-mist uppercase tracking-wider whitespace-nowrap hover:text-ink transition-colors ${className ?? ""}`}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {active
          ? sortDir === "asc"
            ? <ChevronUp className="w-3 h-3 text-brand-500 shrink-0" />
            : <ChevronDown className="w-3 h-3 text-brand-500 shrink-0" />
          : <ChevronsUpDown className="w-3 h-3 opacity-30 shrink-0" />}
      </div>
    </th>
  );
}

function InlineGradeCell({ sub }: { sub: Submission }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setVal(sub.grade != null ? String(sub.grade) : "");
    setEditing(true);
  }

  async function commit() {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0 || n > 100) { setEditing(false); return; }
    if (n === sub.grade) { setEditing(false); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "submissions", sub.id), { grade: n });
    } finally { setSaving(false); setEditing(false); }
  }

  if (editing) {
    return (
      <input
        type="number" min={0} max={100}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        onClick={e => e.stopPropagation()}
        autoFocus
        className="w-16 px-1.5 py-0.5 border border-brand-400 rounded-lg text-sm font-nums text-center focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to edit grade"
      className="group flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-parchment transition-colors cursor-text min-w-[60px]"
    >
      {saving ? <Spinner size="xs" /> : sub.grade != null ? (
        <>
          <span className="font-nums text-sm font-semibold text-ink">{sub.grade}</span>
          <span className="font-nums text-xs text-mist">/100</span>
        </>
      ) : (
        <span className="text-mist text-sm">—</span>
      )}
      <svg className="w-3 h-3 text-mist opacity-0 group-hover:opacity-60 transition-opacity shrink-0 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  );
}

function StatusPill({ status }: { status: StatusKey }) {
  const styles: Record<StatusKey, string> = {
    pending:  "bg-amber-50  text-amber-700  border-amber-200",
    reviewed: "bg-sky-50    text-sky-700    border-sky-200",
    graded:   "bg-brand-50  text-brand-700  border-brand-200",
  };
  const labels: Record<StatusKey, string> = { pending: "Pending", reviewed: "Reviewed", graded: "Graded" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles[status]}`}>
      {status === "graded" && (
        <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {labels[status]}
    </span>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  submissions: Submission[];
  studentMap: Record<string, UserProfile>;
  classes: Class[];
  batchAssignments: BatchAssignment[];
  loading?: boolean;
  filterBatchId?: string | null;
  onClearFilter?: () => void;
  onVerified: (id: string) => void;
}

// ── Main spreadsheet ─────────────────────────────────────────────────────────
export default function SubmissionsSpreadsheet({
  submissions,
  studentMap,
  classes,
  batchAssignments,
  loading,
  filterBatchId,
  onClearFilter,
  onVerified,
}: Props) {
  const [search, setSearch]               = useState("");
  const [batchFilter, setBatchFilter]     = useState("all");
  const [statusFilter, setStatusFilter]   = useState<StatusKey | "all">("all");
  const [sortCol, setSortCol]             = useState<SortCol>("submitted");
  const [sortDir, setSortDir]             = useState<SortDir>("desc");
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [reviewSub, setReviewSub]         = useState<Submission | null>(null);
  const [bulkWorking, setBulkWorking]     = useState(false);
  const classMap      = useMemo(() => Object.fromEntries(classes.map(c => [c.id, c])),                    [classes]);
  const classColorIdx = useMemo(() => Object.fromEntries(classes.map((c, i) => [c.id, i % BATCH_DOTS.length])), [classes]);
  const baMap         = useMemo(() => Object.fromEntries(batchAssignments.map(ba => [ba.id, ba])),        [batchAssignments]);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    let r = [...submissions];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(s => (studentMap[s.studentId]?.displayName ?? "").toLowerCase().includes(q));
    }
    if (batchFilter !== "all")   r = r.filter(s => s.classId === batchFilter);
    if (statusFilter !== "all")  r = r.filter(s => subStatus(s) === statusFilter);

    r.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "student":
          cmp = (studentMap[a.studentId]?.displayName ?? "").localeCompare(studentMap[b.studentId]?.displayName ?? "");
          break;
        case "batch":
          cmp = (classMap[a.classId]?.name ?? "").localeCompare(classMap[b.classId]?.name ?? "");
          break;
        case "submitted":
          cmp = (a.submittedAt?.toDate?.().getTime() ?? 0) - (b.submittedAt?.toDate?.().getTime() ?? 0);
          break;
        case "dueDate": {
          const getDue = (s: Submission) => {
            const ba = s.batchAssignmentId ? baMap[s.batchAssignmentId] : null;
            return (ba?.dueDate ?? s.dueDate)?.toDate?.().getTime() ?? 0;
          };
          cmp = getDue(a) - getDue(b);
          break;
        }
        case "aiGrade":    cmp = (a.suggestedGrade ?? -1) - (b.suggestedGrade ?? -1); break;
        case "finalGrade": cmp = (a.grade ?? -1) - (b.grade ?? -1); break;
        case "status": {
          const ord: Record<StatusKey, number> = { graded: 0, reviewed: 1, pending: 2 };
          cmp = ord[subStatus(a)] - ord[subStatus(b)];
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [submissions, search, batchFilter, statusFilter, sortCol, sortDir, studentMap, classMap, baMap]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  const allSelected  = rows.length > 0 && rows.every(s => selected.has(s.id));
  const someSelected = rows.some(s => selected.has(s.id));

  function toggleAll() { setSelected(allSelected ? new Set() : new Set(rows.map(s => s.id))); }
  function toggleRow(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selRows          = rows.filter(s => selected.has(s.id));
  const hasPendingInSel  = selRows.some(s => s.status === "pending");

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function handleBulkMarkReviewed() {
    setBulkWorking(true);
    try {
      const pending = selRows.filter(s => s.status === "pending");
      await Promise.all(
        pending.map(s =>
          updateDoc(doc(db, "submissions", s.id), {
            status: "verified",
            grade: s.suggestedGrade ?? 80,
            verifiedAt: serverTimestamp(),
          })
        )
      );
      pending.forEach(s => onVerified(s.id));
      setSelected(new Set());
    } finally { setBulkWorking(false); }
  }

  // ── Loading / empty states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-parchment rounded-xl animate-pulse"
            style={{ opacity: 1 - i * 0.11 }}
          />
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-parchment border-2 border-sand rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-mist" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <p className="font-heading text-xl font-semibold text-ink mb-1">No submissions yet</p>
        <p className="text-sm text-mist">Students haven&apos;t submitted any work yet.</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Filter-active banner ──────────────────────────────────── */}
      {filterBatchId && onClearFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border-b border-brand-100 text-sm shrink-0">
          <svg className="w-3.5 h-3.5 text-brand-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="font-semibold text-brand-700 flex-1 text-xs">Filtered by assignment</span>
          <button onClick={onClearFilter} className="text-xs font-bold text-brand-600 underline underline-offset-2 hover:text-brand-900 transition-colors shrink-0">
            Show all
          </button>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-sand bg-white shrink-0">
        {/* Search */}
        <div className="relative min-w-[150px] max-w-[260px] flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mist pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student…"
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-sand rounded-lg bg-parchment/50 placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-mist hover:text-ink transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Batch filter */}
        <select
          value={batchFilter}
          onChange={e => setBatchFilter(e.target.value)}
          className="text-xs font-semibold border border-sand rounded-lg px-2.5 py-1.5 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
        >
          <option value="all">All Batches</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusKey | "all")}
          className="text-xs font-semibold border border-sand rounded-lg px-2.5 py-1.5 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="graded">Graded</option>
        </select>

        {/* Row count + download */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-mist font-semibold whitespace-nowrap hidden sm:block">
            {rows.length} of {submissions.length}
          </span>
          <button
            onClick={() => triggerDownload(buildCSV(rows, studentMap, classMap, baMap), "submissions.csv")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-mist hover:text-ink border border-sand rounded-lg hover:bg-parchment transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download CSV</span>
          </button>
        </div>
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────── */}
      {someSelected && (
        <div className="flex items-center gap-3 px-3 py-2 bg-brand-500 text-white text-sm shrink-0 animate-fade-in">
          <span className="font-semibold text-sm">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => triggerDownload(buildCSV(selRows, studentMap, classMap, baMap), "selected_submissions.csv")}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors"
            >
              <Download className="w-3 h-3" />
              Download CSV
            </button>
            {hasPendingInSel && (
              <button
                onClick={handleBulkMarkReviewed}
                disabled={bulkWorking}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-brand-700 text-xs font-bold hover:bg-brand-50 transition-colors disabled:opacity-60"
              >
                {bulkWorking
                  ? <Spinner size="xs" />
                  : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                }
                Mark Reviewed
              </button>
            )}
            <button onClick={() => setSelected(new Set())} className="p-1 rounded-lg hover:bg-white/20 transition-colors ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-16 text-center">
          <div>
            <p className="font-semibold text-ink text-sm mb-1">No results</p>
            <p className="text-xs text-mist">Try adjusting your search or filters.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-sm" style={{ minWidth: "960px", width: "100%" }}>
            <thead>
              <tr className="border-b border-sand bg-white sticky top-0 z-20">
                {/* Checkbox — sticky left-0 */}
                <th className="sticky left-0 z-30 bg-white w-10 px-3 py-2.5 border-r border-sand/40">
                  <input
                    ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-sand accent-brand-500 cursor-pointer"
                  />
                </th>
                {/* # — sticky left-10 */}
                <th className="sticky left-10 z-30 bg-white w-10 px-2 py-2.5 text-[11px] font-bold text-mist text-center border-r border-sand/40">#</th>
                {/* Student — sticky left-20 */}
                <SortTh
                  label="Student" col="student" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort}
                  className="sticky left-20 z-30 bg-white min-w-[180px] border-r border-sand/40"
                />
                <SortTh label="Batch"       col="batch"      sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="min-w-[130px]" />
                <SortTh label="Submitted"   col="submitted"  sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="w-[90px]" />
                <SortTh label="Due Date"    col="dueDate"    sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="w-[90px]" />
                <SortTh label="AI Grade"    col="aiGrade"    sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="w-[90px]" />
                <SortTh label="Final Grade" col="finalGrade" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="w-[110px]" />
                <SortTh label="Status"      col="status"     sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="w-[115px]" />
                <th className="px-3 py-2.5 w-[95px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/40">
              {rows.map((sub, i) => {
                const student    = studentMap[sub.studentId];
                const cls        = classMap[sub.classId];
                const dotClass   = BATCH_DOTS[classColorIdx[sub.classId] ?? 0];
                const ba         = sub.batchAssignmentId ? baMap[sub.batchAssignmentId] : null;
                const dueTs      = ba?.dueDate ?? sub.dueDate;
                const overdue    = isOverdue(dueTs);
                const status     = subStatus(sub);
                const isSel      = selected.has(sub.id);
                const isEven     = i % 2 === 1;
                const rowBg      = isSel ? "bg-brand-50" : isEven ? "bg-cream/40" : "bg-white";
                const stickyBg   = isSel ? "bg-brand-50" : isEven ? "bg-cream/40 group-hover:bg-parchment/60" : "bg-white group-hover:bg-parchment/30";
                const initials   = student?.displayName
                  ? student.displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
                  : "?";

                const feedback = sub.aiFeedback ?? "";
                const feedbackShort = feedback.length > 90 ? feedback.slice(0, 90) + "…" : feedback;

                return (
                  <tr
                    key={sub.id}
                    onClick={() => toggleRow(sub.id)}
                    className={`group transition-colors cursor-pointer ${rowBg} hover:bg-parchment/30`}
                  >
                    {/* Checkbox */}
                    <td className={`sticky left-0 z-10 px-3 py-2.5 border-r border-sand/40 ${stickyBg}`}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleRow(sub.id)}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-sand accent-brand-500 cursor-pointer"
                      />
                    </td>

                    {/* # */}
                    <td className={`sticky left-10 z-10 px-2 py-2.5 text-center font-nums text-xs text-mist border-r border-sand/40 ${stickyBg}`}>
                      {i + 1}
                    </td>

                    {/* Student */}
                    <td className={`sticky left-20 z-10 px-3 py-2.5 border-r border-sand/40 ${stickyBg}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-[10px] shrink-0">
                          {initials}
                        </div>
                        <span className="font-semibold text-ink text-sm truncate max-w-[140px]">
                          {student?.displayName ?? "Unknown"}
                        </span>
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                        <span className="text-xs font-semibold text-mist truncate">{cls?.name ?? "—"}</span>
                      </div>
                    </td>

                    {/* Submitted */}
                    <td className="px-3 py-2.5 text-xs text-mist whitespace-nowrap">
                      {fmtDate(sub.submittedAt)}
                    </td>

                    {/* Due Date */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${overdue ? "text-brick" : "text-mist"}`}>
                        {fmtDate(dueTs)}
                        {overdue && <span className="ml-1">⚠</span>}
                      </span>
                    </td>

                    {/* AI Grade */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {sub.suggestedGrade != null ? (
                        <span className="font-nums text-sm font-semibold text-sky-600">
                          {sub.suggestedGrade}<span className="text-sky-400 text-xs font-normal">/100</span>
                        </span>
                      ) : (
                        <span className="text-mist text-xs">—</span>
                      )}
                    </td>

                    {/* Final Grade — inline editable */}
                    <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                      <InlineGradeCell sub={sub} />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      <StatusPill status={status} />
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View submitted file"
                          className="p-1.5 rounded-lg text-mist hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                        <button
                          onClick={() => setReviewSub(sub)}
                          className="text-[11px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100"
                        >
                          Review →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Review modal ──────────────────────────────────────────── */}
      {reviewSub && (
        <div
          className="fixed inset-0 z-50 flex sm:items-center items-end justify-center bg-ink/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setReviewSub(null); }}
        >
          <div className="w-full max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-warm-lg max-h-[90vh] overflow-y-auto">
            <div className="sm:hidden w-10 h-1 bg-sand rounded-full mx-auto mt-3 mb-1" />
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand sticky top-0 bg-white z-10">
              <p className="font-heading text-lg font-semibold text-ink">Review Submission</p>
              <button
                onClick={() => setReviewSub(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-mist hover:text-ink hover:bg-parchment transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5">
              <ReviewModal
                submission={reviewSub}
                student={studentMap[reviewSub.studentId] ?? null}
                onVerified={() => { onVerified(reviewSub.id); setReviewSub(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ReviewModal — single-submission grading form ──────────────────────────────
function ReviewModal({
  submission, student, onVerified,
}: {
  submission: Submission;
  student: UserProfile | null;
  onVerified: () => void;
}) {
  const [grade, setGrade]     = useState(submission.suggestedGrade ?? 80);
  const [feedback, setFeedback] = useState(submission.aiFeedback ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      await verifySubmission({ submissionId: submission.id, grade, feedback });
      onVerified();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify.");
    } finally { setLoading(false); }
  };

  const gradeColor = grade >= 90 ? "text-brand-600" : grade >= 70 ? "text-amber-600" : "text-brick";
  const initials = student?.displayName
    ? student.displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div>
      {/* Student header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-brand-100 border-2 border-brand-200 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm">{student?.displayName ?? "Unknown Student"}</p>
          <p className="text-xs text-mist">Submitted {fmtDate(submission.submittedAt)}</p>
        </div>
        <span className={`badge-status ${submission.status === "pending" ? "badge-pending" : "badge-graded"}`}>
          {submission.status === "pending" ? "Pending Review" : "Verified"}
        </span>
      </div>

      {/* View file link */}
      <a
        href={submission.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 p-3 border border-sand rounded-xl mb-4 hover:bg-parchment transition-colors group"
      >
        <div className="w-8 h-8 bg-parchment rounded-lg flex items-center justify-center group-hover:bg-brand-50 transition-colors">
          <svg className="w-4 h-4 text-mist group-hover:text-brand-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-brand-600 group-hover:text-brand-700 transition-colors flex-1">View Submitted Work</span>
        <svg className="w-3.5 h-3.5 text-mist" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>

      {submission.status === "pending" && (
        <>
          {/* AI suggestion */}
          {submission.suggestedGrade != null && (
            <div className="mb-4 p-3.5 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-3">
              <div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-sky-800">
                  AI Suggested Grade: <span className="font-nums">{submission.suggestedGrade}/100</span>
                </p>
                {submission.aiFeedback && (
                  <p className="text-xs text-sky-600 mt-0.5 leading-relaxed">{submission.aiFeedback}</p>
                )}
                <p className="text-xs text-sky-400 mt-1">Review and adjust below before confirming.</p>
              </div>
            </div>
          )}

          {/* Grade slider */}
          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-bold text-ink">Grade</label>
              <span className={`font-nums text-2xl font-bold ${gradeColor}`}>
                {grade}<span className="text-sm font-normal text-mist">/100</span>
              </span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={grade}
              onChange={e => setGrade(Number(e.target.value))}
              className="w-full h-2 bg-parchment rounded-full appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-mist font-nums mt-1.5">
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          {/* Feedback */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-ink mb-1.5">Feedback for Student</label>
            <textarea
              rows={3}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Great work on problem 3! Remember to show your working for fractions…"
              className="input-field resize-none"
            />
          </div>

          {error && <p className="text-brick text-sm font-semibold mb-3">{error}</p>}

          <button onClick={handleVerify} disabled={loading} className="btn-primary w-full">
            {loading ? "Saving…" : `Confirm Grade (${grade}/100)`}
          </button>
        </>
      )}

      {submission.status === "verified" && (
        <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-xl">
          <p className="font-nums font-bold text-brand-800 text-lg">
            {submission.grade}<span className="text-sm font-normal text-brand-600">/100</span>
          </p>
          {submission.feedback && (
            <p className="text-sm text-brand-700 mt-1 leading-relaxed italic">&ldquo;{submission.feedback}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
