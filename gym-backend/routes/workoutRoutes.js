const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const workoutController = require('../controllers/workoutController');
router.get('/plans', auth(['admin', 'trainer']), workoutController.getWorkoutPlans);
router.get('/plans/:id/exercises', auth(['admin', 'trainer']), workoutController.getWorkoutExercises);
router.get('/exercises', auth(['admin', 'trainer']), workoutController.getExercises);
router.post('/assign', auth(['admin', 'trainer']), workoutController.assignWorkout);
module.exports = router;
