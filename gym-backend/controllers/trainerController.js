const db = require('../db');

exports.getStats = async (req, res) => {
    try {
        const [[{ total }]]   = await db.query('SELECT COUNT(*) AS total FROM Trainer');
        const [[{ clients }]] = await db.query('SELECT COUNT(DISTINCT member_id) AS clients FROM Member_Workout');
        const [[{ sessions }]]= await db.query(
            "SELECT COUNT(*) AS sessions FROM Class_Schedule WHERE scheduled_date = CURDATE()"
        );
        // Team performance: ratio of active-client trainers to total, scaled
        const [[{ busy }]] = await db.query(
            'SELECT COUNT(DISTINCT trainer_id) AS busy FROM Member_Workout'
        );
        const performance = total > 0 ? Math.min(Math.round((busy / total) * 100), 99) : 0;
        res.json({ total_trainers: total, sessions_today: sessions, active_clients: clients, performance });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getAllTrainers = async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit)  || 6;
        const offset = parseInt(req.query.offset) || 0;

        const [rows] = await db.query(
            `SELECT t.*,
                    COUNT(DISTINCT mw.member_id) AS active_clients
             FROM Trainer t
             LEFT JOIN Member_Workout mw ON mw.trainer_id = t.trainer_id
             GROUP BY t.trainer_id
             ORDER BY t.trainer_id ASC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM Trainer');
        res.json({ trainers: rows, total });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getTrainerById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Trainer WHERE trainer_id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Trainer not found' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createTrainer = async (req, res) => {
    try {
        const { name, specialization, phone, salary, hire_date } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });
        const [result] = await db.query(
            'INSERT INTO Trainer (name, specialization, phone, salary, hire_date) VALUES (?, ?, ?, ?, ?)',
            [name, specialization || null, phone || null, salary || null, hire_date || null]
        );
        res.status(201).json({ id: result.insertId, message: 'Trainer created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateTrainer = async (req, res) => {
    try {
        const { name, specialization, phone, salary, hire_date } = req.body;
        await db.query(
            'UPDATE Trainer SET name=?, specialization=?, phone=?, salary=?, hire_date=? WHERE trainer_id=?',
            [name, specialization, phone, salary, hire_date, req.params.id]
        );
        res.json({ message: 'Trainer updated' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteTrainer = async (req, res) => {
    try {
        await db.query('DELETE FROM Trainer WHERE trainer_id = ?', [req.params.id]);
        res.json({ message: 'Trainer deleted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
