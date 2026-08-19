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
   MESSAGES
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
   LEVEL OPTIONS
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
   LOAD ADMIN DATA
-------------------------------------------------- */

async function loadAdminData() {
    try {
        const response = await fetch(
            `${API_BASE}/admin-data`,
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                "Unable to load administrative data."
            );
        }

        console.log("Admin data loaded:", data);

        renderCurrentConditions(data);
        renderUpcomingChanges(data);
        renderHistory(data);

    } catch (error) {
        console.error(
            "Admin data loading error:",
            error
        );

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

    /*
     * The API provides the current values directly.
     */

    if (data.current) {

        currentFireLevelEl.textContent =
            data.current.fire_level ||
            "Not set";

        currentIfplEl.textContent =
            data.current.ifpl_level ||
            "Not set";

    } else {

        currentFireLevelEl.textContent =
            "Not set";

        currentIfplEl.textContent =
            "Not set";
    }
}


/* --------------------------------------------------
   UPCOMING CHANGES
-------------------------------------------------- */

function renderUpcomingChanges(data) {

    const upcoming =
        Array.isArray(data.upcoming)
            ? data.upcoming
            : [];

    if (upcoming.length === 0) {

        upcomingContainer.innerHTML =
            "<p>No upcoming changes scheduled.</p>";

        return;
    }

    const table =
        document.createElement("table");

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

    const tbody =
        table.querySelector("tbody");

    upcoming.forEach(record => {

        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>
                ${escapeHtml(
                    record.section ||
                    record.type ||
                    "Change"
                )}
            </td>

            <td>
                <span class="status scheduled">
                    ${escapeHtml(
                        record.level || ""
                    )}
                </span>
            </td>

            <td>
                ${formatDate(
                    record.effective_at
                )}
            </td>

            <td>
                ${escapeHtml(
                    record.created_by || ""
                )}
            </td>
        `;

        tbody.appendChild(row);
    });

    upcomingContainer.innerHTML = "";

    upcomingContainer.appendChild(table);
}


/* --------------------------------------------------
   CHANGE HISTORY
-------------------------------------------------- */

function renderHistory(data) {

    const history =
        Array.isArray(data.history)
            ? data.history
            : [];

    if (history.length === 0) {

        historyContainer.innerHTML =
            "<p>No change history available.</p>";

        return;
    }

    const table =
        document.createElement("table");

    table.innerHTML = `
        <thead>
            <tr>
                <th>Action</th>
                <th>Section</th>
                <th>Details</th>
                <th>Performed By</th>
                <th>Performed At</th>
            </tr>
        </thead>

        <tbody></tbody>
    `;

    const tbody =
        table.querySelector("tbody");

    history.forEach(record => {

        const row =
            document.createElement("tr");

        let details = "";

        if (record.details) {

            try {

                const parsed =
                    typeof record.details === "string"
                        ? JSON.parse(record.details)
                        : record.details;

                details =
                    `${parsed.level || ""}` +
                    `${parsed.effective_at
                        ? " — " +
                          formatDate(parsed.effective_at)
                        : ""}`;

            } catch {

                details =
                    record.details;
            }
        }

        row.innerHTML = `
            <td>
                ${escapeHtml(
                    record.action || ""
                )}
            </td>

            <td>
                ${escapeHtml(
                    record.section || ""
                )}
            </td>

            <td>
                ${escapeHtml(
                    details
                )}
            </td>

            <td>
                ${escapeHtml(
                    record.performed_by || ""
                )}
            </td>

            <td>
                ${formatDate(
                    record.performed_at
                )}
            </td>
        `;

        tbody.appendChild(row);
    });

    historyContainer.innerHTML = "";

    historyContainer.appendChild(table);
}


/* --------------------------------------------------
   SCHEDULE CHANGE
-------------------------------------------------- */

scheduleForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        clearMessage();

        const changeType =
            changeTypeEl.value;

        const level =
            newLevelEl.value;

        const date =
            effectiveDateEl.value;

        const time =
            effectiveTimeEl.value;

        const notes =
            notesEl.value.trim();

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

        if (
            Number.isNaN(
                effectiveDate.getTime()
            )
        ) {

            showMessage(
                "Please enter a valid effective date and time.",
                "error"
            );

            return;
        }

        if (
            effectiveDate <= new Date()
        ) {

            showMessage(
                "The effective date and time must be in the future.",
                "error"
            );

            return;
        }


        /* Confirmation */

        const confirmed =
            window.confirm(
                `Schedule this change?\n\n` +

                `Type: ${
                    changeType === "fire"
                        ? "Fire Danger & Public Use Restrictions"
                        : "Industrial Fire Precaution Level"
                }\n` +

                `Level: ${level}\n` +

                `Effective: ${
                    formatDate(effectiveAt)
                }`
            );

        if (!confirmed) {
            return;
        }


        const submitButton =
            scheduleForm.querySelector(
                'button[type="submit"]'
            );

        submitButton.disabled = true;

        submitButton.textContent =
            "Scheduling...";


        try {

            const response =
                await fetch(
                    `${API_BASE}/admin-write`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "same-origin",

                        body: JSON.stringify({
                            changeType,
                            level,
                            effectiveAt,
                            notes
                        })
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {

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

            effectiveTimeEl.value =
                "00:01";

            updateLevelOptions();


            /*
             * Reload the data immediately.
             */

            await loadAdminData();


        } catch (error) {

            console.error(
                "Schedule change error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to schedule the change.",
                "error"
            );


        } finally {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Schedule Change";
        }
    }
);


/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

function formatDate(value) {

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
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
        .replaceAll(
            "'",
            "&#039;"
        );
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
