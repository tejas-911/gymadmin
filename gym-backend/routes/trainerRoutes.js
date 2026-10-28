const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const trainerController = require('../controllers/trainerController');

router.get('/stats', auth(['admin']), trainerController.getStats);
router.get('/', auth(['admin']), trainerController.getAllTrainers);
router.post('/', auth(['admin']), trainerController.createTrainer);
router.get('/:id', auth(['admin']), trainerController.getTrainerById);
router.put('/:id', auth(['admin']), trainerController.updateTrainer);
router.delete('/:id', auth(['admin']), trainerController.deleteTrainer);

module.exports = router;
