const db = require('../config/db');

// ── GET /api/fees?class= ────────────────────────────────────────────────────
exports.getFees = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const { rows: [stu] } = await db.query(
        'SELECT id FROM students WHERE user_id=$1', [req.user.id]
      );
      if (!stu) return res.json([]);
      const { rows } = await db.query(
        'SELECT * FROM fees WHERE student_id=$1 ORDER BY due_date', [stu.id]
      );
      return res.json(rows);
    }

    const { class: cls } = req.query;
    const { rows } = await db.query(
      `SELECT f.*, s.name AS student_name, s.rollno, s.class_name
       FROM fees f
       JOIN students s ON s.id = f.student_id
       WHERE f.college_id = $1
         AND ($2::text IS NULL OR s.class_name = $2)
       ORDER BY f.due_date DESC, s.name`,
      [req.user.collegeId, cls || null]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/fees ──────────────────────────────────────────────────────────
exports.addFee = async (req, res) => {
  try {
    const { studentId, term, amount, dueDate } = req.body;
    const { rows: [r] } = await db.query(
      `INSERT INTO fees (college_id, student_id, term, amount, paid, due_date, status)
       VALUES ($1,$2,$3,$4,0,$5,'due') RETURNING *`,
      [req.user.collegeId, studentId, term, amount, dueDate || null]
    );
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── PUT /api/fees/:id/pay ───────────────────────────────────────────────────
exports.recordPayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const { rows: [fee] } = await db.query(
      'SELECT * FROM fees WHERE id=$1 AND college_id=$2',
      [req.params.id, req.user.collegeId]
    );
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    const newPaid = Math.min(fee.amount, (parseInt(fee.paid) || 0) + parseInt(amount));
    const status  = newPaid >= fee.amount ? 'paid' : newPaid > 0 ? 'partial' : 'due';

    const { rows: [updated] } = await db.query(
      'UPDATE fees SET paid=$1, status=$2 WHERE id=$3 RETURNING *',
      [newPaid, status, fee.id]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
