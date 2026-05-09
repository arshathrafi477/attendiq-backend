const db = require('../config/db');

// ── GET /api/attendance?class=&date= ───────────────────────────────────────
exports.getAttendance = async (req, res) => {
  try {
    const { class: cls, date } = req.query;
    const attDate = date || new Date().toISOString().slice(0, 10);

    let query, params;
    if (req.user.role === 'student') {
      // Student sees their own attendance summary
      const { rows: [stu] } = await db.query(
        'SELECT id FROM students WHERE user_id=$1', [req.user.id]
      );
      if (!stu) return res.json([]);
      query = `
        SELECT a.period, a.subject, a.att_date, a.present, a.class_name
        FROM attendance a
        WHERE a.student_id=$1
        ORDER BY a.att_date DESC, a.period
      `;
      params = [stu.id];
    } else {
      // Admin/staff — full class attendance for a date
      query = `
        SELECT s.id AS student_id, s.name, s.rollno,
               COALESCE(json_agg(
                 json_build_object('period',a.period,'present',a.present,'subject',a.subject)
                 ORDER BY a.period
               ) FILTER (WHERE a.id IS NOT NULL), '[]') AS periods
        FROM students s
        LEFT JOIN attendance a
          ON a.student_id = s.id AND a.att_date = $1
        WHERE s.college_id = $2
          AND ($3::text IS NULL OR s.class_name = $3)
        GROUP BY s.id
        ORDER BY s.name
      `;
      params = [attDate, req.user.collegeId, cls || null];
    }
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/attendance ────────────────────────────────────────────────────
// Body: { records: [{studentId, period, subject, present}], date, className }
exports.markAttendance = async (req, res) => {
  const client = await require('../config/db').pool.connect();
  try {
    const { records, date, className } = req.body;
    if (!records?.length) return res.status(400).json({ message: 'No records provided' });
    const attDate = date || new Date().toISOString().slice(0, 10);

    await client.query('BEGIN');
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance
           (college_id, student_id, class_name, subject, period, att_date, present)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (student_id, att_date, period)
         DO UPDATE SET present=$7, subject=$4`,
        [req.user.collegeId, r.studentId, className || '', r.subject || '', r.period, attDate, r.present]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Attendance saved', count: records.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// ── GET /api/attendance/summary?studentId= ──────────────────────────────────
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { studentId } = req.query;
    const sid = studentId || (await db.query(
      'SELECT id FROM students WHERE user_id=$1', [req.user.id]
    )).rows[0]?.id;
    if (!sid) return res.json([]);

    const { rows } = await db.query(
      `SELECT subject,
              COUNT(*) AS total_classes,
              COUNT(*) FILTER (WHERE present) AS attended,
              ROUND(100.0 * COUNT(*) FILTER (WHERE present) / NULLIF(COUNT(*),0), 1) AS percentage
       FROM attendance
       WHERE student_id = $1
       GROUP BY subject
       ORDER BY subject`,
      [sid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
