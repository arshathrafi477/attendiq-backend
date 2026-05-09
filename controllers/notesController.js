const db = require('../config/db');

// ── GET /api/notes?class=&subject=&q= ──────────────────────────────────────
exports.getNotes = async (req, res) => {
  try {
    const { class: cls, subject, q } = req.query;
    const { rows } = await db.query(
      `SELECT n.id, n.class_name, n.subject, n.title, n.body, n.file_url,
              n.created_at, u.name AS uploaded_by_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.uploaded_by
       WHERE n.college_id = $1
         AND ($2::text IS NULL OR n.class_name = $2)
         AND ($3::text IS NULL OR n.subject    = $3)
         AND ($4::text IS NULL OR n.title ILIKE '%' || $4 || '%'
                               OR n.body  ILIKE '%' || $4 || '%')
       ORDER BY n.created_at DESC`,
      [req.user.collegeId, cls || null, subject || null, q || null]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/notes ─────────────────────────────────────────────────────────
exports.addNote = async (req, res) => {
  try {
    const { className, subject, title, body, fileUrl } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const { rows: [r] } = await db.query(
      `INSERT INTO notes (college_id, class_name, subject, title, body, file_url, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.collegeId, className || '', subject || '', title, body || '', fileUrl || '', req.user.id]
    );
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── DELETE /api/notes/:id ───────────────────────────────────────────────────
exports.deleteNote = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM notes WHERE id=$1 AND college_id=$2',
      [req.params.id, req.user.collegeId]
    );
    if (!rowCount) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
