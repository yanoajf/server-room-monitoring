const db = require("./database");

db.exec(`
    CREATE TABLE IF NOT EXISTS sensor_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER,
        temperature REAL NOT NULL,
        humidity REAL NOT NULL,
        alarm_status TEXT NOT NULL DEFAULT 'NORMAL',
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alarm_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER,
        temperature REAL NOT NULL,
        threshold REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        duration_seconds INTEGER
    );

    CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_name TEXT NOT NULL,
        device_type TEXT NOT NULL,
        ip_address TEXT,
        wifi_signal INTEGER,
        status TEXT NOT NULL DEFAULT 'OFFLINE',
        uptime_seconds INTEGER DEFAULT 0,
        last_seen DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        monitoring_enabled INTEGER NOT NULL DEFAULT 1,
        sampling_interval INTEGER NOT NULL DEFAULT 2,
        alarm_enabled INTEGER NOT NULL DEFAULT 1,
        temperature_threshold REAL NOT NULL DEFAULT 26.0,
        buzzer_enabled INTEGER NOT NULL DEFAULT 1,
        alarm_logging INTEGER NOT NULL DEFAULT 1,
        device_name TEXT NOT NULL DEFAULT 'Server Room Node',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

db.prepare(`
    INSERT OR IGNORE INTO settings (
        id,
        monitoring_enabled,
        sampling_interval,
        alarm_enabled,
        temperature_threshold,
        buzzer_enabled,
        alarm_logging,
        device_name
    )
    VALUES (1, 1, 2, 1, 26.0, 1, 1, 'Server Room Node')
`).run();

console.log("Database tables initialized successfully.");

db.close();