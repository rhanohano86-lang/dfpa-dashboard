const API_URL = "/api/admin-data";

const fireLevels = [
    "LOW",
    "MODERATE",
    "HIGH",
    "EXTREME"
];

const ifplLevels = [
    "LEVEL 1",
    "LEVEL 2",
    "LEVEL 3",
    "LEVEL 4"
];

const message = document.getElementById("message");
const currentFireLevel = document.getElementById("currentFireLevel");
const currentIfpl = document.getElementById("currentIfpl");
const upcomingContainer = document.getElementById("upcomingContainer");
const historyContainer = document.getElementById("historyContainer");
const changeType = document.getElementById("changeType");
const newLevel = document.getElementById("newLevel");
const scheduleForm = document.getElementById("scheduleForm");


function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = `message ${type}`;
}


function formatDateTime(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
}


function populateLevelOptions() {
    const levels = changeType.value === "fire"
        ? fireLevels
        : ifplLevels;

    newLevel.innerHTML = "";

    levels.forEach(level => {
        const option = document.createElement("option");
        option.value = level;
        option.textContent = level;
        newLevel.appendChild(option);
    });
}


function renderUpcoming(data) {
    const fire = data.fire_restrictions || [];
    const ifpl = data.ifpl || [];

    if (fire.length === 0 && ifpl.length === 0) {
        upcomingContainer.innerHTML = "<p>No upcoming changes scheduled.</p>";
        return;
    }

    const rows = [];

    fire.forEach(record => {
        rows.push(`
            <tr>
                <td>Fire Danger & Public Use Restrictions</td>
                <td>${escapeHtml(record.level)}</td>
                <td>${formatDateTime(record.effective_at)}</td>
                <td><span class="status scheduled">Scheduled</span></td>
            </tr>
        `);
    });

    ifpl.forEach(record => {
        rows.push(`
            <tr>
                <td>Industrial Fire Precaution Level</td>
                <td>${escapeHtml(record.level)}</td>
                <td>${formatDateTime(record.effective_at)}</td>
                <td><span class="status scheduled">Scheduled</span></td>
            </tr>
        `);
    });

    upcomingContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Change</th>
                    <th>Level</th>
                    <th>Effective</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows.join("")}
            </tbody>
        </table>
    `;
}


function renderHistory(data) {
    const fire = data.fire_restrictions || [];
    const ifpl = data.ifpl || [];

    const records = [
        ...fire.map(record => ({
            type: "Fire Danger & Public Use Restrictions",
            record
        })),
        ...ifpl.map(record => ({
            type: "Industrial Fire Precaution Level",
            record
        }))
    ];

    records.sort((a, b) => {
        return new Date(b.record.effective_at) -
               new Date(a.record.effective_at);
    });

    if (records.length === 0) {
        historyContainer.innerHTML = "<p>No change history available.</p>";
        return;
    }

    const rows = records.map(item => `
        <tr>
            <td>${escapeHtml(item.type)}</td>
            <td>${escapeHtml(item.record.level)}</td>
            <td>${formatDateTime(item.record.effective_at)}</td>
            <td>${escapeHtml(item.record.created_by || "—")}</td>
        </tr>
    `);

    historyContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Change</th>
                    <th>Level</th>
                    <th>Effective</th>
                    <th>Created By</th>
                </tr>
            </thead>
            <tbody>
                ${rows.join("")}
            </tbody>
        </table>
    `;
}


function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


async function loadAdminData() {
    try {
        currentFireLevel.textContent = "Loading...";
        currentIfpl.textContent = "Loading...";
        upcomingContainer.textContent = "Loading...";
        historyContainer.textContent = "Loading...";

        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Unable to load admin data.");
        }

        currentFireLevel.textContent =
            data.current?.fire_restrictions?.level || "Not Set";

        currentIfpl.textContent =
            data.current?.ifpl?.level || "Not Set";

        renderUpcoming(data.upcoming || {});
        renderHistory(data.history || {});

    } catch (error) {
        console.error("Admin data error:", error);

        currentFireLevel.textContent = "Unavailable";
        currentIfpl.textContent = "Unavailable";

        upcomingContainer.textContent =
            "Unable to load upcoming changes.";

        historyContainer.textContent =
            "Unable to load change history.";

        showMessage(
            "Unable to connect to the administration database.",
            "error"
        );
    }
}


changeType.addEventListener("change", populateLevelOptions);

scheduleForm.addEventListener("submit", function(event) {
    event.preventDefault();

    showMessage(
        "Scheduling is not enabled yet. Authentication and secure write access will be added next.",
        "error"
    );
});


populateLevelOptions();
loadAdminData();
