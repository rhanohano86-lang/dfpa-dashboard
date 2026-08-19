const API_BASE = "/api";

const FIRE_LEVELS = [
    "LOW",
    "MODERATE",
    "HIGH",
    "EXTREME"
];

const IFPL_LEVELS = [
    "LEVEL 1",
    "LEVEL 2",
    "LEVEL 3",
    "LEVEL 4"
];

const messageEl = document.getElementById("message");
const scheduleForm = document.getElementById("scheduleForm");
const changeTypeEl = document.getElementById("changeType");
const newLevelEl = document.getElementById("newLevel");
const effectiveDateEl = document.getElementById("effectiveDate");
const effectiveTimeEl = document.getElementById("effectiveTime");
const notesEl = document.getElementById("notes");

const currentFireLevelEl =
    document.getElementById("currentFireLevel");

const currentIfplEl =
    document.getElementById("currentIfpl");

const upcomingContainer =
    document.getElementById("upcomingContainer");

const historyContainer =
    document.getElementById("historyContainer");


/* --------------------------------------------------
   MESSAGE
-------------------------------------------------- */

function showMessage(text, type = "success") {
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
}

function clearMessage() {
    messageEl.textContent = "";
    messageEl.className = "message";
}


/* --------------------------------------------------
   LEVEL DROPDOWN
-------------------------------------------------- */

function updateLevelOptions() {
    const levels =
        changeTypeEl.value === "fire"
            ? FIRE_LEVELS
            : IFPL_LEVELS;

    newLevelEl.innerHTML = "";

    levels.forEach(level => {
        const option = document.createElement("option");
        option.value = level;
        option.textContent = level;
        newLevelEl.appendChild(option);
    });
}


/* --------------------------------------------------
   LOAD DATA
-------------------------------------------------- */

async function loadAdminData() {
    try {
        const response = await fetch(
            `${API_BASE}/admin-data`,
            {
                credentials: "same-origin"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "Unable to load dashboard data."
            );
        }

        renderCurrentConditions(data);
        renderUpcomingChanges(data);
        renderHistory(data);

    } catch (error) {
        console.error(error);

        showMessage(
            "Unable to load administrative data.",
            "error"
        );
    }
}


/* --------------------------------------------------
   CURRENT CONDITIONS
-------------------------------------------------- */

function renderCurrentConditions(data) {
    const now = new Date();

    const fireChanges =
        data.fire_restrictions || [];

    const ifplChanges =
        data.ifpl_schedule || [];

    const currentFire =
        fireChanges
            .filter(record =>
                new Date(record.effective_at) <= now
            )
            .sort(
                (a, b) =>
                    new Date(b.effective_at) -
                    new Date(a.effective_at)
            )[0];

    const currentIfpl =
        ifplChanges
            .filter(record =>
                new Date(record.effective_at) <= now
            )
            .sort(
                (a, b) =>
                    new Date(b.effective_at) -
                    new Date(a.effective_at)
            )[0];

    currentFireLevelEl.textContent =
        currentFire
            ? currentFire.level
            : "Not set";

    currentIfplEl.textContent =
        currentIfpl
            ? currentIfpl.level
            : "Not set";
}


/* --------------------------------------------------
   UPCOMING CHANGES
-------------------------------------------------- */

function renderUpcomingChanges(data) {
    const now = new Date();

    const fireChanges =
        (data.fire_restrictions || [])
            .filter(record =>
                new Date(record.effective_at) > now
            )
            .map(record => ({
                ...record,
                type: "Fire Danger & Public Use Restrictions"
            }));

    const ifplChanges =
        (data.ifpl_schedule || [])
            .filter(record =>
                new Date(record.effective_at) > now
            )
            .map(record => ({
                ...record,
                type: "Industrial Fire Precaution Level"
            }));

    const upcoming = [
        ...fireChanges,
        ...ifplChanges
    ].sort(
        (a, b) =>
            new Date(a.effective_at) -
            new Date(b.effective_at)
    );

    if (upcoming.length === 0) {
        upcomingContainer.innerHTML =
            "<p>No upcoming changes scheduled.</p>";
        return;
    }

    const table = document.createElement("table");

    table.innerHTML = `
        <thead>
            <tr>
                <th>Change</th>
                <th>New Level</th>
                <th>Effective</th>
                <th>Created By</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    upcoming.forEach(record => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(record.type)}</td>
            <td>
                <span class="status scheduled">
                    ${escapeHtml(record.level)}
                </span>
            </td>
            <td>${formatDate(record.effective_at)}</td>
            <td>${escapeHtml(record.created_by)}</td>
        `;

        tbody.appendChild(row);
    });

    upcomingContainer.innerHTML = "";
    upcomingContainer.appendChild(table);
}


/* --------------------------------------------------
   HISTORY
-------------------------------------------------- */

function renderHistory(data) {
    const allChanges = [
        ...(data.fire_restrictions || []).map(record => ({
            ...record,
            type: "Fire Danger & Public Use Restrictions"
        })),

        ...(data.ifpl_schedule || []).map(record => ({
            ...record,
            type: "Industrial Fire Precaution Level"
        }))
    ].sort(
        (a, b) =>
            new Date(b.effective_at) -
            new Date(a.effective_at)
    );

    if (allChanges.length === 0) {
        historyContainer.innerHTML =
            "<p>No change history available.</p>";
        return;
    }

    const table = document.createElement("table");

    table.innerHTML = `
        <thead>
            <tr>
                <th>Change</th>
                <th>Level</th>
                <th>Effective</th>
                <th>Created By</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    allChanges.forEach(record => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHtml(record.type)}</td>
            <td>${escapeHtml(record.level)}</td>
            <td>${formatDate(record.effective_at)}</td>
            <td>${escapeHtml(record.created_by)}</td>
        `;

        tbody.appendChild(row);
    });

    historyContainer.innerHTML = "";
    historyContainer.appendChild(table);
}


/* --------------------------------------------------
   SCHEDULE CHANGE
-------------------------------------------------- */

scheduleForm.addEventListener("submit", async event => {
    event.preventDefault();

    clearMessage();

    const changeType = changeTypeEl.value;
    const level = newLevelEl.value;
    const date = effectiveDateEl.value;
    const time = effectiveTimeEl.value;
    const notes = notesEl.value.trim();

    if (!date || !time) {
        showMessage(
            "Please enter an effective date and time.",
            "error"
        );
        return;
    }

    const effectiveAt =
        `${date}T${time}`;

    const effectiveDate =
        new Date(effectiveAt);

    if (Number.isNaN(effectiveDate.getTime())) {
        showMessage(
            "Please enter a valid effective date and time.",
            "error"
        );
        return;
    }

    if (effectiveDate <= new Date()) {
        showMessage(
            "The effective date and time must be in the future.",
            "error"
        );
        return;
    }

    const confirmed = window.confirm(
    `Schedule this change?\n\n` +
    `Type: ${
        changeType === "fire"
            ? "Fire Danger & Public Use Restrictions"
            : "Industrial Fire Precaution Level"
    }\n` +
    `Level: ${level}\n` +
    `Effective: ${formatDate(effectiveAt)}`
);

if (!confirmed) {
    return;
}

    const submitButton =
        scheduleForm.querySelector(
            'button[type="submit"]'
        );

    submitButton.disabled = true;
    submitButton.textContent = "Scheduling...";

    try {
        const response = await fetch(
            `${API_BASE}/admin-write`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    changeType,
                    level,
                    effectiveAt,
                    notes
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                "Unable to schedule the change."
            );
        }

        showMessage(
            "Change scheduled successfully.",
            "success"
        );

        scheduleForm.reset();

        effectiveTimeEl.value = "00:01";

        updateLevelOptions();

        await loadAdminData();

    } catch (error) {
        console.error(error);

        showMessage(
            error.message ||
            "Unable to schedule the change.",
            "error"
        );

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Schedule Change";
    }
});


/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return date.toLocaleString(
        "en-US",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* --------------------------------------------------
   INITIALIZE
-------------------------------------------------- */

changeTypeEl.addEventListener(
    "change",
    updateLevelOptions
);

updateLevelOptions();

loadAdminData();
