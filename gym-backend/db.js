const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gym_db',
    // Return DATE columns as 'YYYY-MM-DD' strings. As JS Dates they serialize to UTC,
    // which in IST (UTC+5:30) shows the previous day and shifts the date back on every edit.
    dateStrings: ['DATE'],
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
