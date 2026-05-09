const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const role    = require('../middleware/roleMiddleware');
const ctrl    = require('../controllers/adminController');

const adminOrStaff = [auth, role('admin', 'staff')];
const adminOnly    = [auth, role('admin')];

// Dashboard stats
router.get('/dashboard', ...adminOrStaff, ctrl.getDashboard);

// Students
router.get('/students',     ...adminOrStaff, ctrl.getStudents);
router.post('/students',    ...adminOrStaff, ctrl.createStudent);
router.put('/students/:id', ...adminOrStaff, ctrl.updateStudent);
router.delete('/students/:id', ...adminOnly, ctrl.deleteStudent);

// Classes
router.get('/classes',  ...adminOrStaff, ctrl.getClasses);
router.post('/classes', ...adminOrStaff, ctrl.addClass);

// Subjects
router.get('/subjects',  ...adminOrStaff, ctrl.getSubjects);
router.post('/subjects', ...adminOrStaff, ctrl.addSubject);

module.exports = router;
