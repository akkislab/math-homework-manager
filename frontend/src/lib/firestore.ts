/**
 * Firestore query helpers — all returns are typed.
 */
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  updateDoc,
  Unsubscribe,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Assignment,
  Class,
  Submission,
  UserProfile,
  Notification,
  Badge,
  StudentProgress,
  Worksheet,
} from "../types";

// ── Generic typed fetch ───────────────────────────────────────────────────────
async function fetchCollection<T>(
  path: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const snap = await getDocs(query(collection(db, path), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

// ── Classes ───────────────────────────────────────────────────────────────────
export const getTeacherClass = async (teacherUid: string): Promise<Class | null> => {
  const snap = await getDocs(
    query(collection(db, "classes"), where("teacherId", "==", teacherUid), limit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Class;
};

export const getTeacherClasses = async (teacherUid: string): Promise<Class[]> =>
  fetchCollection<Class>("classes", where("teacherId", "==", teacherUid), orderBy("createdAt", "desc"));

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUser = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null;
};

export const getStudentsByClass = async (classId: string) =>
  fetchCollection<UserProfile>(
    "users",
    where("classId", "==", classId),
    where("role", "==", "student"),
    orderBy("displayName")
  );

// ── Assignments ───────────────────────────────────────────────────────────────
export const getAssignmentsForStudent = async (studentId: string) =>
  fetchCollection<Assignment>(
    "assignments",
    where("studentId", "==", studentId),
    orderBy("dueDate", "asc")
  );

export const getAssignmentsForClass = async (classId: string) =>
  fetchCollection<Assignment>(
    "assignments",
    where("classId", "==", classId),
    orderBy("dueDate", "desc")
  );

// ── Submissions ───────────────────────────────────────────────────────────────
export const getPendingSubmissions = async (teacherId: string) =>
  fetchCollection<Submission>(
    "submissions",
    where("teacherId", "==", teacherId),
    where("status", "==", "pending"),
    orderBy("submittedAt", "asc")
  );

export const getStudentSubmissions = async (studentId: string) =>
  fetchCollection<Submission>(
    "submissions",
    where("studentId", "==", studentId),
    orderBy("submittedAt", "desc")
  );

// ── Worksheets ────────────────────────────────────────────────────────────────
export const getWorksheetsByClass = async (classId: string) =>
  fetchCollection<Worksheet>(
    "worksheets",
    where("classId", "==", classId),
    orderBy("createdAt", "desc")
  );

// ── Notifications (real-time listener) ───────────────────────────────────────
export const listenNotifications = (
  userId: string,
  callback: (notifs: Notification[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
  });
};

export const markNotificationRead = async (notifId: string) =>
  updateDoc(doc(db, "notifications", notifId), { read: true });

// ── Badges ────────────────────────────────────────────────────────────────────
export const getStudentBadges = async (studentId: string): Promise<Badge[]> => {
  const snap = await getDocs(
    collection(db, "studentBadges", studentId, "earned")
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Badge));
};

// ── Progress summary (for teacher dashboard) ─────────────────────────────────
export const getClassProgress = async (
  classId: string
): Promise<StudentProgress[]> => {
  const [students, assignments, submissions] = await Promise.all([
    getStudentsByClass(classId),
    getAssignmentsForClass(classId),
    fetchCollection<Submission>(
      "submissions",
      where("classId", "==", classId)
    ),
  ]);

  return Promise.all(
    students.map(async (student) => {
      const myAssignments = assignments.filter(
        (a) => a.studentId === student.uid
      );
      const mySubmissions = submissions.filter(
        (s) => s.studentId === student.uid
      );
      const verified = mySubmissions.filter((s) => s.status === "verified");
      const grades = verified.map((s) => s.grade ?? 0);
      const avgGrade =
        grades.length > 0
          ? grades.reduce((a, b) => a + b, 0) / grades.length
          : 0;
      const badges = await getStudentBadges(student.uid);

      return {
        student,
        totalAssignments: myAssignments.length,
        submitted: mySubmissions.length,
        verified: verified.length,
        avgGrade: Math.round(avgGrade),
        badges,
      };
    })
  );
};
