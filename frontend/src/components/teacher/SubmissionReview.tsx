"use client";
import { useState } from "react";
import { verifySubmission } from "../../lib/api";
import type { Submission, UserProfile } from "../../types";

interface Props {
  submission: Submission;
  student: UserProfile | null;
  onVerified: () => void;
}

export default function SubmissionReview({ submission, student, onVerified }: Props) {
  const [grade, setGrade] = useState(submission.suggestedGrade ?? 80);
  const [feedback, setFeedback] = useState(submission.aiFeedback ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    try {
      await verifySubmission({ submissionId: submission.id, grade, feedback });
      onVerified();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify.");
    } finally {
      setLoading(false);
    }
  };

  const gradeColor =
    grade >= 90 ? "text-green-600" : grade >= 70 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {/* Student header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
          {student?.displayName?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="font-medium text-gray-900">{student?.displayName ?? "Unknown Student"}</p>
          <p className="text-xs text-gray-500">
            Submitted {new Date(submission.submittedAt.toDate()).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
            submission.status === "pending"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {submission.status === "pending" ? "Pending Review" : "Verified"}
        </span>
      </div>

      {/* Submission file */}
      <a
        href={submission.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl mb-4 hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl">📄</span>
        <span className="text-sm text-brand-600 font-medium">View Submitted Work</span>
        <span className="ml-auto text-xs text-gray-400">opens in new tab</span>
      </a>

      {submission.status === "pending" && (
        <>
          {/* AI suggested grade banner */}
          {submission.suggestedGrade != null && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  AI Suggested Grade: <strong>{submission.suggestedGrade}/100</strong>
                </p>
                {submission.aiFeedback && (
                  <p className="text-xs text-blue-600 mt-0.5">{submission.aiFeedback}</p>
                )}
                <p className="text-xs text-blue-400 mt-1">
                  Review and adjust below before confirming.
                </p>
              </div>
            </div>
          )}

          {/* Grade slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-gray-700">Grade</label>
              <span className={`text-xl font-bold ${gradeColor}`}>{grade}/100</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          {/* Feedback */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback for Student
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Great work on problem 3! Remember to show your working for fractions..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-3">{error}</p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full bg-success hover:bg-green-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "Saving..." : `Submit Grade (${grade}/100)`}
          </button>
        </>
      )}

      {submission.status === "verified" && (
        <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
          <p className="font-medium text-green-800">Grade: {submission.grade}/100</p>
          {submission.feedback && (
            <p className="text-sm text-green-700 mt-1">{submission.feedback}</p>
          )}
        </div>
      )}
    </div>
  );
}
