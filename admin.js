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


/* ======================================================
   ELEMENT REFERENCES
   ====================================================== */

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


/* ======================================================
   FIRE SEASON ELEMENT REFERENCES
   ====================================================== */

const currentSeasonPanel =
    document.getElementById(
        "currentSeasonPanel"
    );

const seasonStatusEl =
    document.getElementById(
        "seasonStatus"
    );

const seasonYearEl =
    document.getElementById(
        "seasonYear"
    );

const seasonStartDateEl =
    document.getElementById(
        "seasonStartDate"
    );

const seasonEndDateEl =
    document.getElementById(
        "seasonEndDate"
    );

const endSeasonControlsEl =
    document.getElementById(
        "endSeasonControls"
    );

const endSeasonDateEl =
    document.getElementById(
        "endSeasonDate"
    );

const endSeasonButton =
    document.getElementById(
        "endSeasonButton"
    );

const startSeasonPanel =
    document.getElementById(
        "startSeasonPanel"
    );

const newSeasonYearEl =
    document.getElementById(
        "newSeasonYear"
    );

const newSeasonStartDateEl =
    document.getElementById(
        "newSeasonStartDate"
    );

const startSeasonButton =
    document.getElementById(
        "startSeasonButton"
    );

const fireSeasonHistoryContainer =
    document.getElementById(
        "fireSeasonHistoryContainer"
    );

const seasonTotalDaysEl =
    document.getElementById(
        "seasonTotalDays"
    );

const fireSeasonStatsBody =
    document.getElementById(
        "fireSeasonStatsBody"
    );

const ifplSeasonStatsBody =
    document.getElementById(
        "ifplSeasonStatsBody"
    );

/* ======================================================
   MESSAGES
   ====================================================== */

function showMessage(
    text,
    type = "success"
) {

    if (!messageEl) {
        return;
    }

    messageEl.textContent =
        text;

    messageEl.className =
        `message ${type}`;
}


function clearMessage() {

    if (!messageEl) {
        return;
    }

    messageEl.textContent =
        "";

    messageEl.className =
        "message";
}


/* ======================================================
   FORMAT PACIFIC DATE
   ====================================================== */

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


/* ======================================================
   FORMAT DATE-ONLY VALUES
   ====================================================== */

function formatDateOnly(
    value
) {

    if (!value) {
        return "—";
    }

    const parts =
        String(value)
            .split("-");

    if (parts.length !== 3) {
        return String(value);
    }

    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const day =
        Number(parts[2]);

    const date =
        new Date(
            year,
            month - 1,
            day
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleDateString(
        "en-US",
        {
            month:
                "long",
            day:
                "numeric",
            year:
                "numeric"
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


/* ======================================================
   LEVEL OPTIONS
   ====================================================== */

function updateLevelOptions() {

    if (
        !changeTypeEl ||
        !newLevelEl
    ) {
        return;
    }

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


/* ======================================================
   IFPL SCOPE CONTROLS
   ====================================================== */

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
        !zoneContainer ||
        !changeTypeEl
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


/* ======================================================
   LOAD ADMIN DATA
   ====================================================== */

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


/* ======================================================
   LOAD FIRE SEASON DATA
   ====================================================== */

async function loadFireSeasonData() {

    try {

        const response =
            await fetch(
                `${API_BASE}/fire-season`,
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
                "Unable to load fire season data."
            );
        }

        renderFireSeason(
            data
        );

const currentYear =
    data.current?.year ||
    (
        Array.isArray(data.history) &&
        data.history.length > 0
            ? data.history[0].year
            : null
    );

if (currentYear) {
    await loadFireSeasonReport(
        currentYear
    );
}
        
    } catch (error) {

        console.error(
            "Fire season loading error:",
            error
        );

        if (
            fireSeasonHistoryContainer
        ) {

            fireSeasonHistoryContainer.innerHTML =
                "<p>Unable to load fire season history.</p>";
        }

        showMessage(
            "Unable to load fire season data.",
            "error"
        );
    }
}

/* ======================================================
   LOAD FIRE SEASON REPORT
   ====================================================== */

async function loadFireSeasonReport(
    year
) {

    try {

        if (!year) {
            return;
        }


        const response =
            await fetch(
                `${API_BASE}/season-report?year=${encodeURIComponent(year)}`,
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
                "Unable to load fire season statistics."
            );
        }


        renderFireSeasonReport(
            data.report
        );


    } catch (error) {

        console.error(
            "Fire season report loading error:",
            error
        );


        if (
            seasonTotalDaysEl
        ) {

            seasonTotalDaysEl.textContent =
                "—";
        }


        if (
            fireSeasonStatsBody
        ) {

            fireSeasonStatsBody.innerHTML = `
                <tr>
                    <td colspan="2">
                        Unable to load statistics.
                    </td>
                </tr>
            `;
        }


        if (
            ifplSeasonStatsBody
        ) {

            ifplSeasonStatsBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        Unable to load statistics.
                    </td>
                </tr>
            `;
        }
    }
}


/* ======================================================
   RENDER FIRE SEASON REPORT
   ====================================================== */

function renderFireSeasonReport(
    report
) {

    if (!report) {
        return;
    }


    /*
     * Total season days.
     */
    if (
        seasonTotalDaysEl
    ) {

        seasonTotalDaysEl.textContent =
            report.season?.total_days ??
            "—";
    }


    /* ==================================================
       FIRE DANGER / PUR STATISTICS
       ================================================== */

    if (
        fireSeasonStatsBody
    ) {

        const fireDanger =
            report.fire_danger || {};


        fireSeasonStatsBody.innerHTML = `
            <tr>
                <td>LOW</td>
                <td>${escapeHtml(
                    fireDanger.LOW ?? 0
                )}</td>
            </tr>

            <tr>
                <td>MODERATE</td>
                <td>${escapeHtml(
                    fireDanger.MODERATE ?? 0
                )}</td>
            </tr>

            <tr>
                <td>HIGH</td>
                <td>${escapeHtml(
                    fireDanger.HIGH ?? 0
                )}</td>
            </tr>

            <tr>
                <td>EXTREME</td>
                <td>${escapeHtml(
                    fireDanger.EXTREME ?? 0
                )}</td>
            </tr>

            <tr>
                <td><strong>Total</strong></td>
                <td><strong>${escapeHtml(
                    fireDanger.total ?? 0
                )}</strong></td>
            </tr>
        `;
    }


    /* ==================================================
       IFPL STATISTICS
       ================================================== */

    if (
        ifplSeasonStatsBody
    ) {

        const ifpl =
            report.ifpl || {};


        const zones = [
            "DG-1",
            "DG-2",
            "UA-1",
            "UA-2"
        ];


        ifplSeasonStatsBody.innerHTML =
            zones.map(
                zone => {

                    const zoneData =
                        ifpl[zone] || {};


                    return `
                        <tr>
                            <td>
                                <strong>
                                    ${escapeHtml(zone)}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    zoneData["LEVEL 1"] ?? 0
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    zoneData["LEVEL 2"] ?? 0
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    zoneData["LEVEL 3"] ?? 0
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    zoneData["LEVEL 4"] ?? 0
                                )}
                            </td>
                        </tr>
                    `;
                }
            )
            .join("");
    }
}

/* ======================================================
   CURRENT CONDITIONS
   ====================================================== */

function renderCurrentConditions(
    data
) {

    const fireRestriction =
        data.current?.fire_restrictions;

    const currentFireEffectiveEl =
        document.getElementById(
            "currentFireEffective"
        );

    if (
        currentFireLevelEl
    ) {

        currentFireLevelEl.textContent =
            fireRestriction?.level ||
            "Not set";
    }

    if (
        currentFireEffectiveEl
    ) {

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
     * display all zones.
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
     * Temporary legacy fallback.
     */
    const legacyIfpl =
        data.current?.ifpl;


    if (
        currentIfplEl
    ) {

        currentIfplEl.innerHTML =
            legacyIfpl?.level ||
            "Not set";
    }


    const currentIfplEffectiveEl =
        document.getElementById(
            "currentIfplEffective"
        );


    if (
        currentIfplEffectiveEl
    ) {

        currentIfplEffectiveEl.textContent =
            legacyIfpl?.effective_at
                ? "Effective: " +
                  formatPacificDate(
                      legacyIfpl.effective_at
                  )
                : "Effective: —";
    }
}


/* ======================================================
   CURRENT IFPL ZONES
   ====================================================== */

function renderCurrentIfplZones(
    zones
) {

    if (
        !currentIfplEl
    ) {
        return;
    }


    currentIfplEl.innerHTML =
        "";


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "ifpl-zone-list";


    IFPL_ZONES.forEach(
        zoneName => {

            const zone =
                zones.find(
                    record =>
                        record.zone === zoneName
                );


            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "ifpl-zone-item";


            const zoneNameEl =
                document.createElement(
                    "div"
                );

            zoneNameEl.className =
                "ifpl-zone-name";

            zoneNameEl.textContent =
                zoneName;


            const pill =
                document.createElement(
                    "div"
                );

            pill.className =
                "status-pill status-high";


            const dot =
                document.createElement(
                    "span"
                );

            dot.className =
                "status-dot";

            dot.setAttribute(
                "aria-hidden",
                "true"
            );


            const levelEl =
                document.createElement(
                    "span"
                );

            levelEl.className =
                "status-text ifpl-zone-level";

            levelEl.textContent =
                zone?.level ||
                "Not set";


            pill.appendChild(
                dot
            );

            pill.appendChild(
                levelEl
            );


            const level =
                zone?.level ||
                "Not set";


            pill.classList.remove(
                "status-low",
                "status-moderate",
                "status-high",
                "status-extreme"
            );


            pill.classList.add(
                getStatusClass(
                    level
                )
            );


            const zoneEffective =
                document.createElement(
                    "div"
                );

            zoneEffective.className =
                "ifpl-zone-effective";

            zoneEffective.textContent =
                zone?.effective_at
                    ? "Effective: " +
                      formatPacificDate(
                          zone.effective_at
                      )
                    : "Effective: —";


            item.appendChild(
                zoneNameEl
            );

            item.appendChild(
                pill
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


    if (
        legacyEffectiveEl
    ) {

        legacyEffectiveEl.textContent =
            "";
    }
}


/* ======================================================
   STATUS CLASS
   ====================================================== */

function getStatusClass(
    level
) {

    if (!level) {
        return "status-high";
    }


    const normalized =
        String(level)
            .toUpperCase();


    if (
        normalized === "LOW"
    ) {
        return "status-low";
    }


    if (
        normalized === "MODERATE"
    ) {
        return "status-moderate";
    }


    if (
        normalized === "HIGH"
    ) {
        return "status-high";
    }


    if (
        normalized === "EXTREME"
    ) {
        return "status-extreme";
    }


    return "status-high";
}


/* ======================================================
   FIRE SEASON
   ====================================================== */

function renderFireSeason(
    data
) {

    const current =
        data.current;


    const history =
        Array.isArray(
            data.history
        )
            ? data.history
            : [];


    /*
     * Active season.
     */
    if (
        current
    ) {

        if (
            seasonStatusEl
        ) {

            seasonStatusEl.textContent =
                "ACTIVE";

            seasonStatusEl.className =
                "season-status active";
        }


        if (
            seasonYearEl
        ) {

            seasonYearEl.textContent =
                current.year;
        }


        if (
            seasonStartDateEl
        ) {

            seasonStartDateEl.textContent =
                formatDateOnly(
                    current.start_date
                );
        }


        if (
            seasonEndDateEl
        ) {

            seasonEndDateEl.textContent =
                current.end_date
                    ? formatDateOnly(
                        current.end_date
                    )
                    : "—";
        }


        if (
            endSeasonControlsEl
        ) {

            endSeasonControlsEl.style.display =
                "";
        }


        if (
            startSeasonPanel
        ) {

            startSeasonPanel.style.display =
                "none";
        }


        /*
         * Set a sensible default year/date
         * for the next season form.
         */
        const nextYear =
            Number(current.year) + 1;


        if (
            newSeasonYearEl
        ) {

            newSeasonYearEl.value =
                nextYear;
        }


        /*
         * History is still displayed below.
         */
        renderFireSeasonHistory(
            history
        );

        return;
    }


    /*
     * No active season.
     */
    if (
        currentSeasonPanel
    ) {

        currentSeasonPanel.style.display =
            "";
    }


    if (
        seasonStatusEl
    ) {

        seasonStatusEl.textContent =
            "INACTIVE";

        seasonStatusEl.className =
            "season-status inactive";
    }


    /*
     * Show most recent completed season
     * in the current panel.
     */
    const mostRecentSeason =
        history.length > 0
            ? history[0]
            : null;


    if (
        mostRecentSeason
    ) {

        if (
            seasonYearEl
        ) {

            seasonYearEl.textContent =
                mostRecentSeason.year;
        }


        if (
            seasonStartDateEl
        ) {

            seasonStartDateEl.textContent =
                formatDateOnly(
                    mostRecentSeason.start_date
                );
        }


        if (
            seasonEndDateEl
        ) {

            seasonEndDateEl.textContent =
                mostRecentSeason.end_date
                    ? formatDateOnly(
                        mostRecentSeason.end_date
                    )
                    : "—";
        }

    } else {

        if (
            seasonYearEl
        ) {

            seasonYearEl.textContent =
                "—";
        }


        if (
            seasonStartDateEl
        ) {

            seasonStartDateEl.textContent =
                "—";
        }


        if (
            seasonEndDateEl
        ) {

            seasonEndDateEl.textContent =
                "—";
        }
    }


    /*
     * No active season means the End control
     * should not be shown.
     */
    if (
        endSeasonControlsEl
    ) {

        endSeasonControlsEl.style.display =
            "none";
    }


    /*
     * Show Start New Fire Season.
     */
    if (
        startSeasonPanel
    ) {

        startSeasonPanel.style.display =
            "";
    }


    /*
     * Default next season year.
     */
    if (
        newSeasonYearEl
    ) {

        const suggestedYear =
            mostRecentSeason
                ? Number(
                    mostRecentSeason.year
                ) + 1
                : new Date()
                    .getFullYear();

        newSeasonYearEl.value =
            suggestedYear;
    }


    renderFireSeasonHistory(
        history
    );
}


/* ======================================================
   FIRE SEASON HISTORY
   ====================================================== */

function renderFireSeasonHistory(
    history
) {

    if (
        !fireSeasonHistoryContainer
    ) {
        return;
    }


    if (
        history.length === 0
    ) {

        fireSeasonHistoryContainer.innerHTML =
            "<p>No fire season history available.</p>";

        return;
    }


    const table =
        document.createElement(
            "table"
        );


    table.innerHTML = `
        <thead>
            <tr>
                <th>Season</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;


    const tbody =
        table.querySelector(
            "tbody"
        );


    history.forEach(
        season => {

            const row =
                document.createElement(
                    "tr"
                );


            const statusClass =
                season.status === "ACTIVE"
                    ? "scheduled"
                    : "";


            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        season.year
                    )}
                </td>

                <td>
                    <span class="status ${statusClass}">
                        ${escapeHtml(
                            season.status
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        formatDateOnly(
                            season.start_date
                        )
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        formatDateOnly(
                            season.end_date
                        )
                    )}
                </td>
            `;


            tbody.appendChild(
                row
            );
        }
    );


    fireSeasonHistoryContainer.innerHTML =
        "";


    fireSeasonHistoryContainer.appendChild(
        table
    );
}


/* ======================================================
   END FIRE SEASON
   ====================================================== */

async function endFireSeason() {

    if (
        !endSeasonDateEl ||
        !endSeasonButton
    ) {
        return;
    }


    const endDate =
        endSeasonDateEl.value;


    if (!endDate) {

        showMessage(
            "Please enter the fire season end date.",
            "error"
        );

        return;
    }


    const confirmed =
        window.confirm(
            `End the current fire season on ${formatDateOnly(
                endDate
            )}?\n\n` +
            "The current season will be marked INACTIVE " +
            "and the end date will be permanently recorded."
        );


    if (!confirmed) {
        return;
    }


    endSeasonButton.disabled =
        true;

    endSeasonButton.textContent =
        "Ending Fire Season...";


    clearMessage();


    try {

        const response =
            await fetch(
                `${API_BASE}/fire-season`,
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
                            action:
                                "END",
                            endDate
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
                "Unable to end fire season."
            );
        }


        showMessage(
            "Fire season ended successfully.",
            "success"
        );


        endSeasonDateEl.value =
            "";


        await loadFireSeasonData();


    } catch (error) {

        console.error(
            "End fire season error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to end fire season.",
            "error"
        );


    } finally {

        endSeasonButton.disabled =
            false;

        endSeasonButton.textContent =
            "End Fire Season";
    }
}


/* ======================================================
   START NEW FIRE SEASON
   ====================================================== */

async function startFireSeason() {

    if (
        !newSeasonYearEl ||
        !newSeasonStartDateEl ||
        !startSeasonButton
    ) {
        return;
    }


    const year =
        Number(
            newSeasonYearEl.value
        );


    const startDate =
        newSeasonStartDateEl.value;


    if (
        !Number.isInteger(year) ||
        !startDate
    ) {

        showMessage(
            "Please enter a fire season year and start date.",
            "error"
        );

        return;
    }


    const confirmed =
        window.confirm(
            `Start fire season ${year} on ${formatDateOnly(
                startDate
            )}?\n\n` +
            "This will create a new historical fire season record."
        );


    if (!confirmed) {
        return;
    }


    startSeasonButton.disabled =
        true;

    startSeasonButton.textContent =
        "Starting Fire Season...";


    clearMessage();


    try {

        const response =
            await fetch(
                `${API_BASE}/fire-season`,
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
                            action:
                                "START",
                            year,
                            startDate
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
                "Unable to start fire season."
            );
        }


        showMessage(
            "Fire season started successfully.",
            "success"
        );


        newSeasonStartDateEl.value =
            "";


        await loadFireSeasonData();


    } catch (error) {

        console.error(
            "Start fire season error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to start fire season.",
            "error"
        );


    } finally {

        startSeasonButton.disabled =
            false;

        startSeasonButton.textContent =
            "Start Fire Season";
    }
}


/* ======================================================
   UPCOMING CHANGES
   ====================================================== */

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


/* ======================================================
   GROUP UPCOMING CHANGES
   ====================================================== */

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
                !groups.has(
                    key
                )
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


/* ======================================================
   CANCEL FUTURE SCHEDULED CHANGE
   ====================================================== */

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


/* ======================================================
   CHANGE HISTORY
   ====================================================== */

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


/* ======================================================
   SCHEDULE CHANGE
   ====================================================== */

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


/* ======================================================
   HELPERS
   ====================================================== */

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


/* ======================================================
   INITIALIZE
   ====================================================== */

if (
    changeTypeEl
) {

    changeTypeEl.addEventListener(
        "change",
        () => {

            updateLevelOptions();

            updateIfplZoneControls();
        }
    );

}


const initialScopeEl =
    getIfplScopeEl();


if (
    initialScopeEl
) {

    initialScopeEl.addEventListener(
        "change",
        updateIfplZoneControls
    );
}


if (
    endSeasonButton
) {

    endSeasonButton.addEventListener(
        "click",
        endFireSeason
    );
}


if (
    startSeasonButton
) {

    startSeasonButton.addEventListener(
        "click",
        startFireSeason
    );
}


updateLevelOptions();

updateIfplZoneControls();

loadAdminData();

loadFireSeasonData();
