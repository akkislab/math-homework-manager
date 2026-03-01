# Math Homework Manager AI - Product Requirements Document (PRD)

**Project Owner:** Akshith Brundala  
**Last Updated:** 2026-03-01  

---

## 1. Overview / Purpose
The Math Homework Manager AI is a platform designed to streamline homework assignment, submission, grading, and tracking for teachers and students. The platform leverages AI to generate worksheets, automatically score assignments, and provide real-time notifications to students.

**Objectives:**
- Save teacher time on grading.  
- Keep students organized and engaged.  
- Provide a clean, responsive UI on web and mobile.  
- Support batch management and student progress tracking.  

---

## 2. Target Users
1. **Teachers** – Assign homework, track student progress, generate worksheets, manage batches, and add students.  
2. **Students** – View assignments, submit homework, receive scores, earn badges, and get reminders.  

---

## 3. Core Features

### 3.1 Teacher Features
1. **Homework Management**
   - Assign homework to specific batches or all students.  
   - Set deadlines.  
   - View list of assigned homework and submission status.  

2. **AI Worksheet Generator**
   - Generate worksheets based on grade/level and topic.  
   - Assign worksheets directly to batches.  
   - Option to preview before assigning.  

3. **Grading & Confirmation**
   - AI auto-scores submissions in %.  
   - Teacher confirms scores before student sees results.  

4. **Batch & Student Management**
   - Create and manage batches/classes.  
   - Assign students to batches.  
   - **Add new students** to the system and to batches.  
   - View batch-wise student lists and progress.  

5. **Notifications & Reminders**
   - Notify students of upcoming deadlines.  

6. **Badge & Reward System**
   - Award badges to students for achievements (e.g., 100% score).  

---

### 3.2 Student Features
1. **Dashboard**
   - View list of assigned homework.  
   - See submission status.  

2. **Homework Submission**
   - Upload answers directly on the platform.  
   - View AI-generated % score once teacher confirms.  

3. **Notifications**
   - Receive alerts for upcoming deadlines.  

4. **Badge & Reward System**
   - Earn badges for performance (e.g., 100%, completing all homework).  

---

## 4. Technical Requirements
- **Platform:** Web + Mobile (responsive design).  
- **Responsive Design:**  
  - Desktop: full-featured dashboard.  
  - Mobile: simplified, easy-to-navigate view.  
- **Authentication:**  
  - Teacher and student login.  
  - Role-based access control.  
- **AI Integration:**  
  - AI worksheet generator with customizable parameters.  
  - Auto-grading system.  
- **Notifications:**  
  - Push notifications for mobile.  
  - Optional email reminders.  

---

## 5. User Interface Requirements

### 5.1 Teacher UI
- Clean dashboard showing batches, students, and homework.  
- Buttons for **Generate Worksheet**, **Assign Homework**, **Add Student**.  
- Homework submission view with student names and AI-generated scores.  
- Batch management page to create batches and add/remove students.  
- Mobile-responsive navigation bar.  

### 5.2 Student UI
- Dashboard showing pending homework.  
- Submission upload interface (PDF, images, or text).  
- Badge display area.  
- Notifications for deadlines.  
- Mobile-first, easy scrolling interface.  

---

## 6. Workflows

### 6.1 Teacher Assigns Homework
1. Teacher selects batch → chooses worksheet (AI generated or existing) → sets deadline → assigns.  
2. Students notified about homework.  

### 6.2 Student Submits Homework
1. Student opens assignment → uploads answer.  
2. AI evaluates → teacher reviews → confirms score.  
3. Student sees final score and earned badges.  

### 6.3 Batch Management
1. Teacher creates batch → adds students → views student progress per batch.  
2. Teacher can add new students to the system and assign them to batches.  

---

## 7. Badge System
- **100% Score** → Gold badge  
- **90-99%** → Silver badge  
- **Completed all homework for a month** → Special achievement badge  
- Displayed on student dashboard  

---

## 8. Non-Functional Requirements
- **Performance:** AI grading and worksheet generation within 10 seconds per assignment.  
- **Security:** Secure login and data encryption; only teachers can view all student scores.  
- **Scalability:** Support multiple batches and hundreds of students.  
- **Maintainability:** Modular codebase for future features (analytics, AI tutoring).  

---

## 9. Optional Future Features
- Analytics dashboard for teachers (average scores, trends).  
- AI suggestions for personalized homework.  
- Integration with Google Classroom / LMS.  

---

## 10. Suggested Technology Stack
- **Frontend:** React.js / React Native (mobile)  
- **Backend:** Node.js + Express / Firebase  
- **Database:** Firestore or PostgreSQL  
- **AI Services:** OpenAI API or in-house ML for worksheet generation  
- **Notifications:** Firebase Cloud Messaging  

---