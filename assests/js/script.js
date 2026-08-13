/* ======================================================
   DFPA FIRE STATUS DASHBOARD
   Version 2.4

   Fire Danger + Public Use Restrictions:
   SYNCHRONIZED

   IFPL:
   INDEPENDENT

   Fire Season:
   AUTOMATICALLY CALCULATED

   Time Zone:
   Pacific Time
   ====================================================== */


/* ======================================================
   DFPA DASHBOARD CONTROL CENTER

   THIS IS THE ONLY SECTION YOU SHOULD NORMALLY EDIT.

   ====================================================== */

const dashboardData = {


    /* ==================================================
       FIRE SEASON
       ================================================== */

    fireSeason: {

        startDateTime: "2026-05-30T00:01:00",

        endDateTime: null

    },


    /* ==================================================
       FIRE DANGER + PUBLIC USE RESTRICTIONS
       SYNCHRONIZED
       ==================================================

       Both Fire Danger and Public Use Restrictions
       use this SAME schedule.

       They will always display the same level
       and the same color.

       ================================================== */

    fireDangerAndRestrictions: [

        {
            effective: "2026-07-11T00:01:00",
            level: "HIGH"
        }

    ],


    /* ==================================================
       IFPL
       ==================================================

       IFPL has its own independent schedule.

       ================================================== */

    ifpl: [

        {
            effective: "2026-07-15T00:01:00",
            level: "LEVEL 3"
        }

    ],


    /* ==================================================
       DASHBOARD LAST UPDATED
       ==================================================

       This represents the date/time the dashboard
       information was last reviewed or updated.

       ================================================== */

    lastUpdated: {

        date: "August 12, 2026",

        time: "2:30 PM"

    }

};


/* ======================================================
   SYSTEM SETTINGS
   ====================================================== */

const DASHBOARD_TIME_ZONE =
    "America/Los_Angeles";

const REFRESH_INTERVAL =
    30000;


/* ======================================================
   GET CURRENT PACIFIC DATE
   ====================================================== */

function getPacificDateParts() {

    const now =
        new Date();


    const formatter =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    DASHBOARD_TIME_ZONE,

                year: "numeric",

                month: "numeric",

                day: "numeric"
            }
        );


    const parts =
        formatter.formatToParts(now);


    let year;
    let month;
    let day;


    parts.forEach(
        part => {

            if (
                part.type === "year"
            ) {

                year =
                    Number(part.value);

            }


            if (
                part.type === "month"
            ) {

                month =
                    Number(part.value);

            }


            if (
                part.type === "day"
            ) {

                day =
                    Number(part.value);

            }

        }
    );


    return {

        year: year,

        month: month,

        day: day

    };

}


/* ======================================================
   PARSE SCHEDULED PACIFIC DATE/TIME
   ====================================================== */

function parsePacificDateTime(value) {

    const match =
        value.match(
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
        );


    if (!match) {

        console.error(
            "Invalid scheduled date/time:",
            value
        );

        return new Date(NaN);

    }


    const year =
        Number(match[1]);

    const month =
        Number(match[2]);

    const day =
        Number(match[3]);

    const hour =
        Number(match[4]);

    const minute =
        Number(match[5]);

    const second =
        Number(match[6] || 0);


    const utcGuess =
        Date.UTC(
            year,
            month - 1,
            day,
            hour,
            minute,
            second
        );


    const formatter =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    DASHBOARD_TIME_ZONE,

                year: "numeric",

                month: "2-digit",

                day: "2-digit",

                hour: "2-digit",

                minute: "2-digit",

                second: "2-digit",

                hourCycle: "h23"
            }
        );


    const parts =
        formatter.formatToParts(
            new Date(utcGuess)
        );


    const values = {};


    parts.forEach(
        part => {

            if (
                part.type !== "literal"
            ) {

                values[part.type] =
                    Number(part.value);

            }

        }
    );


    const pacificAsUTC =
        Date.UTC(
            values.year,
            values.month - 1,
            values.day,
            values.hour,
            values.minute,
            values.second
        );


    const offset =
        pacificAsUTC - utcGuess;


    return new Date(
        utcGuess - offset
    );

}


/* ======================================================
   GET CURRENT SCHEDULED VALUE
   ====================================================== */

function getCurrentScheduledValue(schedule) {

    if (
        !Array.isArray(schedule) ||
        schedule.length === 0
    ) {

        return null;

    }


    const now =
        new Date();


    let currentValue =
        null;


    let latestEffective =
        null;


    schedule.forEach(
        entry => {

            const effective =
                parsePacificDateTime(
                    entry.effective
                );


            if (
                Number.isNaN(
                    effective.getTime()
                )
            ) {

                return;

            }


            if (
                effective <= now
            ) {

                if (
                    latestEffective === null ||
                    effective > latestEffective
                ) {

                    latestEffective =
                        effective;

                    currentValue =
                        entry.level;

                }

            }

        }
    );


    return currentValue;

}


/* ======================================================
   STATUS COLOR
   ====================================================== */

function getStatusClass(status) {

    if (!status) {

        return "";

    }


    switch (
        status
            .toUpperCase()
            .trim()
    ) {

        case "LOW":

            return "status-low";


        case "MODERATE":

            return "status-moderate";


        case "HIGH":

            return "status-high";


        case "EXTREME":

            return "status-extreme";


        default:

            return "";

    }

}


/* ======================================================
   UPDATE STATUS PILL
   ====================================================== */

function updateStatusPill(
    element,
    status
) {

    if (
        !element ||
        !status
    ) {

        return;

    }


    element.textContent =
        status;


    const pill =
        element.closest(
            ".status-pill"
        );


    if (!pill) {

        return;

    }


    pill.classList.remove(

        "status-low",

        "status-moderate",

        "status-high",

        "status-extreme"

    );


    const statusClass =
        getStatusClass(status);


    if (statusClass) {

        pill.classList.add(
            statusClass
        );

    }

}


/* ======================================================
   FIRE SEASON
   ====================================================== */

function updateFireSeason() {

    const status =
        document.getElementById(
            "season-status"
        );


    const day =
        document.getElementById(
            "season-day"
        );


    const startDisplay =
        document.getElementById(
            "season-start-date"
        );


    if (
        !status ||
        !day ||
        !startDisplay
    ) {

        return;

    }


    const startDateOnly =
        dashboardData
            .fireSeason
            .startDateTime
            .split("T")[0];


    const startParts =
        startDateOnly.split("-");


    const startYear =
        Number(startParts[0]);


    const startMonth =
        Number(startParts[1]);


    const startDay =
        Number(startParts[2]);


    const today =
        getPacificDateParts();


    const startCalendar =
        Date.UTC(
            startYear,
            startMonth - 1,
            startDay
        );


    const todayCalendar =
        Date.UTC(
            today.year,
            today.month - 1,
            today.day
        );


    const now =
        new Date();


    const seasonStart =
        parsePacificDateTime(
            dashboardData
                .fireSeason
                .startDateTime
        );


    let seasonEnd =
        null;


    if (
        dashboardData
            .fireSeason
            .endDateTime
    ) {

        seasonEnd =
            parsePacificDateTime(
                dashboardData
                    .fireSeason
                    .endDateTime
            );

    }


    const active =
        now >= seasonStart &&
        (
            seasonEnd === null ||
            now < seasonEnd
        );


    /* ==================================================
       Status
       ================================================== */

    if (active) {

        status.textContent =
            "ACTIVE";

        status.classList.remove(
            "inactive"
        );

        status.classList.add(
            "active"
        );

    } else {

        status.textContent =
            "INACTIVE";

        status.classList.remove(
            "active"
        );

        status.classList.add(
            "inactive"
        );

    }


    /* ==================================================
       Start Date
       ================================================== */

    startDisplay.textContent =
        new Date(
            Date.UTC(
                startYear,
                startMonth - 1,
                startDay
            )
        ).toLocaleDateString(
            "en-US",
            {
                month: "long",

                day: "numeric",

                year: "numeric",

                timeZone: "UTC"
            }
        );


    /* ==================================================
       Current Fire Season Day
       ================================================== */

    if (!active) {

        day.textContent =
            "—";

        return;

    }


    const millisecondsPerDay =
        86400000;


    const difference =
        todayCalendar -
        startCalendar;


    const seasonDay =
        Math.floor(
            difference /
            millisecondsPerDay
        ) + 1;


    day.textContent =
        seasonDay >= 1
            ? seasonDay
            : "—";

}


/* ======================================================
   FIRE DANGER + PUBLIC USE RESTRICTIONS
   SYNCHRONIZED
   ====================================================== */

function updateFireDangerAndRestrictions() {

    const currentLevel =
        getCurrentScheduledValue(
            dashboardData
                .fireDangerAndRestrictions
        );


    if (!currentLevel) {

        return;

    }


    const fireDanger =
        document.getElementById(
            "fire-danger"
        );


    const restrictions =
        document.getElementById(
            "public-use-restrictions"
        );


    updateStatusPill(
        fireDanger,
        currentLevel
    );


    updateStatusPill(
        restrictions,
        currentLevel
    );

}


/* ======================================================
   IFPL
   ====================================================== */

function updateIFPL() {

    const currentIFPL =
        getCurrentScheduledValue(
            dashboardData.ifpl
        );


    const element =
        document.getElementById(
            "ifpl-level"
        );


    if (
        !currentIFPL ||
        !element
    ) {

        return;

    }


    element.textContent =
        currentIFPL;


    const pill =
        element.closest(
            ".status-pill"
        );


    if (!pill) {

        return;

    }


    pill.classList.remove(

        "status-low",

        "status-moderate",

        "status-high",

        "status-extreme"

    );


    const ifplColors = {

        "LEVEL 1":
            "status-low",

        "LEVEL 2":
            "status-moderate",

        "LEVEL 3":
            "status-high",

        "LEVEL 4":
            "status-extreme",

        "LEVEL 5":
            "status-extreme"

    };


    const colorClass =
        ifplColors[
            currentIFPL
                .toUpperCase()
                .trim()
        ];


    if (colorClass) {

        pill.classList.add(
            colorClass
        );

    }

}


/* ======================================================
   DASHBOARD UPDATED
   ====================================================== */

function updateLastUpdated() {

    const date =
        document.getElementById(
            "last-updated-date"
        );


    const time =
        document.getElementById(
            "last-updated-time"
        );


    if (date) {

        date.textContent =
            dashboardData
                .lastUpdated
                .date;

    }


    if (time) {

        time.textContent =
            dashboardData
                .lastUpdated
                .time;

    }

}


/* ======================================================
   UPDATE ENTIRE DASHBOARD
   ====================================================== */

function updateDashboard() {

    updateFireSeason();

    updateFireDangerAndRestrictions();

    updateIFPL();

    updateLastUpdated();

}


/* ======================================================
   INITIALIZE DASHBOARD
   ====================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateDashboard();


        /*
           Check every 30 seconds for scheduled
           changes.
        */

        setInterval(
            updateDashboard,
            REFRESH_INTERVAL
        );

    }
);
