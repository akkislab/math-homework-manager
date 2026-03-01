# MathClass — AI-Powered Math Homework Platform

A full-stack, cloud-deployed math homework platform built on Google Firebase.

## Features

| Feature | Details |
|---------|---------|
| AI Worksheet Generation | One Claude API call generates problems + personalizes PDFs for every student |
| Teacher Dashboard | Student list, progress charts, bulk assign, submission review with grading |
| Student Portal | View assignments, drag-and-drop submission upload, instant grade notifications |
| Badge System | Automatic badges for streaks, perfect scores, completion milestones |
| In-App Notifications | Real-time Firestore listeners — no email/SMS cost |
| Deadline Reminders | Scheduled Cloud Function runs daily at 08:00 UTC |

## Project Structure

```
math-homework-platform/
├── firebase.json              Firebase config (hosting, functions, firestore, storage)
├── firestore.rules            Security rules
├── firestore.indexes.json     Composite indexes
├── storage.rules              Storage access control
├── DEPLOY.md                  Step-by-step deployment guide
├── COST_OPTIMIZATION.md       Cost analysis and optimization strategies
│
├── functions/                 Cloud Functions (Node.js 20, TypeScript)
│   └── src/
│       ├── index.ts           All function exports
│       ├── worksheetGenerator.ts  AI generation + batch PDF creation
│       ├── pdfGenerator.ts    PDFKit-based worksheet PDF builder
│       ├── badgeService.ts    Automatic badge evaluation engine
│       └── types.ts           Shared TypeScript types
│
└── frontend/                  Next.js 14 App Router (TypeScript + Tailwind)
    └── src/
        ├── app/               Pages
        │   ├── page.tsx           Root redirect
        │   ├── login/page.tsx     Auth page (email + Google)
        │   ├── teacher/dashboard/ Teacher dashboard page
        │   └── student/portal/    Student portal page
        ├── components/
        │   ├── teacher/
        │   │   ├── Dashboard.tsx        Full teacher dashboard
        │   │   ├── WorksheetGenerator.tsx  AI worksheet form
        │   │   ├── SubmissionReview.tsx    Grade + feedback UI
        │   │   └── ProgressChart.tsx       Recharts visualizations
        │   ├── student/
        │   │   └── Portal.tsx           Assignments + badges + notifications
        │   └── shared/
        │       ├── Navbar.tsx           Top nav with notification badge
        │       └── AuthGuard.tsx        Role-based route protection
        ├── hooks/useAuth.ts     Firebase Auth hook + register/login helpers
        ├── lib/
        │   ├── firebase.ts      Firebase app initialization
        │   ├── api.ts           Typed callable function wrappers
        │   └── firestore.ts     Typed Firestore query helpers
        └── types/index.ts       All TypeScript domain types
```

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd math-homework-platform

# 2. Install all dependencies
(cd functions && npm install)
(cd frontend && npm install)

# 3. Configure environment
cp .env.example frontend/.env.local
# Edit frontend/.env.local with your Firebase config

# 4. Start local emulators + dev server
firebase emulators:start &
cd frontend && NEXT_PUBLIC_USE_EMULATORS=true npm run dev
```

See DEPLOY.md for full production deployment steps.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts
- **Backend**: Firebase Cloud Functions v2 (Node.js 20)
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication (email + Google)
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **PDF**: PDFKit (server-side, no headless browser)
- **Hosting**: Firebase Hosting (static export)

## Firestore Data Model

```
users/{uid}              UserProfile (role, displayName, classId)
classes/{classId}        Class (teacherId, studentIds, name)
worksheets/{id}          Worksheet template (problems, topic, grade, answerKeyUrl)
assignments/{id}         Assignment (worksheetId, studentId, dueDate, status)
submissions/{id}         Submission (fileUrl, grade, feedback, status)
notifications/{id}       In-app notification (userId, type, read)
badges/{id}              Badge definition
studentBadges/{uid}/earned/{badgeId}  Earned badges
```
