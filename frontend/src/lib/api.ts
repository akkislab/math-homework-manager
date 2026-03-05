/**
 * Typed wrappers around Firebase callable Cloud Functions.
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type {
  GenerateWorksheetPayload,
  VerifySubmissionPayload,
  CreateFileAssignmentPayload,
} from "../types";

// ── generateWorksheet ─────────────────────────────────────────────────────────
export interface GenerateWorksheetResult {
  worksheetId: string;
  assignmentIds: string[];
  pdfUrls: string[];
}

export const generateWorksheet = async (
  payload: GenerateWorksheetPayload
): Promise<GenerateWorksheetResult> => {
  const fn = httpsCallable<GenerateWorksheetPayload, GenerateWorksheetResult>(
    functions,
    "generateWorksheet"
  );
  const result = await fn(payload);
  return result.data;
};

// ── assignWorksheet ────────────────────────────────────────────────────────────
export const assignWorksheet = async (payload: {
  worksheetId: string;
  classId: string;
  studentIds: string[];
  dueDate: string;
}) => {
  const fn = httpsCallable(functions, "assignWorksheet");
  const result = await fn(payload);
  return result.data;
};

// ── submitAssignment ───────────────────────────────────────────────────────────
export const submitAssignment = async (payload: {
  assignmentId?: string;
  batchAssignmentId?: string;
  fileUrl: string;
}) => {
  const fn = httpsCallable<typeof payload, { submissionId: string }>(
    functions,
    "submitAssignment"
  );
  const result = await fn(payload);
  return result.data;
};

// ── verifySubmission ───────────────────────────────────────────────────────────
export const verifySubmission = async (
  payload: VerifySubmissionPayload
): Promise<{ success: boolean; newBadges: string[] }> => {
  const fn = httpsCallable<
    VerifySubmissionPayload,
    { success: boolean; newBadges: string[] }
  >(functions, "verifySubmission");
  const result = await fn(payload);
  return result.data;
};

// ── setUserRole ────────────────────────────────────────────────────────────────
export const setUserRole = async (payload: {
  targetUid: string;
  role: "teacher" | "student";
}) => {
  const fn = httpsCallable(functions, "setUserRole");
  const result = await fn(payload);
  return result.data;
};

// ── createClass ────────────────────────────────────────────────────────────────
export const createClass = async (payload: {
  name: string;
}): Promise<{ classId: string }> => {
  const fn = httpsCallable<{ name: string }, { classId: string }>(functions, "createClass");
  const result = await fn(payload);
  return result.data;
};

// ── createFileAssignment ───────────────────────────────────────────────────────
export const createFileAssignment = async (
  payload: CreateFileAssignmentPayload
): Promise<{ batchAssignmentId: string }> => {
  const fn = httpsCallable<CreateFileAssignmentPayload, { batchAssignmentId: string }>(
    functions,
    "createFileAssignment"
  );
  const result = await fn(payload);
  return result.data;
};

// ── addStudentToClass ──────────────────────────────────────────────────────────
export const addStudentToClass = async (payload: {
  email: string;
  classId: string;
}): Promise<{ success: boolean; studentId: string }> => {
  const fn = httpsCallable<typeof payload, { success: boolean; studentId: string }>(
    functions,
    "addStudentToClass"
  );
  const result = await fn(payload);
  return result.data;
};
