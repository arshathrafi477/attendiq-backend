const bcrypt       = require('bcrypt');
const db           = require('../config/db');
const genPassword  = require('../utils/generatePassword');
const { sendCredentials } = require('../utils/sendEmail');

// ── GET /api/admin/students ─────────────────────────────────────────────────
exports.getStudents = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.name, s.rollno, s.class_name, s.phone,
              u.username, u.email
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.college_id = $1
       ORDER BY s.class_name, s.name`,
      [req.user.collegeId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/admin/students ────────────────────────────────────────────────
exports.createStudent = async (req, res) => {
  const client = await require('../config/db').pool.connect();
  try {
    const { name, rollno, className, phone, email } = req.body;
    if (!name) return res.status(400).json({ message: 'Student name is required' });

    await client.query('BEGIN');

    const password  = genPassword(name, rollno);
    const hash      = await bcrypt.hash(password, 12);
    const base      = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const roll2     = (rollno || '').replace(/\s/g, '').toLowerCase();
    const username  = `${base}${roll2 || Math.floor(1000 + Math.random() * 9000)}`;
    const userEmail = email || `${username}@attendiq.local`;

    // Create login account
    const { rows: [user] } = await client.query(
      `INSERT INTO users (college_id, name, email, username, password, role)
       VALUES ($1,$2,$3,$4,$5,'student')
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id, username, email`,
      [req.user.collegeId, name, userEmail.toLowerCase(), username, hash]
    );

    // Create student profile
    const { rows: [student] } = await client.query(
      `INSERT INTO students (college_id, user_id, name, rollno, class_name, phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.collegeId, user.id, name, rollno || '', className || '', phone || '']
    );

    await client.query('COMMIT');

    // Send credentials email (non-fatal if it fails)
    if (email) {
      const { rows: [col] } = await db.query(
        'SELECT college_name FROM colleges WHERE id=$1', [req.user.collegeId]
      );
      sendCredentials({
        to:          email,
        name,
        username:    user.username,
        password,
        collegeName: col.college_name,
      }).catch(e => console.warn('Email send failed:', e.message));
    }

    res.status(201).json({
      student: { ...student, username: user.username, email: user.email },
      credentials: { username: user.username, password },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createStudent error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// ── PUT /api/admin/students/:id ─────────────────────────────────────────────
exports.updateStudent = async (req, res) => {
  try {
    const { name, rollno, className, phone } = req.body;
    const { rows } = await db.query(
      `UPDATE students SET name=$1, rollno=$2, class_name=$3, phone=$4
       WHERE id=$5 AND college_id=$6 RETURNING *`,
      [name, rollno, className, phone, req.params.id, req.user.collegeId]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── DELETE /api/admin/students/:id ──────────────────────────────────────────
exports.deleteStudent = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT user_id FROM students WHERE id=$1 AND college_id=$2',
      [req.params.id, req.user.collegeId]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Student not found' });

    await db.query('DELETE FROM students WHERE id=$1', [req.params.id]);
    if (rows[0].user_id) {
      await db.query('DELETE FROM users WHERE id=$1', [rows[0].user_id]);
    }
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/admin/classes ──────────────────────────────────────────────────
exports.getClasses = async (req, res) => {
  const { rows } = await db.query(
    'SELECT name FROM classes WHERE college_id=$1 ORDER BY name',
    [req.user.collegeId]
  );
  res.json(rows.map(r => r.name));
};

// ── POST /api/admin/classes ─────────────────────────────────────────────────
exports.addClass = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Class name required' });
  await db.query(
    'INSERT INTO classes (college_id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.user.collegeId, name]
  );
  res.status(201).json({ name });
};

// ── GET /api/admin/subjects ─────────────────────────────────────────────────
exports.getSubjects = async (req, res) => {
  const { rows } = await db.query(
    'SELECT name FROM subjects WHERE college_id=$1 ORDER BY name',
    [req.user.collegeId]
  );
  res.json(rows.map(r => r.name));
};

// ── POST /api/admin/subjects ────────────────────────────────────────────────
exports.addSubject = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Subject name required' });
  await db.query(
    'INSERT INTO subjects (college_id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [req.user.collegeId, name]
  );
  res.status(201).json({ name });
};

// ── GET /api/admin/dashboard ────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const cid = req.user.collegeId;
    const [stuRes, attRes, feesRes] = await Promise.all([
      db.query('SELECT COUNT(*) FROM students WHERE college_id=$1', [cid]),
      db.query(
        `SELECT COUNT(*) FILTER (WHERE present) AS present,
                COUNT(*) AS total
         FROM attendance WHERE college_id=$1 AND att_date = CURRENT_DATE`, [cid]
      ),
      db.query(
        `SELECT SUM(amount) AS total, SUM(paid) AS paid
         FROM fees WHERE college_id=$1`, [cid]
      ),
    ]);
    res.json({
      totalStudents:   parseInt(stuRes.rows[0].count),
      todayPresent:    parseInt(attRes.rows[0].present  || 0),
      todayTotal:      parseInt(attRes.rows[0].total    || 0),
      totalFees:       parseInt(feesRes.rows[0].total   || 0),
      paidFees:        parseInt(feesRes.rows[0].paid    || 0),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
