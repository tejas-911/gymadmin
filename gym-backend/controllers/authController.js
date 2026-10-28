const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { email, password, role } = req.body; // role: 'member' | 'trainer' | 'admin'

    const tableMap = {
        member:  { table: 'Member',  idCol: 'member_id' },
        trainer: { table: 'Trainer', idCol: 'trainer_id' },
        admin:   { table: 'Admin',   idCol: 'admin_id' },
    };

    if (role && !tableMap[role]) return res.status(400).json({ message: 'Invalid role' });

    // No role sent (login page auto-detects): try each table in turn
    const roles = role ? [role] : ['admin', 'trainer', 'member'];

    try {
        for (const r of roles) {
            const target = tableMap[r];
            const [rows] = await db.query(
                `SELECT * FROM ${target.table} WHERE email = ?`, [email]
            );
            const user = rows[0];
            if (!user || !user.password || !(await bcrypt.compare(password, user.password))) continue;

            const token = jwt.sign(
                { id: user[target.idCol], role: r },
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );
            return res.json({ token, role: r, name: user.name });
        }

        res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
