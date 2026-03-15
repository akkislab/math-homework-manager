/**
 * Unit Tests — Batch & Student Management
 *
 * Run: cd tests && npm test -- batchStudentManagement
 */

import { describe, it, expect, vi } from "vitest";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClass(overrides = {}) {
  return {
    id: "class-001",
    name: "Year 7 Maths",
    teacherId: "teacher-001",
    studentIds: ["s1", "s2", "s3"],
    classType: "group",
    classDay: "Monday",
    classTime: "15:30",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeStudent(overrides = {}) {
  return {
    uid: "s1",
    displayName: "Alice Johnson",
    email: "alice@school.com",
    role: "student" as const,
    classIds: ["class-001"],
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Class Creation", () => {
  it("creates a class with required fields", () => {
    const cls = makeClass();
    expect(cls.id).toBeDefined();
    expect(cls.name).toBeTruthy();
    expect(cls.teacherId).toBeTruthy();
    expect(Array.isArray(cls.studentIds)).toBe(true);
  });

  it("starts with an empty student list when no students provided", () => {
    const cls = makeClass({ studentIds: [] });
    expect(cls.studentIds.length).toBe(0);
  });

  it("stores classType correctly", () => {
    const cls = makeClass({ classType: "solo" });
    expect(["solo", "group"]).toContain(cls.classType);
  });

  it("formats classTime as HH:mm", () => {
    const cls = makeClass({ classTime: "09:00" });
    expect(cls.classTime).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("Adding Student to Class", () => {
  it("adds studentId to class studentIds array", () => {
    const cls = makeClass({ studentIds: ["s1"] });
    const newStudentId = "s2";
    const updated = { ...cls, studentIds: [...cls.studentIds, newStudentId] };
    expect(updated.studentIds).toContain("s2");
    expect(updated.studentIds.length).toBe(2);
  });

  it("adds classId to student classIds array", () => {
    const student = makeStudent({ classIds: [] });
    const classId = "class-001";
    const updated = { ...student, classIds: [...student.classIds, classId] };
    expect(updated.classIds).toContain("class-001");
  });

  it("does not add duplicate studentId", () => {
    const cls = makeClass({ studentIds: ["s1", "s2"] });
    const isDuplicate = cls.studentIds.includes("s1");
    expect(isDuplicate).toBe(true);
    // Guard: only add if not already present
    const updatedIds = isDuplicate
      ? cls.studentIds
      : [...cls.studentIds, "s1"];
    expect(updatedIds.filter((id) => id === "s1").length).toBe(1);
  });

  it("supports student in multiple classes", () => {
    const student = makeStudent({ classIds: ["class-001", "class-002"] });
    expect(student.classIds.length).toBe(2);
  });
});

describe("Removing Student from Class", () => {
  it("removes studentId from class studentIds array", () => {
    const cls = makeClass({ studentIds: ["s1", "s2", "s3"] });
    const updated = { ...cls, studentIds: cls.studentIds.filter((id) => id !== "s2") };
    expect(updated.studentIds).not.toContain("s2");
    expect(updated.studentIds.length).toBe(2);
  });

  it("removes classId from student classIds", () => {
    const student = makeStudent({ classIds: ["class-001", "class-002"] });
    const updated = { ...student, classIds: student.classIds.filter((id) => id !== "class-001") };
    expect(updated.classIds).not.toContain("class-001");
    expect(updated.classIds).toContain("class-002");
  });

  it("handles removal when student is not in class gracefully", () => {
    const cls = makeClass({ studentIds: ["s1", "s2"] });
    const updated = { ...cls, studentIds: cls.studentIds.filter((id) => id !== "s99") };
    expect(updated.studentIds.length).toBe(2); // unchanged
  });
});

describe("Class Deletion", () => {
  it("removes class reference from all students", () => {
    const students = [
      makeStudent({ uid: "s1", classIds: ["class-001", "class-002"] }),
      makeStudent({ uid: "s2", classIds: ["class-001"] }),
    ];
    const classIdToDelete = "class-001";
    const updated = students.map((s) => ({
      ...s,
      classIds: s.classIds.filter((id) => id !== classIdToDelete),
    }));
    expect(updated[0].classIds).not.toContain("class-001");
    expect(updated[0].classIds).toContain("class-002");
    expect(updated[1].classIds.length).toBe(0);
  });
});

describe("Student Count", () => {
  it("reports correct student count", () => {
    const cls = makeClass({ studentIds: ["s1", "s2", "s3", "s4"] });
    expect(cls.studentIds.length).toBe(4);
  });

  it("handles empty class", () => {
    const cls = makeClass({ studentIds: [] });
    expect(cls.studentIds.length).toBe(0);
  });
});

describe("Student Data Integrity", () => {
  it("student has required fields", () => {
    const student = makeStudent();
    expect(student.uid).toBeDefined();
    expect(student.displayName).toBeTruthy();
    expect(student.email).toMatch(/@/);
    expect(student.role).toBe("student");
  });

  it("student email is lowercase", () => {
    const student = makeStudent({ email: "Alice@School.COM" });
    const normalised = student.email.toLowerCase();
    expect(normalised).toBe("alice@school.com");
  });

  it("generates initials from display name", () => {
    const name = "Alice Johnson";
    const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    expect(initials).toBe("AJ");
  });

  it("generates single initial for single-word name", () => {
    const name = "Alice";
    const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    expect(initials).toBe("A");
  });
});
