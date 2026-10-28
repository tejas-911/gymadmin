const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const subscriptionController = require('../controllers/subscriptionController');
router.get('/', auth(['admin']), subscriptionController.getAllSubscriptions);
router.post('/', auth(['admin']), subscriptionController.createSubscription);
module.exports = router;
