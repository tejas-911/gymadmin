const db = require('../db');

exports.getWorkoutPlans = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Workout_Plan');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getExercises = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Exercise');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.assignWorkout = async (req, res) => {
    try {
        const { member_id, workout_id, trainer_id, start_date, end_date } = req.body;
        await db.query(
            'INSERT INTO Member_Workout (member_id, workout_id, trainer_id, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [member_id, workout_id, trainer_id, start_date, end_date]
        );
        res.status(201).json({ message: 'Workout assigned' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getWorkoutExercises = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT
                e.exercise_id,
                e.exercise_name,
                e.muscle_group,
                e.equipment_required,
                we.sets,
                we.reps,
                we.rest_time
            FROM Workout_Exercise we
            JOIN Exercise e ON we.exercise_id = e.exercise_id
            WHERE we.workout_id = ?
            ORDER BY e.muscle_group, e.exercise_name
        `, [id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};
