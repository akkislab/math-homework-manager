"use client";
import { useState } from "react";
import { generateWorksheet } from "../../lib/api";
import type { GenerateWorksheetPayload } from "../../types";

interface Props {
  classId: string;
  studentIds: string[];
  onSuccess?: (result: { worksheetId: string; pdfUrls: string[] }) => void;
}

const GRADES = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3",
  "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8",
];

const TOPICS_BY_GRADE: Record<string, string[]> = {
  "Grade 1": ["Addition", "Subtraction", "Counting"],
  "Grade 2": ["Addition", "Subtraction", "Place Value", "Measurement"],
  "Grade 3": ["Multiplication", "Division", "Fractions", "Geometry"],
  "Grade 4": ["Fractions", "Decimals", "Multiplication", "Area & Perimeter"],
  "Grade 5": ["Fractions", "Decimals", "Percentages", "Algebra Basics"],
  "Grade 6": ["Ratios", "Percentages", "Integers", "Expressions"],
  "Grade 7": ["Algebra", "Proportions", "Geometry", "Statistics"],
  "Grade 8": ["Linear Equations", "Functions", "Geometry", "Pythagorean Theorem"],
};

export default function WorksheetGenerator({ classId, studentIds, onSuccess }: Props) {
  const [grade, setGrade] = useState("Grade 4");
  const [topic, setTopic] = useState("Fractions");
  const [example, setExample] = useState("");
  const [numProblems, setNumProblems] = useState(8);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ worksheetId: string; pdfUrls: string[] } | null>(null);

  const topics = TOPICS_BY_GRADE[grade] ?? ["General Math"];

  const handleGradeChange = (g: string) => {
    setGrade(g);
    const newTopics = TOPICS_BY_GRADE[g] ?? ["General Math"];
    setTopic(newTopics[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const payload: GenerateWorksheetPayload = {
        grade,
        topic,
        exampleProblem: example,
        numProblems,
        classId,
        studentIds,
        dueDate: new Date(dueDate).toISOString(),
        title: title || undefined,
      };
      const res = await generateWorksheet(payload);
      setResult(res);
      onSuccess?.(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">AI Worksheet Generator</h2>
      <p className="text-sm text-gray-500 mb-5">
        One API call generates {numProblems} problems and creates PDFs for all{" "}
        {studentIds.length} students.
      </p>

      {result && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="font-medium text-green-800">
            Worksheet generated and assigned to {result.pdfUrls.length} students!
          </p>
          <a
            href={result.pdfUrls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 underline mt-1 inline-block"
          >
            Preview first PDF
          </a>
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Grade + Topic */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade Level
            </label>
            <select
              value={grade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Worksheet Title <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${topic} Practice — ${grade}`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Example problem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Example Problem Style <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder='e.g. "Find the area of a rectangle with length 8 cm and width 5 cm."'
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            The AI will use this as a style guide — it will NOT copy this exact problem.
          </p>
        </div>

        {/* Row 2: Num problems + due date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Problems
            </label>
            <input
              type="number"
              min={3}
              max={20}
              value={numProblems}
              onChange={(e) => setNumProblems(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Cost estimate */}
        <div className="p-3 bg-brand-50 rounded-lg text-xs text-brand-600">
          <strong>Cost estimate:</strong> ~$0.01–0.03 per worksheet batch (all{" "}
          {studentIds.length} students share one AI call).
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading
            ? `Generating worksheet & ${studentIds.length} PDFs...`
            : `Generate & Assign to ${studentIds.length} Students`}
        </button>
      </form>
    </div>
  );
}
