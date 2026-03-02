# 🐒 MonkeyLMS

A modern Mentorship Management System built with **Go** (Backend) and **Next.js** (Frontend).

## 🚀 Getting Started

### 📋 Prerequisites
- **Docker** & **Docker Compose**
- **Go** (1.21+)
- **Node.js** (18+) & **npm/pnpm**

---

## 🛠️ How to Run

### 1. Infrastructure (Database)
The project uses PostgreSQL managed via Docker:
```bash
docker-compose up -d
```

### 2. Backend (API)
Navigate to the backend directory and run:
```bash
cd backend
go run cmd/api/main.go
```
*API will be available at `http://localhost:8080`*

### 3. Frontend (Web)
Navigate to the web directory and run:
```bash
cd web
npm run dev
```
*Frontend will be available at `http://localhost:3000`*

---

## 🔐 Credentials & Context
For a list of test users (Mentors/Mentees) and detailed project status, see:
- [project_context.md](file:///c:/Users/Sidharth/Desktop/monkeylms/context/project_context.md)
- [implementation_plan.md](file:///c:/Users/Sidharth/Desktop/monkeylms/context/implementation_plan.md)

---

## ✨ Features
- **Mentor Dashboard**: Assign goals, review submissions, and provide feedback.
- **Mentee Dashboard**: Track progress, view assigned tasks, and submit solutions.
- **Question Bank**: Manage a library of coding and conceptual questions.
- **Gamification**: Interactive progress bars and status tracking.
