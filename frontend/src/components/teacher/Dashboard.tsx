"use client";
import { useCallback, useEffect, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useDropzone } from "react-dropzone";
import { GradeChart, CompletionChart } from "./ProgressChart";
import WorksheetGenerator from "./WorksheetGenerator";
import SubmissionReview from "./SubmissionReview";
import Toast from "../shared/Toast";
import { storage } from "../../lib/firebase";
import {
  getClassProgress,
  getPendingSubmissions,
  getStudentsByClass,
  listenBatchAssignments,
  getSubmissionsForBatchAssignment,
} from "../../lib/firestore";
import { createFileAssignment } from "../../lib/api";
import type {
  BatchAssignment,
  CreateFileAssignmentPayload,
  StudentProgress,
  Submission,
  UserProfile,
} from "../../types";

interface Props {
  classId: string;
  teacherUid: string;
}

type Tab = "overview" | "assignments" | "submissions" | "students";
type ModalTab = "ai" | "file";

export default function TeacherDashboard({ classId, teacherUid }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [pendingSubs, setPendingSubs] = useState<Submission[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, UserProfile>>({});
  const [batchAssignments, setBatchAssignments] = useState<BatchAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("ai");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  // When set, the submissions tab filters to this batch assignment
  const [filterBatchId, setFilterBatchId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getClassProgress(classId),
      getPendingSubmissions(teacherUid),
      getStudentsByClass(classId),
    ]).then(([prog, subs, studs]) => {
      setProgress(prog);
      setPendingSubs(subs);
      setStudents(studs);
      const map: Record<string, UserProfile> = {};
      studs.forEach((s) => (map[s.uid] = s));
      setStudentMap(map);
      setLoading(false);
    });
  }, [classId, teacherUid]);

  // Real-time batch assignments listener
  useEffect(() => {
    return listenBatchAssignments(classId, setBatchAssignments);
  }, [classId]);

  const classAvg =
    progress.length > 0
      ? Math.round(
          progress.reduce((a, b) => a + b.avgGrade, 0) / progress.length
        )
      : 0;
  const submissionRate =
    progress.length > 0
      ? Math.round(
          (progress.reduce((a, b) => a + b.submitted, 0) /
            Math.max(progress.reduce((a, b) => a + b.totalAssignments, 0), 1)) *
            100
        )
      : 0;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "assignments", label: "Assignments", badge: batchAssignments.length || undefined },
    { id: "submissions", label: "Review Submissions", badge: pendingSubs.length },
    { id: "students", label: "Students" },
  ];

  const handleAssignSuccess = () => {
    setIsModalOpen(false);
    setToast({ message: "You successfully assigned the work.", type: "success" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-sm text-gray-500">{students.length} students enrolled</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Students" value={students.length} icon="👥" color="blue" />
        <StatCard label="Class Average" value={`${classAvg}%`} icon="📊" color="green" />
        <StatCard label="Submission Rate" value={`${submissionRate}%`} icon="📬" color="yellow" />
        <StatCard label="Pending Reviews" value={pendingSubs.length} icon="⏳" color={pendingSubs.length > 0 ? "red" : "gray"} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-5">
          <GradeChart data={progress} />
          <CompletionChart data={progress} />
        </div>
      )}

      {tab === "assignments" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {batchAssignments.length} assignment{batchAssignments.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => { setModalTab("ai"); setIsModalOpen(true); }}
              className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              + Assign Work
            </button>
          </div>

          {batchAssignments.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">📝</p>
              <p className="font-medium">No assignments yet</p>
              <p className="text-sm mt-1">Click "+ Assign Work" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batchAssignments.map((a) => (
                <BatchAssignmentCard
                  key={a.id}
                  assignment={a}
                  onViewSubmissions={() => {
                    setFilterBatchId(a.id);
                    setTab("submissions");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "submissions" && (
        <SubmissionsPanel
          pendingSubs={pendingSubs}
          studentMap={studentMap}
          filterBatchId={filterBatchId}
          onClearFilter={() => setFilterBatchId(null)}
          onVerified={(id) => setPendingSubs((prev) => prev.filter((s) => s.id !== id))}
        />
      )}

      {tab === "students" && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Student</th>
                <th className="text-center px-4 py-3">Assignments</th>
                <th className="text-center px-4 py-3">Submitted</th>
                <th className="text-center px-4 py-3">Avg Grade</th>
                <th className="text-center px-4 py-3">Badges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {progress.map((p) => (
                <tr key={p.student.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                      {p.student.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{p.student.displayName}</p>
                      <p className="text-xs text-gray-400">{p.student.email}</p>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3 text-gray-600">{p.totalAssignments}</td>
                  <td className="text-center px-4 py-3">
                    <span className={p.submitted < p.totalAssignments ? "text-yellow-600" : "text-green-600"}>
                      {p.submitted}/{p.totalAssignments}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <GradePill grade={p.avgGrade} />
                  </td>
                  <td className="text-center px-4 py-3 text-xl">
                    {p.badges.slice(0, 4).map((b) => (
                      <span key={b.id} title={b.name}>{b.icon}</span>
                    ))}
                    {p.badges.length > 4 && (
                      <span className="text-xs text-gray-400">+{p.badges.length - 4}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Work Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Assign Work</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal tab selector */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mx-5 mt-4">
              <button
                onClick={() => setModalTab("ai")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  modalTab === "ai" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                AI Worksheet
              </button>
              <button
                onClick={() => setModalTab("file")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  modalTab === "file" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Upload File
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              {modalTab === "ai" ? (
                <WorksheetGenerator
                  classId={classId}
                  studentIds={students.map((s) => s.uid)}
                  onSuccess={handleAssignSuccess}
                />
              ) : (
                <FileAssignmentForm
                  classId={classId}
                  onSuccess={handleAssignSuccess}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ── Batch Assignment Card (teacher view) ──────────────────────────────────────
function BatchAssignmentCard({
  assignment,
  onViewSubmissions,
}: {
  assignment: BatchAssignment;
  onViewSubmissions: () => void;
}) {
  const dueDate = assignment.dueDate.toDate();
  const isOverdue = dueDate < new Date();
  const total = assignment.totalStudents;
  const submitted = assignment.submittedCount;
  const pending = Math.max(0, total - submitted);
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{assignment.title}</h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                assignment.type === "ai"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {assignment.type === "ai" ? "AI" : "File"}
            </span>
          </div>
          <p className={`text-xs ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
            Due: {dueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={onViewSubmissions}
          className="flex-shrink-0 text-xs font-medium text-brand-600 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          View Submissions
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{submitted} submitted</span>
          <span>{pending} pending</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-right text-xs text-gray-400 mt-0.5">{pct}% · {submitted}/{total}</p>
      </div>
    </div>
  );
}

// ── Submissions Panel (with optional batch filter) ───────────────────────────
function SubmissionsPanel({
  pendingSubs,
  studentMap,
  filterBatchId,
  onClearFilter,
  onVerified,
}: {
  pendingSubs: Submission[];
  studentMap: Record<string, UserProfile>;
  filterBatchId: string | null;
  onClearFilter: () => void;
  onVerified: (id: string) => void;
}) {
  const [batchSubs, setBatchSubs] = useState<Submission[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    if (!filterBatchId) {
      setBatchSubs(null);
      return;
    }
    setBatchLoading(true);
    getSubmissionsForBatchAssignment(filterBatchId)
      .then(setBatchSubs)
      .finally(() => setBatchLoading(false));
  }, [filterBatchId]);

  // Which submissions to show
  const subs = filterBatchId ? (batchSubs ?? []) : pendingSubs;
  const loading = filterBatchId && batchLoading;

  return (
    <div className="space-y-4">
      {filterBatchId && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <span className="text-sm text-blue-700 flex-1">Showing submissions for this assignment only</span>
          <button
            onClick={onClearFilter}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            Show all
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-7 w-7 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">{filterBatchId ? "📭" : "🎉"}</p>
          <p className="font-medium">
            {filterBatchId ? "No submissions yet for this assignment." : "All submissions reviewed!"}
          </p>
        </div>
      ) : (
        subs.map((sub) => (
          <SubmissionReview
            key={sub.id}
            submission={sub}
            student={studentMap[sub.studentId] ?? null}
            onVerified={() => onVerified(sub.id)}
          />
        ))
      )}
    </div>
  );
}

// ── File Assignment Form ───────────────────────────────────────────────────────
function FileAssignmentForm({
  classId,
  onSuccess,
}: {
  classId: string;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const path = `batchAssignments/${classId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        setUploadedUrl(url);
        setUploadedName(file.name);
      } catch {
        setError("File upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [classId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png"] },
    maxFiles: 1,
    disabled: uploading || submitting,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedUrl) {
      setError("Please upload the assignment file first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateFileAssignmentPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        batchId: classId,
        fileUrl: uploadedUrl,
        dueDate: new Date(dueDate).toISOString(),
      };
      await createFileAssignment(payload);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 3 Practice"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Instructions for students…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Due Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          required
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Assignment File <span className="text-red-500">*</span>
        </label>
        {uploadedUrl ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <span>✅</span>
            <span className="truncate flex-1">{uploadedName}</span>
            <button
              type="button"
              onClick={() => { setUploadedUrl(null); setUploadedName(null); }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-brand-400"
            } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            <p className="text-2xl mb-1">{uploading ? "⏳" : "📄"}</p>
            <p className="text-sm text-gray-500">
              {uploading
                ? "Uploading…"
                : isDragActive
                ? "Drop it here!"
                : "Upload assignment PDF or image"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">PDF or image (max 25 MB)</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !uploadedUrl}
        className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
      >
        {submitting ? "Assigning…" : "Assign to Class"}
      </button>
    </form>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: "blue" | "green" | "yellow" | "red" | "gray";
}) {
  const colors = {
    blue:   "bg-blue-50 border-blue-100",
    green:  "bg-green-50 border-green-100",
    yellow: "bg-yellow-50 border-yellow-100",
    red:    "bg-red-50 border-red-100",
    gray:   "bg-gray-50 border-gray-100",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function GradePill({ grade }: { grade: number }) {
  const color =
    grade >= 90
      ? "bg-green-100 text-green-700"
      : grade >= 70
      ? "bg-yellow-100 text-yellow-700"
      : grade > 0
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {grade > 0 ? `${grade}%` : "—"}
    </span>
  );
}
