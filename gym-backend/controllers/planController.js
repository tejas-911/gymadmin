const db = require('../db');

exports.getAllPlans = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Membership_Plan');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createPlan = async (req, res) => {
    try {
        const { plan_name, duration_months, price, description } = req.body;
        const [result] = await db.query(
            'INSERT INTO Membership_Plan (plan_name, duration_months, price, description) VALUES (?, ?, ?, ?)',
            [plan_name, duration_months, price, description]
        );
        res.status(201).json({ id: result.insertId, message: 'Plan created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
