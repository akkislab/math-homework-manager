import { Timestamp } from "firebase/firestore";

export type UserRole = "teacher" | "student";
export type AssignmentStatus = "assigned" | "submitted" | "verified";
export type NotificationType =
  | "new_assignment"
  | "new_submission"
  | "grade_received"
  | "badge_earned"
  | "deadline_reminder";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  classId?: string;
  photoURL?: string;
  createdAt: Timestamp;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  createdAt: Timestamp;
}

export interface WorksheetProblem {
  number: number;
  question: string;
  solution: string;
  answer: string;
}

export interface Worksheet {
  id: string;
  title: string;
  topic: string;
  grade: string;
  instructions: string;
  problems: WorksheetProblem[];
  classId: string;
  createdBy: string;
  answerKeyUrl?: string;
  createdAt: Timestamp;
}

export interface Assignment {
  id: string;
  worksheetId: string;
  classId: string;
  studentId: string;
  teacherId: string;
  dueDate: Timestamp;
  status: AssignmentStatus;
  pdfUrl?: string;
  submissionId?: string;
  grade?: number;
  createdAt: Timestamp;
}

export interface Submission {
  id: string;
  assignmentId: string;
  worksheetId: string;
  classId: string;
  studentId: string;
  teacherId: string;
  fileUrl: string;
  status: "pending" | "verified";
  dueDate: Timestamp;
  submittedAt: Timestamp;
  grade?: number;
  feedback?: string;
  verifiedAt?: Timestamp;
  /** AI-suggested grade (0-100) from auto-grading */
  suggestedGrade?: number;
  /** AI-generated feedback shown to teacher as a suggestion */
  aiFeedback?: string;
  autoGradedAt?: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: Timestamp;
}

// ── API request/response types (mirrors functions/src/types.ts) ───────────────
export interface GenerateWorksheetPayload {
  grade: string;
  topic: string;
  exampleProblem: string;
  numProblems: number;
  classId: string;
  studentIds: string[];
  dueDate: string;
  title?: string;
}

export interface VerifySubmissionPayload {
  submissionId: string;
  grade: number;
  feedback: string;
  awardBadge?: string;
}

// ── Dashboard summary types ────────────────────────────────────────────────────
export interface StudentProgress {
  student: UserProfile;
  totalAssignments: number;
  submitted: number;
  verified: number;
  avgGrade: number;
  badges: Badge[];
}
