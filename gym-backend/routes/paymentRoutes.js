const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

router.get('/stats', auth(['admin']), paymentController.getStats);
router.get('/trend/monthly', auth(['admin']), paymentController.getMonthlyTrend);
router.get('/trend/daily', auth(['admin']), paymentController.getDailyTrend);
router.get('/', auth(['admin']), paymentController.getAllPayments);
router.post('/', auth(['admin']), paymentController.createPayment);

module.exports = router;
