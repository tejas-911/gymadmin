const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const reportsController = require('../controllers/reportsController');

router.get('/', auth(['admin']), reportsController.getReports);
router.post('/renew-subscription', auth(['admin']), reportsController.renewSubscription);

module.exports = router;
