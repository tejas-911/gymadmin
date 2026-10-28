const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const supplementController = require('../controllers/supplementController');
router.get('/', auth(['admin']), supplementController.getSupplements);
router.get('/sales', auth(['admin']), supplementController.getSales);
router.post('/sale', auth(['admin']), supplementController.recordSale);
module.exports = router;
