require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// SECURITY
app.use(helmet());

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://adorable-alpaca-2bd7e9.netlify.app',
  ],
  credentials: true,
}));

// RATE LIMIT
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
}));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
}));

// BODY PARSER
app.use(express.json({ limit: '1mb' }));

// ROOT ROUTE
app.get('/', (req, res) => {
  res.send('AttendIQ Backend Running 🚀');
});

// HEALTH CHECK
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date()
  });
});

// API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.path} not found`
  });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: 'Internal server error'
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`✅ AttendIQ backend running on port ${PORT}`);
});