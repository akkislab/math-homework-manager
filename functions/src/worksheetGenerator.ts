import Anthropic from "@anthropic-ai/sdk";
import * as admin from "firebase-admin";
import { getDownloadURL } from "firebase-admin/storage";
import { buildWorksheetPDF } from "./pdfGenerator";
import { WorksheetData, GenerateWorksheetRequest, GenerateWorksheetResponse } from "./types";

// Lazily initialized so the secret env var is available at call time, not module load time
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Run: firebase functions:secrets:set ANTHROPIC_API_KEY"
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ── Prompt factory ────────────────────────────────────────────────────────────
function buildPrompt(req: GenerateWorksheetRequest): string {
  return `You are an expert math teacher creating homework worksheets.

Generate exactly ${req.numProblems} math problems for the following:
- Grade Level: ${req.grade}
- Topic: ${req.topic}
- Example problem style: "${req.exampleProblem}"
- Title: "${req.title ?? `${req.topic} Worksheet`}"

Rules:
1. Problems must progress from easier to harder.
2. Each problem must be solvable with ${req.grade} knowledge.
3. Solutions must show clear step-by-step working.
4. Vary problem wording and numbers — do NOT repeat the example.

Return ONLY a valid JSON object matching this exact schema (no markdown, no explanation):
{
  "title": "string",
  "topic": "string",
  "grade": "string",
  "instructions": "string (one sentence instruction for students)",
  "problems": [
    {
      "number": 1,
      "question": "string",
      "solution": "string (step-by-step, newline-separated steps)",
      "answer": "string (final answer only)"
    }
  ]
}`;
}

// ── Parse & validate AI response ─────────────────────────────────────────────
function parseWorksheet(raw: string): WorksheetData {
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as WorksheetData;

  if (!parsed.problems || !Array.isArray(parsed.problems)) {
    throw new Error("AI response missing problems array");
  }
  if (parsed.problems.length === 0) {
    throw new Error("AI returned 0 problems");
  }
  return parsed;
}

// ── Upload a buffer to Firebase Storage and return a download URL ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uploadPDF(
  bucket: any,
  buffer: Buffer,
  storagePath: string
): Promise<string> {
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    contentType: "application/pdf",
    resumable: false,
    metadata: { firebaseStorageDownloadTokens: crypto.randomUUID() },
  });
  // getDownloadURL uses Firebase's token-based URL — no signBlob IAM role needed
  return getDownloadURL(file);
}

// ── Main generator (called by Cloud Function) ────────────────────────────────
export async function generateWorksheetAndAssign(
  req: GenerateWorksheetRequest,
  teacherUid: string
): Promise<GenerateWorksheetResponse> {
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  // ── 1. ONE AI call for all students (cost optimized) ──────────────────────
  const message = await getClient().messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: buildPrompt(req) }],
  });

  const rawText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const worksheet = parseWorksheet(rawText);

  // ── 2. Store worksheet template in Firestore ────────────────────────────────
  const worksheetRef = db.collection("worksheets").doc();
  await worksheetRef.set({
    id: worksheetRef.id,
    title: worksheet.title,
    topic: worksheet.topic,
    grade: worksheet.grade,
    instructions: worksheet.instructions,
    problems: worksheet.problems,
    classId: req.classId,
    createdBy: teacherUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // ── 3. Generate teacher answer-key PDF ────────────────────────────────────
  const answerKeyBuffer = await buildWorksheetPDF(worksheet, "Answer Key", true);
  const answerKeyUrl = await uploadPDF(
    bucket,
    answerKeyBuffer,
    `worksheets/${worksheetRef.id}/answer_key.pdf`
  );
  await worksheetRef.update({ answerKeyUrl });

  // ── 4. Batch-generate one PDF per student (no extra AI calls) ─────────────
  const studentIds = req.studentIds ?? [];
  const assignmentIds: string[] = [];
  const pdfUrls: string[] = [];

  // Resolve display names for all students in one batch read
  const studentDocs = studentIds.length
    ? await db.getAll(
        ...studentIds.map((id) => db.collection("users").doc(id))
      )
    : [];

  const batch = db.batch();

  await Promise.all(
    studentDocs.map(async (snap) => {
      const studentId = snap.id;
      const studentName = (snap.data()?.displayName as string) ?? "Student";

      // Build personalised PDF (same problems, different name)
      const pdfBuffer = await buildWorksheetPDF(worksheet, studentName, false);
      const pdfUrl = await uploadPDF(
        bucket,
        pdfBuffer,
        `worksheets/${worksheetRef.id}/students/${studentId}.pdf`
      );
      pdfUrls.push(pdfUrl);

      // Create assignment document
      const assignRef = db.collection("assignments").doc();
      batch.set(assignRef, {
        id: assignRef.id,
        worksheetId: worksheetRef.id,
        classId: req.classId,
        studentId,
        teacherId: teacherUid,
        dueDate: admin.firestore.Timestamp.fromDate(new Date(req.dueDate)),
        status: "assigned",           // assigned | submitted | verified
        pdfUrl,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // In-app notification for student
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        userId: studentId,
        type: "new_assignment",
        title: "New Assignment",
        body: `"${worksheet.title}" is due ${new Date(req.dueDate).toLocaleDateString()}`,
        link: `/student/assignments/${assignRef.id}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      assignmentIds.push(assignRef.id);
    })
  );

  await batch.commit();

  // ── 5. Write a batchAssignments summary doc ────────────────────────────────
  const batchAssignmentRef = db.collection("batchAssignments").doc();
  await batchAssignmentRef.set({
    id: batchAssignmentRef.id,
    title: req.title ?? `${req.topic} Worksheet`,
    batchId: req.classId,
    teacherId: teacherUid,
    type: "ai",
    worksheetId: worksheetRef.id,
    totalStudents: studentIds.length,
    submittedCount: 0,
    dueDate: admin.firestore.Timestamp.fromDate(new Date(req.dueDate)),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    worksheetId: worksheetRef.id,
    assignmentIds,
    pdfUrls,
    batchAssignmentId: batchAssignmentRef.id,
  };
}
