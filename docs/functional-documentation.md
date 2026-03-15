# AssignSmart — Functional Documentation

---

## 1. User Stories

### Teacher Stories

| ID | As a teacher I want to… | So that… |
|----|------------------------|---------|
| T-01 | Create multiple classes/batches | I can manage different groups separately |
| T-02 | Add students to a class by email | Students get access immediately |
| T-03 | Remove or move students between classes | I keep class rosters accurate |
| T-04 | Generate an AI worksheet with one form | I don't spend hours writing questions |
| T-05 | Preview the worksheet before assigning | I can check quality before students see it |
| T-06 | Upload my own file and assign to a batch | I can use existing materials |
| T-07 | Set a deadline on every assignment | Students know when work is due |
| T-08 | See a live count of who has submitted | I know immediately who is behind |
| T-09 | View each student's uploaded file | I can review the actual work |
| T-10 | See an AI-suggested grade | I save time marking |
| T-11 | Edit and confirm the grade | I always have the final say |
| T-12 | Send the grade with feedback to the student | Students know how to improve |
| T-13 | View a per-student score history chart | I can spot learning trends |
| T-14 | Filter assignments by status (missing, late) | I can prioritise follow-up |
| T-15 | Export submission results to CSV | I can upload to a school management system |
| T-16 | Schedule class sessions on a calendar | I have a visual timetable |
| T-17 | Receive notifications when students submit | I am always informed |

### Student Stories

| ID | As a student I want to… | So that… |
|----|------------------------|---------|
| S-01 | See all my assignments in one place | I never miss a task |
| S-02 | Know the deadline for each assignment | I can plan my time |
| S-03 | Submit work by uploading a file | I can complete assignments digitally |
| S-04 | Know my submission was received | I have peace of mind |
| S-05 | See my grade after the teacher confirms | I know how I performed |
| S-06 | Read the teacher's feedback | I know what to improve |
| S-07 | Earn badges for milestones | I stay motivated |
| S-08 | Receive notifications for new assignments | I am notified without checking constantly |
| S-09 | See deadline reminders before due dates | I don't submit late |

---

## 2. Workflows

### Workflow 1 — Class and Batch Creation

```
Teacher signs up
    → Selects "Teacher" role on onboarding
    → setUserRole() sets custom claim role="teacher"
    → Redirected to /teacher/dashboard
    → Dashboard detects no classes → shows "Create your first class" prompt
    → Teacher fills: name, classType, classDay, classTime
    → createClass() writes classes/{classId} with teacherId, empty studentIds[]
    → Dashboard reloads with new class pill
    → Teacher can repeat to create more classes
```

### Workflow 2 — Adding Students

```
Teacher clicks "Add Student"
    → Enters student email
    → addStudentToClass() called:
        1. Looks up users where email matches
        2. Adds classId to student's classIds[]
        3. Adds studentId to class's studentIds[]
        4. Writes notification: "You've been added to [ClassName]"
    → Student appears in the students list
    → Student sees the class's assignments on next login
```

### Workflow 3 — AI Worksheet Assignment

```
Teacher fills worksheet generator form
    → previewWorksheet() called:
        1. Sends grade + topic + exampleProblem to Claude Opus
        2. Returns structured problems[] + title + instructions
    → Teacher reviews preview
    → Teacher clicks "Assign"
    → generateWorksheet() called:
        1. Re-calls Claude Opus for final version
        2. For each student: generates personalised PDF (PDFKit)
        3. Uploads PDFs to Firebase Storage
        4. Writes worksheets/{id}
        5. Writes assignments/{id} per student (with pdfUrl, dueDate)
        6. Writes batchAssignments/{id} (totalStudents, submittedCount=0)
        7. Sends "New assignment" notification to each student
    → Success modal shown on teacher screen
```

### Workflow 4 — File Assignment

```
Teacher uploads file
    → File uploaded to Firebase Storage by client
    → Teacher fills: title, description, dueDate
    → createFileAssignment() called:
        1. Writes batchAssignments/{id} (type="file", fileUrl, totalStudents)
        2. Sends notification to every student in the batch
    → Assignment appears on teacher dashboard
    → Assignment appears on each student's portal
```

### Workflow 5 — Student Submission

```
Student opens assignment card
    → Drag-drops or selects file
    → Client uploads file to Firebase Storage: submissions/{uid}/{timestamp}
    → submitAssignment() called with fileUrl + assignmentId or batchAssignmentId:
        1. Writes submissions/{id} (status="submitted", fileUrl, submittedAt)
        2. If batchAssignmentId: atomically increments submittedCount
        3. If assignmentId: updates assignments/{id}.status = "submitted"
        4. Sends "New submission" notification to teacher
    → Student card status → "Submitted"
    → Teacher dashboard counter increments in real time
    → gradeNewSubmission Firestore trigger fires:
        1. Fetches worksheet problems (if worksheetId exists)
        2. Downloads submission file
        3. Sends to Claude Haiku with vision
        4. Writes suggestedGrade (0–100) and aiFeedback to submission
```

### Workflow 6 — Teacher Grade Confirmation

```
Teacher clicks "View Submissions"
    → Submission table loads; AI suggested grade pre-filled
    → Teacher edits score (or accepts AI suggestion)
    → Teacher adds feedback text
    → Teacher clicks "Confirm"
    → verifySubmission() called:
        1. Updates submissions/{id}: grade, feedback, status="verified", verifiedAt
        2. Updates assignments/{id}.grade (if AI worksheet)
        3. If awardBadge: writes studentBadges/{uid}/earned/{badgeId}
        4. Sends "Grade received" notification to student
    → Student sees grade on next portal load
```

### Workflow 7 — Calendar Session Management

```
Teacher opens /teacher/calendar
    → CalendarView loads class list
    → Month view: days with session count chips
    → Week view: time-positioned session blocks (7AM–10PM, 60px/hour)
    → Teacher clicks a date/slot → "Add Session" form appears
    → Fills: time, class, type, note
    → Firestore write: classSessions/{id}
    → Optimistic UI: session appears immediately
    → onSnapshot listener confirms and syncs
    → Teacher clicks a session chip → Detail popup shows time, class, type, note
```

### Workflow 8 — Real-Time Submission Counter

```
Teacher dashboard mounts
    → listenBatchAssignments(classId, callback) sets up onSnapshot listener
    → Firestore returns current batchAssignments[]
    → Student submits → submitAssignment() increments submittedCount
    → Firestore triggers onSnapshot on teacher's browser
    → React state updates → progress bar and counter re-render
    → No manual refresh required
```

### Workflow 9 — Deadline Reminders

```
Cloud Scheduler fires checkDeadlines() at 08:00 UTC daily
    → Queries all assignments where dueDate is within next 24 hours
    → For each: sends "deadline_reminder" notification to student
    → Student sees badge count on notification bell
    → Student clicks bell → sees list of upcoming deadlines
```

### Workflow 10 — Badge Awarding

```
Automatic (on verifySubmission):
    → badgeService checks submission grade and student history
    → If criteria met: writes studentBadges/{uid}/earned/{badgeId}
    → Sends "badge_earned" notification

Manual (teacher-initiated):
    → Teacher selects badge in verifySubmission payload
    → Same write + notification flow

Student views badges:
    → /student/badges loads getStudentBadges(studentId)
    → Earned badges shown with unlock date
    → Locked badges shown greyed out with criteria hint
```

---

## 3. Notification Event Matrix

| Event | Sender | Recipient | Notification Type |
|-------|--------|-----------|-------------------|
| Student added to class | Teacher | Student | `new_assignment` |
| New AI worksheet assigned | System | Student | `new_assignment` |
| New file assignment created | System | Each student in batch | `new_assignment` |
| Student submits work | Student | Teacher | `new_submission` |
| Teacher confirms grade | Teacher | Student | `grade_received` |
| Badge awarded | System | Student | `badge_earned` |
| Assignment due in 24h | Scheduler | Student | `deadline_reminder` |

---

## 4. Role & Permission Matrix

| Action | Teacher | Student |
|--------|---------|---------|
| Create class | ✅ | ❌ |
| Add/remove student | ✅ | ❌ |
| Generate worksheet | ✅ | ❌ |
| Create file assignment | ✅ | ❌ |
| View all submissions | ✅ | ❌ |
| Confirm grade | ✅ | ❌ |
| View own assignments | ❌ | ✅ |
| Submit work | ❌ | ✅ |
| View own grade | ❌ | ✅ (after confirmation) |
| View other students' grades | ❌ | ❌ |
| View progress charts | ✅ | ❌ |
| Award badges | ✅ | ❌ |
| View own badges | ❌ | ✅ |

---

## 5. Data Validation Rules

| Field | Rule |
|-------|------|
| Grade (score) | 0–100 integer |
| Due date | Must be in the future at time of creation |
| Number of problems | 5–20 |
| File upload | PDF, JPG, PNG, JPEG, TXT; max 10 MB |
| Student email | Must match existing Firebase Auth user |
| Class name | Non-empty string, max 100 characters |
| Worksheet topic | Non-empty string, max 200 characters |

---

## 6. Error States

| Scenario | Behaviour |
|----------|-----------|
| AI generation timeout (>30s) | Error toast; teacher can retry |
| File upload failure | Error toast with message; upload not marked as submitted |
| Student email not found | Error returned from `addStudentToClass`; teacher shown message |
| Submission already exists | `submitAssignment` returns existing submissionId; no duplicate created |
| Teacher tries to grade non-existent submission | `permission-denied` thrown |
| Unauthenticated access to protected route | `AuthGuard` redirects to `/login` |
| Wrong role accessing protected route | `AuthGuard` redirects to role-appropriate home |
