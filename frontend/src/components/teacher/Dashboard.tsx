"use client";
import { useEffect, useState } from "react";
import { GradeChart, CompletionChart } from "./ProgressChart";
import WorksheetGenerator from "./WorksheetGenerator";
import SubmissionReview from "./SubmissionReview";
import {
  getClassProgress,
  getPendingSubmissions,
  getStudentsByClass,
} from "../../lib/firestore";
import type { StudentProgress, Submission, UserProfile } from "../../types";

interface Props {
  classId: string;
  teacherUid: string;
}

type Tab = "overview" | "generate" | "submissions" | "students";

export default function TeacherDashboard({ classId, teacherUid }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [pendingSubs, setPendingSubs] = useState<Submission[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

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
    { id: "generate", label: "Generate Worksheet" },
    { id: "submissions", label: "Review Submissions", badge: pendingSubs.length },
    { id: "students", label: "Students" },
  ];

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

      {tab === "generate" && (
        <WorksheetGenerator
          classId={classId}
          studentIds={students.map((s) => s.uid)}
          onSuccess={() => setTab("submissions")}
        />
      )}

      {tab === "submissions" && (
        <div className="space-y-4">
          {pendingSubs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">🎉</p>
              <p className="font-medium">All submissions reviewed!</p>
            </div>
          ) : (
            pendingSubs.map((sub) => (
              <SubmissionReview
                key={sub.id}
                submission={sub}
                student={studentMap[sub.studentId] ?? null}
                onVerified={() =>
                  setPendingSubs((prev) => prev.filter((s) => s.id !== sub.id))
                }
              />
            ))
          )}
        </div>
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
    </div>
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
