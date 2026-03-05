"use client";
import { useEffect, useState, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useDropzone } from "react-dropzone";
import { storage } from "../../lib/firebase";
import { submitAssignment } from "../../lib/api";
import {
  getAssignmentsForStudent,
  getStudentSubmissions,
  getStudentBadges,
  getStudentClassId,
  listenBatchAssignments,
  listenNotifications,
  markNotificationRead,
} from "../../lib/firestore";
import type {
  Assignment,
  BatchAssignment,
  Submission,
  Badge,
  Notification,
} from "../../types";

interface Props {
  studentId: string;
  displayName: string;
}

type Tab = "assignments" | "badges" | "notifications";

export default function StudentPortal({ studentId, displayName }: Props) {
  const [tab, setTab] = useState<Tab>("assignments");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batchAssignments, setBatchAssignments] = useState<BatchAssignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Build a map of batchAssignmentId -> submission (for grade/status lookup)
  const batchSubmissionMap: Record<string, Submission> = {};
  for (const s of submissions) {
    if (s.batchAssignmentId) batchSubmissionMap[s.batchAssignmentId] = s;
  }
  const submittedBatchIds = new Set(Object.keys(batchSubmissionMap));

  // Load initial data and start notification listener
  useEffect(() => {
    Promise.all([
      getAssignmentsForStudent(studentId),
      getStudentSubmissions(studentId),
      getStudentBadges(studentId),
    ])
      .then(([a, s, b]) => {
        setAssignments(a);
        setSubmissions(s);
        setBadges(b);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load classId for batch assignments
    getStudentClassId(studentId).then((id) => setClassId(id));

    const unsub = listenNotifications(studentId, setNotifications);
    return unsub;
  }, [studentId]);

  // Real-time batch assignments listener once classId is known
  useEffect(() => {
    if (!classId) return;
    return listenBatchAssignments(classId, setBatchAssignments);
  }, [classId]);

  const submissionMap = Object.fromEntries(
    submissions.map((s) => [s.assignmentId, s])
  );

  const TABS = [
    { id: "assignments" as Tab, label: "My Assignments" },
    { id: "badges" as Tab, label: `Badges (${badges.length})` },
    { id: "notifications" as Tab, label: "Notifications", badge: unreadCount },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Compute stats across both AI and batch assignments
  const aiDue = assignments.filter((a) => a.status === "assigned").length;
  const batchDue = batchAssignments.filter((a) => !submittedBatchIds.has(a.id)).length;
  const due = aiDue + batchDue;
  const submitted =
    assignments.filter((a) => a.status === "submitted").length +
    Object.values(batchSubmissionMap).filter((s) => s.status === "pending").length;
  const graded =
    assignments.filter((a) => a.status === "verified").length +
    Object.values(batchSubmissionMap).filter((s) => s.status === "verified").length;

  // Sort batch assignments by due date ascending (soonest first)
  const sortedBatch = [...batchAssignments].sort(
    (a, b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime()
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hi, {displayName.split(" ")[0]}!</h1>
        <p className="text-sm text-gray-500">
          {due > 0 ? `${due} assignment${due > 1 ? "s" : ""} waiting` : "You're all caught up!"}
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MiniStat label="To Do" value={due} color="yellow" />
        <MiniStat label="Submitted" value={submitted} color="blue" />
        <MiniStat label="Graded" value={graded} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
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

      {/* Content */}
      {tab === "assignments" && (
        <div className="space-y-3">
          {assignments.length === 0 && batchAssignments.length === 0 && (
            <p className="text-center text-gray-400 py-10">No assignments yet.</p>
          )}

          {/* Batch (file-type) assignments — shown first, sorted by due date */}
          {sortedBatch.map((a) => (
            <BatchAssignmentCard
              key={a.id}
              assignment={a}
              existingSubmission={batchSubmissionMap[a.id] ?? null}
              studentId={studentId}
              onSubmitted={(sub) =>
                setSubmissions((prev) => [...prev.filter((s) => s.batchAssignmentId !== a.id), sub])
              }
            />
          ))}

          {/* AI worksheet assignments */}
          {assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              submission={submissionMap[a.id] ?? null}
              studentId={studentId}
              onSubmitted={(sub) => {
                setSubmissions((prev) => [...prev, sub]);
                setAssignments((prev) =>
                  prev.map((x) =>
                    x.id === a.id ? { ...x, status: "submitted" } : x
                  )
                );
              }}
            />
          ))}
        </div>
      )}

      {tab === "badges" && (
        <div>
          {badges.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">🏅</p>
              <p className="font-medium">Submit assignments to earn badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3"
                >
                  <span className="text-3xl">{b.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{b.name}</p>
                    <p className="text-xs text-gray-500">{b.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b.earnedAt?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-2">
          {notifications.length === 0 && (
            <p className="text-center text-gray-400 py-10">No notifications.</p>
          )}
          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notif={n}
              onRead={() => {
                markNotificationRead(n.id);
                setNotifications((prev) =>
                  prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Batch Assignment Card (file-type) ─────────────────────────────────────────
function BatchAssignmentCard({
  assignment,
  existingSubmission,
  studentId,
  onSubmitted,
}: {
  assignment: BatchAssignment;
  existingSubmission: Submission | null;
  studentId: string;
  onSubmitted: (sub: Submission) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [localSubmission, setLocalSubmission] = useState<Submission | null>(existingSubmission);
  const [error, setError] = useState<string | null>(null);

  const submitted = localSubmission !== null;
  const isGraded = localSubmission?.status === "verified";

  const dueDate = assignment.dueDate.toDate();
  const isOverdue = dueDate < new Date() && !submitted;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const path = `submissions/${studentId}_batch_${assignment.id}/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);
        const { submissionId } = await submitAssignment({ batchAssignmentId: assignment.id, fileUrl });
        const newSub: Submission = {
          id: submissionId,
          batchAssignmentId: assignment.id,
          classId: assignment.batchId,
          studentId,
          teacherId: assignment.teacherId,
          fileUrl,
          status: "pending",
          submittedAt: { toDate: () => new Date() } as never,
        };
        setLocalSubmission(newSub);
        onSubmitted(newSub);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [assignment, studentId, onSubmitted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png"] },
    maxFiles: 1,
    disabled: submitted || uploading,
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{assignment.title}</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
              File
            </span>
          </div>
          {assignment.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{assignment.description}</p>
          )}
          <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {isOverdue ? "OVERDUE — " : "Due: "}
            {dueDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
            isGraded
              ? "bg-green-100 text-green-700"
              : submitted
              ? "bg-blue-100 text-blue-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {isGraded ? "Graded" : submitted ? "Submitted" : "To Do"}
        </span>
      </div>

      {/* Download teacher's file */}
      {assignment.fileUrl && (
        <a
          href={assignment.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl mb-3 hover:bg-gray-50 text-sm text-brand-600"
        >
          📥 Download Assignment
        </a>
      )}

      {/* Upload zone */}
      {!submitted && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-brand-500 bg-brand-50"
              : "border-gray-200 hover:border-brand-400 hover:bg-gray-50"
          } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          <p className="text-2xl mb-1">{uploading ? "⏳" : "📤"}</p>
          <p className="text-sm text-gray-500">
            {uploading
              ? "Uploading…"
              : isDragActive
              ? "Drop it here!"
              : "Drag your completed work here, or click to select"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">PDF or image (max 25 MB)</p>
        </div>
      )}

      {isGraded && localSubmission?.grade != null && (
        <div className="p-3 bg-green-50 border border-green-100 rounded-xl mb-2">
          <p className="font-bold text-green-800 text-lg">{localSubmission.grade}/100</p>
          {localSubmission.feedback && (
            <p className="text-sm text-green-700 mt-1 italic">"{localSubmission.feedback}"</p>
          )}
        </div>
      )}

      {submitted && !isGraded && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          Work submitted — awaiting teacher review.
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}

// ── AI Assignment Card with file upload ────────────────────────────────────────
function AssignmentCard({
  assignment,
  submission,
  studentId,
  onSubmitted,
}: {
  assignment: Assignment;
  submission: Submission | null;
  studentId: string;
  onSubmitted: (sub: Submission) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dueDate = assignment.dueDate.toDate();
  const isOverdue = dueDate < new Date() && assignment.status === "assigned";

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const path = `submissions/${studentId}_${assignment.id}/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);
        const { submissionId } = await submitAssignment({
          assignmentId: assignment.id,
          fileUrl,
        });
        onSubmitted({
          id: submissionId,
          assignmentId: assignment.id,
          worksheetId: assignment.worksheetId,
          classId: assignment.classId,
          studentId,
          teacherId: assignment.teacherId,
          fileUrl,
          status: "pending",
          dueDate: assignment.dueDate,
          submittedAt: { toDate: () => new Date() } as never,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [assignment, studentId, onSubmitted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png"] },
    maxFiles: 1,
    disabled: assignment.status !== "assigned" || uploading,
  });

  const statusConfig = {
    assigned: { label: "To Do", bg: "bg-yellow-100 text-yellow-700" },
    submitted: { label: "Submitted", bg: "bg-blue-100 text-blue-700" },
    verified: { label: "Graded", bg: "bg-green-100 text-green-700" },
  };
  const st = statusConfig[assignment.status];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Assignment</h3>
          <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {isOverdue ? "OVERDUE — " : "Due: "}
            {dueDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.bg}`}>
          {st.label}
        </span>
      </div>

      {/* Download worksheet */}
      {assignment.pdfUrl && (
        <a
          href={assignment.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-xl mb-3 hover:bg-gray-50 text-sm text-brand-600"
        >
          📥 Download Worksheet PDF
        </a>
      )}

      {/* Grade display */}
      {assignment.status === "verified" && submission?.grade != null && (
        <div className="p-3 bg-green-50 border border-green-100 rounded-xl mb-3">
          <p className="font-bold text-green-800 text-lg">{submission.grade}/100</p>
          {submission.feedback && (
            <p className="text-sm text-green-700 mt-1 italic">"{submission.feedback}"</p>
          )}
        </div>
      )}

      {/* Upload zone */}
      {assignment.status === "assigned" && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-brand-500 bg-brand-50"
              : "border-gray-200 hover:border-brand-400 hover:bg-gray-50"
          } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          <p className="text-2xl mb-1">{uploading ? "⏳" : "📤"}</p>
          <p className="text-sm text-gray-500">
            {uploading
              ? "Uploading…"
              : isDragActive
              ? "Drop it here!"
              : "Drag your completed work here, or click to select"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">PDF or image (max 25 MB)</p>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}

// ── Notification item ─────────────────────────────────────────────────────────
function NotificationItem({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: () => void;
}) {
  const icons: Record<string, string> = {
    new_assignment: "📚",
    grade_received: "✅",
    badge_earned: "🏅",
    deadline_reminder: "⏰",
    new_submission: "📬",
  };
  return (
    <div
      onClick={onRead}
      className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
        notif.read ? "bg-gray-50" : "bg-blue-50 border border-blue-100"
      }`}
    >
      <span className="text-xl">{icons[notif.type] ?? "🔔"}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${notif.read ? "text-gray-600" : "text-gray-900"}`}>
          {notif.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.body}</p>
      </div>
      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-brand-500 mt-1 flex-shrink-0" />
      )}
    </div>
  );
}

// ── Mini stat ─────────────────────────────────────────────────────────────────
function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "yellow" | "blue" | "green";
}) {
  const c = {
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-green-50 border-green-100 text-green-700",
  }[color];
  return (
    <div className={`rounded-xl border p-3 text-center ${c}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}
