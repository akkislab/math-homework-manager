# AssignSmart — Customer Presentation
### AI-Powered Math Homework Management for Modern Classrooms

---

## Slide 1 — What is AssignSmart?

AssignSmart is a cloud-based homework management platform built specifically for math teachers and their students.

**The problem it solves:**
- Teachers spend hours writing worksheets, chasing submissions, and manually marking work
- Students lose track of assignments and never get feedback fast enough
- Schools have no visibility into class-wide learning gaps

**AssignSmart automates all of it** — from worksheet creation to grading — so teachers spend less time on admin and more time teaching.

**Live platform:** https://math-homework-management.web.app

---

## Slide 2 — Key Features Overview

| Feature | What it does |
|---------|-------------|
| AI Worksheet Generator | Describe a topic + grade level → Claude AI writes a full worksheet with solutions, auto-generates a PDF per student |
| Batch Assignment | Upload any PDF or image and assign to an entire class in seconds |
| Real-Time Dashboard | See exactly who has submitted and who hasn't — live, no refresh needed |
| Auto-Grading | AI reviews student submissions and suggests a percentage score |
| Student Progress Page | Score trends, bar charts, assignment history, late/missing filters per student |
| Calendar View | Schedule class sessions, time-positioned week view |
| Badge System | 9 achievement badges that students unlock automatically |
| In-App Notifications | Instant alerts for new assignments, grades, and deadlines |

---

## Slide 3 — How It Works: Teacher Flow

```
1. Create Class
   └── Add students by email → they receive an instant notification

2. Create Assignment
   ├── Option A: AI Worksheet
   │   └── Enter grade, topic, difficulty → Preview → Assign
   │       └── PDF generated per student automatically
   └── Option B: File Upload
       └── Drag-drop PDF/image → set deadline → Assign to batch

3. Monitor Submissions
   └── Live progress bar: "12 / 25 submitted"
       └── Click "View Submissions" for details

4. Review & Grade
   └── View uploaded file + AI-suggested grade
       └── Edit score + feedback → Confirm
           └── Student receives grade notification

5. Track Progress
   └── Open Progress page → select student
       └── Score trend chart + full assignment history
```

---

## Slide 4 — How It Works: Student Flow

```
1. Log In → See "My Assignments"
   └── Cards show: title, deadline, status (Not Submitted / Submitted / Graded)

2. Submit Work
   └── Click assignment → drag-drop file → Submit
       └── Teacher dashboard updates instantly

3. Get Graded
   └── Grade appears only after teacher confirms
       └── Notification sent automatically

4. Earn Badges
   └── First submission → "First Step" badge
   └── Score 90%+ → "Gold Star" badge
   └── 7-day streak → "Streak" badge
```

---

## Slide 5 — Benefits for Teachers

- **Save 5+ hours per week** — No more manually writing worksheets or chasing submissions
- **AI-generated worksheets in under 10 seconds** — Personalised per student, ready to assign
- **Instant visibility** — Know exactly who is behind before the deadline passes
- **Fair grading** — AI suggests a score; teacher always has final say
- **One platform for everything** — No switching between tools
- **Mobile-friendly** — Review submissions from any device

---

## Slide 6 — Benefits for Students

- **Never miss an assignment** — In-app notifications for every new task and reminder
- **Simple submission** — Drag-drop any file format (PDF, image, text)
- **Fast feedback** — Grades with detailed teacher comments
- **Motivation** — Unlock badges and track personal improvement
- **Always know your standing** — Score history and trends visible at a glance

---

## Slide 7 — Use Cases

### Scenario A: Weekly Homework
> Mrs. Ahmed teaches 3 classes of 25 students each. She creates one AI worksheet per week per grade level. AssignSmart generates 75 personalised PDFs in under 30 seconds, students submit photos of their work, and AI suggests grades that Mrs. Ahmed confirms in 10 minutes.

### Scenario B: Exam Practice
> A teacher uploads past exam papers as PDFs and assigns them to specific batches. Students submit typed or photographed solutions. The teacher reviews and grades from the submission review table.

### Scenario C: Identifying Struggling Students
> A teacher opens the Progress page, selects a student, and immediately sees they have a 42% average and 3 missing assignments over the last 2 weeks — before the term-end report.

### Scenario D: Parent Reporting
> The CSV export from the Submissions table gives a clean, formatted record of all grades that can be attached to a parent report or uploaded to a school management system.

---

## Slide 8 — Technical Highlights

- **Zero infrastructure to manage** — Fully hosted on Google Firebase (99.9% uptime SLA)
- **Real-time** — Firestore listeners push updates to all connected clients instantly
- **Secure** — Role-based access control; students can only see their own data
- **Scalable** — Tested architecture supports 500+ students per teacher
- **AI by Anthropic** — Claude Opus for worksheet generation, Claude Haiku for grading (fast + cost-efficient)

---

## Slide 9 — Pricing & Deployment Options

| Option | Details |
|--------|---------|
| Cloud (SaaS) | Ready to use at `math-homework-management.web.app` |
| Self-hosted | Deploy to any Firebase project with your own API keys |
| White-label | Brand with your school's logo and domain |

---

## Slide 10 — Get Started

1. Visit **https://math-homework-management.web.app**
2. Sign up with Google or email
3. Select **Teacher** and create your first class
4. Add your students by email — they can sign up immediately

**Questions?** Open an issue on GitHub or contact the development team.
