/**
 * AI auto-grading using Claude Vision / Document understanding.
 * Called by the gradeNewSubmission Firestore trigger.
 */
import Anthropic from "@anthropic-ai/sdk";
import * as admin from "firebase-admin";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function autoGradeSubmission(
  submission: FirebaseFirestore.DocumentData,
  submissionId: string
): Promise<void> {
  const db = admin.firestore();

  // Get the worksheet for answer key
  const worksheetSnap = await db
    .collection("worksheets")
    .doc(submission.worksheetId)
    .get();
  if (!worksheetSnap.exists) {
    console.warn(`Worksheet ${submission.worksheetId} not found — skipping auto-grade.`);
    return;
  }
  const worksheet = worksheetSnap.data()!;

  // Build the answer key text
  const problemsText = (worksheet.problems as Array<{
    number: number;
    question: string;
    answer: string;
  }>)
    .map((p) => `Problem ${p.number}: ${p.question}\nAnswer: ${p.answer}`)
    .join("\n\n");

  const gradingPrompt = `You are a math teacher grading student homework.

Worksheet: "${worksheet.title}" (${worksheet.grade})
Topic: ${worksheet.topic}

Answer Key:
${problemsText}

Examine the student's submitted work and grade it as a percentage (0-100).
Consider partial credit for work that shows correct method but minor arithmetic errors.

Return ONLY a valid JSON object with no markdown:
{
  "grade": <integer 0-100>,
  "feedback": "<2-3 sentence encouraging feedback for the student, noting strengths and what to improve>"
}`;

  // Download submission file and encode it
  const fileContentBlocks: Anthropic.ContentBlockParam[] = [];
  try {
    const res = await fetch(submission.fileUrl);
    const arrayBuf = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    if (contentType.includes("pdf")) {
      fileContentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      } as Anthropic.ContentBlockParam);
    } else if (contentType.startsWith("image/")) {
      const mt = contentType.split(";")[0] as ImageMediaType;
      fileContentBlocks.push({
        type: "image",
        source: { type: "base64", media_type: mt, data: base64 },
      } as Anthropic.ContentBlockParam);
    }
  } catch (err) {
    console.warn("Could not download submission file for auto-grading:", err);
  }

  const userContent: Anthropic.ContentBlockParam[] = [
    ...fileContentBlocks,
    { type: "text", text: gradingPrompt },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: userContent }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const result = JSON.parse(cleaned) as { grade: number; feedback: string };

    const grade = Math.max(0, Math.min(100, Math.round(result.grade)));
    const feedback = result.feedback ?? "";

    await db.collection("submissions").doc(submissionId).update({
      suggestedGrade: grade,
      aiFeedback: feedback,
      autoGradedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Auto-graded submission ${submissionId}: ${grade}/100`);
  } catch (err) {
    // Don't fail the function — auto-grading is a best-effort enhancement
    console.error("Auto-grading failed for submission", submissionId, err);
  }
}
