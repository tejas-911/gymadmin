const db = require('../db');

// Uses sp_gym_performance_report STORED PROCEDURE + vw_monthly_revenue VIEW + Audit_Log (from TRIGGERS)
exports.getReports = async (req, res) => {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        let membership = null, revenue = [], attendance = null, topMembers = [], equipmentAlerts = [];

        // ── Try calling the stored procedure ──
        try {
            const [results] = await db.query('CALL sp_gym_performance_report(?, ?)', [month, year]);
            // MySQL2 returns multiple result sets as array elements
            // The procedure returns pairs: label row + data rows
            membership = results[1]?.[0] || null;
            revenue = results[3] || [];
            attendance = results[5]?.[0] || null;
            topMembers = results[7] || [];
            equipmentAlerts = results[9] || [];
        } catch (procErr) {
            // Fallback: manual queries if procedure doesn't exist
            const [[activeRow]] = await db.query("SELECT COUNT(*) as count FROM Member WHERE status='Active'");
            const [[expiredRow]] = await db.query("SELECT COUNT(*) as count FROM Subscription WHERE status='Expired' OR end_date < CURDATE()");
            const [[absentRow]] = await db.query(`
                SELECT COUNT(*) as count FROM Member m
                WHERE m.status='Active' AND m.member_id NOT IN (
                    SELECT member_id FROM Attendance WHERE DATE(check_in_time) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                )
            `);
            membership = {
                total_members: (activeRow.count || 0) + (absentRow.count || 0),
                active_members: activeRow.count || 0,
                inactive_members: 0,
                new_this_month: 0
            };
            const [eqAlerts] = await db.query("SELECT equipment_id, equipment_name, condition_status, location FROM Equipment WHERE condition_status IN ('Needs Repair', 'Out of Order')");
            equipmentAlerts = eqAlerts;
        }

        // ── Try vw_monthly_revenue VIEW ──
        let monthlyRevenue = [];
        try {
            const [rows] = await db.query('SELECT * FROM vw_monthly_revenue ORDER BY payment_month DESC LIMIT 12');
            monthlyRevenue = rows;
        } catch (viewErr) {
            const [rows] = await db.query(`
                SELECT DATE_FORMAT(payment_date, '%Y-%m') as payment_month, SUM(amount) as total_revenue, COUNT(*) as transaction_count
                FROM Payment GROUP BY payment_month ORDER BY payment_month DESC LIMIT 12
            `);
            monthlyRevenue = rows;
        }

        // ── Popular workout / trainer / supplement (always direct queries) ──
        const [popularWorkout] = await db.query(`
            SELECT w.plan_name, COUNT(m.member_id) as count
            FROM Workout_Plan w JOIN Member_Workout m ON w.workout_id = m.workout_id
            GROUP BY w.workout_id, w.plan_name ORDER BY count DESC LIMIT 1
        `);
        const [topTrainer] = await db.query(`
            SELECT t.name, COUNT(m.member_id) as count
            FROM Trainer t JOIN Member_Workout m ON t.trainer_id = m.trainer_id
            GROUP BY t.trainer_id, t.name ORDER BY count DESC LIMIT 1
        `);
        const [topSupplement] = await db.query(`
            SELECT s.name, SUM(qs.quantity) as sold
            FROM Supplement s JOIN Supplement_Sale qs ON s.supplement_id = qs.supplement_id
            GROUP BY s.supplement_id, s.name ORDER BY sold DESC LIMIT 1
        `);
        const [[absentMembers]] = await db.query(`
            SELECT COUNT(*) as count FROM Member m
            WHERE m.status='Active' AND m.member_id NOT IN (
                SELECT member_id FROM Attendance WHERE DATE(check_in_time) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            )
        `);
        const [memberGrowth] = await db.query(`
            SELECT DATE_FORMAT(join_date, '%b %Y') as month, COUNT(*) as count
            FROM Member GROUP BY month ORDER BY MIN(join_date) ASC LIMIT 6
        `);

        // ── Audit Log (populated by TRIGGERS) ──
        let auditLog = [];
        try {
            const [logs] = await db.query('SELECT * FROM Audit_Log ORDER BY changed_at DESC LIMIT 20');
            auditLog = logs;
        } catch (e) { /* table not yet created */ }

        // ── Equipment Health VIEW ──
        let equipmentHealth = [];
        try {
            const [rows] = await db.query('SELECT * FROM vw_equipment_health ORDER BY maintenance_flag DESC');
            equipmentHealth = rows;
        } catch (e) { /* view not yet created */ }

        res.json({
            report_month: month,
            report_year: year,
            membership,
            revenue,
            attendance,
            topMembers,
            equipmentAlerts,
            monthlyRevenue,
            popularWorkout: popularWorkout[0] || null,
            topTrainer: topTrainer[0] || null,
            topSupplement: topSupplement[0] || null,
            absentMembers: absentMembers?.count || 0,
            memberGrowth,
            auditLog,
            equipmentHealth
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Renew subscription using sp_renew_subscription STORED PROCEDURE
exports.renewSubscription = async (req, res) => {
    try {
        const { member_id, plan_id, payment_method } = req.body;
        try {
            await db.query('CALL sp_renew_subscription(?, ?, ?, @sub_id, @msg)', [member_id, plan_id, payment_method]);
            const [[result]] = await db.query('SELECT @sub_id AS subscription_id, @msg AS message');
            const status = result.subscription_id > 0 ? 201 : 400;
            res.status(status).json(result);
        } catch (procErr) {
            res.status(500).json({ error: procErr.message, hint: 'Run advanced_db_features.sql to create stored procedures.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
