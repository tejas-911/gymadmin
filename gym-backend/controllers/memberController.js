const db = require('../db');
const { isBlank, isEmail, isPhone, isDate, GENDERS } = require('../validate');

// Returns an error message for the shared member fields, or null if they are valid
const memberFieldError = ({ name, gender, phone, email, date_of_birth }) => {
    if (isBlank(name)) return 'Name is required';
    if (String(name).length > 100) return 'Name must be 100 characters or fewer';
    if (!isEmail(email)) return 'A valid email is required';
    if (!isBlank(phone) && !isPhone(phone)) return 'Phone must be 7-15 digits, spaces or dashes, optionally starting with +';
    if (!isBlank(gender) && !GENDERS.includes(gender)) return `Gender must be one of: ${GENDERS.join(', ')}`;
    if (!isBlank(date_of_birth) && (!isDate(date_of_birth) || date_of_birth > new Date().toISOString().slice(0, 10)))
        return 'Date of birth must be a valid past date (YYYY-MM-DD)';
    return null;
};

const dupEmail = (error, res) =>
    error.code === 'ER_DUP_ENTRY' && res.status(400).json({ message: 'That email is already in use' });

// Uses vw_member_dashboard VIEW + fn_member_age, fn_subscription_status_label, fn_total_revenue_by_member FUNCTIONS
exports.getAllMembers = async (req, res) => {
    try {
        // Try the enriched view first (requires advanced_db_features.sql to be run)
        try {
            const [rows] = await db.query(`
                SELECT
                    v.*,
                    fn_member_age(v.member_id)                AS age,
                    fn_subscription_status_label(v.member_id) AS subscription_status_label,
                    fn_total_revenue_by_member(v.member_id)   AS lifetime_revenue
                FROM vw_member_dashboard v
                ORDER BY v.member_id
            `);
            return res.json(rows);
        } catch (viewErr) {
            // Fallback to plain query if views/functions not yet created
            const [rows] = await db.query('SELECT * FROM Member ORDER BY member_id');
            return res.json(rows);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMemberById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM Member WHERE member_id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Member not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Uses sp_register_member STORED PROCEDURE for validated insertion
exports.createMember = async (req, res) => {
    try {
        const { name, gender, phone, email, date_of_birth } = req.body;
        const fieldError = memberFieldError(req.body);
        if (fieldError) return res.status(400).json({ message: fieldError });

        try {
            // Call stored procedure with validation
            await db.query(
                'CALL sp_register_member(?, ?, ?, ?, ?, @new_id, @msg)',
                [name, gender || 'Male', phone, email, date_of_birth || null]
            );
            const [[result]] = await db.query('SELECT @new_id AS member_id, @msg AS message');

            if (result.member_id > 0) {
                return res.status(201).json({ id: result.member_id, message: result.message });
            } else {
                return res.status(400).json({ message: result.message });
            }
        } catch (procErr) {
            // Fallback: direct insert if procedure not yet created
            const [result] = await db.query(
                'INSERT INTO Member (name, gender, phone, email, date_of_birth, join_date, status) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)',
                [name, gender || 'Male', phone || null, email, date_of_birth || null, 'Active']
            );
            return res.status(201).json({ id: result.insertId, message: 'Member created' });
        }
    } catch (error) {
        dupEmail(error, res) || res.status(500).json({ error: error.message });
    }
};

exports.updateMember = async (req, res) => {
    try {
        const { name, gender, phone, email, date_of_birth, join_date, status } = req.body;
        const fieldError = memberFieldError(req.body);
        if (fieldError) return res.status(400).json({ message: fieldError });
        if (!isBlank(join_date) && !isDate(join_date)) return res.status(400).json({ message: 'Join date must be a valid date (YYYY-MM-DD)' });
        if (!['Active', 'Inactive'].includes(status)) return res.status(400).json({ message: 'Status must be Active or Inactive' });

        const [result] = await db.query(
            'UPDATE Member SET name=?, gender=?, phone=?, email=?, date_of_birth=?, join_date=?, status=? WHERE member_id=?',
            [name, gender || 'Male', phone || null, email, date_of_birth || null, join_date || null, status, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Member not found' });
        res.json({ message: 'Member updated' });
    } catch (error) {
        dupEmail(error, res) || res.status(500).json({ error: error.message });
    }
};

exports.deleteMember = async (req, res) => {
    try {
        await db.query('DELETE FROM Member WHERE member_id = ?', [req.params.id]);
        res.json({ message: 'Member deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
