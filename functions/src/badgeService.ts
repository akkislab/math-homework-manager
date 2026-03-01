import * as admin from "firebase-admin";

interface BadgeRule {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (stats: StudentStats) => boolean;
}

interface StudentStats {
  totalSubmissions: number;
  avgGrade: number;
  streak: number;          // consecutive on-time submissions
  perfectScores: number;   // 100% grades
}

// ── Badge definitions ─────────────────────────────────────────────────────────
const BADGES: BadgeRule[] = [
  {
    id: "first_submission",
    name: "First Step",
    icon: "🚀",
    description: "Submitted your first assignment",
    check: (s) => s.totalSubmissions >= 1,
  },
  {
    id: "streak_3",
    name: "On A Roll",
    icon: "🔥",
    description: "3 assignments submitted on time in a row",
    check: (s) => s.streak >= 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    icon: "⚡",
    description: "7 assignments submitted on time in a row",
    check: (s) => s.streak >= 7,
  },
  {
    id: "perfect_score",
    name: "Perfect 100",
    icon: "💯",
    description: "Earned 100% on an assignment",
    check: (s) => s.perfectScores >= 1,
  },
  {
    id: "high_achiever",
    name: "High Achiever",
    icon: "🏆",
    description: "Average grade above 90% (min 5 assignments)",
    check: (s) => s.totalSubmissions >= 5 && s.avgGrade >= 90,
  },
  {
    id: "consistent_10",
    name: "Math Master",
    icon: "🎓",
    description: "Completed 10 assignments",
    check: (s) => s.totalSubmissions >= 10,
  },
];

// ── Compute stats for a student from their verified submissions ───────────────
async function getStudentStats(
  db: admin.firestore.Firestore,
  studentId: string
): Promise<StudentStats> {
  const submissionsSnap = await db
    .collection("submissions")
    .where("studentId", "==", studentId)
    .where("status", "==", "verified")
    .orderBy("submittedAt", "desc")
    .get();

  const docs = submissionsSnap.docs.map((d) => d.data());

  const totalSubmissions = docs.length;
  const grades = docs.map((d) => (d.grade as number) ?? 0);
  const avgGrade =
    totalSubmissions > 0
      ? grades.reduce((a, b) => a + b, 0) / totalSubmissions
      : 0;
  const perfectScores = grades.filter((g) => g === 100).length;

  // Calculate on-time streak (compare submittedAt vs assignment dueDate)
  let streak = 0;
  for (const doc of docs) {
    const submittedAt = (doc.submittedAt as admin.firestore.Timestamp).toDate();
    const dueDate = (doc.dueDate as admin.firestore.Timestamp).toDate();
    if (submittedAt <= dueDate) {
      streak++;
    } else {
      break;
    }
  }

  return { totalSubmissions, avgGrade, streak, perfectScores };
}

// ── Award newly unlocked badges ────────────────────────────────────────────────
export async function evaluateAndAwardBadges(
  studentId: string
): Promise<string[]> {
  const db = admin.firestore();
  const stats = await getStudentStats(db, studentId);

  const earnedSnap = await db
    .collection("studentBadges")
    .doc(studentId)
    .collection("earned")
    .get();

  const alreadyEarned = new Set(earnedSnap.docs.map((d) => d.id));
  const newlyAwarded: string[] = [];

  const batch = db.batch();
  for (const badge of BADGES) {
    if (!alreadyEarned.has(badge.id) && badge.check(stats)) {
      const ref = db
        .collection("studentBadges")
        .doc(studentId)
        .collection("earned")
        .doc(badge.id);
      batch.set(ref, {
        id: badge.id,
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // In-app notification
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        userId: studentId,
        type: "badge_earned",
        title: "Badge Earned! " + badge.icon,
        body: `You earned the "${badge.name}" badge! ${badge.description}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      newlyAwarded.push(badge.id);
    }
  }

  if (newlyAwarded.length > 0) await batch.commit();
  return newlyAwarded;
}
