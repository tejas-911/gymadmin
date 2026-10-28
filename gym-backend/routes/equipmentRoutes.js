const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const equipmentController = require('../controllers/equipmentController');

router.get('/stats', auth(['admin']), equipmentController.getStats);
router.get('/maintenance', auth(['admin']), equipmentController.getMaintenance);
router.get('/', auth(['admin']), equipmentController.getEquipment);
router.post('/', auth(['admin']), equipmentController.addEquipment);

module.exports = router;
