# Implementation Plan & Architecture

This document outlines the architectural decisions and implementation history of the **MonkeyLMS** core features.

## 🏗️ Technical Stack
- **Backend**: Go (Chi Router), PostgreSQL, SQLC (Type-safe SQL), JWT Auth.
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion (Animations), Shadcn UI.
- **Infrastructure**: Docker Compose for PostgreSQL.

## 📋 Implementation Phases

### Phase 1: Authentication & User Roles
- [x] JWT-based auth flow.
- [x] Role-based access control (Mentor vs Mentee).
- [x] Unified landing/login experience.

### Phase 2: Goal Assignment (Mentor)
- [x] Mentee discovery API (`GET /users/mentees`).
- [x] Multi-step "Assign Goal" wizard on the frontend.
- [x] Assignment persistence with task-level breakdown.

### Phase 3: Progress & Submissions
- [x] Mentee "My Goals" dashboard with animated progress.
- [x] Task submission system (URL-based solutions).
- [x] Mentor "Submissions" feed with inline feedback forms.
- [x] Enriched join queries for high-performance data fetching.

### Phase 4: User Isolation & Registration (New)
- **Data Isolation (Security Fix)**: 
    - [ ] Update `ListMenteeAssignments` handler to verify that `menteeID` in the URL matches the JWT `UserID` if the caller is a mentee.
    - [ ] Update `GetAssignment` handler to verify that the fetched assignment's `MenteeID` matches the JWT `UserID` if the caller is a mentee.
- **Mentee Registration**: 
    - [ ] Update `LoginPage` UI to include a "Create Account" mode.
    - [ ] Implement `Signup` API call on the frontend with `name`, `email`, `password`, and `role: "mentee"`.
- **Personalized Dashboard**:
    - [ ] Ensure the mentee dashboard only loads data for the currently authenticated user.

## 🗄️ Database Schema Highlights
- **assignments**: Root container for a mentor-mentee goal.
- **assignment_tasks**: Individual requirements within a goal linked to the Question Bank.
- **submissions**: Solutions submitted by mentees for specific tasks.
- **mentor_feedbacks**: Guidance and revision requests linked to submissions.

---
*Last Updated: 2026-03-02*
