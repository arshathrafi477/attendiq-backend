const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/authController');

router.post('/login',            ctrl.login);
router.post('/register-college', ctrl.registerCollege);
router.get('/me',          auth, ctrl.me);

module.exports = router;
