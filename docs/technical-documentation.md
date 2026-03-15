# AssignSmart — Technical Documentation

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                          │
│   Next.js 14 (Static Export) — Firebase Hosting CDN             │
│   React 18 · TypeScript · Tailwind CSS · Recharts               │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTPS
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐   ┌───────▼──────┐   ┌──────▼──────┐
    │  Firebase  │   │   Firebase   │   │  Firebase   │
    │    Auth    │   │  Firestore   │   │   Storage   │
    │            │   │  (real-time) │   │  (files)    │
    └────────────┘   └──────────────┘   └─────────────┘
                             │
                    ┌────────▼────────┐
                    │ Cloud Functions │  Node.js 20
                    │     v2 (13)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Anthropic API  │
                    │  Claude Opus    │
                    │  Claude Haiku   │
                    └─────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js static export | Works with Firebase Hosting CDN; no server to manage |
| Firestore real-time listeners | Push updates to teacher dashboard when students submit |
| Firebase custom claims | Stateless role-based auth; checked server-side in every Cloud Function |
| Cloud Functions v2 | Higher concurrency, longer timeouts (needed for AI calls) |
| Separate AI models | Opus for quality worksheet generation; Haiku for fast/cheap auto-grading |

---

## 2. Database Schema

### Firestore Collections

#### `users/{uid}`
```typescript
{
  uid: string;
  displayName: string;
  email: string;
  role: "teacher" | "student";
  classId?: string;        // legacy single-class
  classIds?: string[];     // multi-class support
  photoURL?: string;
  createdAt: Timestamp;
}
```

#### `classes/{classId}`
```typescript
{
  id: string;
  name: string;
  teacherId: string;
  studentIds: string[];
  classType?: string;      // "solo" | "group"
  classDay?: string;       // "Monday", "Tuesday", ...
  classTime?: string;      // "15:30"
  createdAt: Timestamp;
}
```

#### `classSessions/{sessionId}`
```typescript
{
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  date: string;            // "YYYY-MM-DD"
  time: string;            // "HH:mm"
  classType: string;
  note?: string;
  createdAt: Timestamp;
}
```

#### `worksheets/{worksheetId}`
```typescript
{
  id: string;
  title: string;
  topic: string;
  grade: string;
  instructions: string;
  problems: WorksheetProblem[];   // { number, question, solution, answer }
  classId: string;
  createdBy: string;       // teacherId
  answerKeyUrl?: string;
  createdAt: Timestamp;
}
```

#### `assignments/{assignmentId}` — per-student AI worksheet assignment
```typescript
{
  id: string;
  worksheetId: string;
  classId: string;
  studentId: string;
  teacherId: string;
  dueDate: Timestamp;
  status: "assigned" | "submitted" | "verified";
  pdfUrl?: string;         // student's personalised PDF
  submissionId?: string;
  grade?: number;
  createdAt: Timestamp;
}
```

#### `batchAssignments/{batchAssignmentId}` — batch-level assignment
```typescript
{
  id: string;
  title: string;
  description?: string;
  batchId: string;         // classId
  teacherId: string;
  type: "ai" | "file";
  fileUrl?: string;        // for file-type
  worksheetId?: string;    // for ai-type
  totalStudents: number;
  submittedCount: number;  // incremented atomically
  dueDate: Timestamp;
  createdAt: Timestamp;
}
```

#### `submissions/{submissionId}`
```typescript
{
  id: string;
  assignmentId?: string;        // for AI worksheet submissions
  batchAssignmentId?: string;   // for file assignment submissions
  worksheetId?: string;
  classId: string;
  studentId: string;
  teacherId: string;
  fileUrl: string;
  status: "submitted" | "graded" | "verified";
  dueDate?: Timestamp;
  submittedAt: Timestamp;
  grade?: number;               // 0–100
  feedback?: string;
  verifiedAt?: Timestamp;
  verifiedBy?: string;
  suggestedGrade?: number;      // AI auto-grade
  aiFeedback?: string;
  autoGradedAt?: Timestamp;
  batchAssignmentId?: string;
}
```

#### `notifications/{notificationId}`
```typescript
{
  id: string;
  userId: string;
  type: "new_assignment" | "new_submission" | "grade_received" | "badge_earned" | "deadline_reminder";
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: Timestamp;
}
```

#### `studentBadges/{uid}/earned/{badgeId}`
```typescript
{
  badgeId: string;
  earnedAt: Timestamp;
}
```

### Firestore Indexes

Composite indexes are defined in `firestore.indexes.json` for:
- `assignments` — `(studentId, dueDate ASC)`
- `assignments` — `(classId, dueDate DESC)`
- `batchAssignments` — `(batchId, createdAt DESC)`
- `submissions` — `(teacherId, submittedAt DESC)`
- `submissions` — `(studentId, submittedAt DESC)`
- `notifications` — `(userId, createdAt DESC)`

---

## 3. Cloud Functions API

All callable functions require Firebase Authentication.
Role-guarded functions throw `permission-denied` if the caller's role claim does not match.

### `generateWorksheet` — Teacher only
**Purpose:** AI generates worksheet problems, creates PDFs per student, writes Firestore records.

**Request:**
```typescript
{
  grade: string;
  topic: string;
  exampleProblem: string;
  numProblems: number;       // 5–20
  classId: string;
  studentIds: string[];
  dueDate: string;           // ISO date
  title?: string;
  difficulty?: "easy" | "medium" | "hard";
}
```

**Response:**
```typescript
{ worksheetId: string; assignmentIds: string[]; pdfUrls: string[] }
```

**Side effects:** Creates `worksheets/{id}`, `assignments/{id}` per student, `batchAssignments/{id}`, sends notifications.

---

### `previewWorksheet` — Teacher only
**Purpose:** Returns AI-generated preview without writing to Firestore.

**Request:** Same as `generateWorksheet` minus `classId`, `studentIds`, `dueDate`.
**Response:** `WorksheetPreview` object.

---

### `assignWorksheet` — Teacher only
**Purpose:** Assign an existing worksheet to additional students.

**Request:** `{ worksheetId, classId, studentIds[], dueDate }`
**Response:** `{ success: true, count: number }`

---

### `submitAssignment` — Student only
**Purpose:** Student submits work for an AI or file assignment.

**Request:**
```typescript
{
  assignmentId?: string;        // AI worksheet
  batchAssignmentId?: string;   // file assignment
  fileUrl: string;              // Firebase Storage URL
}
```

**Response:** `{ submissionId: string }`

**Side effects:** Creates `submissions/{id}`, increments `batchAssignments.submittedCount` atomically, sends teacher notification, triggers `gradeNewSubmission`.

---

### `verifySubmission` — Teacher only
**Purpose:** Teacher confirms grade for a submission.

**Request:**
```typescript
{
  submissionId: string;
  grade: number;           // 0–100
  feedback: string;
  awardBadge?: string;     // badgeId to award
}
```

**Response:** `{ success: true, newBadges: string[] }`

**Side effects:** Updates submission status to `"verified"`, sends student notification, optionally writes badge.

---

### `setUserRole` — Any authenticated user
**Purpose:** Set role claim (once per user, idempotent).

**Request:** `{ targetUid: string, role: "teacher" | "student" }`
**Response:** `{ success: true }`

---

### `createClass` — Teacher only
**Request:** `{ name: string, classType?: string, classDay?: string, classTime?: string }`
**Response:** `{ classId: string }`

---

### `addStudentToClass` — Teacher only
**Request:** `{ email: string, classId: string }`
**Response:** `{ success: true, studentId: string }`
**Side effects:** Updates student's `classIds` array, sends welcome notification.

---

### `removeStudentFromClass` — Teacher only
**Request:** `{ studentId: string, classId: string }`
**Response:** `{ success: true }`

---

### `deleteClass` — Teacher only
**Request:** `{ classId: string }`
**Response:** `{ success: true }`
**Side effects:** Removes class from all students, deletes batchAssignments for the class.

---

### `createFileAssignment` — Teacher only
**Request:**
```typescript
{
  title: string;
  description?: string;
  batchId: string;
  fileUrl: string;
  dueDate: string;
}
```
**Response:** `{ batchAssignmentId: string }`

---

### `gradeNewSubmission` — Firestore trigger (automatic)
**Trigger:** `onDocumentCreated("submissions/{submissionId}")`
**Purpose:** Auto-grades submission using Claude Vision; sets `suggestedGrade` and `aiFeedback`.
**Skips if:** No worksheetId (cannot evaluate without the original questions).

---

### `checkDeadlines` — Scheduled (automatic)
**Schedule:** Daily at 08:00 UTC
**Purpose:** Sends deadline reminder notifications for assignments due within the next 24 hours.

---

## 4. Frontend Component Structure

```
components/
├── shared/
│   ├── Navbar.tsx          Props: uid, displayName, role
│   │                       State: unread (notification count), menuOpen
│   │                       Uses: listenNotifications, logout
│   ├── AuthGuard.tsx       Props: requiredRole, children
│   │                       Redirects unauthenticated or wrong-role users
│   ├── Toast.tsx           Props: message, type ("success"|"error"), onClose
│   │                       Auto-dismisses after 3 seconds
│   ├── Spinner.tsx         Props: size ("sm"|"md"|"lg")
│   └── AssignSmartLogo.tsx Props: size, variant ("icon"|"full")
│
├── teacher/
│   ├── Dashboard.tsx       Main classroom hub; real-time batchAssignment listener;
│   │                       tabs: Class Overview; modals: AI/File assignment creation
│   ├── WorksheetGenerator.tsx
│   │                       Multi-step form: input → preview → assign
│   │                       Calls: previewWorksheet, generateWorksheet
│   ├── SubmissionReview.tsx
│   │                       Sortable table with inline grade editing
│   │                       Calls: verifySubmission; CSV export
│   ├── CalendarView.tsx    Month/week views; time-positioned events;
│   │                       Session CRUD; Firestore sessions listener
│   └── ProgressChart.tsx   Recharts BarChart for score trends
│
└── student/
    └── Portal.tsx          Assignment cards + batch assignment cards;
                            File upload via react-dropzone;
                            Calls: submitAssignment
```

---

## 5. Authentication & Security

### Role Claims
Custom claims set by `setUserRole` Cloud Function:
```json
{ "role": "teacher" }
// or
{ "role": "student" }
```

Every Cloud Function calling `requireTeacher(token)` or `requireAuth(uid)` validates these claims before executing.

### Firestore Security Rules Summary

```
users/        — auth required; owner can read/write; teacher can update
classes/      — auth required; teacher can write
worksheets/   — auth required; teacher can write
assignments/  — auth required; teacher can write
submissions/  — student: read+create own; teacher: read+update all
batchAssignments/ — auth required; teacher can write
notifications/ — read/update by recipient; create by teacher
studentBadges/ — read by auth; write by teacher
```

### Firebase Storage Rules
Authenticated users may upload to `submissions/{uid}/` paths.
Worksheets and answer keys are stored under `worksheets/` with teacher-only write access.

---

## 6. Frontend State Management

AssignSmart uses **local React state + Firestore real-time listeners** — no external state library (Redux/Zustand).

Pattern used in all real-time features:
```typescript
useEffect(() => {
  const unsub = listenBatchAssignments(classId, (assignments) => {
    setAssignments(assignments);
  });
  return unsub;   // cleanup on unmount
}, [classId]);
```

---

## 7. Key Dependencies

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2 | Framework + App Router |
| react | 18.3 | UI library |
| firebase | 10.12 | Auth, Firestore, Storage, Functions |
| tailwindcss | 3.4 | Utility CSS |
| recharts | 2.12 | Charts |
| react-dropzone | 14.2 | Drag-drop file upload |
| date-fns | 3.6 | Date formatting |
| lucide-react | 0.577 | Icons |

### Functions
| Package | Version | Purpose |
|---------|---------|---------|
| firebase-functions | 5.0 | Cloud Functions v2 |
| firebase-admin | 12.0 | Admin SDK |
| @anthropic-ai/sdk | 0.36 | Claude API |
| pdfkit | 0.15 | PDF generation |
| date-fns | 3.6 | Date utilities |

---

## 8. Deployment Pipeline

```
Developer machine
    │
    ├── frontend/npm run build  →  frontend/out/   (static export)
    │
    └── firebase deploy
            ├── --only hosting   → uploads frontend/out/ to Firebase CDN
            ├── --only functions → compiles TypeScript, deploys 13 functions
            └── --only firestore:rules → deploys security rules
```

**Build time:** ~25 seconds (frontend) + ~60 seconds (functions)
**Zero downtime:** Firebase Hosting performs atomic releases with instant CDN propagation.
