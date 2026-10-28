const db = require('../db');

// ═══════════════════════════════════════════════════════════════
// VIEWS — Query the MySQL views created in advanced_db_features.sql
// ═══════════════════════════════════════════════════════════════

exports.getMemberDashboard = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM vw_member_dashboard ORDER BY member_id');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create views.' });
    }
};

exports.getMonthlyRevenue = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM vw_monthly_revenue ORDER BY payment_month DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create views.' });
    }
};

exports.getDailyAttendance = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const [rows] = await db.query('SELECT * FROM vw_daily_attendance WHERE date = ? ORDER BY check_in_time DESC', [date]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create views.' });
    }
};

exports.getEquipmentHealth = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM vw_equipment_health ORDER BY maintenance_flag DESC, days_since_service DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create views.' });
    }
};

// ═══════════════════════════════════════════════════════════════
// STORED PROCEDURES
// ═══════════════════════════════════════════════════════════════

exports.callRegisterMember = async (req, res) => {
    try {
        const { name, gender, phone, email, date_of_birth } = req.body;
        await db.query(
            'CALL sp_register_member(?, ?, ?, ?, ?, @new_id, @msg)',
            [name, gender, phone, email, date_of_birth || null]
        );
        const [[result]] = await db.query('SELECT @new_id AS member_id, @msg AS message');
        const status = result.member_id > 0 ? 201 : 400;
        res.status(status).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create procedures.' });
    }
};

exports.callRenewSubscription = async (req, res) => {
    try {
        const { member_id, plan_id, payment_method } = req.body;
        await db.query(
            'CALL sp_renew_subscription(?, ?, ?, @sub_id, @msg)',
            [member_id, plan_id, payment_method]
        );
        const [[result]] = await db.query('SELECT @sub_id AS subscription_id, @msg AS message');
        const status = result.subscription_id > 0 ? 201 : 400;
        res.status(status).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create procedures.' });
    }
};

exports.callPerformanceReport = async (req, res) => {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        // sp_gym_performance_report returns multiple result sets
        const [results] = await db.query('CALL sp_gym_performance_report(?, ?)', [month, year]);

        // MySQL2 returns array of result sets for multi-select procedures
        // results[0] = section label, results[1] = membership, etc.
        // We flatten into a structured response
        const report = {
            month,
            year,
            membership: results[1] ? results[1][0] : null,
            revenue: results[3] || [],
            attendance: results[5] ? results[5][0] : null,
            top_members: results[7] || [],
            equipment_alerts: results[9] || []
        };
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create procedures.' });
    }
};

// ═══════════════════════════════════════════════════════════════
// FUNCTIONS — Call MySQL functions
// ═══════════════════════════════════════════════════════════════

exports.getMemberAge = async (req, res) => {
    try {
        const { id } = req.params;
        const [[row]] = await db.query('SELECT fn_member_age(?) AS age', [id]);
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSubscriptionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const [[row]] = await db.query('SELECT fn_subscription_status_label(?) AS status_label', [id]);
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMemberRevenue = async (req, res) => {
    try {
        const { id } = req.params;
        const [[row]] = await db.query('SELECT fn_total_revenue_by_member(?) AS lifetime_revenue', [id]);
        res.json(row);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// All functions for all members at once (for the table display)
exports.getAllFunctionResults = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                m.member_id,
                m.name,
                fn_member_age(m.member_id)                AS age,
                fn_subscription_status_label(m.member_id) AS subscription_status,
                fn_total_revenue_by_member(m.member_id)   AS lifetime_revenue
            FROM Member m
            ORDER BY m.member_id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create functions.' });
    }
};

// ═══════════════════════════════════════════════════════════════
// TRIGGERS — Audit Log viewer (triggers populate this automatically)
// ═══════════════════════════════════════════════════════════════

exports.getAuditLog = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const [rows] = await db.query(
            'SELECT * FROM Audit_Log ORDER BY changed_at DESC LIMIT ?',
            [limit]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message, hint: 'Run advanced_db_features.sql first to create Audit_Log table.' });
    }
};

// Trigger a test action to demonstrate triggers working
exports.triggerTestPayment = async (req, res) => {
    try {
        // Insert a test payment to trigger trg_payment_audit_log
        const [subs] = await db.query('SELECT subscription_id FROM Subscription LIMIT 1');
        if (subs.length === 0) return res.status(400).json({ message: 'No subscriptions found to test.' });

        const [result] = await db.query(
            'INSERT INTO Payment (subscription_id, amount, payment_date, payment_method) VALUES (?, 0.01, CURDATE(), ?)',
            [subs[0].subscription_id, 'Cash']
        );

        // Fetch the audit log entry the trigger created
        const [logs] = await db.query(
            'SELECT * FROM Audit_Log WHERE table_name = ? AND record_id = ? ORDER BY changed_at DESC LIMIT 1',
            ['Payment', result.insertId]
        );

        // Clean up test payment
        await db.query('DELETE FROM Payment WHERE payment_id = ?', [result.insertId]);

        res.json({
            message: 'Trigger test successful! The AFTER INSERT trigger on Payment created this audit log entry:',
            audit_entry: logs[0] || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
