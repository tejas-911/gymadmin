const db = require('../db');

exports.getAllSubscriptions = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Subscription');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createSubscription = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { member_id, plan_id, start_date, end_date, status } = req.body;
        await conn.beginTransaction();
        // A new subscription replaces the member's current one
        await conn.query(
            "UPDATE Subscription SET status = 'Expired' WHERE member_id = ? AND status = 'Active'",
            [member_id]
        );
        const [result] = await conn.query(
            'INSERT INTO Subscription (member_id, plan_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
            [member_id, plan_id, start_date, end_date, status || 'Active']
        );
        await conn.commit();
        res.status(201).json({ id: result.insertId, message: 'Subscription created' });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ error: error.message });
    } finally { conn.release(); }
};
