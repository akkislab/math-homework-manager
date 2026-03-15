/**
 * Unit Tests — Student Progress Tracking
 *
 * Run: cd tests && npm test -- studentProgress
 */

import { describe, it, expect } from "vitest";

// ── Types ─────────────────────────────────────────────────────────────────────

type RowStatus = "not_submitted" | "submitted" | "needs_grading" | "graded" | "late";

interface AssignmentRow {
  id: string;
  title: string;
  dueDate: Date;
  submittedAt?: Date;
  status: RowStatus;
  grade?: number;
  suggestedGrade?: number;
  feedback?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const YESTERDAY = new Date(Date.now() - 86400000);

function makeRow(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  return {
    id: "row-001",
    title: "Chapter 5 Homework",
    dueDate: FUTURE,
    status: "not_submitted",
    ...overrides,
  };
}

function computeMetrics(rows: AssignmentRow[]) {
  const total = rows.length;
  const submitted = rows.filter((r) => r.status !== "not_submitted" && r.status !== "late").length;
  const missing = rows.filter((r) => r.status === "not_submitted").length;
  const late = rows.filter((r) => r.status === "late").length;
  const graded = rows.filter((r) => r.status === "graded" && r.grade !== undefined);
  const avgScore = graded.length > 0
    ? Math.round(graded.reduce((sum, r) => sum + (r.grade ?? 0), 0) / graded.length)
    : null;
  return { total, submitted, missing, late, avgScore };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Progress Metrics Calculation", () => {
  const rows: AssignmentRow[] = [
    makeRow({ status: "graded", grade: 88, dueDate: PAST }),
    makeRow({ status: "graded", grade: 92, dueDate: PAST }),
    makeRow({ status: "submitted", dueDate: FUTURE }),
    makeRow({ status: "not_submitted", dueDate: FUTURE }),
    makeRow({ status: "late", dueDate: PAST }),
  ];

  it("counts total assignments correctly", () => {
    expect(computeMetrics(rows).total).toBe(5);
  });

  it("counts submitted assignments (non-missing, non-late)", () => {
    expect(computeMetrics(rows).submitted).toBe(3); // graded x2 + submitted x1
  });

  it("counts missing assignments", () => {
    expect(computeMetrics(rows).missing).toBe(1);
  });

  it("counts late assignments", () => {
    expect(computeMetrics(rows).late).toBe(1);
  });

  it("calculates average score from graded assignments only", () => {
    expect(computeMetrics(rows).avgScore).toBe(90); // (88+92)/2
  });
});

describe("Average Score Edge Cases", () => {
  it("returns null when no graded assignments", () => {
    const rows = [makeRow({ status: "submitted" }), makeRow({ status: "not_submitted" })];
    expect(computeMetrics(rows).avgScore).toBeNull();
  });

  it("handles single graded assignment", () => {
    const rows = [makeRow({ status: "graded", grade: 75 })];
    expect(computeMetrics(rows).avgScore).toBe(75);
  });

  it("rounds to nearest integer", () => {
    const rows = [
      makeRow({ status: "graded", grade: 85 }),
      makeRow({ status: "graded", grade: 86 }),
    ];
    // (85+86)/2 = 85.5 → rounds to 86
    expect(computeMetrics(rows).avgScore).toBe(86);
  });
});

describe("Status Filter Logic", () => {
  const rows: AssignmentRow[] = [
    makeRow({ status: "graded" }),
    makeRow({ status: "submitted" }),
    makeRow({ status: "not_submitted" }),
    makeRow({ status: "late" }),
    makeRow({ status: "needs_grading" }),
  ];

  it("filters to show only graded", () => {
    const filtered = rows.filter((r) => r.status === "graded");
    expect(filtered.length).toBe(1);
  });

  it("filters to show only not_submitted and late", () => {
    const filtered = rows.filter((r) => r.status === "not_submitted" || r.status === "late");
    expect(filtered.length).toBe(2);
  });

  it("all filter returns all rows", () => {
    expect(rows.length).toBe(5);
  });
});

describe("Search Filter Logic", () => {
  const rows: AssignmentRow[] = [
    makeRow({ title: "Chapter 5 Algebra Homework" }),
    makeRow({ title: "Geometry Quiz" }),
    makeRow({ title: "Linear Equations Practice" }),
  ];

  it("finds matching rows by title keyword", () => {
    const query = "algebra";
    const filtered = rows.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toContain("Algebra");
  });

  it("returns all rows when query is empty", () => {
    const filtered = rows.filter((r) => r.title.toLowerCase().includes(""));
    expect(filtered.length).toBe(3);
  });

  it("returns empty when no match", () => {
    const filtered = rows.filter((r) => r.title.toLowerCase().includes("trigonometry"));
    expect(filtered.length).toBe(0);
  });

  it("search is case-insensitive", () => {
    const filtered = rows.filter((r) => r.title.toLowerCase().includes("geometry"));
    expect(filtered.length).toBe(1);
  });
});

describe("Sort Logic", () => {
  const rows: AssignmentRow[] = [
    makeRow({ id: "r1", dueDate: new Date("2026-03-01") }),
    makeRow({ id: "r3", dueDate: new Date("2026-05-01") }),
    makeRow({ id: "r2", dueDate: new Date("2026-04-01") }),
  ];

  it("sorts by date descending (newest first)", () => {
    const sorted = [...rows].sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
    expect(sorted[0].id).toBe("r3");
    expect(sorted[2].id).toBe("r1");
  });

  it("sorts by date ascending (oldest first)", () => {
    const sorted = [...rows].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    expect(sorted[0].id).toBe("r1");
    expect(sorted[2].id).toBe("r3");
  });
});

describe("Chart Data Preparation", () => {
  it("maps assignment rows to chart format", () => {
    const rows: AssignmentRow[] = [
      makeRow({ title: "Worksheet 1", status: "graded", grade: 80 }),
      makeRow({ title: "Worksheet 2", status: "graded", grade: 95 }),
      makeRow({ title: "Worksheet 3", status: "submitted" }),
    ];
    const chartData = rows.map((r) => ({
      name: r.title.slice(0, 15),
      score: r.grade ?? null,
    }));
    expect(chartData[0].score).toBe(80);
    expect(chartData[1].score).toBe(95);
    expect(chartData[2].score).toBeNull();
  });
});
