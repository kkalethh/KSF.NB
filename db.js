const Database = require('better-sqlite3');
const db = new Database('data.db');
const fs = require('fs');
const sql = fs.readFileSync('./migrations.sql', 'utf8');
db.exec(sql);
module.exports = db;