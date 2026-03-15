# AssignSmart — Test Results

## Unit Test Execution — 2026-03-14

**Runner:** Vitest v1.6.1
**Command:** `cd tests && npm test`
**Result:** ✅ 97 / 97 PASSED

---

### Test Suites

| Suite | Tests | Result | Duration |
|-------|-------|--------|----------|
| `unit/assignmentManagement.test.ts` | 25 | ✅ PASS | 6ms |
| `unit/batchStudentManagement.test.ts` | 18 | ✅ PASS | 4ms |
| `unit/worksheetGeneration.test.ts` | 17 | ✅ PASS | 4ms |
| `unit/studentProgress.test.ts` | 18 | ✅ PASS | 3ms |
| `unit/authAuthorization.test.ts` | 19 | ✅ PASS | 6ms |
| **Total** | **97** | **✅ ALL PASS** | **272ms** |

---

### Test Coverage by Area

#### Assignment Management (25 tests)
- Assignment status lifecycle (assigned → submitted → verified): ✅
- Due date validation (future, past, near-deadline detection): ✅
- Batch assignment submitted count and pending calculation: ✅
- Submission rate calculation (percentage): ✅
- Assignment type handling (AI vs file): ✅
- Grade validation (0–100 range, average calculation): ✅
- Row status detection (not_submitted, submitted, needs_grading, graded, late): ✅

#### Batch & Student Management (18 tests)
- Class creation with required fields: ✅
- Adding student to class (updates both class and student records): ✅
- Duplicate student prevention: ✅
- Multi-class student support: ✅
- Removing student from class: ✅
- Class deletion cascades to student records: ✅
- Student data integrity (email format, initials generation): ✅

#### Worksheet Generation (17 tests)
- Preview structure validation (title, topic, grade, instructions, problems): ✅
- Problem sequential numbering: ✅
- Generate payload validation (all required fields): ✅
- numProblems range enforcement (5–20): ✅
- difficulty enum validation (easy/medium/hard): ✅
- PDF generation: one PDF per student, unique URLs: ✅

#### Student Progress Tracking (18 tests)
- Metrics calculation (total, submitted, missing, late, avgScore): ✅
- Average score edge cases (null when no graded, single assignment, rounding): ✅
- Status filter logic: ✅
- Search filter (case-insensitive, empty query, no match): ✅
- Sort by date (ascending and descending): ✅
- Chart data preparation (grade mapping, null for ungraded): ✅

#### Authentication & Authorization (19 tests)
- AuthGuard route protection (allow, redirect-login, redirect-home): ✅
- requireAuth (valid uid, undefined, empty string): ✅
- requireTeacher (teacher token, student token, missing token, no role): ✅
- requireStudent (student token, teacher token): ✅
- Role validation (valid roles, invalid role rejection): ✅
- setUserRole idempotency (cannot change own role once set): ✅
- Notification authorization (owner read, other user blocked): ✅

---

## Automation Test Setup

**Runner:** Playwright v1.44+
**Status:** Scripts written and ready to run
**Location:** `tests/automation/`

### How to Run

```bash
cd tests/automation
npm install
npx playwright install   # downloads browser binaries

# Against production
BASE_URL=https://math-homework-management.web.app npm run test:e2e

# Against local emulator
BASE_URL=http://localhost:5000 npm run test:e2e
```

### Test Coverage

| Workflow | File | Tests |
|----------|------|-------|
| Teacher auth & navigation | teacherWorkflow.test.ts | 12 |
| Worksheet creation flow | teacherWorkflow.test.ts | 4 |
| Calendar interactions | teacherWorkflow.test.ts | 4 |
| Progress page | teacherWorkflow.test.ts | 2 |
| Submission review | teacherWorkflow.test.ts | 1 |
| Student auth & navigation | studentWorkflow.test.ts | 4 |
| Assignment portal | studentWorkflow.test.ts | 3 |
| File submission | studentWorkflow.test.ts | 2 |
| Badges page | studentWorkflow.test.ts | 2 |
| Notifications | studentWorkflow.test.ts | 2 |

> **Note:** Automation tests require test accounts (`TEACHER_EMAIL`, `TEACHER_PASSWORD`, `STUDENT_EMAIL`, `STUDENT_PASSWORD` env vars) to run against the live app.
