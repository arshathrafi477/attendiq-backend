const db = require('../config/db');

// ── GET /api/marks?class=&semester= ────────────────────────────────────────
exports.getMarks = async (req, res) => {
  try {
    const { class: cls, semester } = req.query;

    if (req.user.role === 'student') {
      const { rows: [stu] } = await db.query(
        'SELECT id FROM students WHERE user_id=$1', [req.user.id]
      );
      if (!stu) return res.json([]);
      const { rows } = await db.query(
        `SELECT semester, subject, mark, grade
         FROM marks WHERE student_id=$1 ORDER BY semester, subject`,
        [stu.id]
      );
      return res.json(rows);
    }

    // Admin/staff — all students in a class for a semester
    const { rows } = await db.query(
      `SELECT s.id AS student_id, s.name, s.rollno,
              COALESCE(json_agg(
                json_build_object('subject',m.subject,'mark',m.mark,'grade',m.grade)
                ORDER BY m.subject
              ) FILTER (WHERE m.id IS NOT NULL), '[]') AS marks
       FROM students s
       LEFT JOIN marks m
         ON m.student_id = s.id AND ($1::text IS NULL OR m.semester = $1)
       WHERE s.college_id = $2
         AND ($3::text IS NULL OR s.class_name = $3)
       GROUP BY s.id
       ORDER BY s.name`,
      [semester || null, req.user.collegeId, cls || null]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/marks ─────────────────────────────────────────────────────────
// Body: { studentId, semester, subject, mark, grade }
exports.saveMark = async (req, res) => {
  try {
    const { studentId, semester, subject, mark, grade } = req.body;
    if (!studentId || !semester || !subject) {
      return res.status(400).json({ message: 'studentId, semester and subject are required' });
    }
    const { rows: [r] } = await db.query(
      `INSERT INTO marks (college_id, student_id, semester, subject, mark, grade)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (student_id, semester, subject)
       DO UPDATE SET mark=$5, grade=$6
       RETURNING *`,
      [req.user.collegeId, studentId, semester, subject, mark ?? null, grade ?? null]
    );
    res.json(r);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/marks/bulk ────────────────────────────────────────────────────
// Body: { semester, subject, records: [{studentId, mark, grade}] }
exports.bulkSaveMarks = async (req, res) => {
  const client = await require('../config/db').pool.connect();
  try {
    const { semester, subject, records } = req.body;
    await client.query('BEGIN');
    for (const r of records) {
      await client.query(
        `INSERT INTO marks (college_id, student_id, semester, subject, mark, grade)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (student_id, semester, subject)
         DO UPDATE SET mark=$5, grade=$6`,
        [req.user.collegeId, r.studentId, semester, subject, r.mark ?? null, r.grade ?? null]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Marks saved', count: records.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
