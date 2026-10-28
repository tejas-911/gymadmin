const db = require('../db');


function computeStatus(registered, capacity) {
    if (registered >= capacity) return 'Full';
    if (registered >= capacity * 0.9) return 'Waitlist';
    return 'Booking Open';
}

function formatTimeLabel(dateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    if (d.getTime() === today.getTime()) return 'TODAY';
    if (d.getTime() === tomorrow.getTime()) return 'TOMORROW';
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

exports.getStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [[{ classes_today }]] = await db.query(
            'SELECT COUNT(*) AS classes_today FROM Class_Schedule WHERE scheduled_date = ?', [today]
        );
        const [[{ total_bookings }]] = await db.query(
            'SELECT COALESCE(SUM(registered), 0) AS total_bookings FROM Class_Schedule WHERE scheduled_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
        );
        const [[{ avg_capacity }]] = await db.query(
            'SELECT ROUND(AVG(CASE WHEN capacity > 0 THEN (registered / capacity) * 100 ELSE 0 END), 1) AS avg_capacity FROM Class_Schedule WHERE capacity > 0'
        );
        res.json({ classes_today, total_bookings, avg_capacity: avg_capacity || 0 });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getWeekClasses = async (req, res) => {
    try {
        // weekStart = Monday of requested week (ISO date string)
        const weekStart = req.query.weekStart || new Date().toISOString().split('T')[0];
        const start = new Date(weekStart);
        // Snap to Monday
        const day = start.getDay(); // 0=Sun
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);
        const end = new Date(start); end.setDate(start.getDate() + 6);

        const [rows] = await db.query(
            `SELECT cs.*, t.name AS trainer_name, DATE_FORMAT(cs.scheduled_time,'%h:%i %p') AS time_display
             FROM Class_Schedule cs
             LEFT JOIN Trainer t ON cs.trainer_id = t.trainer_id
             WHERE cs.scheduled_date BETWEEN ? AND ?
             ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC`,
            [start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
        );

        const enriched = rows.map(r => ({
            ...r,
            status: computeStatus(r.registered, r.capacity)
        }));

        res.json({
            classes: enriched,
            week_start: start.toISOString().split('T')[0],
            week_end: end.toISOString().split('T')[0]
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getUpcoming = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const status = req.query.status || 'all';

        let query = `SELECT cs.*, t.name AS trainer_name, DATE_FORMAT(cs.scheduled_time,'%H:%i') AS time_display
                     FROM Class_Schedule cs
                     LEFT JOIN Trainer t ON cs.trainer_id = t.trainer_id
                     WHERE cs.scheduled_date >= ?
                     ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC
                     LIMIT 20`;

        const [rows] = await db.query(query, [today]);

        let enriched = rows.map(r => ({
            ...r,
            status: computeStatus(r.registered, r.capacity),
            date_label: formatTimeLabel(r.scheduled_date)
        }));

        if (status !== 'all') {
            enriched = enriched.filter(r => r.status.toLowerCase().replace(' ', '_') === status);
        }

        res.json(enriched);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getAllClasses = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT cs.*, t.name AS trainer_name, DATE_FORMAT(cs.scheduled_time,'%h:%i %p') AS time_display
             FROM Class_Schedule cs
             LEFT JOIN Trainer t ON cs.trainer_id = t.trainer_id
             ORDER BY cs.scheduled_date DESC, cs.scheduled_time ASC`
        );
        res.json(rows.map(r => ({ ...r, status: computeStatus(r.registered, r.capacity) })));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.addClass = async (req, res) => {
    try {
        const { class_name, trainer_id, scheduled_date, scheduled_time, duration_minutes, capacity, color } = req.body;
        if (!class_name || !scheduled_date || !scheduled_time) {
            return res.status(400).json({ message: 'Class name, date, and time are required' });
        }
        const [result] = await db.query(
            `INSERT INTO Class_Schedule (class_name, trainer_id, scheduled_date, scheduled_time, duration_minutes, capacity, color)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [class_name, trainer_id || null, scheduled_date, scheduled_time,
             duration_minutes || 60, capacity || 20, color || 'lime']
        );
        res.status(201).json({ id: result.insertId, message: 'Class created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { class_name, trainer_id, scheduled_date, scheduled_time, duration_minutes, capacity, registered, color } = req.body;
        await db.query(
            `UPDATE Class_Schedule SET class_name=?, trainer_id=?, scheduled_date=?, scheduled_time=?,
             duration_minutes=?, capacity=?, registered=?, color=? WHERE class_id=?`,
            [class_name, trainer_id || null, scheduled_date, scheduled_time, duration_minutes, capacity, registered, color, id]
        );
        res.json({ message: 'Class updated' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteClass = async (req, res) => {
    try {
        await db.query('DELETE FROM Class_Schedule WHERE class_id = ?', [req.params.id]);
        res.json({ message: 'Class deleted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
