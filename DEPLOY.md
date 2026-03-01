# Deployment Guide — Math Homework Platform

## Prerequisites
- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Google account with a Firebase project created at console.firebase.google.com
- An Anthropic API key from console.anthropic.com

---

## Step 1 — Firebase Project Setup

```bash
firebase login
firebase projects:create math-homework-prod   # or use an existing project
firebase use math-homework-prod
```

Enable services in the Firebase console:
- Authentication → Enable Email/Password + Google
- Firestore → Create database (production mode)
- Storage → Enable
- Functions → Enable (requires Blaze billing plan)

---

## Step 2 — Store the Anthropic API Key as a Secret

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
# Paste your sk-ant-... key when prompted
```

---

## Step 3 — Configure the Frontend

```bash
cd frontend
cp ../.env.example .env.local
# Edit .env.local with your Firebase project values from console.firebase.google.com
```

Fill in all `NEXT_PUBLIC_FIREBASE_*` values from:
Firebase Console → Project Settings → Your apps → Web app → SDK setup

---

## Step 4 — Install Dependencies

```bash
# Functions
cd functions && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

---

## Step 5 — Deploy Everything

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Deploy all at once
firebase deploy
```

Or deploy individually:
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only functions
firebase deploy --only hosting
```

---

## Step 6 — Seed Initial Data (optional)

Run this in the Firebase console → Firestore to create your first class:

```json
Collection: classes
Document ID: demo-class-001
{
  "name": "Grade 4 Math",
  "teacherId": "<your-teacher-uid>",
  "studentIds": []
}
```

Then add students by having them register and sharing the class ID.

---

## Local Development (Emulators)

```bash
# Terminal 1: start emulators
firebase emulators:start

# Terminal 2: start Next.js with emulator flag
cd frontend
NEXT_PUBLIC_USE_EMULATORS=true npm run dev
```

Access the emulator UI at http://localhost:4000

---

## Custom Domain (optional)

```bash
firebase hosting:channel:deploy production --expires 365d
# Then add a custom domain in Firebase Console → Hosting
```

---

## Upgrading Roles for Users

After a teacher registers, set their custom claim:
1. Go to Firebase Console → Functions → Logs to find their UID
2. Or use the Admin SDK in a one-off script:
```js
admin.auth().setCustomUserClaims('TEACHER_UID', { role: 'teacher' })
```

The `setUserRole` Cloud Function handles this automatically on registration.
