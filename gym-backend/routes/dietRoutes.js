const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const dietController = require('../controllers/dietController');
router.get('/plans', auth(['admin', 'trainer']), dietController.getDietPlans);
router.post('/assign', auth(['admin', 'trainer']), dietController.assignDiet);
module.exports = router;
