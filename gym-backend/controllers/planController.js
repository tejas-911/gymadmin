const db = require('../db');
const { isBlank, isId, isAmount } = require('../validate');

exports.getAllPlans = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Membership_Plan');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createPlan = async (req, res) => {
    try {
        const { plan_name, duration_months, price, description } = req.body;
        if (isBlank(plan_name)) return res.status(400).json({ message: 'Plan name is required' });
        if (!isId(duration_months)) return res.status(400).json({ message: 'Duration must be a whole number of months, at least 1' });
        if (!isAmount(price)) return res.status(400).json({ message: 'Price must be a non-negative number' });
        const [result] = await db.query(
            'INSERT INTO Membership_Plan (plan_name, duration_months, price, description) VALUES (?, ?, ?, ?)',
            [plan_name, duration_months, price, description]
        );
        res.status(201).json({ id: result.insertId, message: 'Plan created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
