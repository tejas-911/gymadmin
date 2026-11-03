const db = require('../db');
const { isId, isDate, PAYMENT_METHODS } = require('../validate');

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
        const { member_id, supplement_id, quantity, sale_date, payment_method = 'Cash' } = req.body;
        if (!isId(member_id)) return res.status(400).json({ message: 'A valid member is required' });
        if (!isId(supplement_id)) return res.status(400).json({ message: 'A valid supplement is required' });
        if (!isId(quantity)) return res.status(400).json({ message: 'Quantity must be a whole number of at least 1' });
        if (!isDate(sale_date)) return res.status(400).json({ message: 'Sale date must be a valid date (YYYY-MM-DD)' });
        if (!PAYMENT_METHODS.includes(payment_method)) return res.status(400).json({ message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}` });

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Price comes from the DB, never the client
            const [[supp]] = await connection.query('SELECT price FROM Supplement WHERE supplement_id = ?', [supplement_id]);
            if (!supp) {
                await connection.rollback();
                return res.status(404).json({ message: 'Supplement not found' });
            }
            const total_amount = supp.price * quantity;

            // trg_supplement_stock_update deducts stock, or SIGNALs 45000 if there isn't enough
            await connection.query(
                'INSERT INTO Supplement_Sale (member_id, supplement_id, quantity, sale_date, total_amount) VALUES (?, ?, ?, ?, ?)',
                [member_id, supplement_id, quantity, sale_date, total_amount]
            );

            // Record transaction in Payment DB (dynamic payment_method)
            await connection.query(
                'INSERT INTO Payment (subscription_id, amount, payment_date, payment_method) VALUES (?, ?, ?, ?)',
                [null, total_amount, sale_date, payment_method]
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
        // 45000 = SIGNAL from trg_supplement_stock_update (insufficient stock)
        if (error.sqlState === '45000') return res.status(400).json({ message: error.message });
        res.status(500).json({ error: error.message });
    }
};
