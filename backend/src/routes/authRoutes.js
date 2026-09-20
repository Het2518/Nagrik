'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { registerCitizen, loginCitizen, loginOfficer, getMe, changeCitizenPassword } = require('../controllers/authController');

router.post('/citizen/register', registerCitizen);
router.post('/citizen/login', loginCitizen);
router.post('/officer/login', loginOfficer);
router.post('/officer/talati/login', loginOfficer);

// Protected routes — require valid JWT
router.get('/me', authenticate, getMe);
router.patch('/citizen/change-password', authenticate, changeCitizenPassword);

module.exports = router;
