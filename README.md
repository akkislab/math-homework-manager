# AssignSmart — AI Math Homework Platform

> AI-powered worksheets, instant grading, and real-time classroom progress tracking — built for modern math classrooms.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-math--homework--management.web.app-green?style=flat-square)](https://math-homework-management.web.app)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-10-orange?style=flat-square)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square)](https://www.typescriptlang.org/)

---

## Overview

AssignSmart is a full-stack SaaS platform that helps math teachers manage classes, generate AI-powered worksheets, track student progress in real time, and automate grading — all from a single dashboard.

---

## Features

### For Teachers
- **AI Worksheet Generation** — Describe a topic and grade; Claude AI writes personalised problems + generates a PDF per student
- **File Assignments** — Upload PDF/image and assign to an entire batch with one click
- **Batch Management** — Create multiple classes, add/remove students by email, move between batches
- **Submission Review** — View uploads, see AI-suggested grades, edit and confirm scores
- **Real-Time Dashboard** — Live submitted/pending counters update instantly as students submit
- **Calendar** — Schedule and visualise class sessions with a time-positioned week view
- **Student Progress Page** — Per-student score trends, bar charts, assignment history with status filters
- **Notifications** — In-app bell with unread count for every key event

### For Students
- **Assignment Portal** — See all pending, submitted, and graded work in one place
- **File Upload** — Drag-and-drop submission (PDF, image, text)
- **Grades** — Score visible only after teacher confirmation
- **Badges** — 9 unlockable achievement badges for motivation and engagement

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Firebase Cloud Functions v2, Node.js 20 |
| Database | Cloud Firestore |
| Auth | Firebase Authentication + custom role claims |
| Storage | Firebase Storage |
| AI | Anthropic Claude (`claude-opus-4-6` worksheets, `claude-haiku-4-5` grading) |
| PDF | PDFKit |
| Charts | Recharts |

---

## Project Structure

```
math-homework-platform/
├── frontend/                  # Next.js 14 application
│   ├── src/
│   │   ├── app/               # Pages (App Router)
│   │   │   ├── login/
│   │   │   ├── onboarding/
│   │   │   ├── teacher/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── students/
│   │   │   │   ├── worksheets/
│   │   │   │   ├── calendar/
│   │   │   │   └── progress/
│   │   │   └── student/
│   │   │       ├── portal/
│   │   │       └── badges/
│   │   ├── components/
│   │   │   ├── shared/        # Navbar, AuthGuard, Toast, Spinner, AssignSmartLogo
│   │   │   ├── teacher/       # Dashboard, WorksheetGenerator, SubmissionReview, CalendarView, ProgressChart
│   │   │   └── student/       # Portal
│   │   ├── hooks/             # useAuth
│   │   ├── lib/               # firebase.ts, firestore.ts, api.ts
│   │   └── types/             # index.ts — all TypeScript interfaces
│   └── public/                # Static assets (logo files)
├── functions/                 # Firebase Cloud Functions
│   └── src/
│       ├── index.ts           # 13 exported functions
│       ├── worksheetGenerator.ts
│       ├── pdfGenerator.ts
│       ├── autoGrader.ts
│       └── badgeService.ts
├── docs/                      # Full documentation
├── tests/                     # Unit and automation tests
├── firestore.rules
├── storage.rules
├── firebase.json
└── README.md
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project with Firestore, Auth, Storage, and Functions enabled
- Anthropic API key

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/math-homework-platform.git
cd math-homework-platform
```

### 2. Configure Firebase

```bash
firebase login
firebase use --add   # select your project
```

### 3. Environment variables

**Frontend** — `frontend/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

**Functions** — `functions/.secret.local`:
```env
ANTHROPIC_API_KEY=your_key_here
```

### 4. Install dependencies

```bash
cd frontend && npm install
cd ../functions && npm install
```

### 5. Run emulators

```bash
firebase emulators:start
```

Ports: Auth `9099` · Firestore `8080` · Functions `5001` · Hosting `5000` · Storage `9199` · UI `4000`

### 6. Start dev server

```bash
cd frontend && npm run dev   # http://localhost:3000
```

---

## Deployment

```bash
# Frontend only
cd frontend && npm run build
firebase deploy --only hosting

# Functions only
firebase deploy --only functions

# Everything
cd frontend && npm run build && cd .. && firebase deploy
```

---

## Teacher Workflow

1. Sign up → select **Teacher** role on onboarding
2. Create a class (name, type, schedule)
3. Add students by email address
4. Create assignment: choose **AI Worksheet** or **File Upload** → set deadline → Assign
5. Monitor live submission counters on the dashboard
6. **View Submissions** → review uploads → edit grade → Confirm
7. Track per-student trends on the **Progress** page

## Student Workflow

1. Sign up → select **Student** role
2. Open **My Assignments** on the portal
3. Click an assignment → drag-drop file → Submit
4. Check back for grade (visible after teacher confirms)
5. Earn badges on the **Badges** page

---

## Running Tests

```bash
# Unit tests
cd tests && npm install && npm test

# Automation tests
cd tests/automation && npm install && npm run test:e2e
```

See `tests/` for full test documentation and results.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional messages: `feat:`, `fix:`, `docs:`, `test:`
4. Run `npx tsc --noEmit` to verify TypeScript before opening a PR
5. Open a pull request against `main`

---

## Support

- Issues: open a GitHub issue
- Live app: [https://math-homework-management.web.app](https://math-homework-management.web.app)
