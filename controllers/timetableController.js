const db = require('../config/db');

// ── GET /api/timetable?class= ───────────────────────────────────────────────
exports.getTimetable = async (req, res) => {
  try {
    const { class: cls } = req.query;
    const { rows } = await db.query(
      `SELECT day, period, subject, faculty, room
       FROM timetable
       WHERE college_id=$1 AND ($2::text IS NULL OR class_name=$2)
       ORDER BY
         CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2
                  WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4
                  WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END,
         period`,
      [req.user.collegeId, cls || null]
    );

    // Return as nested object: { Monday: { P1: {...}, P2: {...} }, ... }
    const result = {};
    for (const r of rows) {
      if (!result[r.day]) result[r.day] = {};
      result[r.day][r.period] = { subject: r.subject, faculty: r.faculty, room: r.room };
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/timetable ─────────────────────────────────────────────────────
exports.setSlot = async (req, res) => {
  try {
    const { className, day, period, subject, faculty, room } = req.body;
    await db.query(
      `INSERT INTO timetable (college_id, class_name, day, period, subject, faculty, room)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (college_id, class_name, day, period)
       DO UPDATE SET subject=$5, faculty=$6, room=$7`,
      [req.user.collegeId, className, day, period, subject, faculty || '', room || '']
    );
    res.json({ message: 'Timetable slot saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
