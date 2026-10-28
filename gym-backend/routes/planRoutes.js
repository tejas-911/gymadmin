const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const planController = require('../controllers/planController');

router.get('/', auth(['admin', 'trainer', 'member']), planController.getAllPlans);
router.post('/', auth(['admin', 'trainer', 'member']), planController.createPlan);

module.exports = router;
