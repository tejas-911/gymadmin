const db = require('../db');

exports.getAllSubscriptions = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Subscription');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createSubscription = async (req, res) => {
    try {
        const { member_id, plan_id, start_date, end_date, status } = req.body;
        const [result] = await db.query(
            'INSERT INTO Subscription (member_id, plan_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
            [member_id, plan_id, start_date, end_date, status || 'Active']
        );
        res.status(201).json({ id: result.insertId, message: 'Subscription created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
