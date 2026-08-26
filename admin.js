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

const IFPL_ZONES = [
    "DG-1",
    "DG-2",
    "UA-1",
    "UA-2"
];


const messageEl =
    document.getElementById("message");

const scheduleForm =
    document.getElementById("scheduleForm");

const changeTypeEl =
    document.getElementById("changeType");

const newLevelEl =
    document.getElementById("newLevel");

const effectiveDateEl =
    document.getElementById("effectiveDate");

const effectiveTimeEl =
    document.getElementById("effectiveTime");

const notesEl =
    document.getElementById("notes");

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

function showMessage(
    text,
    type = "success"
) {

    messageEl.textContent = text;

    messageEl.className =
        `message ${type}`;
}


function clearMessage() {

    messageEl.textContent = "";

    messageEl.className =
        "message";
}


/* --------------------------------------------------
   FORMAT PACIFIC DATE
-------------------------------------------------- */

function formatPacificDate(
    value
) {

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
            timeZone:
                "America/Los_Angeles",
            month:
                "long",
            day:
                "numeric",
            year:
                "numeric",
            hour:
                "numeric",
            minute:
                "2-digit"
        }
    );
}


function formatDate(
    value
) {

    return formatPacificDate(
        value
    );
}


/* --------------------------------------------------
   LEVEL OPTIONS
-------------------------------------------------- */

function updateLevelOptions() {

    const levels =
        changeTypeEl.value === "fire"
            ? FIRE_LEVELS
            : IFPL_LEVELS;


    newLevelEl.innerHTML =
        "";


    levels.forEach(
        level => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                level;

            option.textContent =
                level;

            newLevelEl.appendChild(
                option
            );
        }
    );
}


/* --------------------------------------------------
   IFPL SCOPE CONTROLS
-------------------------------------------------- */

function getIfplScopeContainer() {

    return document.getElementById(
        "ifplScopeContainer"
    );
}


function getIfplZoneContainer() {

    return document.getElementById(
        "ifplZoneContainer"
    );
}


function getIfplScopeEl() {

    return document.getElementById(
        "ifplScope"
    );
}


function getIfplZoneEl() {

    return document.getElementById(
        "ifplZone"
    );
}


function updateIfplZoneControls() {

    const scopeContainer =
        getIfplScopeContainer();

    const zoneContainer =
        getIfplZoneContainer();

    const scopeEl =
        getIfplScopeEl();


    if (
        !scopeEl ||
        !scopeContainer ||
        !zoneContainer
    ) {
        return;
    }


    const isIFPL =
        changeTypeEl.value === "ifpl";


    scopeContainer.style.display =
        isIFPL
            ? ""
            : "none";


    zoneContainer.style.display =
        isIFPL &&
        scopeEl.value === "zone"
            ? ""
            : "none";
}


/* --------------------------------------------------
   LOAD ADMIN DATA
-------------------------------------------------- */

async function loadAdminData() {

    try {

        const response =
            await fetch(
                `${API_BASE}/admin-data`,
                {
                    credentials:
                        "same-origin",
                    cache:
                        "no-store"
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
                "Unable to load administrative data."
            );

        }


        renderCurrentConditions(
            data
        );

        renderUpcomingChanges(
            data
        );

        renderHistory(
            data
        );


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

function renderCurrentConditions(
    data
) {

    const fireRestriction =
        data.current?.fire_restrictions;


    const currentFireEffectiveEl =
        document.getElementById(
            "currentFireEffective"
        );


    currentFireLevelEl.textContent =
        fireRestriction?.level ||
        "Not set";


    if (currentFireEffectiveEl) {

        currentFireEffectiveEl.textContent =
            fireRestriction?.effective_at
                ? "Effective: " +
                  formatPacificDate(
                      fireRestriction.effective_at
                  )
                : "Effective: —";
    }


    const ifplZones =
        Array.isArray(
            data.current?.ifpl_zones
        )
            ? data.current.ifpl_zones
            : [];


    /*
     * If zone-aware IFPL data exists,
     * display all four zones.
     */
    if (
        ifplZones.length > 0
    ) {

        renderCurrentIfplZones(
            ifplZones
        );

        return;
    }


    /*
     * Temporary legacy fallback while
     * the transition is in progress.
     */
    const legacyIfpl =
        data.current?.ifpl;


    currentIfplEl.innerHTML =
        legacyIfpl?.level ||
        "Not set";


    const currentIfplEffectiveEl =
        document.getElementById(
            "currentIfplEffective"
        );


    if (currentIfplEffectiveEl) {

        currentIfplEffectiveEl.textContent =
            legacyIfpl?.effective_at
                ? "Effective: " +
                  formatPacificDate(
                      legacyIfpl.effective_at
                  )
                : "Effective: —";
    }
}


/* --------------------------------------------------
   CURRENT IFPL ZONES
-------------------------------------------------- */

function renderCurrentIfplZones(
    zones
) {

    currentIfplEl.innerHTML =
        "";


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "ifpl-zone-list";


    zones.forEach(
        zone => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "ifpl-zone-item";


            const zoneName =
                document.createElement(
                    "div"
                );

            zoneName.className =
                "ifpl-zone-name";

            zoneName.textContent =
                zone.zone;


            const zoneLevel =
                document.createElement(
                    "div"
                );

            zoneLevel.className =
                "ifpl-zone-level";

            zoneLevel.textContent =
                zone.level;


            const zoneEffective =
                document.createElement(
                    "div"
                );

            zoneEffective.className =
                "ifpl-zone-effective";

            zoneEffective.textContent =
                zone.effective_at
                    ? "Effective: " +
                      formatPacificDate(
                          zone.effective_at
                      )
                    : "Effective: —";


            item.appendChild(
                zoneName
            );

            item.appendChild(
                zoneLevel
            );

            item.appendChild(
                zoneEffective
            );


            wrapper.appendChild(
                item
            );
        }
    );


    currentIfplEl.appendChild(
        wrapper
    );


    const legacyEffectiveEl =
        document.getElementById(
            "currentIfplEffective"
        );


    if (legacyEffectiveEl) {

        legacyEffectiveEl.textContent =
            "";
    }
}


/* --------------------------------------------------
   UPCOMING CHANGES
-------------------------------------------------- */

function renderUpcomingChanges(
    data
) {

    const fireChanges =
        Array.isArray(
            data.upcoming?.fire_restrictions
        )
            ? data.upcoming.fire_restrictions.map(
                record => ({
                    ...record,
                    changeType:
                        "Fire Danger Level & Public Use Restrictions",
                    tableName:
                        "fire_restrictions",
                    changeGroupId:
                        null
                })
            )
            : [];


    const ifplChanges =
        Array.isArray(
            data.upcoming?.ifpl_zones
        )
            ? data.upcoming.ifpl_zones.map(
                record => ({
                    ...record,
                    changeType:
                        "Industrial Fire Precaution Level",
                    tableName:
                        "ifpl_schedule_zoned",
                    changeGroupId:
                        record.change_group_id
                })
            )
            : [];


    const upcoming =
        [
            ...fireChanges,
            ...ifplChanges
        ].sort(
            (a, b) =>
                new Date(
                    a.effective_at
                ) -
                new Date(
                    b.effective_at
                )
        );


    if (
        upcoming.length === 0
    ) {

        upcomingContainer.innerHTML =
            "<p>No upcoming changes scheduled.</p>";

        return;
    }


    const grouped =
        groupUpcomingChanges(
            upcoming
        );


    const table =
        document.createElement(
            "table"
        );


    table.innerHTML = `
        <thead>
            <tr>
                <th>Change</th>
                <th>New Level</th>
                <th>Zones</th>
                <th>Effective</th>
                <th>Created By</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;


    const tbody =
        table.querySelector(
            "tbody"
        );


    grouped.forEach(
        group => {

            const row =
                document.createElement(
                    "tr"
                );


            const zonesLabel =
                group.changeType.includes(
                    "Industrial Fire"
                )
                    ? group.records
                        .map(
                            record =>
                                record.zone
                        )
                        .join(", ")
                    : "All";


            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        group.changeType
                    )}
                </td>

                <td>
                    <span class="status scheduled">
                        ${escapeHtml(
                            group.level
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        zonesLabel
                    )}
                </td>

                <td>
                    ${formatDate(
                        group.effective_at
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        group.created_by
                    )}
                </td>

                <td>
                    <button
                        type="button"
                        class="secondary cancel-change-button"
                    >
                        Cancel
                    </button>
                </td>
            `;


            const cancelButton =
                row.querySelector(
                    ".cancel-change-button"
                );


            cancelButton.addEventListener(
                "click",
                () => {

                    cancelScheduledChange(
                        group.records[0].id,
                        group.tableName,
                        group.level,
                        group.effective_at
                    );

                }
            );


            tbody.appendChild(
                row
            );
        }
    );


    upcomingContainer.innerHTML =
        "";

    upcomingContainer.appendChild(
        table
    );
}


/* --------------------------------------------------
   GROUP UPCOMING CHANGES
-------------------------------------------------- */

function groupUpcomingChanges(
    records
) {

    const groups =
        new Map();


    records.forEach(
        record => {

            const key =
                record.tableName ===
                    "ifpl_schedule_zoned"
                    ? `${record.tableName}|${record.changeGroupId}`
                    : `${record.tableName}|${record.id}`;


            if (
                !groups.has(key)
            ) {

                groups.set(
                    key,
                    {
                        tableName:
                            record.tableName,
                        changeType:
                            record.changeType,
                        level:
                            record.level,
                        effective_at:
                            record.effective_at,
                        created_by:
                            record.created_by,
                        records: []
                    }
                );
            }


            groups.get(
                key
            ).records.push(
                record
            );
        }
    );


    return Array.from(
        groups.values()
    );
}


/* --------------------------------------------------
   CANCEL FUTURE SCHEDULED CHANGE
-------------------------------------------------- */

async function cancelScheduledChange(
    id,
    table,
    level,
    effectiveAt
) {

    const confirmed =
        window.confirm(
            "Are you sure you want to cancel this scheduled change?\n\n" +
            "Level: " +
            level +
            "\n" +
            "Effective: " +
            formatPacificDate(
                effectiveAt
            )
    );


    if (!confirmed) {
        return;
    }


    try {

        showMessage(
            "Cancelling scheduled change...",
            "success"
        );


        const response =
            await fetch(
                "/api/admin-delete",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials:
                        "same-origin",

                    body:
                        JSON.stringify({
                            id,
                            table,
                            reason:
                                "Scheduled change cancelled by administrator."
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
                "Unable to cancel the scheduled change."
            );
        }


        showMessage(
            "Scheduled change cancelled successfully.",
            "success"
        );


        await loadAdminData();


    } catch (error) {

        console.error(
            "Cancel scheduled change error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to cancel the scheduled change.",
            "error"
        );
    }
}


/* --------------------------------------------------
   CHANGE HISTORY
-------------------------------------------------- */

function renderHistory(
    data
) {

    const fireHistory =
        Array.isArray(
            data.history?.fire_restrictions
        )
            ? data.history.fire_restrictions.map(
                record => ({
                    ...record,
                    changeType:
                        "Fire Danger Level & Public Use Restrictions"
                })
            )
            : [];


    const ifplHistory =
        Array.isArray(
            data.history?.ifpl_zones
        )
            ? data.history.ifpl_zones.map(
                record => ({
                    ...record,
                    changeType:
                        "Industrial Fire Precaution Level"
                })
            )
            : [];


    const history =
        [
            ...fireHistory,
            ...ifplHistory
        ].sort(
            (a, b) =>
                new Date(
                    b.effective_at
                ) -
                new Date(
                    a.effective_at
                )
        );


    if (
        history.length === 0
    ) {

        historyContainer.innerHTML =
            "<p>No change history available.</p>";

        return;
    }


    const table =
        document.createElement(
            "table"
        );


    table.innerHTML = `
        <thead>
            <tr>
                <th>Change</th>
                <th>Zone</th>
                <th>Level</th>
                <th>Effective</th>
                <th>Created By</th>
                <th>Created</th>
            </tr>
        </thead>

        <tbody></tbody>
    `;


    const tbody =
        table.querySelector(
            "tbody"
        );


    history.forEach(
        record => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        record.changeType
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.zone ||
                        "All"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.level
                    )}
                </td>

                <td>
                    ${formatDate(
                        record.effective_at
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.created_by
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        record.created_at
                    )}
                </td>
            `;


            tbody.appendChild(
                row
            );
        }
    );


    historyContainer.innerHTML =
        "";

    historyContainer.appendChild(
        table
    );
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


        if (
            !date ||
            !time
        ) {

            showMessage(
                "Please enter an effective date and time.",
                "error"
            );

            return;
        }


        const localDateTime =
            `${date}T${time}`;


        /*
         * Convert Pacific local time to UTC.
         */
        function convertPacificToUTC(
            localDateTime
        ) {

            const [datePart, timePart] =
                localDateTime.split(
                    "T"
                );

            const [year, month, day] =
                datePart
                    .split("-")
                    .map(
                        Number
                    );

            const [hour, minute] =
                timePart
                    .split(":")
                    .map(
                        Number
                    );


            const targetUTC =
                Date.UTC(
                    year,
                    month - 1,
                    day,
                    hour,
                    minute
                );


            const formatter =
                new Intl.DateTimeFormat(
                    "en-US",
                    {
                        timeZone:
                            "America/Los_Angeles",
                        year:
                            "numeric",
                        month:
                            "2-digit",
                        day:
                            "2-digit",
                        hour:
                            "2-digit",
                        minute:
                            "2-digit",
                        hourCycle:
                            "h23"
                    }
                );


            const parts =
                formatter.formatToParts(
                    new Date(
                        targetUTC
                    )
                );


            const values =
                {};


            parts.forEach(
                part => {

                    if (
                        part.type !==
                        "literal"
                    ) {

                        values[
                            part.type
                        ] =
                            Number(
                                part.value
                            );
                    }
                }
            );


            const displayedAsUTC =
                Date.UTC(
                    values.year,
                    values.month - 1,
                    values.day,
                    values.hour,
                    values.minute
                );


            const offset =
                displayedAsUTC -
                targetUTC;


            const utcTime =
                new Date(
                    targetUTC -
                    offset
                );


            return utcTime.toISOString();
        }


        const effectiveAt =
            convertPacificToUTC(
                localDateTime
            );


        const effectiveDate =
            new Date(
                effectiveAt
            );


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


        /*
         * Read IFPL scope controls.
         */
        const ifplScopeEl =
            getIfplScopeEl();

        const ifplZoneEl =
            getIfplZoneEl();


        const ifplApplyTo =
            changeType === "ifpl"
                ? (
                    ifplScopeEl?.value ||
                    "all"
                )
                : null;


        const ifplZone =
            changeType === "ifpl" &&
            ifplApplyTo === "zone"
                ? (
                    ifplZoneEl?.value ||
                    null
                )
                : null;


        const typeLabel =
            changeType === "fire"
                ? "Fire Danger Level & Public Use Restrictions"
                : "Industrial Fire Precaution Level";


        let confirmationText =
            `Schedule this change?\n\n` +
            `Type: ${typeLabel}\n` +
            `Level: ${level}\n`;


        if (
            changeType === "ifpl"
        ) {

            if (
                ifplApplyTo === "all"
            ) {

                confirmationText +=
                    "Apply To: All Regulation Use Zones\n";

            } else {

                confirmationText +=
                    `Zone: ${ifplZone}\n`;
            }
        }


        confirmationText +=
            `Effective: ${formatDate(
                effectiveAt
            )}`;


        const confirmed =
            window.confirm(
                confirmationText
            );


        if (!confirmed) {
            return;
        }


        const submitButton =
            scheduleForm.querySelector(
                'button[type="submit"]'
            );


        submitButton.disabled =
            true;

        submitButton.textContent =
            "Scheduling...";


        try {

            const response =
                await fetch(
                    `${API_BASE}/admin-write`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials:
                            "same-origin",

                        body:
                            JSON.stringify({
                                changeType,
                                level,
                                effectiveAt,
                                notes,
                                ifplApplyTo,
                                ifplZone
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

            updateIfplZoneControls();


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

function escapeHtml(
    value
) {

    return String(
        value
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
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
    () => {

        updateLevelOptions();

        updateIfplZoneControls();
    }
);


const initialScopeEl =
    getIfplScopeEl();

if (initialScopeEl) {

    initialScopeEl.addEventListener(
        "change",
        updateIfplZoneControls
    );
}


updateLevelOptions();

updateIfplZoneControls();

loadAdminData();
