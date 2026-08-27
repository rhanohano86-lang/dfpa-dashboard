/* ======================================================
   DFPA FIRE SEASON REPORT API
   Read-only operational-day reporting
   ====================================================== */

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
   FORMAT PACIFIC CALENDAR DATE
   Returns YYYY-MM-DD
   ====================================================== */

function getPacificDate(
    value
) {

    const date =
        value instanceof Date
            ? value
            : new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }


    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone:
                "America/Los_Angeles",
            year:
                "numeric",
            month:
                "2-digit",
            day:
                "2-digit"
        }
    ).format(
        date
    );
}


/* ======================================================
   DATE-ONLY HELPERS
   These use UTC internally so there are no timezone
   surprises when calculating calendar-day differences.
   ====================================================== */

function parseDateOnly(
    value
) {

    if (!value) {
        return null;
    }


    const parts =
        String(value)
            .split("-");


    if (
        parts.length !== 3
    ) {
        return null;
    }


    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const day =
        Number(parts[2]);


    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    ) {
        return null;
    }


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }


    return date;
}


function formatDateOnly(
    value
) {

    const date =
        parseDateOnly(
            value
        );


    if (!date) {
        return null;
    }


    return date
        .toISOString()
        .slice(
            0,
            10
        );
}


function daysBetweenInclusive(
    startDate,
    endDate
) {

    const start =
        parseDateOnly(
            startDate
        );

    const end =
        parseDateOnly(
            endDate
        );


    if (
        !start ||
        !end ||
        end < start
    ) {
        return 0;
    }


    const millisecondsPerDay =
        1000 *
        60 *
        60 *
        24;


    return (
        Math.floor(
            (
                end.getTime() -
                start.getTime()
            ) /
            millisecondsPerDay
        ) + 1
    );
}


/* ======================================================
   GET OPERATIONAL REPORT END DATE
   ====================================================== */

function getOperationalReportEndDate(
    season
) {

    /*
     * Completed season:
     * use its stored end date.
     */
    if (
        season.status === "INACTIVE" &&
        season.end_date
    ) {

        return formatDateOnly(
            season.end_date
        );
    }


    /*
     * Active season:
     * use today's Pacific calendar date.
     */
    return getPacificDate(
        new Date()
    );
}


/* ======================================================
   CALCULATE STATUS DURATIONS
   ====================================================== */

function calculateDurations(
    events,
    startDate,
    endDate,
    levels,
    zone = null
) {

    const totals = {};


    levels.forEach(
        level => {
            totals[level] = 0;
        }
    );


    /*
     * Convert events into operational calendar dates.
     * Only ACTIVE events inside the report period count.
     */
    const normalizedEvents =
        events
            .filter(
                event =>
                    event.status === "ACTIVE"
            )
            .map(
                event => ({
                    ...event,
                    effective_date:
                        getPacificDate(
                            event.effective_at
                        )
                })
            )
            .filter(
                event =>
                    event.effective_date &&
                    event.effective_date >=
                        startDate &&
                    event.effective_date <=
                        endDate
            )
            .sort(
                (a, b) =>
                    a.effective_date
                        .localeCompare(
                            b.effective_date
                        )
            );


    /*
     * Nothing recorded for the requested period.
     */
    if (
        normalizedEvents.length === 0
    ) {
        return totals;
    }


    for (
        let index = 0;
        index < normalizedEvents.length;
        index++
    ) {

        const current =
            normalizedEvents[index];


        const next =
            normalizedEvents[
                index + 1
            ];


        /*
         * The current status applies from its
         * effective date through the day before
         * the next status change.
         */
        let periodEnd =
            next
                ? next.effective_date
                : endDate;


        if (next) {

            const nextDate =
                parseDateOnly(
                    next.effective_date
                );


            if (nextDate) {

                nextDate.setUTCDate(
                    nextDate.getUTCDate() - 1
                );


                periodEnd =
                    nextDate
                        .toISOString()
                        .slice(
                            0,
                            10
                        );
            }
        }


        /*
         * Cap the period to the report end.
         */
        if (
            periodEnd > endDate
        ) {
            periodEnd =
                endDate;
        }


        const days =
            daysBetweenInclusive(
                current.effective_date,
                periodEnd
            );


        if (
            Object.prototype.hasOwnProperty.call(
                totals,
                current.level
            )
        ) {

            totals[current.level] +=
                Math.max(
                    0,
                    days
                );
        }
    }


    return totals;
}


/* ======================================================
   GET SEASON
   ====================================================== */

async function getSeason(
    db,
    requestedYear
) {

    if (requestedYear) {

        const year =
            Number(
                requestedYear
            );


        if (
            !Number.isInteger(year) ||
            year < 2000 ||
            year > 2100
        ) {

            throw new Error(
                "Invalid fire season year."
            );
        }


        return db
            .prepare(`
                SELECT
                    id,
                    year,
                    status,
                    start_date,
                    end_date,
                    end_time,
                    created_by,
                    created_at,
                    updated_by,
                    updated_at
                FROM fire_seasons
                WHERE year = ?
                LIMIT 1
            `)
            .bind(
                year
            )
            .first();
    }


    return db
        .prepare(`
            SELECT
                id,
                year,
                status,
                start_date,
                end_date,
                end_time,
                created_by,
                created_at,
                updated_by,
                updated_at
            FROM fire_seasons
            WHERE status = 'ACTIVE'
            ORDER BY year DESC
            LIMIT 1
        `)
        .first();
}


/* ======================================================
   REPORT ENDPOINT
   ====================================================== */

export async function onRequestGet(
    context
) {

    try {

        const email =
            context.request.headers.get(
                "CF-Access-Authenticated-User-Email"
            );


        /*
         * Reports contain administrative data.
         */
        if (!email) {

            return Response.json(
                {
                    success: false,
                    error:
                        "Authenticated administrator identity not found."
                },
                { status: 401 }
            );
        }


        /*
         * Confirm active administrator.
         */
        const administrator =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        email,
                        role
                    FROM administrators
                    WHERE lower(email) = lower(?)
                      AND active = 1
                    LIMIT 1
                `)
                .bind(
                    email
                )
                .first();


        if (!administrator) {

            return Response.json(
                {
                    success: false,
                    error:
                        "You are not an active DFPA administrator."
                },
                { status: 403 }
            );
        }


        /*
         * Requested season.
         */
        const url =
            new URL(
                context.request.url
            );


        const requestedYear =
            url.searchParams.get(
                "year"
            );


        const season =
            await getSeason(
                context.env.DFPA_DB,
                requestedYear
            );


        if (!season) {

            return Response.json(
                {
                    success: false,
                    error:
                        "Fire season not found."
                },
                { status: 404 }
            );
        }


        /*
         * Validate season dates.
         */
        const startDate =
            formatDateOnly(
                season.start_date
            );


        const reportEndDate =
            getOperationalReportEndDate(
                season
            );


        if (
            !startDate ||
            !reportEndDate
        ) {

            return Response.json(
                {
                    success: false,
                    error:
                        "Unable to determine the fire season reporting period."
                },
                { status: 500 }
            );
        }


        if (
            reportEndDate < startDate
        ) {

            return Response.json(
                {
                    success: false,
                    error:
                        "Fire season end date cannot be before its start date."
                },
                { status: 500 }
            );
        }


        /*
         * Operational calendar-day count.
         * Start day counts as Day 1.
         */
        const totalDays =
            daysBetweenInclusive(
                startDate,
                reportEndDate
            );


        /* ==================================================
           FIRE DANGER / PUR EVENTS
           ================================================== */

        const fireEventResult =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        level,
                        effective_at,
                        status
                    FROM status_change_events
                    WHERE season_year = ?
                      AND category = 'FIRE'
                      AND zone IS NULL
                    ORDER BY effective_at ASC
                `)
                .bind(
                    season.year
                )
                .all();


        const fireEvents =
            fireEventResult.results || [];


        const fireTotals =
            calculateDurations(
                fireEvents,
                startDate,
                reportEndDate,
                FIRE_LEVELS
            );


        /* ==================================================
           IFPL EVENTS
           ================================================== */

        const ifplEventResult =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        zone,
                        level,
                        effective_at,
                        status
                    FROM status_change_events
                    WHERE season_year = ?
                      AND category = 'IFPL'
                    ORDER BY
                        zone ASC,
                        effective_at ASC
                `)
                .bind(
                    season.year
                )
                .all();


        const ifplEvents =
            ifplEventResult.results || [];


        const ifplTotals = {};


        IFPL_ZONES.forEach(
            zone => {

                const zoneEvents =
                    ifplEvents.filter(
                        event =>
                            event.zone === zone
                    );


                ifplTotals[zone] =
                    calculateDurations(
                        zoneEvents,
                        startDate,
                        reportEndDate,
                        IFPL_LEVELS,
                        zone
                    );
            }
        );


        /* ==================================================
           RESPONSE
           ================================================== */

        return Response.json({

            success: true,

            report: {

                season: {
                    id:
                        season.id,

                    year:
                        season.year,

                    status:
                        season.status,

                    start_date:
                        season.start_date,

                    end_date:
                        season.end_date,

                   end_time:
                        season.end_time,     

                    report_end_date:
                        reportEndDate,

                    total_days:
                        totalDays
                },


                fire_danger: {

                    LOW:
                        fireTotals.LOW,

                    MODERATE:
                        fireTotals.MODERATE,

                    HIGH:
                        fireTotals.HIGH,

                    EXTREME:
                        fireTotals.EXTREME,

                    total:
                        Object.values(
                            fireTotals
                        ).reduce(
                            (
                                total,
                                days
                            ) =>
                                total + days,
                            0
                        )
                },


                ifpl: {

                    "DG-1":
                        ifplTotals["DG-1"],

                    "DG-2":
                        ifplTotals["DG-2"],

                    "UA-1":
                        ifplTotals["UA-1"],

                    "UA-2":
                        ifplTotals["UA-2"]
                }

            }

        });


    } catch (error) {

        console.error(
            "Season report error:",
            error
        );


        return Response.json(
            {
                success: false,
                error:
                    "Unable to generate fire season report."
            },
            { status: 500 }
        );
    }
}
