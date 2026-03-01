"use client";
import AuthGuard from "../../../components/shared/AuthGuard";
import Navbar from "../../../components/shared/Navbar";
import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { getStudentBadges } from "../../../lib/firestore";
import type { Badge } from "../../../types";

export default function BadgesPage() {
  const { user } = useAuth();

  return (
    <AuthGuard requiredRole="student">
      {user && (
        <>
          <Navbar uid={user.uid} displayName={user.displayName ?? "Student"} role="student" />
          <main>
            <BadgesContent studentId={user.uid} />
          </main>
        </>
      )}
    </AuthGuard>
  );
}

function BadgesContent({ studentId }: { studentId: string }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentBadges(studentId)
      .then(setBadges)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  const ALL_BADGES = [
    { id: "first_submission", name: "First Step", icon: "🚀", description: "Submit your first assignment" },
    { id: "gold_score", name: "Gold Star", icon: "🥇", description: "Score 100% on an assignment" },
    { id: "silver_score", name: "Silver Star", icon: "🥈", description: "Score 90–99% on an assignment" },
    { id: "perfect_score", name: "Perfect 100", icon: "💯", description: "Earn 100% on an assignment" },
    { id: "streak_3", name: "On A Roll", icon: "🔥", description: "3 on-time submissions in a row" },
    { id: "streak_7", name: "Week Warrior", icon: "⚡", description: "7 on-time submissions in a row" },
    { id: "high_achiever", name: "High Achiever", icon: "🏆", description: "Average 90%+ over 5 assignments" },
    { id: "monthly_completion", name: "Monthly Champion", icon: "🌟", description: "Complete all assignments in a month" },
    { id: "consistent_10", name: "Math Master", icon: "🎓", description: "Complete 10 assignments" },
  ];

  const earnedIds = new Set(badges.map((b) => b.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Badges</h1>
        <p className="text-sm text-gray-500">{badges.length} of {ALL_BADGES.length} earned</p>
      </div>

      {badges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Earned</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map((b) => (
              <div key={b.id} className="bg-white border border-yellow-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <span className="text-3xl">{b.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {b.earnedAt?.toDate().toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Locked</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ALL_BADGES.filter((b) => !earnedIds.has(b.id)).map((b) => (
            <div key={b.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3 opacity-50">
              <span className="text-3xl grayscale">{b.icon}</span>
              <div>
                <p className="font-semibold text-gray-600 text-sm">{b.name}</p>
                <p className="text-xs text-gray-400">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
