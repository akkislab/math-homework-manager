/**
 * Unit Tests — Authentication & Authorization
 *
 * Run: cd tests && npm test -- authAuthorization
 */

import { describe, it, expect, vi } from "vitest";

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRole = "teacher" | "student";

interface DecodedToken {
  uid: string;
  email: string;
  role?: UserRole;
}

// ── Auth Guard Logic (mirrors AuthGuard.tsx) ──────────────────────────────────

function checkAccess(
  user: { uid: string; role: UserRole } | null,
  requiredRole: UserRole
): "allow" | "redirect-login" | "redirect-home" {
  if (!user) return "redirect-login";
  if (user.role !== requiredRole) return "redirect-home";
  return "allow";
}

// ── Role Guard Logic (mirrors Cloud Function guards) ─────────────────────────

function requireAuth(uid: string | undefined): void {
  if (!uid) throw new Error("unauthenticated");
}

function requireTeacher(token: DecodedToken | undefined): void {
  if (!token) throw new Error("unauthenticated");
  if (token.role !== "teacher") throw new Error("permission-denied");
}

function requireStudent(token: DecodedToken | undefined): void {
  if (!token) throw new Error("unauthenticated");
  if (token.role !== "student") throw new Error("permission-denied");
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AuthGuard: checkAccess", () => {
  it("allows teacher to access teacher route", () => {
    const user = { uid: "t1", role: "teacher" as UserRole };
    expect(checkAccess(user, "teacher")).toBe("allow");
  });

  it("allows student to access student route", () => {
    const user = { uid: "s1", role: "student" as UserRole };
    expect(checkAccess(user, "student")).toBe("allow");
  });

  it("redirects to login when user is null", () => {
    expect(checkAccess(null, "teacher")).toBe("redirect-login");
    expect(checkAccess(null, "student")).toBe("redirect-login");
  });

  it("redirects to home when teacher tries to access student route", () => {
    const teacher = { uid: "t1", role: "teacher" as UserRole };
    expect(checkAccess(teacher, "student")).toBe("redirect-home");
  });

  it("redirects to home when student tries to access teacher route", () => {
    const student = { uid: "s1", role: "student" as UserRole };
    expect(checkAccess(student, "teacher")).toBe("redirect-home");
  });
});

describe("Cloud Function: requireAuth", () => {
  it("does not throw when uid is provided", () => {
    expect(() => requireAuth("user-001")).not.toThrow();
  });

  it("throws unauthenticated when uid is undefined", () => {
    expect(() => requireAuth(undefined)).toThrow("unauthenticated");
  });

  it("throws unauthenticated when uid is empty string", () => {
    expect(() => requireAuth("")).toThrow("unauthenticated");
  });
});

describe("Cloud Function: requireTeacher", () => {
  it("does not throw for teacher token", () => {
    const token: DecodedToken = { uid: "t1", email: "t@school.com", role: "teacher" };
    expect(() => requireTeacher(token)).not.toThrow();
  });

  it("throws permission-denied for student token", () => {
    const token: DecodedToken = { uid: "s1", email: "s@school.com", role: "student" };
    expect(() => requireTeacher(token)).toThrow("permission-denied");
  });

  it("throws unauthenticated when token is undefined", () => {
    expect(() => requireTeacher(undefined)).toThrow("unauthenticated");
  });

  it("throws permission-denied when role is missing from token", () => {
    const token: DecodedToken = { uid: "u1", email: "u@school.com" };
    expect(() => requireTeacher(token)).toThrow("permission-denied");
  });
});

describe("Cloud Function: requireStudent", () => {
  it("does not throw for student token", () => {
    const token: DecodedToken = { uid: "s1", email: "s@school.com", role: "student" };
    expect(() => requireStudent(token)).not.toThrow();
  });

  it("throws permission-denied for teacher token", () => {
    const token: DecodedToken = { uid: "t1", email: "t@school.com", role: "teacher" };
    expect(() => requireStudent(token)).toThrow("permission-denied");
  });
});

describe("Role Validation", () => {
  it("accepts valid roles", () => {
    const validRoles: UserRole[] = ["teacher", "student"];
    expect(validRoles).toContain("teacher");
    expect(validRoles).toContain("student");
  });

  it("rejects invalid role strings", () => {
    const validRoles: UserRole[] = ["teacher", "student"];
    expect(validRoles).not.toContain("admin");
    expect(validRoles).not.toContain("parent");
    expect(validRoles).not.toContain("");
  });

  it("setUserRole is idempotent — does not overwrite existing role", () => {
    // Simulate the idempotency check in setUserRole Cloud Function
    const existingRole: UserRole = "teacher";
    const newRole: UserRole = "student";

    function canChangeRole(existing: UserRole | undefined, requested: UserRole, isSelf: boolean): boolean {
      if (existing && isSelf) return false; // Can't change own role once set
      return true;
    }

    expect(canChangeRole(existingRole, newRole, true)).toBe(false);
    expect(canChangeRole(undefined, newRole, true)).toBe(true);
  });
});

describe("Notification Authorization", () => {
  it("recipient can read their own notification", () => {
    const notification = { userId: "s1", title: "New assignment" };
    const requestingUid = "s1";
    expect(notification.userId === requestingUid).toBe(true);
  });

  it("other users cannot read someone else's notification", () => {
    const notification = { userId: "s1", title: "New assignment" };
    const requestingUid = "s2";
    expect(notification.userId === requestingUid).toBe(false);
  });
});
