const db = require('../db');

exports.getSupplements = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Supplement');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getSales = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Supplement_Sale');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.recordSale = async (req, res) => {
    try {
        const { member_id, supplement_id, quantity, sale_date, payment_method, total_amount } = req.body;

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query(
                'INSERT INTO Supplement_Sale (member_id, supplement_id, quantity, sale_date, total_amount) VALUES (?, ?, ?, ?, ?)',
                [member_id, supplement_id, quantity, sale_date, total_amount]
            );

            const [result] = await connection.query(
                'UPDATE Supplement SET stock_quantity = stock_quantity - ? WHERE supplement_id = ? AND stock_quantity >= ?',
                [quantity, supplement_id, quantity]
            );

            if (result.affectedRows === 0) {
                throw new Error('Insufficient stock!');
            }

            // Record transaction in Payment DB (dynamic payment_method)
            await connection.query(
                'INSERT INTO Payment (subscription_id, amount, payment_date, payment_method) VALUES (?, ?, ?, ?)',
                [null, total_amount, sale_date, payment_method || 'Cash']
            );

            await connection.commit();
            res.status(201).json({ message: 'Sale recorded and stock updated' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
