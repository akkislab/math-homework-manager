"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { StudentProgress } from "../../types";

interface BarProps {
  data: StudentProgress[];
}

// ── Grade distribution bar chart ──────────────────────────────────────────────
export function GradeChart({ data }: BarProps) {
  const chartData = data.map((d) => ({
    name: d.student.displayName.split(" ")[0], // first name only
    grade: d.avgGrade,
    submitted: d.submitted,
    total: d.totalAssignments,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        Average Grades by Student
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barSize={22}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, "Avg Grade"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="grade" fill="#1a73e8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Submission completion stacked bar ─────────────────────────────────────────
export function CompletionChart({ data }: BarProps) {
  const chartData = data.map((d) => ({
    name: d.student.displayName.split(" ")[0],
    verified: d.verified,
    submitted: d.submitted - d.verified,
    pending: d.totalAssignments - d.submitted,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        Assignment Completion
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barSize={22}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="verified" stackId="a" fill="#34a853" name="Graded" radius={[0,0,0,0]} />
          <Bar dataKey="submitted" stackId="a" fill="#fbbc04" name="Submitted" />
          <Bar dataKey="pending" stackId="a" fill="#e8eaed" name="Not submitted" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Class average line chart (mock trend data) ────────────────────────────────
export function TrendChart({
  weeklyAverages,
}: {
  weeklyAverages: { week: string; avg: number }[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        Class Average Over Time
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={weeklyAverages}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v: number) => [`${v}%`, "Class Avg"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#1a73e8"
            strokeWidth={2}
            dot={{ fill: "#1a73e8", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
