const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const attendanceController = require('../controllers/attendanceController');

router.get('/', auth(['admin', 'trainer', 'member']), attendanceController.getAllAttendance);
router.post('/', auth(['admin', 'trainer', 'member']), attendanceController.createAttendance);
router.post('/checkin', auth(['admin', 'trainer', 'member']), attendanceController.checkIn);
router.post('/checkout', auth(['admin', 'trainer', 'member']), attendanceController.checkOut);
router.get('/today', auth(['admin', 'trainer', 'member']), attendanceController.getTodayAttendance);
router.get('/stats', auth(['admin', 'trainer', 'member']), attendanceController.getStats);

module.exports = router;
