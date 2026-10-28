const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const c = require('../controllers/classController');

router.get('/stats', auth(['admin', 'trainer', 'member']), c.getStats);
router.get('/week', auth(['admin', 'trainer', 'member']), c.getWeekClasses);
router.get('/upcoming', auth(['admin', 'trainer', 'member']), c.getUpcoming);
router.get('/', auth(['admin', 'trainer', 'member']), c.getAllClasses);
router.post('/', auth(['admin', 'trainer', 'member']), c.addClass);
router.put('/:id', auth(['admin', 'trainer', 'member']), c.updateClass);
router.delete('/:id', auth(['admin', 'trainer', 'member']), c.deleteClass);

module.exports = router;
