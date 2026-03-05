import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { generateWorksheetAndAssign } from "./worksheetGenerator";
import { evaluateAndAwardBadges } from "./badgeService";
import { autoGradeSubmission } from "./autoGrader";
import {
  GenerateWorksheetRequest,
  AssignWorksheetRequest,
  VerifySubmissionRequest,
  CreateClassRequest,
  AddStudentRequest,
  CreateFileAssignmentRequest,
} from "./types";

admin.initializeApp();
const db = admin.firestore();

const REGION = "us-central1";

// ── Guard: caller must be authenticated ──────────────────────────────────────
function requireAuth(uid: string | undefined) {
  if (!uid) throw new HttpsError("unauthenticated", "Login required.");
}

// ── Guard: caller must be a teacher ──────────────────────────────────────────
function requireTeacher(token: admin.auth.DecodedIdToken | undefined) {
  if (!token || token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Teacher access required.");
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 1. generateWorksheet
//    Teacher triggers AI generation + PDF upload + assignment creation
// ────────────────────────────────────────────────────────────────────────────
export const generateWorksheet = onCall(
  { region: REGION, timeoutSeconds: 120, memory: "512MiB", secrets: ["ANTHROPIC_API_KEY"] },
  async (request) => {
    requireAuth(request.auth?.uid);
    requireTeacher(request.auth?.token as admin.auth.DecodedIdToken | undefined);

    const req = request.data as GenerateWorksheetRequest;

    if (!req.grade || !req.topic || !req.exampleProblem) {
      throw new HttpsError("invalid-argument", "grade, topic, and exampleProblem are required.");
    }
    if (!req.numProblems || req.numProblems < 1 || req.numProblems > 20) {
      throw new HttpsError("invalid-argument", "numProblems must be 1–20.");
    }

    try {
      return await generateWorksheetAndAssign(req, request.auth!.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("generateWorksheet error:", msg);
      throw new HttpsError("internal", msg);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 2. assignWorksheet
//    Assign an already-generated worksheet to additional students
// ────────────────────────────────────────────────────────────────────────────
export const assignWorksheet = onCall(
  { region: REGION },
  async (request) => {
    requireAuth(request.auth?.uid);
    requireTeacher(request.auth?.token as admin.auth.DecodedIdToken | undefined);

    const { worksheetId, classId, studentIds, dueDate } =
      request.data as AssignWorksheetRequest;

    if (!worksheetId || !classId || !studentIds?.length) {
      throw new HttpsError("invalid-argument", "worksheetId, classId, studentIds required.");
    }

    const batch = db.batch();
    for (const studentId of studentIds) {
      const ref = db.collection("assignments").doc();
      batch.set(ref, {
        id: ref.id,
        worksheetId,
        classId,
        studentId,
        teacherId: request.auth!.uid,
        dueDate: admin.firestore.Timestamp.fromDate(new Date(dueDate)),
        status: "assigned",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    return { success: true, count: studentIds.length };
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 3. submitAssignment
//    Student marks their assignment as submitted (after uploading file).
//    Accepts either assignmentId (AI worksheet) or batchAssignmentId (file upload).
// ────────────────────────────────────────────────────────────────────────────
export const submitAssignment = onCall(
  { region: REGION },
  async (request) => {
    requireAuth(request.auth?.uid);

    const { assignmentId, batchAssignmentId, fileUrl } = request.data as {
      assignmentId?: string;
      batchAssignmentId?: string;
      fileUrl: string;
    };

    if (!fileUrl) {
      throw new HttpsError("invalid-argument", "fileUrl is required.");
    }
    if (!assignmentId && !batchAssignmentId) {
      throw new HttpsError("invalid-argument", "assignmentId or batchAssignmentId is required.");
    }

    const studentId = request.auth!.uid;
    const submissionRef = db.collection("submissions").doc();
    const batch = db.batch();

    if (batchAssignmentId) {
      // ── File-type batch assignment path ────────────────────────────────────
      const batchAssignRef = db.collection("batchAssignments").doc(batchAssignmentId);
      const batchAssignSnap = await batchAssignRef.get();
      if (!batchAssignSnap.exists) {
        throw new HttpsError("not-found", "Batch assignment not found.");
      }
      const batchAssign = batchAssignSnap.data()!;

      // Guard against duplicate submission
      const existingSnap = await db
        .collection("submissions")
        .where("batchAssignmentId", "==", batchAssignmentId)
        .where("studentId", "==", studentId)
        .limit(1)
        .get();
      if (!existingSnap.empty) {
        throw new HttpsError("failed-precondition", "Already submitted this assignment.");
      }

      batch.set(submissionRef, {
        id: submissionRef.id,
        batchAssignmentId,
        classId: batchAssign.batchId,
        studentId,
        teacherId: batchAssign.teacherId,
        fileUrl,
        status: "pending",
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Increment submittedCount on batchAssignment
      batch.update(batchAssignRef, {
        submittedCount: admin.firestore.FieldValue.increment(1),
      });

      // Notify teacher
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        userId: batchAssign.teacherId,
        type: "new_submission",
        title: "New Submission",
        body: `A student submitted "${batchAssign.title}"`,
        link: `/teacher/submissions/${submissionRef.id}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // ── AI worksheet assignment path (existing behavior) ───────────────────
      const assignRef = db.collection("assignments").doc(assignmentId!);
      const assignSnap = await assignRef.get();
      if (!assignSnap.exists) {
        throw new HttpsError("not-found", "Assignment not found.");
      }
      const assignment = assignSnap.data()!;
      if (assignment.studentId !== studentId) {
        throw new HttpsError("permission-denied", "Not your assignment.");
      }
      if (assignment.status === "verified") {
        throw new HttpsError("failed-precondition", "Assignment already verified.");
      }

      batch.set(submissionRef, {
        id: submissionRef.id,
        assignmentId: assignmentId!,
        worksheetId: assignment.worksheetId,
        classId: assignment.classId,
        studentId,
        teacherId: assignment.teacherId,
        fileUrl,
        status: "pending",
        dueDate: assignment.dueDate,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.update(assignRef, { status: "submitted", submissionId: submissionRef.id });

      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        userId: assignment.teacherId,
        type: "new_submission",
        title: "New Submission",
        body: `A student submitted assignment #${assignmentId!.slice(0, 6)}`,
        link: `/teacher/submissions/${submissionRef.id}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return { submissionId: submissionRef.id };
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 4. verifySubmission
//    Teacher grades a submission and optionally awards a badge
// ────────────────────────────────────────────────────────────────────────────
export const verifySubmission = onCall(
  { region: REGION },
  async (request) => {
    requireAuth(request.auth?.uid);
    requireTeacher(request.auth?.token as admin.auth.DecodedIdToken | undefined);

    const { submissionId, grade, feedback, awardBadge } =
      request.data as VerifySubmissionRequest;

    if (grade < 0 || grade > 100) {
      throw new HttpsError("invalid-argument", "Grade must be 0–100.");
    }

    const submissionRef = db.collection("submissions").doc(submissionId);
    const snap = await submissionRef.get();
    if (!snap.exists) throw new HttpsError("not-found", "Submission not found.");

    const submission = snap.data()!;
    const batch = db.batch();

    batch.update(submissionRef, {
      status: "verified",
      grade,
      feedback,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: request.auth!.uid,
    });

    // Update assignment status (only for AI worksheet assignments)
    if (submission.assignmentId) {
      batch.update(db.collection("assignments").doc(submission.assignmentId), {
        status: "verified",
        grade,
      });
    }

    // Notify student of grade
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      id: notifRef.id,
      userId: submission.studentId,
      type: "grade_received",
      title: "Assignment Graded",
      body: `You received ${grade}/100. ${feedback ? `Feedback: ${feedback}` : ""}`,
      link: `/student/assignments/${submission.assignmentId}`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Manual badge award if specified
    if (awardBadge) {
      const badgeRef = db
        .collection("studentBadges")
        .doc(submission.studentId)
        .collection("earned")
        .doc(awardBadge);
      const badgeDefSnap = await db.collection("badges").doc(awardBadge).get();
      if (badgeDefSnap.exists) {
        batch.set(badgeRef, {
          ...badgeDefSnap.data(),
          earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    // Evaluate automatic badges after grading — non-fatal if it fails
    let newBadges: string[] = [];
    try {
      newBadges = await evaluateAndAwardBadges(submission.studentId);
    } catch (badgeErr) {
      console.error("Badge evaluation failed (non-fatal):", badgeErr);
    }

    return { success: true, newBadges };
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 5. setUserRole
//    Called after user signup to assign teacher/student role via custom claim
// ────────────────────────────────────────────────────────────────────────────
export const setUserRole = onCall(
  { region: REGION },
  async (request) => {
    requireAuth(request.auth?.uid);

    const { targetUid, role } = request.data as {
      targetUid: string;
      role: "teacher" | "student";
    };

    // Only a teacher can promote another user; new users can set their own role
    // once (if no existing role claim)
    const callerToken = request.auth?.token as admin.auth.DecodedIdToken | undefined;
    const isSelf = request.auth?.uid === targetUid;
    const callerHasRole = !!callerToken?.role;

    if (!isSelf && callerToken?.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only.");
    }
    if (isSelf && callerHasRole) {
      throw new HttpsError("failed-precondition", "Role already set.");
    }

    await admin.auth().setCustomUserClaims(targetUid, { role });
    await db.collection("users").doc(targetUid).set(
      { role, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { success: true };
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 6. createClass
//    Teacher creates a new class/batch
// ────────────────────────────────────────────────────────────────────────────
export const createClass = onCall(
  { region: REGION },
  async (request) => {
    requireAuth(request.auth?.uid);
    requireTeacher(request.auth?.token as admin.auth.DecodedIdToken | undefined);

    const { name } = request.data as CreateClassRequest;
    if (!name?.trim()) {
      throw new HttpsError("invalid-argument", "Class name is required.");
    }

    const classRef = db.collection("classes").doc();
    await classRef.set({
      id: classRef.id,
      name: name.trim(),
      teacherId: request.auth!.uid,
      studentIds: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { classId: classRef.id };
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 7. addStudentToClass
//    Teacher adds a student (by email) to their class
// ────────────────────────────────────────────────────────────────────────────
export const addStudentToClass = onCall(
  { region: REGION },
  async (request) => {
    requireAuth(request.auth?.uid);
    requireTeacher(request.auth?.token as admin.auth.DecodedIdToken | undefined);

    const { email, classId } = request.data as AddStudentRequest;
    if (!email || !classId) {
      throw new HttpsError("invalid-argument", "email and classId are required.");
    }

    // Look up user account by email
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email.toLowerCase().trim());
    } catch {
      throw new HttpsError(
        "not-found",
        `No account found for ${email}. The student must sign up first.`
      );
    }

    const studentId = userRecord.uid;

    const classRef = db.collection("classes").doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Class not found.");
    }
    if (classSnap.data()!.teacherId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Not your class.");
    }

    const batch = db.batch();
    batch.update(classRef, {
      studentIds: admin.firestore.FieldValue.arrayUnion(studentId),
    });
    batch.set(
      db.collection("users").doc(studentId),
      { classId, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    // Welcome notification
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      id: notifRef.id,
      userId: studentId,
      type: "new_assignment",
      title: "Welcome to the class!",
      body: `You have been added to "${classSnap.data()!.name}".`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return { success: true, studentId };
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 8. createFileAssignment
//    Teacher uploads a file and assigns it to a whole batch
// ────────────────────────────────────────────────────────────────────────────
export const createFileAssignment = onCall(
  { region: REGION },
  async (request) => {
    requireAuth(request.auth?.uid);
    requireTeacher(request.auth?.token as admin.auth.DecodedIdToken | undefined);

    const { title, description, batchId, fileUrl, dueDate } =
      request.data as CreateFileAssignmentRequest;

    if (!title?.trim() || !batchId || !fileUrl || !dueDate) {
      throw new HttpsError(
        "invalid-argument",
        "title, batchId, fileUrl, and dueDate are required."
      );
    }

    const classSnap = await db.collection("classes").doc(batchId).get();
    if (!classSnap.exists) {
      throw new HttpsError("not-found", "Class not found.");
    }
    if (classSnap.data()!.teacherId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Not your class.");
    }

    const studentIds: string[] = classSnap.data()!.studentIds ?? [];

    const batchAssignmentRef = db.collection("batchAssignments").doc();
    const batch = db.batch();

    batch.set(batchAssignmentRef, {
      id: batchAssignmentRef.id,
      title: title.trim(),
      description: description?.trim() ?? "",
      batchId,
      teacherId: request.auth!.uid,
      type: "file",
      fileUrl,
      totalStudents: studentIds.length,
      submittedCount: 0,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(dueDate)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify all students in the class
    for (const studentId of studentIds) {
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        userId: studentId,
        type: "new_assignment",
        title: "New Assignment",
        body: `"${title.trim()}" is due ${new Date(dueDate).toLocaleDateString()}`,
        link: "/student/portal",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return { batchAssignmentId: batchAssignmentRef.id };
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 9. gradeNewSubmission  — Firestore trigger
//    Automatically grades a submission with AI when it is first created
// ────────────────────────────────────────────────────────────────────────────
export const gradeNewSubmission = onDocumentCreated(
  {
    document: "submissions/{submissionId}",
    region: REGION,
    secrets: ["ANTHROPIC_API_KEY"],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (event) => {
    const submission = event.data?.data();
    if (!submission) return;
    await autoGradeSubmission(submission, event.params.submissionId);
  }
);

// ────────────────────────────────────────────────────────────────────────────
// 10. checkDeadlines  — runs daily at 08:00 UTC
//    Sends in-app reminders for assignments due within 24 hours
// ────────────────────────────────────────────────────────────────────────────
export const checkDeadlines = onSchedule(
  { schedule: "0 8 * * *", region: REGION, timeZone: "UTC" },
  async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const snap = await db
      .collection("assignments")
      .where("status", "==", "assigned")
      .where("dueDate", ">=", admin.firestore.Timestamp.fromDate(now))
      .where("dueDate", "<=", admin.firestore.Timestamp.fromDate(in24h))
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        userId: data.studentId,
        type: "deadline_reminder",
        title: "Assignment Due Soon ⏰",
        body: `You have an assignment due in less than 24 hours!`,
        link: `/student/assignments/${doc.id}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`Sent ${snap.size} deadline reminders.`);
  }
);
