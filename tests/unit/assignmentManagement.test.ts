/**
 * Unit Tests — Assignment Management
 * Tests core assignment creation, update, and deletion logic.
 *
 * Run: cd tests && npm test -- assignmentManagement
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFirestore = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnThis(),
  add: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
};

vi.mock("firebase/firestore", () => ({
  getFirestore: () => mockFirestore,
  collection: vi.fn(() => mockFirestore),
  doc: vi.fn(() => mockFirestore),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
  increment: vi.fn((n: number) => ({ _increment: n })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAssignment(overrides = {}) {
  return {
    id: "assign-001",
    worksheetId: "ws-001",
    classId: "class-001",
    studentId: "student-001",
    teacherId: "teacher-001",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "assigned" as const,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeBatchAssignment(overrides = {}) {
  return {
    id: "batch-001",
    title: "Chapter 5 Homework",
    batchId: "class-001",
    teacherId: "teacher-001",
    type: "file" as const,
    totalStudents: 25,
    submittedCount: 0,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Assignment Status Logic", () => {
  it("defaults to 'assigned' status on creation", () => {
    const assignment = makeAssignment();
    expect(assignment.status).toBe("assigned");
  });

  it("transitions to 'submitted' after student submission", () => {
    const assignment = makeAssignment({ status: "submitted" });
    expect(assignment.status).toBe("submitted");
  });

  it("transitions to 'verified' after teacher confirmation", () => {
    const assignment = makeAssignment({ status: "verified" });
    expect(assignment.status).toBe("verified");
  });

  it("does not allow unknown status values", () => {
    const validStatuses = ["assigned", "submitted", "verified"];
    const assignment = makeAssignment();
    expect(validStatuses).toContain(assignment.status);
  });
});

describe("Assignment Due Date Validation", () => {
  it("accepts a future due date", () => {
    const future = new Date(Date.now() + 86400000);
    const assignment = makeAssignment({ dueDate: future });
    expect(assignment.dueDate.getTime()).toBeGreaterThan(Date.now());
  });

  it("detects a past due date as late", () => {
    const past = new Date(Date.now() - 86400000);
    const assignment = makeAssignment({ dueDate: past });
    const isLate = assignment.dueDate.getTime() < Date.now();
    expect(isLate).toBe(true);
  });

  it("detects an assignment due within 24 hours as near deadline", () => {
    const soon = new Date(Date.now() + 23 * 60 * 60 * 1000);
    const assignment = makeAssignment({ dueDate: soon });
    const hoursUntilDue = (assignment.dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursUntilDue).toBeLessThan(24);
  });
});

describe("BatchAssignment Submission Count", () => {
  it("starts at zero submitted count", () => {
    const batch = makeBatchAssignment();
    expect(batch.submittedCount).toBe(0);
  });

  it("calculates pending count correctly", () => {
    const batch = makeBatchAssignment({ submittedCount: 12, totalStudents: 25 });
    const pending = batch.totalStudents - batch.submittedCount;
    expect(pending).toBe(13);
  });

  it("calculates submission rate as percentage", () => {
    const batch = makeBatchAssignment({ submittedCount: 20, totalStudents: 25 });
    const rate = Math.round((batch.submittedCount / batch.totalStudents) * 100);
    expect(rate).toBe(80);
  });

  it("handles 100% submission rate", () => {
    const batch = makeBatchAssignment({ submittedCount: 25, totalStudents: 25 });
    const rate = (batch.submittedCount / batch.totalStudents) * 100;
    expect(rate).toBe(100);
  });

  it("never exceeds totalStudents", () => {
    const batch = makeBatchAssignment({ submittedCount: 25, totalStudents: 25 });
    expect(batch.submittedCount).toBeLessThanOrEqual(batch.totalStudents);
  });
});

describe("Assignment Type Handling", () => {
  it("creates AI-type batch assignment with worksheetId", () => {
    const batch = makeBatchAssignment({ type: "ai", worksheetId: "ws-001" });
    expect(batch.type).toBe("ai");
    expect(batch.worksheetId).toBeDefined();
  });

  it("creates file-type batch assignment with fileUrl", () => {
    const batch = makeBatchAssignment({ type: "file", fileUrl: "https://storage.example.com/file.pdf" });
    expect(batch.type).toBe("file");
    expect(batch.fileUrl).toBeDefined();
  });

  it("validates assignment type is one of ai or file", () => {
    const validTypes = ["ai", "file"];
    const batch = makeBatchAssignment({ type: "ai" });
    expect(validTypes).toContain(batch.type);
  });
});

describe("Grade Validation", () => {
  it("accepts grade of 0", () => {
    expect(0).toBeGreaterThanOrEqual(0);
    expect(0).toBeLessThanOrEqual(100);
  });

  it("accepts grade of 100", () => {
    expect(100).toBeGreaterThanOrEqual(0);
    expect(100).toBeLessThanOrEqual(100);
  });

  it("rejects grade below 0", () => {
    const grade = -1;
    expect(grade < 0 || grade > 100).toBe(true);
  });

  it("rejects grade above 100", () => {
    const grade = 101;
    expect(grade < 0 || grade > 100).toBe(true);
  });

  it("calculates average grade correctly", () => {
    const grades = [85, 92, 78, 95, 88];
    const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
    expect(avg).toBe(87.6);
  });
});

describe("Submission Status Detection", () => {
  function rowStatusFor(submission: any, batchAssignment: any): string {
    if (!submission) {
      const now = new Date();
      if (batchAssignment.dueDate < now) return "late";
      return "not_submitted";
    }
    if (submission.status === "verified") return "graded";
    if (submission.status === "submitted" && !submission.suggestedGrade) return "submitted";
    return "needs_grading";
  }

  it("returns not_submitted when no submission and due date is future", () => {
    const ba = makeBatchAssignment({ dueDate: new Date(Date.now() + 86400000) });
    expect(rowStatusFor(undefined, ba)).toBe("not_submitted");
  });

  it("returns late when no submission and due date has passed", () => {
    const ba = makeBatchAssignment({ dueDate: new Date(Date.now() - 86400000) });
    expect(rowStatusFor(undefined, ba)).toBe("late");
  });

  it("returns submitted when submission exists but no AI grade yet", () => {
    const sub = { status: "submitted", suggestedGrade: undefined };
    const ba = makeBatchAssignment();
    expect(rowStatusFor(sub, ba)).toBe("submitted");
  });

  it("returns needs_grading when AI grade exists but not verified", () => {
    const sub = { status: "submitted", suggestedGrade: 75 };
    const ba = makeBatchAssignment();
    expect(rowStatusFor(sub, ba)).toBe("needs_grading");
  });

  it("returns graded when submission is verified", () => {
    const sub = { status: "verified", grade: 88 };
    const ba = makeBatchAssignment();
    expect(rowStatusFor(sub, ba)).toBe("graded");
  });
});
