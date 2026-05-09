require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const apiRoutes  = require('./routes/apiRoutes');
const adminRoutes= require('./routes/adminRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── SECURITY ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://adorable-alpaca-2bd7e9.netlify.app',   // update with your Netlify URL
    /\.netlify\.app$/,
  ],
  credentials: true,
}));

// Rate limiting — 100 requests per minute per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Stricter limiter on auth endpoints
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// ── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api',       apiRoutes);

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route ${req.path} not found` }));

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ AttendIQ backend running on port ${PORT}`);
  console.log(`   DB: ${process.env.DATABASE_URL?.slice(0, 40)}...`);
});
