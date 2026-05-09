const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleMiddleware');

const attCtrl  = require('../controllers/attendanceController');
const mrkCtrl  = require('../controllers/marksController');
const feesCtrl = require('../controllers/feesController');
const ttCtrl   = require('../controllers/timetableController');
const ntCtrl   = require('../controllers/notesController');

// ── ATTENDANCE ──────────────────────────────────────────────────────────────
router.get('/attendance',         auth,                        attCtrl.getAttendance);
router.get('/attendance/summary', auth,                        attCtrl.getAttendanceSummary);
router.post('/attendance',        auth, role('admin','staff'), attCtrl.markAttendance);

// ── MARKS ───────────────────────────────────────────────────────────────────
router.get('/marks',       auth,                        mrkCtrl.getMarks);
router.post('/marks',      auth, role('admin','staff'), mrkCtrl.saveMark);
router.post('/marks/bulk', auth, role('admin','staff'), mrkCtrl.bulkSaveMarks);

// ── FEES ────────────────────────────────────────────────────────────────────
router.get('/fees',            auth,                        feesCtrl.getFees);
router.post('/fees',           auth, role('admin','staff'), feesCtrl.addFee);
router.put('/fees/:id/pay',    auth, role('admin','staff'), feesCtrl.recordPayment);

// ── TIMETABLE ───────────────────────────────────────────────────────────────
router.get('/timetable',  auth, ttCtrl.getTimetable);
router.post('/timetable', auth, role('admin','staff'), ttCtrl.setSlot);

// ── NOTES ───────────────────────────────────────────────────────────────────
router.get('/notes',        auth,                        ntCtrl.getNotes);
router.post('/notes',       auth, role('admin','staff'), ntCtrl.addNote);
router.delete('/notes/:id', auth, role('admin','staff'), ntCtrl.deleteNote);

module.exports = router;
