const db = require('../db');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

exports.getAllPayments = async (req, res) => {
    try {
        const search = req.query.search || '';
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const searchParam = `%${search}%`;

        const [rows] = await db.query(
            `SELECT p.payment_id, p.subscription_id, p.amount, p.payment_date, p.payment_method,
                    m.name AS member_name, m.member_id,
                    mp.plan_name,
                    s.status AS subscription_status
             FROM Payment p
             LEFT JOIN Subscription s ON p.subscription_id = s.subscription_id
             LEFT JOIN Member m ON s.member_id = m.member_id
             LEFT JOIN Membership_Plan mp ON s.plan_id = mp.plan_id
             WHERE (m.name LIKE ? OR mp.plan_name LIKE ? OR p.payment_method LIKE ?)
             ORDER BY p.payment_date DESC, p.payment_id DESC
             LIMIT ? OFFSET ?`,
            [searchParam, searchParam, searchParam, limit, offset]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total
             FROM Payment p
             LEFT JOIN Subscription s ON p.subscription_id = s.subscription_id
             LEFT JOIN Member m ON s.member_id = m.member_id
             LEFT JOIN Membership_Plan mp ON s.plan_id = mp.plan_id
             WHERE (m.name LIKE ? OR mp.plan_name LIKE ? OR p.payment_method LIKE ?)`,
            [searchParam, searchParam, searchParam]
        );

        // Derive status: Cancelled subscription → Refunded, otherwise Paid
        const records = rows.map(r => ({
            ...r,
            status: r.subscription_status === 'Cancelled' ? 'Refunded' : 'Paid'
        }));

        res.json({ records, total });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createPayment = async (req, res) => {
    try {
        const { subscription_id, amount, payment_date, payment_method } = req.body;
        const [result] = await db.query(
            'INSERT INTO Payment (subscription_id, amount, payment_date, payment_method) VALUES (?, ?, ?, ?)',
            [subscription_id, amount, payment_date, payment_method]
        );
        res.status(201).json({ id: result.insertId, message: 'Payment created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getStats = async (req, res) => {
    try {
        // This month & last month revenue
        const [[revRow]] = await db.query(`
            SELECT
                SUM(CASE WHEN DATE_FORMAT(payment_date,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m') THEN amount ELSE 0 END) AS this_month,
                SUM(CASE WHEN DATE_FORMAT(payment_date,'%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH),'%Y-%m') THEN amount ELSE 0 END) AS last_month,
                COUNT(CASE WHEN YEARWEEK(payment_date,1) = YEARWEEK(NOW(),1) THEN 1 END) AS successful_this_week,
                COUNT(CASE WHEN DATE_FORMAT(payment_date,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m') THEN 1 END) AS successful_this_month,
                COUNT(*) AS total_all
            FROM Payment
        `);

        // Pending: Active subscriptions with no payment this month
        const [[{ pending }]] = await db.query(`
            SELECT COUNT(*) AS pending
            FROM Subscription s
            WHERE s.status = 'Active'
              AND s.subscription_id NOT IN (
                  SELECT subscription_id FROM Payment
                  WHERE DATE_FORMAT(payment_date,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m')
                    AND subscription_id IS NOT NULL
              )
        `);

        // Expired memberships needing action
        const [[{ expired_count }]] = await db.query(
            `SELECT COUNT(*) AS expired_count FROM Subscription WHERE status = 'Expired'`
        );

        const thisMonth = parseFloat(revRow.this_month) || 0;
        const lastMonth = parseFloat(revRow.last_month) || 0;
        const pctChange = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : null;

        const totalThisWeek = revRow.successful_this_week || 0;
        const totalAll = revRow.total_all || 1;
        const successRate = totalAll > 0 ? ((revRow.successful_this_month / (revRow.successful_this_month + pending)) * 100).toFixed(1) : '100.0';

        res.json({
            this_month_revenue: thisMonth,
            last_month_revenue: lastMonth,
            pct_change: pctChange,
            pending_count: pending,
            expired_count,
            successful_this_week: totalThisWeek,
            success_rate: successRate
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getMonthlyTrend = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                YEAR(payment_date) AS year,
                MONTH(payment_date) AS month,
                SUM(amount) AS total
            FROM Payment
            WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(payment_date), MONTH(payment_date)
            ORDER BY year ASC, month ASC
        `);

        const data = rows.map(r => ({
            name: MONTH_NAMES[r.month - 1],
            revenue: parseFloat(r.total) || 0
        }));

        // Fill in missing months with 0
        const result = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = MONTH_NAMES[d.getMonth()];
            const found = data.find(x => x.name === monthName);
            result.push(found || { name: monthName, revenue: 0 });
        }

        res.json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getDailyTrend = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                DATE(payment_date) AS day,
                SUM(amount) AS total
            FROM Payment
            WHERE payment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(payment_date)
            ORDER BY day ASC
        `);

        const data = rows.map(r => ({
            name: new Date(r.day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            revenue: parseFloat(r.total) || 0
        }));

        res.json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
};
