# IMPLEMENTATION PROMPT  
## Project: Math Homework Manager AI  
## Goal: Build Full Feature MVP with Responsive Design  

You are a senior full-stack engineer.

Build a production-ready MVP web application called **Math Homework Manager AI** with clean, modern UI and fully responsive design (mobile + desktop).

---

# 1. Core Requirements

## Roles
- Teacher
- Student

Use role-based authentication.

---

# 2. Teacher Features

## 2.1 Batch Management

Teachers must be able to:

- Create multiple batches/classes
- Add students to specific batches
- Move students between batches
- View list of students inside each batch
- View batch-level assignment statistics

Each student belongs to one or more batches.

---

## 2.2 Assignment Creation

When teacher creates assignment:

### Step 1: Select Batch(es)
Dropdown with multi-select.

### Step 2: Choose Assignment Type

Option A: **Generate Worksheet (AI)**
- Grade selector
- Topic input
- Difficulty selector
- Preview before assigning

Option B: **Upload File**
- Upload PDF / DOC / Image
- File stored securely

### Step 3: Set Deadline

### Step 4: Click Assign

After clicking assign, show confirmation modal:

✅ "You successfully assigned the work."

- Prevent duplicate submissions
- Auto close after 3 seconds

---

## 2.3 Assignment Dashboard

For each assignment show:

- Batch name
- Deadline
- Progress bar
- Submitted count (e.g. 12 / 25)
- Pending count
- Button: View Submissions

### Real-Time Requirement
When a student submits:
- Submitted count increases automatically
- Pending count decreases
- No manual refresh required

Use real-time listeners.

---

## 2.4 Submission Review

Teacher can:
- View all submissions
- View uploaded file
- See AI-generated percentage score
- Edit score if needed
- Click Confirm

Student only sees score after confirmation.

---

# 3. Student Features

## 3.1 Student Dashboard

Student must only see assignments assigned to their batch.

For each assignment show:
- Title
- Deadline
- Status:
  - Not Submitted
  - Submitted
  - Graded
- Score (only after teacher confirms)

---

## 3.2 Submission Flow

Student:
- Click assignment
- Upload file (PDF, Image, Text)
- Click Submit

After submission:
- Status changes to Submitted
- Teacher submission counter updates instantly

---

# 4. Data Structure

Design clean scalable schema:

Teacher:
- id
- name
- email

Student:
- id
- name
- email
- batchIds[]

Batch:
- id
- name
- teacherId
- studentIds[]

Assignment:
- id
- batchId
- title
- type (AI | Upload)
- deadline
- totalStudents
- submittedCount

Submission:
- id
- assignmentId
- studentId
- fileUrl
- score
- status (submitted | graded)

---

# 5. Technical Stack

Frontend:
- React (functional components)
- Clean folder structure
- Reusable UI components

Backend:
- Firebase or Node + Express

Database:
- Firestore or PostgreSQL

Storage:
- Secure file upload

AI:
- Worksheet generation endpoint
- Auto grading returning %

---

# 6. Responsiveness Requirements (IMPORTANT)

The application MUST be fully responsive.

## Desktop (1024px+)
- Sidebar navigation
- Grid dashboard layout
- Table view for submissions
- Large progress bars

## Tablet (768px - 1023px)
- Collapsible sidebar
- 2-column dashboard layout

## Mobile (<768px)
- Mobile-first design
- Stacked card layout
- Bottom navigation or hamburger menu
- Large tap-friendly buttons
- Submission progress shown as compact bar
- Modals optimized for small screens

Use:
- Flexbox / Grid
- Responsive breakpoints
- No horizontal scroll
- Consistent spacing
- Clean modern minimal UI

---

# 7. UX Requirements

- Clean and modern aesthetic
- Soft shadows
- Rounded corners
- Clear CTA buttons
- Loading states for AI generation
- Error handling for uploads
- Toast notifications for actions
- Smooth transitions

---

# 8. Non-Functional Requirements

- Real-time updates for submissions
- Secure authentication
- Role-based access
- Fast AI response (<10 seconds)
- Scalable for 500+ students per teacher
- Modular codebase

---

# 9. Deliverables

Generate:

- Full frontend structure
- Backend API routes
- Database schema
- Real-time submission logic
- Responsive layout
- Example AI worksheet generation mock
- Example grading mock

Code must be clean, structured, and production-ready.