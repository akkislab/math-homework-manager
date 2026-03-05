// ─── Shared domain types used across Cloud Functions ─────────────────────────

export interface WorksheetProblem {
  number: number;
  question: string;
  solution: string; // step-by-step
  answer: string;   // final answer only
}

export interface WorksheetData {
  title: string;
  topic: string;
  grade: string;
  instructions: string;
  problems: WorksheetProblem[];
}

export interface GenerateWorksheetRequest {
  grade: string;         // e.g. "Grade 4"
  topic: string;         // e.g. "Fractions"
  exampleProblem: string;// e.g. "1/2 + 1/4 = ?"
  numProblems: number;   // 5–20
  classId: string;
  studentIds?: string[]; // if provided, generate one PDF per student
  dueDate: string;       // ISO string
  title?: string;
}

export interface GenerateWorksheetResponse {
  worksheetId: string;
  assignmentIds: string[];
  pdfUrls: string[];
  batchAssignmentId?: string;
}

export interface AssignWorksheetRequest {
  worksheetId: string;
  classId: string;
  studentIds: string[];
  dueDate: string;
}

export interface VerifySubmissionRequest {
  submissionId: string;
  grade: number;         // 0–100
  feedback: string;
  awardBadge?: string;   // badge ID
}

export interface CreateClassRequest {
  name: string;
}

export interface AddStudentRequest {
  email: string;
  classId: string;
}

export interface AutoGradeRequest {
  submissionId: string;
}

export interface AutoGradeResponse {
  suggestedGrade: number;
  feedback: string;
}

export interface BatchAssignment {
  id: string;
  title: string;
  description?: string;
  batchId: string;
  teacherId: string;
  type: "ai" | "file";
  fileUrl?: string;
  worksheetId?: string;
  totalStudents: number;
  submittedCount: number;
  dueDate: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface CreateFileAssignmentRequest {
  title: string;
  description?: string;
  batchId: string;
  fileUrl: string;
  dueDate: string; // ISO string
}

export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  classId?: string;
  photoURL?: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;       // emoji or URL
  criteria: string;
}
