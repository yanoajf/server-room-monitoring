const Database = require("better-sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "../server-room-monitoring.db");

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");

console.log(`Database connected: ${databasePath}`);

module.exports = db;