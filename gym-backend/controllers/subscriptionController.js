const db = require('../db');
const { isId, isDate } = require('../validate');

exports.getAllSubscriptions = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Subscription');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createSubscription = async (req, res) => {
    const { member_id, plan_id, start_date, end_date, status } = req.body;
    if (!isId(member_id)) return res.status(400).json({ message: 'A valid member is required' });
    if (!isId(plan_id)) return res.status(400).json({ message: 'A valid plan is required' });
    if (!isDate(start_date) || !isDate(end_date)) return res.status(400).json({ message: 'Start and end dates must be valid dates (YYYY-MM-DD)' });
    if (end_date < start_date) return res.status(400).json({ message: 'End date cannot be before start date' });
    if (status != null && !['Active', 'Expired', 'Cancelled'].includes(status)) return res.status(400).json({ message: 'Status must be Active, Expired, or Cancelled' });

    const conn = await db.getConnection();
    try {
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
