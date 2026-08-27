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

const seasonYearEl =
    document.getElementById(
        "seasonYear"
    );

const loadReportButton =
    document.getElementById(
        "loadReportButton"
    );

const printButton =
    document.getElementById(
        "printButton"
    );

const reportEl =
    document.getElementById(
        "report"
    );

const messageEl =
    document.getElementById(
        "message"
    );


/* ======================================================
   MESSAGE HANDLING
   ====================================================== */

function showError(
    message
) {

    if (!messageEl) {
        return;
    }

    messageEl.textContent =
        message;

    messageEl.className =
        "message error";
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
   DATE FORMATTING
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


    if (
        parts.length !== 3
    ) {
        return String(value);
    }


    const date =
        new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
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


/* ======================================================
   LOAD AVAILABLE SEASONS
   ====================================================== */

async function loadSeasonList() {

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
                "Unable to load fire seasons."
            );
        }


        const history =
            Array.isArray(
                data.history
            )
                ? data.history
                : [];


        seasonYearEl.innerHTML =
            "";


        if (
            history.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                "";

            option.textContent =
                "No seasons available";

            seasonYearEl.appendChild(
                option
            );


            if (
                reportEl
            ) {

                reportEl.innerHTML = `
                    <div class="loading">
                        No fire season records are available.
                    </div>
                `;
            }


            return;
        }


        history.forEach(
            season => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    season.year;


                option.textContent =
                    season.year +
                    (
                        season.status === "ACTIVE"
                            ? " — ACTIVE"
                            : ""
                    );


                seasonYearEl.appendChild(
                    option
                );
            }
        );


        /*
         * Prefer the current active season.
         * Otherwise use the newest season.
         */
        const activeSeason =
            data.current;


        seasonYearEl.value =
            activeSeason?.year ||
            history[0].year;


        await generateReport();


    } catch (error) {

        console.error(
            "Season list loading error:",
            error
        );


        showError(
            "Unable to load fire season records."
        );


        if (
            reportEl
        ) {

            reportEl.innerHTML = `
                <div class="loading">
                    Unable to load report data.
                </div>
            `;
        }
    }
}


/* ======================================================
   GENERATE REPORT
   ====================================================== */

async function generateReport() {

    clearMessage();


    const year =
        seasonYearEl?.value;


    if (!year) {

        showError(
            "Please select a fire season."
        );

        return;
    }


    if (
        loadReportButton
    ) {

        loadReportButton.disabled =
            true;

        loadReportButton.textContent =
            "Generating...";
    }


    if (
        reportEl
    ) {

        reportEl.innerHTML = `
            <div class="loading">
                Generating report...
            </div>
        `;
    }


    try {

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
                "Unable to generate season report."
            );
        }


        renderReport(
            data.report
        );


    } catch (error) {

        console.error(
            "Season report generation error:",
            error
        );


        showError(
            error.message ||
            "Unable to generate season report."
        );


        if (
            reportEl
        ) {

            reportEl.innerHTML = `
                <div class="loading">
                    Unable to generate report.
                </div>
            `;
        }


    } finally {

        if (
            loadReportButton
        ) {

            loadReportButton.disabled =
                false;

            loadReportButton.textContent =
                "Generate Report";
        }
    }
}


/* ======================================================
   RENDER REPORT
   ====================================================== */

function renderReport(
    report
) {

    if (
        !reportEl ||
        !report
    ) {
        return;
    }


    const season =
        report.season || {};


    const fire =
        report.fire_danger || {};


    const ifpl =
        report.ifpl || {};


    const statusLabel =
        season.status === "ACTIVE"
            ? "ACTIVE"
            : "INACTIVE";


    const endDate =
        season.end_date ||
        null;


    reportEl.innerHTML = `

        <div class="report-header">

            <h2>
                Fire Season Summary Report
            </h2>

            <div class="subtitle">
                Douglas Forest Protective Association
            </div>

        </div>


        <div class="report-meta">

            <div class="meta-box">

                <div class="meta-label">
                    Fire Season
                </div>

                <div class="meta-value">
                    ${escapeHtml(
                        season.year
                    )}
                </div>

            </div>


            <div class="meta-box">

                <div class="meta-label">
                    Status
                </div>

                <div class="meta-value">
                    ${escapeHtml(
                        statusLabel
                    )}
                </div>

            </div>


            <div class="meta-box">

                <div class="meta-label">
                    Total Days
                </div>

                <div class="meta-value">
                    ${escapeHtml(
                        season.total_days ?? 0
                    )}
                </div>

            </div>


            <div class="meta-box">

                <div class="meta-label">
                    Start Date
                </div>

                <div class="meta-value">
                    ${escapeHtml(
                        formatDateOnly(
                            season.start_date
                        )
                    )}
                </div>

            </div>


            <div class="meta-box">

                <div class="meta-label">
                    End Date
                </div>

                <div class="meta-value">
                    ${escapeHtml(
                        formatDateOnly(
                            endDate
                        )
                    )}
                </div>

            </div>


            <div class="meta-box">

                <div class="meta-label">
                    Reporting Through
                </div>

                <div class="meta-value">
                    ${escapeHtml(
                        formatDateOnly(
                            season.report_end_date
                        )
                    )}
                </div>

            </div>

        </div>


        <!-- FIRE DANGER -->

        <div class="section">

            <h3>
                Fire Danger &amp; Public Use Restrictions
            </h3>


            <table>

                <thead>

                    <tr>
                        <th>Level</th>
                        <th style="text-align:right;">
                            Days
                        </th>
                    </tr>

                </thead>


                <tbody>

                    ${FIRE_LEVELS.map(
                        level => `
                            <tr>
                                <td>
                                    ${escapeHtml(
                                        level
                                    )}
                                </td>

                                <td class="number">
                                    ${escapeHtml(
                                        fire[level] ?? 0
                                    )}
                                </td>
                            </tr>
                        `
                    ).join("")}


                    <tr class="total-row">

                        <td>
                            Total
                        </td>

                        <td class="number">
                            ${escapeHtml(
                                fire.total ?? 0
                            )}
                        </td>

                    </tr>

                </tbody>

            </table>

        </div>


        <!-- IFPL -->

        <div class="section">

            <h3>
                Industrial Fire Precaution Levels
            </h3>


            <div class="ifpl-wrapper">

                <table class="ifpl-table">

                    <thead>

                        <tr>

                            <th>
                                Regulation Use Zone
                            </th>

                            <th>
                                Level 1
                            </th>

                            <th>
                                Level 2
                            </th>

                            <th>
                                Level 3
                            </th>

                            <th>
                                Level 4
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${IFPL_ZONES.map(
                            zone => {

                                const zoneData =
                                    ifpl[zone] || {};


                                return `
                                    <tr>

                                        <td>
                                            <strong>
                                                ${escapeHtml(
                                                    zone
                                                )}
                                            </strong>
                                        </td>

                                        <td class="number">
                                            ${escapeHtml(
                                                zoneData["LEVEL 1"] ?? 0
                                            )}
                                        </td>

                                        <td class="number">
                                            ${escapeHtml(
                                                zoneData["LEVEL 2"] ?? 0
                                            )}
                                        </td>

                                        <td class="number">
                                            ${escapeHtml(
                                                zoneData["LEVEL 3"] ?? 0
                                            )}
                                        </td>

                                        <td class="number">
                                            ${escapeHtml(
                                                zoneData["LEVEL 4"] ?? 0
                                            )}
                                        </td>

                                    </tr>
                                `;
                            }
                        ).join("")}

                    </tbody>

                </table>

            </div>

        </div>


        <div class="report-footer">

            <div>
                Generated from the DFPA Fire Status Dashboard.
            </div>

            <div>
                Report generated:
                ${escapeHtml(
                    new Date().toLocaleString(
                        "en-US",
                        {
                            timeZone:
                                "America/Los_Angeles"
                        }
                    )
                )}
            </div>

        </div>
    `;
}


/* ======================================================
   HTML ESCAPING
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
   EVENT HANDLERS
   ====================================================== */

if (
    loadReportButton
) {

    loadReportButton.addEventListener(
        "click",
        generateReport
    );
}


if (
    seasonYearEl
) {

    seasonYearEl.addEventListener(
        "change",
        generateReport
    );
}


if (
    printButton
) {

    printButton.addEventListener(
        "click",
        () => {

            window.print();
        }
    );
}


/* ======================================================
   INITIALIZE
   ====================================================== */

loadSeasonList();
