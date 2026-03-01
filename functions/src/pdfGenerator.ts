import PDFDocument from "pdfkit";
import { WorksheetData } from "./types";

/**
 * Build a worksheet PDF buffer.
 * @param data       Parsed worksheet from AI
 * @param studentName  Student's display name (or "Answer Key")
 * @param includeAnswers  Whether to include the solution/answer key pages
 */
export async function buildWorksheetPDF(
  data: WorksheetData,
  studentName: string,
  includeAnswers = false
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });

    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const BLUE = "#1a73e8";
    const GRAY = "#5f6368";
    const LIGHT = "#f8f9fa";
    const WIDTH = doc.page.width - 100; // usable width

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(50, 40, WIDTH, 60).fill(BLUE);
    doc.fill("white").fontSize(18).font("Helvetica-Bold")
      .text(data.title, 60, 52, { width: WIDTH - 20 });
    doc.fontSize(10).font("Helvetica")
      .text(`${data.grade}  ·  Topic: ${data.topic}`, 60, 78, { width: WIDTH - 20 });

    // ── Student info line ────────────────────────────────────────────────────
    doc.fill("black").fontSize(11).font("Helvetica")
      .moveDown(1.5)
      .text(`Name: ${studentName}`, { continued: true })
      .text(`    Date: _______________`, { align: "right" });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(50 + WIDTH, doc.y).stroke(GRAY);
    doc.moveDown(0.5);

    // ── Instructions ─────────────────────────────────────────────────────────
    doc.fill(GRAY).fontSize(10).font("Helvetica-Oblique")
      .text(data.instructions, { width: WIDTH });
    doc.moveDown(1);

    // ── Problems ─────────────────────────────────────────────────────────────
    data.problems.forEach((p) => {
      // Problem number badge
      const y = doc.y;
      doc.rect(50, y, 24, 20).fill(BLUE);
      doc.fill("white").fontSize(10).font("Helvetica-Bold")
        .text(String(p.number), 50, y + 5, { width: 24, align: "center" });

      // Question text
      doc.fill("black").fontSize(11).font("Helvetica")
        .text(p.question, 82, y, { width: WIDTH - 32 });

      doc.moveDown(0.4);

      // Answer box
      const boxTop = doc.y;
      const boxH = 48;
      doc.rect(82, boxTop, WIDTH - 32, boxH).fill(LIGHT).stroke("#dadce0");
      doc.fill(GRAY).fontSize(8).font("Helvetica")
        .text("Answer:", 88, boxTop + 4);
      doc.moveDown(0.2);

      doc.y = boxTop + boxH + 10; // advance past the box
      doc.moveDown(0.3);

      // Page break guard
      if (doc.y > doc.page.height - 120) doc.addPage();
    });

    // ── Answer Key page ──────────────────────────────────────────────────────
    if (includeAnswers) {
      doc.addPage();

      doc.rect(50, 40, WIDTH, 40).fill("#34a853");
      doc.fill("white").fontSize(16).font("Helvetica-Bold")
        .text("Answer Key", 60, 52, { width: WIDTH - 20 });

      doc.fill("black").moveDown(2);

      data.problems.forEach((p) => {
        if (doc.y > doc.page.height - 140) doc.addPage();

        doc.fontSize(11).font("Helvetica-Bold")
          .text(`${p.number}. `, { continued: true })
          .font("Helvetica").text(p.question);

        doc.fill(GRAY).fontSize(10).font("Helvetica")
          .text(p.solution, { indent: 20, width: WIDTH - 20 });

        doc.fill("#1a73e8").fontSize(10).font("Helvetica-Bold")
          .text(`✓ Answer: ${p.answer}`, { indent: 20 });

        doc.fill("black").moveDown(0.8);
      });
    }

    doc.end();
  });
}
