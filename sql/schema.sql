-- ═══════════════════════════════════════════════════════
--  AttendIQ — Neon PostgreSQL Schema
--  Multi-tenant: every table carries college_id
--  Run once on your Neon database
-- ═══════════════════════════════════════════════════════

-- 1. COLLEGES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colleges (
  id           SERIAL PRIMARY KEY,
  college_name VARCHAR(200) NOT NULL,
  college_code VARCHAR(50)  UNIQUE,
  email        VARCHAR(150),
  phone        VARCHAR(20),
  address      TEXT,
  inst_type    VARCHAR(30)  DEFAULT 'engineering', -- engineering | school | college
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  college_id  INTEGER      REFERENCES colleges(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  username    VARCHAR(80)  UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  DEFAULT 'student',   -- admin | staff | student
  verified    BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 3. CLASSES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id          SERIAL PRIMARY KEY,
  college_id  INTEGER      REFERENCES colleges(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,   -- e.g. "2nd CSE A"
  UNIQUE (college_id, name)
);

-- 4. SUBJECTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          SERIAL PRIMARY KEY,
  college_id  INTEGER      REFERENCES colleges(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  UNIQUE (college_id, name)
);

-- 5. STUDENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id          SERIAL PRIMARY KEY,
  college_id  INTEGER      REFERENCES colleges(id) ON DELETE CASCADE,
  user_id     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  name        VARCHAR(100) NOT NULL,
  rollno      VARCHAR(50),
  class_name  VARCHAR(100),
  phone       VARCHAR(20),
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 6. ATTENDANCE ───────────────────────────────────────
--  One row per student × date × period
CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  college_id  INTEGER      REFERENCES colleges(id) ON DELETE CASCADE,
  student_id  INTEGER      REFERENCES students(id) ON DELETE CASCADE,
  class_name  VARCHAR(100),
  subject     VARCHAR(100),
  period      VARCHAR(10),             -- P1 … P8
  att_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
  present     BOOLEAN      NOT NULL DEFAULT FALSE,
  UNIQUE (student_id, att_date, period)
);

-- 7. MARKS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marks (
  id          SERIAL PRIMARY KEY,
  college_id  INTEGER        REFERENCES colleges(id) ON DELETE CASCADE,
  student_id  INTEGER        REFERENCES students(id) ON DELETE CASCADE,
  semester    VARCHAR(20)    NOT NULL,
  subject     VARCHAR(100)   NOT NULL,
  mark        DECIMAL(5,2),
  grade       VARCHAR(5),              -- A+, B, etc. when mode = grades
  UNIQUE (student_id, semester, subject)
);

-- 8. FEES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fees (
  id           SERIAL PRIMARY KEY,
  college_id   INTEGER      REFERENCES colleges(id) ON DELETE CASCADE,
  student_id   INTEGER      REFERENCES students(id) ON DELETE CASCADE,
  term         VARCHAR(80)  NOT NULL,
  amount       INTEGER      NOT NULL DEFAULT 0,
  paid         INTEGER      NOT NULL DEFAULT 0,
  due_date     DATE,
  status       VARCHAR(20)  DEFAULT 'due'   -- paid | partial | due
);

-- 9. TIMETABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable (
  id          SERIAL PRIMARY KEY,
  college_id  INTEGER      REFERENCES colleges(id) ON DELETE CASCADE,
  class_name  VARCHAR(100),
  day         VARCHAR(15)  NOT NULL,   -- Monday … Saturday
  period      VARCHAR(10)  NOT NULL,   -- P1 … P8
  subject     VARCHAR(100),
  faculty     VARCHAR(100),
  room        VARCHAR(50),
  UNIQUE (college_id, class_name, day, period)
);

-- 10. NOTES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id          SERIAL PRIMARY KEY,
  college_id  INTEGER      REFERENCES colleges(id) ON DELETE CASCADE,
  class_name  VARCHAR(100),
  subject     VARCHAR(100),
  title       VARCHAR(200) NOT NULL,
  body        TEXT,
  file_url    TEXT,
  uploaded_by INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ═══ INDEXES ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_students_college   ON students(college_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance(att_date);
CREATE INDEX IF NOT EXISTS idx_marks_student      ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_student       ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_college  ON timetable(college_id, class_name);
CREATE INDEX IF NOT EXISTS idx_notes_college      ON notes(college_id);
