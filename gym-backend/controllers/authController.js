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

    const target = tableMap[role];
    if (!target) return res.status(400).json({ message: 'Invalid role' });

    try {
        const [rows] = await db.query(
            `SELECT * FROM ${target.table} WHERE email = ?`, [email]
        );

        if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user[target.idCol], role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, role, name: user.name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
