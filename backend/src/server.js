const express = require("express");
const cors = require("cors");
const db = require("./database");

const http = require("http");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/*
 * ================================
 * HEALTH CHECK
 * ================================
 */

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Server Room Monitoring API is running",
        version: "1.0.0"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "online",
        service: "server-room-monitoring-backend",
        timestamp: new Date().toISOString()
    });
});

app.get("/api/settings", (req, res) => {
    try {
        const settings = db.prepare(`
            SELECT
                id,
                monitoring_enabled,
                sampling_interval,
                alarm_enabled,
                temperature_threshold,
                buzzer_enabled,
                alarm_logging,
                device_name,
                updated_at
            FROM settings
            WHERE id = 1
        `).get();

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: "Settings not found."
            });
        }

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error("Settings API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve settings."
        });
    }
});

app.put("/api/settings", (req, res) => {
    try {
        const {
            monitoring_enabled,
            sampling_interval,
            alarm_enabled,
            temperature_threshold,
            buzzer_enabled,
            alarm_logging,
            device_name
        } = req.body;

        if (
            typeof monitoring_enabled !== "boolean" ||
            typeof sampling_interval !== "number" ||
            typeof alarm_enabled !== "boolean" ||
            typeof temperature_threshold !== "number" ||
            typeof buzzer_enabled !== "boolean" ||
            typeof alarm_logging !== "boolean" ||
            typeof device_name !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid settings data."
            });
        }

        db.prepare(`
            UPDATE settings
            SET
                monitoring_enabled = ?,
                sampling_interval = ?,
                alarm_enabled = ?,
                temperature_threshold = ?,
                buzzer_enabled = ?,
                alarm_logging = ?,
                device_name = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(
            monitoring_enabled ? 1 : 0,
            sampling_interval,
            alarm_enabled ? 1 : 0,
            temperature_threshold,
            buzzer_enabled ? 1 : 0,
            alarm_logging ? 1 : 0,
            device_name
        );

        const updatedSettings = db.prepare(`
            SELECT
                id,
                monitoring_enabled,
                sampling_interval,
                alarm_enabled,
                temperature_threshold,
                buzzer_enabled,
                alarm_logging,
                device_name,
                updated_at
            FROM settings
            WHERE id = 1
        `).get();

        res.json({
            success: true,
            message: "Settings updated successfully.",
            data: updatedSettings
        });

    } catch (error) {
        console.error("Update settings API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update settings."
        });
    }
});

app.get("/api/devices", (req, res) => {
    try {

        // Jika tidak ada heartbeat selama 30 detik,
        // perangkat dianggap OFFLINE.
        db.prepare(`
            UPDATE devices
            SET status = 'OFFLINE'
            WHERE last_seen IS NULL
               OR datetime(last_seen) < datetime('now', '-30 seconds')
        `).run();


        const devices = db.prepare(`
            SELECT
                id,
                device_name,
                device_type,
                ip_address,
                wifi_signal,
                status,
                uptime_seconds,
                last_seen,
                created_at
            FROM devices
            ORDER BY id ASC
        `).all();


        res.json({
            success: true,
            count: devices.length,
            data: devices
        });


    } catch (error) {

        console.error("Devices API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve devices."
        });
    }
});

app.put("/api/devices/:id", (req, res) => {
    try {
        const deviceId = Number(req.params.id);

        const {
            ip_address,
            wifi_signal,
            status,
            uptime_seconds
        } = req.body;

        if (!Number.isInteger(deviceId) || deviceId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid device ID."
            });
        }

        if (
            typeof ip_address !== "string" ||
            typeof wifi_signal !== "number" ||
            typeof status !== "string" ||
            typeof uptime_seconds !== "number"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid device data."
            });
        }

        const device = db.prepare(`
            SELECT id
            FROM devices
            WHERE id = ?
        `).get(deviceId);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found."
            });
        }

        db.prepare(`
            UPDATE devices
            SET
                ip_address = ?,
                wifi_signal = ?,
                status = ?,
                uptime_seconds = ?,
                last_seen = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            ip_address,
            wifi_signal,
            status,
            uptime_seconds,
            deviceId
        );

        const updatedDevice = db.prepare(`
            SELECT
                id,
                device_name,
                device_type,
                ip_address,
                wifi_signal,
                status,
                uptime_seconds,
                last_seen,
                created_at
            FROM devices
            WHERE id = ?
        `).get(deviceId);

        res.json({
            success: true,
            message: "Device updated successfully.",
            data: updatedDevice
        });

    } catch (error) {
        console.error("Update device API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update device."
        });
    }
});

app.post("/api/devices/:id/heartbeat", (req, res) => {
    try {
        const deviceId = Number(req.params.id);

        const {
            ip_address,
            wifi_signal,
            uptime_seconds
        } = req.body;

        if (!Number.isInteger(deviceId) || deviceId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid device ID."
            });
        }

        if (
            typeof ip_address !== "string" ||
            typeof wifi_signal !== "number" ||
            typeof uptime_seconds !== "number"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid heartbeat data."
            });
        }

        const device = db.prepare(`
            SELECT id
            FROM devices
            WHERE id = ?
        `).get(deviceId);

        if (!device) {
            return res.status(404).json({
                success: false,
                message: "Device not found."
            });
        }

        db.prepare(`
            UPDATE devices
            SET
                ip_address = ?,
                wifi_signal = ?,
                uptime_seconds = ?,
                status = 'ONLINE',
                last_seen = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            ip_address,
            wifi_signal,
            uptime_seconds,
            deviceId
        );

        const updatedDevice = db.prepare(`
            SELECT
                id,
                device_name,
                device_type,
                ip_address,
                wifi_signal,
                status,
                uptime_seconds,
                last_seen,
                created_at
            FROM devices
            WHERE id = ?
        `).get(deviceId);

        res.json({
            success: true,
            message: "Heartbeat received successfully.",
            data: updatedDevice
        });

    } catch (error) {
        console.error("Heartbeat API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to process heartbeat."
        });
    }
});

app.get("/api/dashboard", (req, res) => {
    try {
        const latestSensor = db.prepare(`
            SELECT
                id,
                temperature,
                humidity,
                alarm_status,
                recorded_at
            FROM sensor_data
            ORDER BY id DESC
            LIMIT 1
        `).get();

        const device = db.prepare(`
            SELECT
                id,
                device_name,
                device_type,
                ip_address,
                wifi_signal,
                status,
                uptime_seconds,
                last_seen
            FROM devices
            ORDER BY id ASC
            LIMIT 1
        `).get();

        const activeAlarm = db.prepare(`
            SELECT
                id,
                temperature,
                threshold,
                status,
                started_at
            FROM alarm_logs
            WHERE status = 'ACTIVE'
            ORDER BY id DESC
            LIMIT 1
        `).get();

        const settings = db.prepare(`
            SELECT
                monitoring_enabled,
                sampling_interval,
                alarm_enabled,
                temperature_threshold,
                buzzer_enabled,
                alarm_logging,
                device_name
            FROM settings
            WHERE id = 1
        `).get();

        res.json({
            success: true,
            data: {
                sensor: latestSensor || null,
                device: device || null,
                active_alarm: activeAlarm || null,
                settings: settings || null
            }
        });

    } catch (error) {
        console.error("Dashboard API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve dashboard data."
        });
    }
});

/*
 * ================================
 * RECEIVE SENSOR DATA
 * ================================
 */

app.post("/api/sensor", (req, res) => {
    try {
        const { temperature, humidity } = req.body;

        if (
            typeof temperature !== "number" ||
            typeof humidity !== "number"
        ) {
            return res.status(400).json({
                success: false,
                message: "Temperature and humidity must be numbers."
            });
        }

        const settings = db.prepare(`
            SELECT
                alarm_enabled,
                temperature_threshold,
                alarm_logging
            FROM settings
            WHERE id = 1
        `).get();

        const threshold = settings?.temperature_threshold ?? 26.0;
        const alarmEnabled = settings?.alarm_enabled === 1;
        const alarmLogging = settings?.alarm_logging === 1;

        const alarmStatus =
            alarmEnabled && temperature > threshold
                ? "WARNING"
                : "NORMAL";

        /*
         * Save sensor data
         */
        const insertSensor = db.prepare(`
            INSERT INTO sensor_data (
                temperature,
                humidity,
                alarm_status
            )
            VALUES (?, ?, ?)
        `);

        const sensorResult = insertSensor.run(
            temperature,
            humidity,
            alarmStatus
        );

        /*
         * Alarm handling
         */

        let alarmEvent = null;

        if (alarmEnabled && alarmLogging) {
            const activeAlarm = db.prepare(`
                SELECT *
                FROM alarm_logs
                WHERE status = 'ACTIVE'
                ORDER BY id DESC
                LIMIT 1
            `).get();

            /*
             * Temperature above threshold
             */
            if (temperature > threshold && !activeAlarm) {

                const insertAlarm = db.prepare(`
                    INSERT INTO alarm_logs (
                        temperature,
                        threshold,
                        status
                    )
                    VALUES (?, ?, 'ACTIVE')
                `);

                const alarmResult = insertAlarm.run(
                    temperature,
                    threshold
                );

                alarmEvent = {
                    action: "STARTED",
                    id: alarmResult.lastInsertRowid,
                    status: "ACTIVE"
                };
            }

            /*
             * Temperature returned to normal
             */
            if (temperature <= threshold && activeAlarm) {

                const startedAt = new Date(activeAlarm.started_at);
                const resolvedAt = new Date();

                const durationSeconds = Math.max(
                    0,
                    Math.floor(
                        (resolvedAt.getTime() - startedAt.getTime()) / 1000
                    )
                );

                db.prepare(`
                    UPDATE alarm_logs
                    SET
                        status = 'RESOLVED',
                        resolved_at = CURRENT_TIMESTAMP,
                        duration_seconds = ?
                    WHERE id = ?
                `).run(
                    durationSeconds,
                    activeAlarm.id
                );

                alarmEvent = {
                    action: "RESOLVED",
                    id: activeAlarm.id,
                    status: "RESOLVED",
                    duration_seconds: durationSeconds
                };
            }
        }

        const sensorMessage = {
            type: "sensor_update",
            data: {
                id: sensorResult.lastInsertRowid,
                temperature,
                humidity,
                alarm_status: alarmStatus,
                threshold,
                alarm_event: alarmEvent
            }
        };

        wss.clients.forEach((client) => {

            if (client.readyState === WebSocket.OPEN) {

                client.send(
                    JSON.stringify(sensorMessage)
                );

            }

        });

        res.status(201).json({
            success: true,
            message: "Sensor data saved successfully.",
            data: {
                id: sensorResult.lastInsertRowid,
                temperature,
                humidity,
                alarm_status: alarmStatus,
                threshold,
                alarm_event: alarmEvent
            }
        });

    } catch (error) {
        console.error("Sensor API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to save sensor data."
        });
    }
});

/*
 * ================================
 * GET LATEST SENSOR DATA
 * ================================
 */

app.get("/api/sensor/latest", (req, res) => {
    try {
        const data = db.prepare(`
            SELECT
                id,
                temperature,
                humidity,
                alarm_status,
                recorded_at
            FROM sensor_data
            ORDER BY id DESC
            LIMIT 1
        `).get();

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "No sensor data available."
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Latest sensor API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve latest sensor data."
        });
    }
});

/*
 * ================================
 * GET SENSOR HISTORY
 * ================================
 */

app.get("/api/sensor/history", (req, res) => {
    try {
        const limit = Math.min(
            Math.max(Number(req.query.limit) || 50, 1),
            200
        );

        const totalCount =
            db.prepare(`
                SELECT COUNT(*) AS total
                FROM sensor_data
            `).get().total;

        const normalCount =
            db.prepare(`
                SELECT COUNT(*) AS total
                FROM sensor_data
                WHERE temperature <= ?
                AND humidity >= ?
                AND humidity <= ?
            `).get(
                26.0,
                40.0,
                70.0
            ).total;

        const warningCount =
            totalCount - normalCount;

        const data = db.prepare(`
            SELECT
                id,
                temperature,
                humidity,
                alarm_status,
                recorded_at
            FROM sensor_data
            ORDER BY id DESC
            LIMIT ?
        `).all(limit);

        res.json({
            success: true,
            count: data.length,
            total_count: totalCount,
            normal_count: normalCount,
            warning_count: warningCount,
            data
        });

    } catch (error) {
        console.error("Sensor history API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve sensor history."
        });
    }
});

/*
 * ================================
 * GET ALARM LOG
 * ================================
 */

app.get("/api/alarms", (req, res) => {
    try {
        const data = db.prepare(`
            SELECT
                id,
                device_id,
                temperature,
                threshold,
                status,
                started_at,
                resolved_at,
                duration_seconds
            FROM alarm_logs
            ORDER BY id DESC
            LIMIT 100
        `).all();

        res.json({
            success: true,
            count: data.length,
            data
        });

    } catch (error) {
        console.error("Alarm API error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve alarm logs."
        });
    }
});

/*
 * ================================
 * START SERVER
 * ================================
 */

const server = http.createServer(app);

const wss = new WebSocket.Server({
    server
});

wss.on("connection", (ws) => {

    console.log("WebSocket client connected.");

    ws.send(JSON.stringify({
        type: "connection",
        message: "WebSocket connected successfully."
    }));

    ws.on("close", () => {
        console.log("WebSocket client disconnected.");
    });

});

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Server Room Monitoring API running on port ${PORT}`
    );

    console.log(
        `WebSocket server running on port ${PORT}`
    );

});