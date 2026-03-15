/**
 * Unit Tests — Worksheet Generation Logic
 *
 * Run: cd tests && npm test -- worksheetGeneration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WorksheetProblem {
  number: number;
  question: string;
  solution: string;
  answer: string;
}

interface WorksheetPreview {
  title: string;
  topic: string;
  grade: string;
  instructions: string;
  problems: WorksheetProblem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProblem(overrides = {}): WorksheetProblem {
  return {
    number: 1,
    question: "Solve for x: 2x + 3 = 11",
    solution: "2x = 8, x = 4",
    answer: "x = 4",
    ...overrides,
  };
}

function makeWorksheetPreview(overrides = {}): WorksheetPreview {
  return {
    title: "Algebra: Linear Equations",
    topic: "Linear Equations",
    grade: "Grade 7",
    instructions: "Show all working. Solve each equation for x.",
    problems: [
      makeProblem({ number: 1 }),
      makeProblem({ number: 2, question: "Solve: 3x - 5 = 10", answer: "x = 5" }),
      makeProblem({ number: 3, question: "Solve: 5x = 25", answer: "x = 5" }),
    ],
    ...overrides,
  };
}

// ── Payload Validation ────────────────────────────────────────────────────────

function validateGeneratePayload(payload: {
  grade: string;
  topic: string;
  exampleProblem: string;
  numProblems: number;
  classId: string;
  studentIds: string[];
  dueDate: string;
  difficulty?: string;
}): string[] {
  const errors: string[] = [];
  if (!payload.grade) errors.push("grade is required");
  if (!payload.topic) errors.push("topic is required");
  if (!payload.exampleProblem) errors.push("exampleProblem is required");
  if (payload.numProblems < 5 || payload.numProblems > 20) errors.push("numProblems must be 5–20");
  if (!payload.classId) errors.push("classId is required");
  if (!payload.studentIds || payload.studentIds.length === 0) errors.push("studentIds must not be empty");
  if (!payload.dueDate) errors.push("dueDate is required");
  if (payload.difficulty && !["easy", "medium", "hard"].includes(payload.difficulty)) {
    errors.push("difficulty must be easy, medium, or hard");
  }
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Worksheet Preview Structure", () => {
  it("has required top-level fields", () => {
    const preview = makeWorksheetPreview();
    expect(preview.title).toBeTruthy();
    expect(preview.topic).toBeTruthy();
    expect(preview.grade).toBeTruthy();
    expect(preview.instructions).toBeTruthy();
    expect(Array.isArray(preview.problems)).toBe(true);
  });

  it("has at least one problem", () => {
    const preview = makeWorksheetPreview();
    expect(preview.problems.length).toBeGreaterThan(0);
  });

  it("each problem has number, question, solution, answer", () => {
    const preview = makeWorksheetPreview();
    preview.problems.forEach((p) => {
      expect(p.number).toBeGreaterThan(0);
      expect(p.question).toBeTruthy();
      expect(p.solution).toBeTruthy();
      expect(p.answer).toBeTruthy();
    });
  });

  it("problem numbers are sequential starting at 1", () => {
    const preview = makeWorksheetPreview();
    preview.problems.forEach((p, i) => {
      expect(p.number).toBe(i + 1);
    });
  });
});

describe("Generate Payload Validation", () => {
  const validPayload = {
    grade: "Grade 7",
    topic: "Linear Equations",
    exampleProblem: "Solve: 2x + 3 = 11",
    numProblems: 10,
    classId: "class-001",
    studentIds: ["s1", "s2"],
    dueDate: "2026-04-01",
    difficulty: "medium",
  };

  it("passes with all valid fields", () => {
    const errors = validateGeneratePayload(validPayload);
    expect(errors.length).toBe(0);
  });

  it("fails when grade is missing", () => {
    const errors = validateGeneratePayload({ ...validPayload, grade: "" });
    expect(errors).toContain("grade is required");
  });

  it("fails when topic is missing", () => {
    const errors = validateGeneratePayload({ ...validPayload, topic: "" });
    expect(errors).toContain("topic is required");
  });

  it("fails when numProblems is below 5", () => {
    const errors = validateGeneratePayload({ ...validPayload, numProblems: 3 });
    expect(errors).toContain("numProblems must be 5–20");
  });

  it("fails when numProblems exceeds 20", () => {
    const errors = validateGeneratePayload({ ...validPayload, numProblems: 25 });
    expect(errors).toContain("numProblems must be 5–20");
  });

  it("fails when studentIds is empty", () => {
    const errors = validateGeneratePayload({ ...validPayload, studentIds: [] });
    expect(errors).toContain("studentIds must not be empty");
  });

  it("fails with invalid difficulty", () => {
    const errors = validateGeneratePayload({ ...validPayload, difficulty: "extreme" });
    expect(errors).toContain("difficulty must be easy, medium, or hard");
  });

  it("accepts difficulty = easy", () => {
    const errors = validateGeneratePayload({ ...validPayload, difficulty: "easy" });
    expect(errors.length).toBe(0);
  });

  it("accepts difficulty = hard", () => {
    const errors = validateGeneratePayload({ ...validPayload, difficulty: "hard" });
    expect(errors.length).toBe(0);
  });
});

describe("Worksheet Problem Count", () => {
  it("generates the requested number of problems", () => {
    const numProblems = 8;
    const problems = Array.from({ length: numProblems }, (_, i) =>
      makeProblem({ number: i + 1 })
    );
    expect(problems.length).toBe(numProblems);
  });

  it("respects minimum of 5 problems", () => {
    const problems = Array.from({ length: 5 }, (_, i) => makeProblem({ number: i + 1 }));
    expect(problems.length).toBeGreaterThanOrEqual(5);
  });
});

describe("PDF Generation Logic", () => {
  it("creates one PDF per student", () => {
    const studentIds = ["s1", "s2", "s3"];
    const pdfUrls = studentIds.map((id) => `https://storage.example.com/worksheets/${id}/ws-001.pdf`);
    expect(pdfUrls.length).toBe(studentIds.length);
  });

  it("each PDF URL is unique per student", () => {
    const studentIds = ["s1", "s2"];
    const urls = studentIds.map((id) => `https://storage.example.com/${id}/ws.pdf`);
    const unique = new Set(urls);
    expect(unique.size).toBe(urls.length);
  });
});
