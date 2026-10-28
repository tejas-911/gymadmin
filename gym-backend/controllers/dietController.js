const db = require('../db');

exports.getDietPlans = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Diet_Plan');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.assignDiet = async (req, res) => {
    try {
        const { member_id, diet_id, trainer_id, start_date, end_date } = req.body;
        await db.query(
            'INSERT INTO Member_Diet (member_id, diet_id, trainer_id, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [member_id, diet_id, trainer_id, start_date, end_date]
        );
        res.status(201).json({ message: 'Diet assigned' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
