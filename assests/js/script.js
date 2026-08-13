/* ======================================================
   DFPA FIRE STATUS DASHBOARD
   Automatic Scheduling + Responsive Wix Height
   ====================================================== */


/* ======================================================
   DASHBOARD DATA
   ====================================================== */

const dashboardData = {

    fireSeason: {
        active: true,
        startDate: "May 30, 2026"
    },

    /*
     * FIRE DANGER + PUBLIC USE RESTRICTIONS
     * These are intentionally synchronized.
     *
     * Change BOTH together by changing "level".
     */

    fireRestrictionsSchedule: [

        {
            effective: "2026-08-12T00:01:00",
            level: "HIGH"
        }

        /*
         * Future scheduled changes can be added here.
         *
         * Example:
         *
         * {
         *     effective: "2026-08-20T00:01:00",
         *     level: "EXTREME"
         * }
         */

    ],


    /*
     * IFPL operates independently.
     */

    ifplSchedule: [

        {
            effective: "2026-07-15T00:01:00",
            level: "LEVEL 3"
        }

        /*
         * Future example:
         *
         * {
         *     effective: "2026-08-20T00:01:00",
         *     level: "LEVEL 4"
         * }
         */

    ],


    lastUpdated: {
        date: "August 12, 2026",
        time: "2:30 PM"
    }

};


/* ======================================================
   GET CURRENT SCHEDULED VALUE
   ====================================================== */

function getScheduledValue(schedule, fallback) {

    const now = new Date();

    let currentValue = fallback;

    schedule.forEach(item => {

        const effectiveDate = new Date(item.effective);

        if (now >= effectiveDate) {
            currentValue = item.level;
        }

    });

    return currentValue;
}


/* ======================================================
   GET STATUS CSS CLASS
   ====================================================== */

function getStatusClass(level) {

    const normalized = level.toUpperCase();

    if (normalized === "LOW") {
        return "status-low";
    }

    if (normalized === "MODERATE") {
        return "status-moderate";
    }

    if (normalized === "HIGH") {
        return "status-high";
    }

    if (normalized === "EXTREME") {
        return "status-extreme";
    }

    return "status-high";
}


/* ======================================================
   FIRE SEASON
   ====================================================== */

function updateFireSeason() {

    const seasonStatus =
        document.getElementById("season-status");

    const seasonDay =
        document.getElementById("season-day");

    const seasonStartDate =
        document.getElementById("season-start-date");


    if (!seasonStatus || !seasonDay || !seasonStartDate) {
        return;
    }


    seasonStatus.textContent =
        dashboardData.fireSeason.active
            ? "ACTIVE"
            : "INACTIVE";


    seasonStatus.classList.remove(
        "active",
        "inactive"
    );


    seasonStatus.classList.add(
        dashboardData.fireSeason.active
            ? "active"
            : "inactive"
    );


    seasonStartDate.textContent =
        dashboardData.fireSeason.startDate;


    if (!dashboardData.fireSeason.active) {

        seasonDay.textContent = "—";

        return;
    }


    const startDate =
        new Date(
            dashboardData.fireSeason.startDate
        );


    const today = new Date();


    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);


    const millisecondsPerDay =
        1000 * 60 * 60 * 24;


    const dayCount =
        Math.floor(
            (today - startDate) /
            millisecondsPerDay
        ) + 1;


    seasonDay.textContent =
        Math.max(dayCount, 1);

}


/* ======================================================
   FIRE DANGER + PUBLIC USE RESTRICTIONS
   SYNCHRONIZED
   ====================================================== */

function updateFireRestrictions() {

    const fireDanger =
        document.getElementById("fire-danger");

    const publicUseRestrictions =
        document.getElementById(
            "public-use-restrictions"
        );


    if (!fireDanger || !publicUseRestrictions) {
        return;
    }


    const level =
        getScheduledValue(
            dashboardData.fireRestrictionsSchedule,
            "LOW"
        );


    fireDanger.textContent = level;

    publicUseRestrictions.textContent = level;


    const statusClass =
        getStatusClass(level);


    const fireDangerPill =
        fireDanger.closest(".status-pill");


    const publicUsePill =
        publicUseRestrictions.closest(
            ".status-pill"
        );


    if (fireDangerPill) {

        fireDangerPill.classList.remove(
            "status-low",
            "status-moderate",
            "status-high",
            "status-extreme"
        );

        fireDangerPill.classList.add(
            statusClass
        );

    }


    if (publicUsePill) {

        publicUsePill.classList.remove(
            "status-low",
            "status-moderate",
            "status-high",
            "status-extreme"
        );

        publicUsePill.classList.add(
            statusClass
        );

    }

}


/* ======================================================
   IFPL
   ====================================================== */

function updateIFPL() {

    const ifplLevel =
        document.getElementById("ifpl-level");


    if (!ifplLevel) {
        return;
    }


    const level =
        getScheduledValue(
            dashboardData.ifplSchedule,
            "LEVEL 1"
        );


    ifplLevel.textContent = level;

}


/* ======================================================
   DASHBOARD UPDATED
   ====================================================== */

function updateLastUpdated() {

    const lastUpdatedDate =
        document.getElementById(
            "last-updated-date"
        );


    const lastUpdatedTime =
        document.getElementById(
            "last-updated-time"
        );


    if (lastUpdatedDate) {

        lastUpdatedDate.textContent =
            dashboardData.lastUpdated.date;

    }


    if (lastUpdatedTime) {

        lastUpdatedTime.textContent =
            dashboardData.lastUpdated.time;

    }

}


/* ======================================================
   WIX AUTO HEIGHT
   ====================================================== */

function sendHeightToWix() {

    const height =
        document.documentElement.scrollHeight;


    window.parent.postMessage(
        {
            type: "DFPA_DASHBOARD_HEIGHT",
            height: height
        },
        "*"
    );

}


/* ======================================================
   SEND HEIGHT AFTER PAGE LOAD
   ====================================================== */

function initializeHeightMessaging() {

    sendHeightToWix();


    /*
     * Recheck after the browser finishes
     * rendering fonts, images and layout.
     */

    setTimeout(
        sendHeightToWix,
        100
    );


    setTimeout(
        sendHeightToWix,
        500
    );


    setTimeout(
        sendHeightToWix,
        1000
    );


    /*
     * Watch for any changes to the
     * dashboard's size.
     */

    if (typeof ResizeObserver !== "undefined") {

        const observer =
            new ResizeObserver(
                sendHeightToWix
            );


        observer.observe(
            document.documentElement
        );

    }

}


/* ======================================================
   INITIALIZE DASHBOARD
   ====================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateFireSeason();

        updateFireRestrictions();

        updateIFPL();

        updateLastUpdated();

        initializeHeightMessaging();

    }
);


/* ======================================================
   WINDOW LOAD
   ====================================================== */

window.addEventListener(
    "load",
    () => {

        sendHeightToWix();

    }
);
