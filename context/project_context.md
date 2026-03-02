# Project Context & Credentials

## 🔐 Credentials

  ### 👨‍🏫 Mentors
  - **Email**: `mentor@monkeylms.com`
  - **Password**: `password123`

### 🧑🎓 Mentees
- **Email**: `mentee@monkeylms.com`
- **Password**: `password123`

---

## 🌱 Seed Users — Create Mentor & Mentee

### Option 1: Via API (Recommended — handles password hashing automatically)

> Make sure the backend is running (`docker compose up -d` or `go run ./cmd/api/main.go`)

**Create Mentor:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin Mentor","email":"mentor@monkeylms.com","password":"password123","role":"mentor"}'
```

**Create Mentee:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Mentee","email":"mentee@monkeylms.com","password":"password123","role":"mentee"}'
```

**Login (get JWT token):**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mentor@monkeylms.com","password":"password123"}'
```

---

### Option 2: Direct SQL (password hash = bcrypt of `password123`)

> Connect to the DB first:
```bash
# Docker
docker exec -it monkeylms_db psql -U postgres -d mentorflow

# Local psql
psql "postgres://postgres:password@localhost:5433/mentorflow"
```

> Then run:
```sql
-- Insert Mentor
WITH mentor AS (
  INSERT INTO users (email, password_hash, role)
  VALUES (
    'mentor@monkeylms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt of "password123"
    'mentor'
  )
  RETURNING id
)
INSERT INTO user_profiles (user_id, name)
SELECT id, 'Admin Mentor' FROM mentor;

-- Insert Mentee
WITH mentee AS (
  INSERT INTO users (email, password_hash, role)
  VALUES (
    'mentee@monkeylms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt of "password123"
    'mentee'
  )
  RETURNING id
)
INSERT INTO user_profiles (user_id, name)
SELECT id, 'Test Mentee' FROM mentee;
```

> ⚠️ **Use Option 1 (API) whenever possible** — the bcrypt hash above is a standard hash but your backend generates its own. Using the API guarantees the correct cost factor is used.

---

## 🚀 High-Level Features

- **Auth**: Fully functional (Signup/Login/Logout).
- **Mentor Dashboard**: Can view mentees and assign goals/tasks.
- **Mentee Dashboard**: Can view assigned goals and track progress.
- **Task Submission**: (In Progress) Mentees can submit solutions for tasks.
- **Feedback**: (In Progress) Mentors can review submissions and provide feedback.
- **Question Bank**: Mentors can manage coding questions for assignments.

---
*Created on: 2026-03-02*
