// server.js
// AttendIQ Backend — application entry point.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/config');
const { testConnection } = require('./config/db');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ── Global middleware ──────────────────────────────────────────────────
app.use(helmet());                                   // secure HTTP headers
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));              // parse JSON bodies
app.use(express.urlencoded({ extended: true }));
if (config.env !== 'test') {
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
}

// ── Root + health check ───────────────────────────────────────────────
// A bare GET / is what most hosting platforms (and curious browsers) hit
// first, so it gets a friendly response instead of falling through to 404.
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AttendIQ backend is running',
    docs: '/health for a lightweight status check, /api/* for the REST API',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'AttendIQ backend is running', env: config.env });
});

// ── API routes ──────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 + error handling (must be registered last) ──────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Boot ────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    const now = await testConnection();
    // eslint-disable-next-line no-console
    console.log(`PostgreSQL connected — server time: ${now}`);

    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`AttendIQ backend listening on port ${config.port} [${config.env}]`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to PostgreSQL. Check your .env settings.', err.message);
    process.exit(1);
  }
};

start();

module.exports = app; // exported for testing (e.g. supertest)
