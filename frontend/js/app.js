/* =========================================
   SERVER ROOM MONITORING
   FRONTEND JAVASCRIPT
========================================= */

/* =========================================
   BACKEND API
========================================= */

const API_BASE_URL =
    "/api";


async function apiRequest(
    endpoint,
    options = {}
) {
    try {

        const response =
            await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    headers: {
                        "Content-Type":
                            "application/json",
                        ...(options.headers || {})
                    },
                    ...options
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "API request failed."
            );
        }


        return result;

    } catch (error) {

        console.error(
            `API Error [${endpoint}]:`,
            error
        );

        throw error;
    }
}

/* =========================================
   WEBSOCKET REAL-TIME
========================================= */

let socket = null;

function connectWebSocket() {

    const wsProtocol =
        window.location.protocol === "https:"
            ? "wss:"
            : "ws:";

    const wsUrl =
        `${wsProtocol}//${window.location.host}/ws`;

    console.log(
        "Menghubungkan WebSocket:",
        wsUrl
    );

    socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => {

        console.log(
            "WebSocket connected."
        );

    });

    socket.addEventListener("message", (event) => {

        try {

            const message =
                JSON.parse(event.data);

            console.log(
                "WebSocket message:",
                message
            );


            /* ==========================
            SENSOR UPDATE
            ========================== */

            if (
                 
                message.data
            ) {

                const data = message.data;


                /* ==========================
                UPDATE SENSOR DATA
                ========================== */

                sensorData.temperature =
                    data.temperature;

                sensorData.humidity =
                    data.humidity;


                /* ==========================
                UPDATE DISPLAY
                ========================== */

                updateSensorDisplay();

                updateMonitoringDisplay();

                updateAlarmStatus();

                updateLastUpdate();


                /* ==========================
                UPDATE CHART
                ========================== */

                const time =
                    new Date().toLocaleTimeString(
                        "id-ID",
                        {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                        }
                    );

                temperatureLabels.push(time);

                temperatureData.push(
                    data.temperature
                );

                humidityLabels.push(time);

                humidityData.push(
                    data.humidity
                );


                /* ==========================
                BATASI DATA CHART
                ========================== */

                if (
                    temperatureLabels.length >
                    CONFIG.maxDataPoints
                ) {

                    temperatureLabels.shift();
                    temperatureData.shift();

                }


                if (
                    humidityLabels.length >
                    CONFIG.maxDataPoints
                ) {

                    humidityLabels.shift();
                    humidityData.shift();

                }


                /* ==========================
                REFRESH CHART
                ========================== */

                if (temperatureChart) {

                    temperatureChart.update();

                }


                if (humidityChart) {

                    humidityChart.update();

                }

            }

        } catch (error) {

            console.error(
                "WebSocket message error:",
                error
            );

        }

    });

    socket.addEventListener("close", () => {

        console.log(
            "WebSocket disconnected. Reconnecting..."
        );

        setTimeout(
            connectWebSocket,
            3000
        );

    });

    socket.addEventListener("error", (error) => {

        console.error(
            "WebSocket error:",
            error
        );

    });
}

/* =========================================
   LOAD DASHBOARD DATA
========================================= */

async function loadDashboardData() {

    try {

        const result =
            await apiRequest("/dashboard");

        console.log(
            "Dashboard API:",
            result
        );

        if (!result.success) {
            throw new Error(
                "Dashboard data tidak tersedia."
            );
        }

        const data = result.data;

        if (data.sensor) {
            sensorData.temperature = data.sensor.temperature;
            sensorData.humidity = data.sensor.humidity;

            if (data.sensor) {
                const time = new Date(
                    data.sensor.recorded_at
                ).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                });

                temperatureLabels.push(time);
                temperatureData.push(
                    data.sensor.temperature
                );

                humidityLabels.push(time);
                humidityData.push(
                    data.sensor.humidity
                );

                if (
                    temperatureLabels.length >
                    CONFIG.maxDataPoints
                ) {
                    temperatureLabels.shift();
                    temperatureData.shift();
                }

                if (
                    humidityLabels.length >
                    CONFIG.maxDataPoints
                ) {
                    humidityLabels.shift();
                    humidityData.shift();
                }

                if (temperatureChart) {
                    temperatureChart.update();
                }

                if (humidityChart) {
                    humidityChart.update();
                }
            }
        }

        if (data.settings) {
            CONFIG.temperatureLimit =
                data.settings.temperature_threshold;

            CONFIG.updateInterval =
                data.settings.sampling_interval * 1000;
        }

        return data;

    } catch (error) {

        console.error(
            "Gagal mengambil dashboard data:",
            error
        );

        return null;
    }
}

/* =========================================
   KONFIGURASI
========================================= */

const CONFIG = {
    temperatureLimit: 26.0,

    humidityMin: 40.0,
    humidityMax: 70.0,

    maxDataPoints: 30,

    updateInterval: 2000
};


/* =========================================
   DATA SENSOR
========================================= */

let sensorData = {
    temperature: 25.4,
    humidity: 58.2
};


/* =========================================
   DATA GRAFIK
========================================= */

const temperatureLabels = [];
const temperatureData = [];

const humidityLabels = [];
const humidityData = [];


/* =========================================
   DATA HISTORY
========================================= */

const historyData = [];


/* =========================================
   DATA ALARM
========================================= */

const alarmData = [];

let previousAlarmState = false;


/* =========================================
   ELEMENT HTML
========================================= */

const temperatureElement =
    document.getElementById("temperature");

const humidityElement =
    document.getElementById("humidity");

const lastUpdateElement =
    document.getElementById("lastUpdate");

const footerYearElement =
    document.getElementById("footerYear");


/* =========================================
   JAM REAL-TIME
========================================= */


/* =========================================
   LAST UPDATE
========================================= */

function updateLastUpdate() {

    if (!lastUpdateElement) {
        return;
    }

    lastUpdateElement.textContent =
        getCurrentTime();
}


/* =========================================
   FOOTER YEAR
========================================= */

function updateFooterYear() {

    if (footerYearElement) {

        footerYearElement.textContent =
            new Date().getFullYear();

    }
}


/* =========================================
   WAKTU SEKARANG
========================================= */

function getCurrentTime() {

    const now = new Date();

    const hours =
        String(now.getHours()).padStart(2, "0");

    const minutes =
        String(now.getMinutes()).padStart(2, "0");

    const seconds =
        String(now.getSeconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}


/* =========================================
   SIMULASI TEMPERATURE
========================================= */


/* =========================================
   SIMULASI HUMIDITY
========================================= */


/* =========================================
   UPDATE SENSOR DISPLAY
========================================= */

function updateSensorDisplay() {

    if (temperatureElement) {

        temperatureElement.textContent =
            sensorData.temperature.toFixed(1);

    }

    if (humidityElement) {

        humidityElement.textContent =
            sensorData.humidity.toFixed(1);

    }
}

function updateMonitoringDisplay() {

    const temperature =
        Number(sensorData.temperature);

    const humidity =
        Number(sensorData.humidity);


    /* ==========================
       TEMPERATURE
    ========================== */

    const temperatureValue =
        document.querySelector(
            "#monitoringTemperatureValue"
        );

    if (temperatureValue) {

        temperatureValue.textContent =
            temperature.toFixed(1);
    }


    const tableTemperature =
        document.querySelector(
            "#monitoringTableTemperature"
        );

    if (tableTemperature) {

        tableTemperature.textContent =
            `${temperature.toFixed(1)} °C`;
    }


    /* ==========================
       HUMIDITY
    ========================== */

    const humidityValue =
        document.querySelector(
            "#monitoringHumidityValue"
        );

    if (humidityValue) {

        humidityValue.textContent =
            humidity.toFixed(1);
    }


    const tableHumidity =
        document.querySelector(
            "#monitoringTableHumidity"
        );

    if (tableHumidity) {

        tableHumidity.textContent =
            `${humidity.toFixed(1)} %`;
    }

}

function updateMonitoringStatus() {

    const temperature =
        Number(sensorData.temperature);

    const humidity =
        Number(sensorData.humidity);


    /* ==========================
       TEMPERATURE STATUS
    ========================== */

    const temperatureStatus =
        document.querySelector(
            "#monitoringTemperatureStatus"
        );

    if (temperatureStatus) {

        const normal =
            temperature <=
            CONFIG.temperatureLimit;

        temperatureStatus.className =
            normal
                ? "monitoring-status normal-status"
                : "monitoring-status warning-status";

        temperatureStatus.innerHTML =
            normal
                ? "<span>●</span> NORMAL"
                : "<span>●</span> WARNING";
    }


    /* ==========================
       HUMIDITY STATUS
    ========================== */

    const humidityStatus =
        document.querySelector(
            "#monitoringHumidityStatus"
        );

    if (humidityStatus) {

        const normal =
            humidity >= CONFIG.humidityMin &&
            humidity <= CONFIG.humidityMax;

        humidityStatus.className =
            normal
                ? "monitoring-status normal-status"
                : "monitoring-status warning-status";

        humidityStatus.innerHTML =
            normal
                ? "<span>●</span> NORMAL"
                : "<span>●</span> WARNING";
    }

    /* ==========================
       BUZZER STATUS
    ========================== */

    const buzzerStatus =
        document.querySelector(
            "#monitoringBuzzerStatus"
        );

    if (buzzerStatus) {

        const buzzerOn =
            temperature >
            CONFIG.temperatureLimit;

        buzzerStatus.className =
            buzzerOn
                ? "monitoring-status warning-status"
                : "monitoring-status normal-status";

        buzzerStatus.innerHTML =
            buzzerOn
                ? "<span>●</span> BUZZER ON"
                : "<span>●</span> BUZZER OFF";
    }
}

/* =========================================
   UPDATE ALARM STATUS
========================================= */

function updateAlarmStatus() {

    const alarmAktif =
        sensorData.temperature >
        CONFIG.temperatureLimit;


    const alarmStatus =
        document.querySelector(".alarm-status");


    const alarmFooter =
        document
            .querySelector(".sensor-icon.alarm")
            ?.parentElement
            ?.parentElement
            ?.querySelector(".sensor-footer");


    const statusBanner =
        document.querySelector(".status-banner");


    const statusIcon =
        document.querySelector(".status-icon");


    const statusTitle =
        document.querySelector(
            ".status-banner strong"
        );


    const statusDescription =
        document.querySelector(
            ".status-banner p"
        );


    /* =====================================
       ALARM AKTIF
    ===================================== */

    if (alarmAktif) {

        if (alarmStatus) {

            alarmStatus.textContent =
                "WARNING";

            alarmStatus.style.color =
                "#dc2626";
        }


        if (statusTitle) {

            statusTitle.textContent =
                "Peringatan Suhu Ruangan";
        }


        if (statusDescription) {

            statusDescription.textContent =
                "Suhu ruangan melebihi batas yang ditentukan.";
        }


        if (statusIcon) {

            statusIcon.textContent =
                "!";

            statusIcon.style.background =
                "#fee2e2";

            statusIcon.style.color =
                "#dc2626";
        }


        if (statusBanner) {

            statusBanner.style.borderLeftColor =
                "#dc2626";
        }


        if (alarmFooter) {

            const statusText =
                alarmFooter.querySelector(
                    ".normal"
                );

            if (statusText) {

                statusText.textContent =
                    "● BUZZER ON";

                statusText.style.color =
                    "#dc2626";
            }
        }

    }


    /* =====================================
       NORMAL
    ===================================== */

    else {

        if (alarmStatus) {

            alarmStatus.textContent =
                "NORMAL";

            alarmStatus.style.color =
                "#16a34a";
        }


        if (statusTitle) {

            statusTitle.textContent =
                "Ruangan Dalam Kondisi Aman";
        }


        if (statusDescription) {

            statusDescription.textContent =
                "Semua parameter berada dalam batas normal.";
        }


        if (statusIcon) {

            statusIcon.textContent =
                "✓";

            statusIcon.style.background =
                "#dcfce7";

            statusIcon.style.color =
                "#16a34a";
        }


        if (statusBanner) {

            statusBanner.style.borderLeftColor =
                "#22c55e";
        }


        if (alarmFooter) {

            const statusText =
                alarmFooter.querySelector(
                    ".normal"
                );

            if (statusText) {

                statusText.textContent =
                    "● BUZZER OFF";

                statusText.style.color =
                    "#16a34a";
            }
        }
    }


    /* =====================================
       CATAT PERUBAHAN ALARM
    ===================================== */

    if (
        alarmAktif &&
        !previousAlarmState
    ) {

        addAlarmLog();
    }


    previousAlarmState =
        alarmAktif;
}


/* =========================================
   CONFIG CHART
========================================= */

const chartOptions = {

    responsive: true,

    maintainAspectRatio: false,

    animation: false,

    interaction: {

        intersect: false,

        mode: "index"
    },

    plugins: {

        legend: {

            display: false
        }
    },

    scales: {

        x: {

            grid: {

                display: false
            },

            ticks: {

                maxTicksLimit: 8,

                font: {

                    size: 10
                }
            }
        },

        y: {

            beginAtZero: false,

            ticks: {

                font: {

                    size: 10
                }
            }
        }
    }
};


/* =========================================
   TEMPERATURE CHART
========================================= */

const temperatureChartContext =
    document
        .getElementById("temperatureChart")
        ?.getContext("2d");


let temperatureChart = null;

let monitoringTemperatureChart = null;

const monitoringTemperatureChartContext =
    document
        .getElementById("monitoringTemperatureChart")
        ?.getContext("2d");


if (monitoringTemperatureChartContext) {

    monitoringTemperatureChart =
        new Chart(
            monitoringTemperatureChartContext,
            {

                type: "line",

                data: {

                    labels:
                        temperatureLabels,

                    datasets: [

                        {

                            label:
                                "Temperature",

                            data:
                                temperatureData,

                            borderWidth: 2,

                            pointRadius: 2,

                            pointHoverRadius: 5,

                            tension: 0.35,

                            fill: false
                        }
                    ]
                },

                options: {

                    ...chartOptions,

                    scales: {

                        ...chartOptions.scales,

                        y: {

                            ...chartOptions.scales.y,

                            title: {

                                display: true,

                                text: "°C"
                            }
                        }
                    }
                }
            }
        );
}


if (temperatureChartContext) {

    temperatureChart =
        new Chart(
            temperatureChartContext,
            {

                type: "line",

                data: {

                    labels:
                        temperatureLabels,

                    datasets: [

                        {

                            label:
                                "Temperature",

                            data:
                                temperatureData,

                            borderWidth: 2,

                            pointRadius: 2,

                            pointHoverRadius: 5,

                            tension: 0.35,

                            fill: false
                        }
                    ]
                },

                options: {

                    ...chartOptions,

                    scales: {

                        ...chartOptions.scales,

                        y: {

                            ...chartOptions.scales.y,

                            title: {

                                display: true,

                                text: "°C"
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================
   HUMIDITY CHART
========================================= */

const humidityChartContext =
    document
        .getElementById("humidityChart")
        ?.getContext("2d");


let humidityChart = null;

let monitoringHumidityChart = null;

const monitoringHumidityChartContext =
    document
        .getElementById("monitoringHumidityChart")
        ?.getContext("2d");


if (monitoringHumidityChartContext) {

    monitoringHumidityChart =
        new Chart(
            monitoringHumidityChartContext,
            {

                type: "line",

                data: {

                    labels:
                        humidityLabels,

                    datasets: [

                        {

                            label:
                                "Humidity",

                            data:
                                humidityData,

                            borderWidth: 2,

                            pointRadius: 2,

                            pointHoverRadius: 5,

                            tension: 0.35,

                            fill: false
                        }
                    ]
                },

                options: {

                    ...chartOptions,

                    scales: {

                        ...chartOptions.scales,

                        y: {

                            ...chartOptions.scales.y,

                            min: 35,

                            max: 75,

                            title: {

                                display: true,

                                text: "%"
                            }
                        }
                    }
                }
            }
        );
}


if (humidityChartContext) {

    humidityChart =
        new Chart(
            humidityChartContext,
            {

                type: "line",

                data: {

                    labels:
                        humidityLabels,

                    datasets: [

                        {

                            label:
                                "Humidity",

                            data:
                                humidityData,

                            borderWidth: 2,

                            pointRadius: 2,

                            pointHoverRadius: 5,

                            tension: 0.35,

                            fill: false
                        }
                    ]
                },

                options: {

                    ...chartOptions,

                    scales: {

                        ...chartOptions.scales,

                        y: {

                            ...chartOptions.scales.y,

                            min: 35,

                            max: 75,

                            title: {

                                display: true,

                                text: "%"
                            }
                        }
                    }
                }
            }
        );
}


/* =========================================
   UPDATE GRAFIK
========================================= */

function updateCharts() {

    const time =
        getCurrentTime();


    temperatureLabels.push(time);

    temperatureData.push(
        sensorData.temperature
    );


    humidityLabels.push(time);

    humidityData.push(
        sensorData.humidity
    );


    if (
        temperatureLabels.length >
        CONFIG.maxDataPoints
    ) {

        temperatureLabels.shift();

        temperatureData.shift();
    }


    if (
        humidityLabels.length >
        CONFIG.maxDataPoints
    ) {

        humidityLabels.shift();

        humidityData.shift();
    }


    if (temperatureChart) {

        temperatureChart.update();
    }


    if (humidityChart) {

        humidityChart.update();
    }

    if (monitoringTemperatureChart) {

        monitoringTemperatureChart.update();

    }


    if (monitoringHumidityChart) {

        monitoringHumidityChart.update();

    }
}


/* =========================================
   HISTORY
========================================= */

function addHistoryData() {

    const time =
        getCurrentTime();


    const alarmAktif =
        sensorData.temperature >
        CONFIG.temperatureLimit;


    historyData.unshift({

        time: time,

        temperature:
            sensorData.temperature,

        humidity:
            sensorData.humidity,

        status:
            alarmAktif
                ? "WARNING"
                : "NORMAL"
    });


    if (historyData.length > 50) {

        historyData.pop();
    }


    const filter =
        document.getElementById("historyFilter");

    renderHistoryTable(
        filter
            ? filter.value
            : "all"
    );
}


/* =========================================
   RENDER HISTORY TABLE
========================================= */

async function renderHistoryTable(filterStatus = "all") {

    const tableBody =
        document.querySelector("#historyTableBody");

    if (!tableBody) {
        return;
    }

    try {

        const result =
            await apiRequest("/sensor/history?limit=50");

        if (!result.success) {
            throw new Error(
                "Data history tidak tersedia."
            );
        }

        let data = result.data;

        if (filterStatus === "normal") {

            data = data.filter(item => {

                const temperatureNormal =
                    Number(item.temperature) <=
                    CONFIG.temperatureLimit;

                const humidityNormal =
                    Number(item.humidity) >=
                    CONFIG.humidityMin &&
                    Number(item.humidity) <=
                    CONFIG.humidityMax;

                return temperatureNormal && humidityNormal;
            });

        }

        if (filterStatus === "warning") {

            data = data.filter(item => {

                const temperatureWarning =
                    Number(item.temperature) >
                    CONFIG.temperatureLimit;

                const humidityWarning =
                    Number(item.humidity) <
                    CONFIG.humidityMin ||
                    Number(item.humidity) >
                    CONFIG.humidityMax;

                return temperatureWarning || humidityWarning;
            });

        }

        tableBody.innerHTML = "";

        const totalData =
            result.total_count;

        const normalData =
            result.normal_count;

        const warningData =
            result.warning_count;

        const lastReading =
            data.length > 0
                ? new Date(
                    data[0].recorded_at.replace(" ", "T") + "Z"
                ).toLocaleTimeString("id-ID", {
                    timeZone: "Asia/Makassar",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                })
                : "--:--:--";

        const historyTotalElement =
            document.getElementById(
                "historyTotalData"
            );

        const historyNormalElement =
            document.getElementById(
                "historyNormalData"
            );

        const historyWarningElement =
            document.getElementById(
                "historyWarningData"
            );

        const historyLastElement =
            document.getElementById(
                "historyLastReading"
            );

        const historyRecordInfo =
            document.getElementById(
                "historyRecordInfo"
            );

        if (historyTotalElement) {
            historyTotalElement.textContent =
                totalData;
        }

        if (historyNormalElement) {
            historyNormalElement.textContent =
                normalData;
        }

        if (historyWarningElement) {
            historyWarningElement.textContent =
                warningData;
        }

        if (historyLastElement) {
            historyLastElement.textContent =
                lastReading;
        }

        if (historyRecordInfo) {
            historyRecordInfo.textContent =
                `${data.length} records`;
        }

        if (data.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        Belum ada data monitoring.
                    </td>
                </tr>
            `;

            return;
        }

        data.forEach((item) => {

            const row =
                document.createElement("tr");

            const recordedAt =
                new Date(
                    item.recorded_at.replace(" ", "T") + "Z"
                ).toLocaleString("id-ID", {
                    timeZone: "Asia/Makassar"
                });

            const temperatureStatus =
                Number(item.temperature) <= CONFIG.temperatureLimit
                    ? "NORMAL"
                    : "WARNING";

            const humidityStatus =
                Number(item.humidity) >= CONFIG.humidityMin &&
                Number(item.humidity) <= CONFIG.humidityMax
                    ? "NORMAL"
                    : "WARNING";

            const overallStatus =
                temperatureStatus === "WARNING" ||
                humidityStatus === "WARNING"
                    ? "WARNING"
                    : "NORMAL";

            row.innerHTML = `
                <td>${item.id}</td>
                <td>${recordedAt}</td>
                <td>${item.temperature.toFixed(1)} °C</td>
                <td>${item.humidity.toFixed(1)} %</td>

                <td>
                    <span class="status-badge ${
                        temperatureStatus === "WARNING"
                            ? "warning"
                            : "normal"
                    }">
                        ${temperatureStatus}
                    </span>
                </td>

                <td>
                    <span class="status-badge ${
                        humidityStatus === "WARNING"
                            ? "warning"
                            : "normal"
                    }">
                        ${humidityStatus}
                    </span>
                </td>

                <td>
                    <span class="status-badge ${
                        overallStatus === "WARNING"
                            ? "warning"
                            : "normal"
                    }">
                        ${overallStatus}
                    </span>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {

        console.error(
            "Gagal mengambil history:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Gagal mengambil data history.
                </td>
            </tr>
        `;
    }
}

/* =========================================
   HISTORY FILTER
========================================= */

function initializeHistoryFilter() {

    const filter =
        document.getElementById("historyFilter");

    const clearButton =
        document.getElementById("clearHistory");

    if (filter) {

        filter.addEventListener("change", () => {

            renderHistoryTable(
                filter.value
            );

        });

    }

    if (clearButton) {

        clearButton.addEventListener("click", () => {

            if (filter) {
                filter.value = "all";
            }

            renderHistoryTable("all");

        });

    }

}

/* =========================================
   ALARM LOG
========================================= */

function addAlarmLog() {

    const time =
        getCurrentTime();


    alarmData.unshift({

        time: time,

        temperature:
            sensorData.temperature,

        status: "WARNING",

        description:
            `Suhu ruangan melebihi batas ${CONFIG.temperatureLimit.toFixed(1)} °C.`
    });


    if (alarmData.length > 50) {

        alarmData.pop();
    }


    renderAlarmTable();
}


/* =========================================
   RENDER ALARM TABLE
========================================= */

async function renderAlarmTable(filterStatus = "all") {
    console.log("renderAlarmTable() dipanggil");

    const tableBody =
        document.querySelector("#alarmTableBody");

    if (!tableBody) {
        return;
    }

    try {

        const result =
            await apiRequest("/alarms");
            
            console.log("Alarm API:", result);

        if (!result.success) {
            throw new Error(
                "Data alarm tidak tersedia."
            );
        }

        let data = result.data;

        if (filterStatus === "active") {

            data = data.filter(
                (item) =>
                    item.status === "ACTIVE"
            );

        }

        if (filterStatus === "resolved") {

            data = data.filter(
                (item) =>
                    item.status === "RESOLVED"
            );

        }

        tableBody.innerHTML = "";

        const recordInfo =
            document.querySelector("#alarmRecordInfo");

        if (recordInfo) {
            recordInfo.textContent =
                `${data.length} events`;
        }

        if (data.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        Belum ada riwayat alarm.
                    </td>
                </tr>
            `;

            const recordInfo =
                document.querySelector("#alarmRecordInfo");

            if (recordInfo) {
                recordInfo.textContent = "0 events";
            }

            return;
        }

        data.forEach((item) => {

            const row =
                document.createElement("tr");

            const startedDate =
                item.started_at
                    ? new Date(
                        item.started_at.replace(" ", "T") + "Z"
                    )
                    : null;

            const resolvedDate =
                item.resolved_at
                    ? new Date(
                        item.resolved_at.replace(" ", "T") + "Z"
                    )
                    : null;

            const dateText =
                startedDate
                    ? startedDate.toLocaleDateString(
                        "id-ID",
                        {
                            timeZone: "Asia/Makassar"
                        }
                    )
                    : "-";

            const timeText =
                startedDate
                    ? startedDate.toLocaleTimeString(
                        "id-ID",
                        {
                            timeZone: "Asia/Makassar",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                        }
                    )
                    : "-";

            const resolvedText =
                resolvedDate
                    ? resolvedDate.toLocaleTimeString(
                        "id-ID",
                        {
                            timeZone: "Asia/Makassar",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                        }
                    )
                    : "-";

            const duration =
                item.duration_seconds !== null &&
                item.duration_seconds !== undefined
                    ? `${item.duration_seconds} detik`
                    : "-";

            const statusClass =
                item.status === "ACTIVE"
                    ? "warning"
                    : "normal";

            row.innerHTML = `
                <td>${item.id}</td>

                <td>${dateText}</td>

                <td>${timeText}</td>

                <td>
                    ${Number(item.temperature).toFixed(1)} °C
                </td>

                <td>
                    ${Number(item.threshold).toFixed(1)} °C
                </td>

                <td>${duration}</td>

                <td>
                    <span class="status-badge ${statusClass}">
                        ${item.status}
                    </span>
                </td>

                <td>Server Room Node</td>
            `;

            tableBody.appendChild(row);

        });

    } catch (error) {

        console.error(
            "Gagal mengambil alarm:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    Gagal mengambil data alarm.
                </td>
            </tr>
        `;
    }
}

/* =========================================
   ALARM FILTER
========================================= */

function initializeAlarmFilter() {

    const filter =
        document.getElementById("alarmFilter");

    const clearButton =
        document.getElementById("clearAlarmLog");

    if (filter) {

        filter.addEventListener(
            "change",
            () => {

                renderAlarmTable(
                    filter.value
                );

            }
        );

    }

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => {

                if (filter) {
                    filter.value = "all";
                }

                renderAlarmTable("all");

            }
        );

    }

}

async function updateAlarmSummary() {

    try {

        const alarmResult =
            await apiRequest("/alarms");

        const dashboardResult =
            await apiRequest("/dashboard");

        if (
            !alarmResult.success ||
            !dashboardResult.success
        ) {
            throw new Error(
                "Data alarm tidak tersedia."
            );
        }

        const alarms =
            alarmResult.data;

        const dashboard =
            dashboardResult.data;

        /* ==========================
           TOTAL ALARM
        ========================== */

        const totalCount =
            alarms.length;

        const totalElement =
            document.querySelector(
                "#alarmTotalCount"
            );

        if (totalElement) {
            totalElement.textContent =
                totalCount;
        }


        /* ==========================
           ACTIVE ALARM
        ========================== */

        const activeCount =
            alarms.filter(
                (alarm) =>
                    alarm.status === "ACTIVE"
            ).length;

        const activeElement =
            document.querySelector(
                "#alarmActiveCount"
            );

        if (activeElement) {
            activeElement.textContent =
                activeCount;
        }


        /* ==========================
           LAST ALARM
        ========================== */

        const lastAlarm =
            alarms.length > 0
                ? alarms[0]
                : null;

        const lastElement =
            document.querySelector(
                "#alarmLastTime"
            );

        if (lastElement && lastAlarm) {

            const lastTime =
                new Date(
                    lastAlarm.started_at.replace(
                        " ",
                        "T"
                    ) + "Z"
                );

            lastElement.textContent =
                lastTime.toLocaleTimeString(
                    "id-ID",
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    }
                );

        }


        /* ==========================
           HIGHEST TEMPERATURE
        ========================== */

        const highestTemperature =
            alarms.length > 0
                ? Math.max(
                    ...alarms.map(
                        (alarm) =>
                            Number(
                                alarm.temperature
                            )
                    )
                )
                : null;

        const highestElement =
            document.querySelector(
                "#alarmHighestTemperature"
            );

        if (
            highestElement &&
            highestTemperature !== null
        ) {

            highestElement.textContent =
                `${highestTemperature.toFixed(1)} °C`;
        }


        /* ==========================
           CURRENT ALARM
        ========================== */

        const sensor =
            dashboard.sensor;

        const settings =
            dashboard.settings;

        if (sensor) {

            const temperature =
                Number(
                    sensor.temperature
                );

            const threshold =
                Number(
                    settings?.temperature_threshold ??
                    26.0
                );

            const alarmActive =
                temperature > threshold;


            /* Temperature */

            const temperatureElement =
                document.querySelector(
                    "#currentAlarmTemperature"
                );

            if (temperatureElement) {

                temperatureElement.textContent =
                    `${temperature.toFixed(1)} °C`;
            }


            /* Threshold */

            const thresholdElement =
                document.querySelector(
                    "#currentAlarmStatus"
                );

            if (thresholdElement) {

                thresholdElement.textContent =
                    alarmActive
                        ? "WARNING"
                        : "NORMAL";
            }


            /* Description */

            const descriptionElement =
                document.querySelector(
                    "#currentAlarmDescription"
                );

            if (descriptionElement) {

                descriptionElement.textContent =
                    alarmActive
                        ? "Temperatur server room melewati threshold."
                        : "Tidak terdapat kondisi alarm aktif pada server room.";
            }


            /* Buzzer */

            const buzzerElement =
                document.querySelector(
                    "#currentAlarmBuzzer"
                );

            if (buzzerElement) {

                buzzerElement.textContent =
                    alarmActive
                        ? "ON"
                        : "OFF";
            }

        }

    } catch (error) {

        console.error(
            "Gagal mengambil alarm summary:",
            error
        );

    }
}


/* =========================================
   UPDATE DEVICE INFORMATION
========================================= */

async function updateDeviceInformation() {

    try {

        const result =
            await apiRequest("/devices");

        if (!result.success || !result.data.length) {
            console.error("Data device tidak tersedia.");
            return;
        }

        const device = result.data[0];

        console.log("Device API:", device);

        // ==========================
        // DEVICE ONLINE STATUS
        // ==========================

        const liveStatus =
            document.getElementById("deviceLiveStatus");

        console.log("Status device dari API:", device.status);
        console.log("Elemen deviceLiveStatus:", liveStatus);

        const dashboardDeviceStatus =
            document.getElementById("dashboardDeviceStatus");

        const dashboardDeviceConnection =
            document.getElementById("dashboardDeviceConnection");

        const dashboardDeviceUptime =
            document.getElementById("dashboardDeviceUptime");
        
        const monitoringDeviceStatus =
            document.getElementById("monitoringDeviceStatus");

        const monitoringDeviceConnection =
            document.getElementById("monitoringDeviceConnection");

        const monitoringTableDeviceStatus =
            document.getElementById("monitoringTableDeviceStatus");

        const monitoringTableDeviceConnection =
            document.getElementById("monitoringTableDeviceConnection");

        const monitoringTableDeviceBadge =
            document.getElementById("monitoringTableDeviceBadge");

        const dashboardSystemDeviceCircle =
            document.getElementById("dashboardSystemDeviceCircle");

        const dashboardSystemDeviceStatus =
            document.getElementById("dashboardSystemDeviceStatus");

        const isDeviceOnline =
            device.status === "ONLINE";

        if (dashboardSystemDeviceCircle) {

            dashboardSystemDeviceCircle.className =
                isDeviceOnline
                    ? "status-circle"
                    : "status-circle offline";
        }

        if (dashboardSystemDeviceStatus) {

            dashboardSystemDeviceStatus.className =
                isDeviceOnline
                    ? "green"
                    : "red";

            dashboardSystemDeviceStatus.textContent =
                isDeviceOnline
                    ? "Connected"
                    : "Disconnected";
        }

        if (monitoringDeviceStatus) {

            const isOnline =
                device.status === "ONLINE";

            monitoringDeviceStatus.className =
                isOnline
                    ? "monitoring-text-value device-online"
                    : "monitoring-text-value device-offline";

            monitoringDeviceStatus.textContent =
                isOnline
                    ? "ONLINE"
                    : "OFFLINE";
        }

        if (monitoringDeviceConnection) {

            const isOnline =
                device.status === "ONLINE";

            monitoringDeviceConnection.className =
                isOnline
                    ? "monitoring-status normal-status"
                    : "monitoring-status warning-status";

            monitoringDeviceConnection.innerHTML =
                isOnline
                    ? "<span>●</span> Wi-Fi CONNECTED"
                    : "<span>●</span> Wi-Fi DISCONNECTED";
        }

        if (monitoringTableDeviceStatus) {

            monitoringTableDeviceStatus.textContent =
                device.status === "ONLINE"
                    ? "ONLINE"
                    : "OFFLINE";
        }

        if (monitoringTableDeviceConnection) {

            monitoringTableDeviceConnection.textContent =
                device.status === "ONLINE"
                    ? "Connected"
                    : "Disconnected";
        }

        if (monitoringTableDeviceBadge) {

            const isOnline =
                device.status === "ONLINE";

            monitoringTableDeviceBadge.className =
                isOnline
                    ? "table-status normal"
                    : "table-status warning";

            monitoringTableDeviceBadge.textContent =
                isOnline
                    ? "● Connected"
                    : "● Disconnected";
        }

        const monitoringSystemDeviceIcon =
            document.getElementById(
                "monitoringSystemDeviceIcon"
            );

        const monitoringSystemDeviceTitle =
            document.getElementById(
                "monitoringSystemDeviceTitle"
            );

        const monitoringSystemDeviceDescription =
            document.getElementById(
                "monitoringSystemDeviceDescription"
            );

        const monitoringSystemDeviceStatus =
            document.getElementById(
                "monitoringSystemDeviceStatus"
            );

        const isSystemDeviceOnline =
            device.status === "ONLINE";

        if (monitoringSystemDeviceIcon) {

            monitoringSystemDeviceIcon.className =
                isSystemDeviceOnline
                    ? "condition-icon success"
                    : "condition-icon warning";

            monitoringSystemDeviceIcon.textContent =
                isSystemDeviceOnline
                    ? "✓"
                    : "!";
        }

        if (monitoringSystemDeviceTitle) {

            monitoringSystemDeviceTitle.textContent =
                isSystemDeviceOnline
                    ? "ESP8266 Connected"
                    : "ESP8266 Disconnected";
        }

        if (monitoringSystemDeviceDescription) {

            monitoringSystemDeviceDescription.textContent =
                isSystemDeviceOnline
                    ? "Perangkat monitoring terhubung ke jaringan."
                    : "Perangkat monitoring tidak terhubung ke jaringan.";
        }

        if (monitoringSystemDeviceStatus) {

            monitoringSystemDeviceStatus.className =
                isSystemDeviceOnline
                    ? "condition-ok"
                    : "condition-warning";

            monitoringSystemDeviceStatus.textContent =
                isSystemDeviceOnline
                    ? "OK"
                    : "WARNING";
        }

        if (dashboardDeviceStatus) {

            const isOnline =
                device.status === "ONLINE";

            dashboardDeviceStatus.className =
                isOnline
                    ? "device-status online"
                    : "device-status offline";

            dashboardDeviceStatus.innerHTML =
                isOnline
                    ? "<span></span> ONLINE"
                    : "<span></span> OFFLINE";
        }

        if (dashboardDeviceConnection) {

            dashboardDeviceConnection.textContent =
                device.status === "ONLINE"
                    ? "Wi-Fi Connected"
                    : "Wi-Fi Disconnected";
        }

        if (dashboardDeviceUptime) {

            const seconds =
                Number(device.uptime_seconds) || 0;

            const hours =
                Math.floor(seconds / 3600);

            const minutes =
                Math.floor(
                    (seconds % 3600) / 60
                );

            const secs =
                seconds % 60;

            dashboardDeviceUptime.textContent =
                `Uptime: ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        }

        if (liveStatus) {

            const isOnline =
                device.status === "ONLINE";

            liveStatus.className =
                isOnline
                    ? "device-live-status online"
                    : "device-live-status offline";

            liveStatus.innerHTML =
                isOnline
                    ? "<span>●</span> Device Online"
                    : "<span>●</span> Device Offline";
        }

        // ==========================
        // NETWORK INFORMATION
        // ==========================

        const ipElement =
            document.getElementById("deviceIpAddress");

        if (ipElement) {
            ipElement.textContent =
                device.ip_address || "--";
        }

        const signalElement =
            document.getElementById("deviceWifiSignal");

        if (signalElement) {
            signalElement.textContent =
                device.wifi_signal !== null &&
                device.wifi_signal !== undefined
                    ? `${device.wifi_signal} dBm`
                    : "-- dBm";
        }


        // ==========================
        // UPTIME
        // ==========================

        const uptimeElement =
            document.getElementById(
                "deviceUptime"
            );

        if (uptimeElement) {

            const seconds =
                Number(device.uptime_seconds) || 0;

            const hours =
                Math.floor(seconds / 3600);

            const minutes =
                Math.floor(
                    (seconds % 3600) / 60
                );

            uptimeElement.textContent =
                `${hours}h ${minutes}m`;
        }


        // ==========================
        // BUZZER
        // ==========================

        const buzzerElement =
            document.getElementById(
                "deviceBuzzerStatus"
            );

        if (buzzerElement) {

            buzzerElement.textContent =
                sensorData.temperature >
                CONFIG.temperatureLimit
                    ? "ON"
                    : "OFF";
        }

    } catch (error) {

        console.error(
            "Gagal mengambil data device:",
            error
        );
    }
}

/* =========================================
   SETTINGS
========================================= */

function initializeSettings() {

    const temperatureSetting =
        document.getElementById(
            "temperatureLimitSetting"
        );


    const humidityMinSetting =
        document.getElementById(
            "humidityMinSetting"
        );


    const humidityMaxSetting =
        document.getElementById(
            "humidityMaxSetting"
        );


    if (temperatureSetting) {

        temperatureSetting.value =
            CONFIG.temperatureLimit;
    }


    if (humidityMinSetting) {

        humidityMinSetting.value =
            CONFIG.humidityMin;
    }


    if (humidityMaxSetting) {

        humidityMaxSetting.value =
            CONFIG.humidityMax;
    }


    const saveTemperature =
        document.getElementById(
            "saveSettings"
        );


    if (saveTemperature) {

        saveTemperature.addEventListener(
            "click",
            function () {

                const value =
                    Number(
                        temperatureSetting.value
                    );


                if (
                    !isNaN(value) &&
                    value > 0
                ) {

                    CONFIG.temperatureLimit =
                        value;

                    updateAlarmStatus();

                    alert(
                        "Temperature threshold berhasil disimpan."
                    );
                }
            }
        );
    }


    const saveHumidity =
        document.getElementById(
            "saveHumiditySettings"
        );


    if (saveHumidity) {

        saveHumidity.addEventListener(
            "click",
            function () {

                const min =
                    Number(
                        humidityMinSetting.value
                    );


                const max =
                    Number(
                        humidityMaxSetting.value
                    );


                if (
                    !isNaN(min) &&
                    !isNaN(max) &&
                    min < max
                ) {

                    CONFIG.humidityMin =
                        min;

                    CONFIG.humidityMax =
                        max;


                    alert(
                        "Humidity threshold berhasil disimpan."
                    );
                }
            }
        );
    }
}


/* =========================================
   PAGE NAVIGATION
========================================= */

function initializeNavigation() {

    const menuLinks =
        document.querySelectorAll(".menu");


    const pageSections =
        document.querySelectorAll(".page-section");


    /*
        Semua bagian Dashboard.
        Header/topbar sengaja tetap tampil.
    */

    const dashboardSections =
        document.querySelectorAll(
            ".main > section:not(.page-section), .main > footer"
        );


    /*
        ID halaman berdasarkan urutan
        menu pada sidebar.
    */

    const pages = [
        "dashboard",
        "monitoringPage",
        "historyPage",
        "alarmPage",
        "devicePage",
        "settingsPage"
    ];


    menuLinks.forEach(
        (menu, index) => {

            menu.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();


                    /* ==========================
                       ACTIVE MENU
                    ========================== */

                    menuLinks.forEach(
                        (item) => {

                            item.classList.remove(
                                "active"
                            );
                        }
                    );


                    this.classList.add(
                        "active"
                    );


                    /* ==========================
                       SEMBUNYIKAN SEMUA PAGE
                    ========================== */

                    pageSections.forEach(
                        (page) => {

                            page.style.display =
                                "none";
                        }
                    );


                    /* ==========================
                       DASHBOARD
                    ========================== */

                    if (index === 0) {

                        dashboardSections.forEach(
                            (section) => {

                                section.style.display =
                                    "";
                            }
                        );

                    }


                    /* ==========================
                       HALAMAN LAIN
                    ========================== */

                    else {

                        /*
                            Sembunyikan Dashboard
                        */

                        dashboardSections.forEach(
                            (section) => {

                                section.style.display =
                                    "none";
                            }
                        );


                        /*
                            Ambil ID halaman
                        */

                        const pageId =
                            pages[index];


                        const selectedPage =
                            document.getElementById(
                                pageId
                            );


                        if (selectedPage) {

                            selectedPage.style.display =
                                "block";
                        }


                        /* ==========================
                           HISTORY
                        ========================== */

                        if (index === 2) {

                            renderHistoryTable();
                        }


                        /* ==========================
                           ALARM
                        ========================== */

                        if (index === 3) {

                            console.log("Menu Alarm Log diklik");

                            renderAlarmTable();

                            updateAlarmSummary();
                        }


                        /* ==========================
                           DEVICE
                        ========================== */

                        if (index === 4) {

                            updateDeviceInformation();
                        }
                    }


                    window.scrollTo({

                        top: 0,

                        behavior: "smooth"
                    });

                }
            );
        }
    );
}


/* =========================================
   INISIALISASI DASHBOARD
========================================= */

function initializeDashboard() {

    window.dashboardStartTime =
        Date.now();


    updateFooterYear();

    updateSensorDisplay();

    updateAlarmStatus();

    updateLastUpdate();

    initializeSettings();

    initializeNavigation();


    /* ==============================
       DATA AWAL GRAFIK
    ============================== */

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const time =
            getCurrentTime();


        temperatureLabels.push(time);

        temperatureData.push(
            sensorData.temperature
        );


        humidityLabels.push(time);

        humidityData.push(
            sensorData.humidity
        );
    }


    if (temperatureChart) {

        temperatureChart.update();
    }


    if (humidityChart) {

        humidityChart.update();
    }


    /* ==============================
       DATA HISTORY PERTAMA
    ============================== */

    addHistoryData();
}


/* =========================================
   START SYSTEM
========================================= */

initializeDashboard();



/* =========================================
   SENSOR UPDATE
========================================= */

setInterval(
    function () {

        loadDashboardData();

        updateSensorDisplay();

        updateMonitoringDisplay();

        updateMonitoringStatus();

        updateAlarmStatus();

        updateLastUpdate();

        addHistoryData();

        updateDeviceInformation();

    },
    CONFIG.updateInterval
);

setInterval(
    function () {
        updateDeviceInformation();
    },
    10000
);

loadDashboardData();

//connectWebSocket();

initializeHistoryFilter();

initializeAlarmFilter();