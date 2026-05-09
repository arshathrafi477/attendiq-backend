const bcrypt      = require('bcrypt');
const db          = require('../config/db');
const genToken    = require('../utils/generateToken');

// ── POST /api/auth/login ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { identifier, password, role } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    // Find user by email OR username
    const { rows } = await db.query(
      `SELECT u.*, c.college_name, c.inst_type
       FROM users u
       JOIN colleges c ON c.id = u.college_id
       WHERE u.email = $1 OR u.username = $1
       LIMIT 1`,
      [identifier.trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Role check — if frontend sends a role hint, verify it matches
    if (role && role !== user.role) {
      return res.status(401).json({
        message: `This account is registered as "${user.role}", not "${role}"`,
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = genToken({
      id:        user.id,
      collegeId: user.college_id,
      role:      user.role,
      username:  user.username,
      name:      user.name,
    });

    res.json({
      token,
      user: {
        id:          user.id,
        name:        user.name,
        username:    user.username,
        email:       user.email,
        role:        user.role,
        collegeId:   user.college_id,
        collegeName: user.college_name,
        instType:    user.inst_type,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/auth/register-college ────────────────────────────────────────
// First-time setup: creates a college + the first admin account
exports.registerCollege = async (req, res) => {
  try {
    const { collegeName, instType, adminName, email, password } = req.body;
    if (!collegeName || !adminName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check email not taken
    const { rows: ex } = await db.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (ex.length) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);

    // Create college
    const { rows: [college] } = await db.query(
      `INSERT INTO colleges (college_name, inst_type) VALUES ($1,$2) RETURNING id`,
      [collegeName, instType || 'engineering']
    );

    // Seed default classes and subjects
    const defaultClasses  = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    const defaultSubjects = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Programming'];
    for (const cls of defaultClasses) {
      await db.query(
        'INSERT INTO classes (college_id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [college.id, cls]
      );
    }
    for (const sub of defaultSubjects) {
      await db.query(
        'INSERT INTO subjects (college_id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [college.id, sub]
      );
    }

    // Create admin user
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const { rows: [user] } = await db.query(
      `INSERT INTO users (college_id, name, email, username, password, role)
       VALUES ($1,$2,$3,$4,$5,'admin') RETURNING id, name, username, email, role`,
      [college.id, adminName, email.toLowerCase(), username, hash]
    );

    const token = genToken({
      id:        user.id,
      collegeId: college.id,
      role:      'admin',
      username:  user.username,
      name:      user.name,
    });

    res.status(201).json({
      token,
      user: {
        id:          user.id,
        name:        user.name,
        username:    user.username,
        email:       user.email,
        role:        'admin',
        collegeId:   college.id,
        collegeName: collegeName,
        instType:    instType || 'engineering',
      },
    });
  } catch (err) {
    console.error('registerCollege error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /api/auth/me ────────────────────────────────────────────────────────
exports.me = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.username, u.email, u.role, u.college_id,
              c.college_name, c.inst_type
       FROM users u JOIN colleges c ON c.id = u.college_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
