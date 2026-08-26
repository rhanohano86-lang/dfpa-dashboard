/* ======================================================
   DFPA FIRE DANGER LEVEL STATUS DASHBOARD
   Zone-Aware IFPL + Automatic Scheduling + Wix Height
   ====================================================== */


/* ======================================================
   DASHBOARD DATA
   ====================================================== */

const dashboardData = {

    fireSeason: {
        active: true,
        startDate: "May 30, 2026"
    },

    fireRestrictionsLevel: "LOW",

    ifplLevel: "LEVEL 1",

    ifplZones: [],

    lastUpdated: {
        date: "",
        time: ""
    }

};


/* ======================================================
   IFPL REGULATION USE ZONES
   ====================================================== */

const IFPL_ZONES = [
    "DG-1",
    "DG-2",
    "UA-1",
    "UA-2"
];


/* ======================================================
   FORMAT PACIFIC DATE/TIME
   ====================================================== */

function formatPacificDateTime(
    timestamp
) {

    if (!timestamp) {
        return "Effective: —";
    }


    const date =
        new Date(timestamp);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Effective: —";
    }


    return (
        "Effective: " +
        date.toLocaleString(
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
        )
    );

}


/* ======================================================
   LOAD PUBLIC STATUS FROM D1
   ====================================================== */

async function loadPublicStatus() {

    try {

        const response =
            await fetch(
                "/api/public-status",
                {
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
                "Unable to load current fire status."
            );
        }


        /* --------------------------------------------------
           FIRE DANGER + PUBLIC USE RESTRICTIONS
           -------------------------------------------------- */

        if (
            data.current?.fire_restrictions
        ) {

            dashboardData.fireRestrictionsLevel =
                data.current
                    .fire_restrictions
                    .level;
        }


        const fireRestrictionsEffective =
            document.getElementById(
                "fire-restrictions-effective"
            );


        if (
            fireRestrictionsEffective &&
            data.current
                ?.fire_restrictions
                ?.effective_at
        ) {

            fireRestrictionsEffective.textContent =
                formatPacificDateTime(
                    data.current
                        .fire_restrictions
                        .effective_at
                );

        }


        /* --------------------------------------------------
           ZONE-AWARE IFPL
           -------------------------------------------------- */

        if (
            Array.isArray(
                data.current?.ifpl_zones
            ) &&
            data.current.ifpl_zones.length > 0
        ) {

            dashboardData.ifplZones =
                data.current.ifpl_zones;


            /*
             * Keep the legacy single IFPL value
             * synchronized with the first available zone.
             */
            dashboardData.ifplLevel =
                data.current
                    .ifpl_zones[0]
                    ?.level ||
                dashboardData.ifplLevel;

        }


        /* --------------------------------------------------
           LEGACY IFPL FALLBACK
           -------------------------------------------------- */

        else if (
            data.current?.ifpl
        ) {

            dashboardData.ifplLevel =
                data.current
                    .ifpl
                    .level;

        }


        /* --------------------------------------------------
           DASHBOARD LAST UPDATED
           -------------------------------------------------- */

        if (
            data.last_updated
        ) {

            const lastUpdated =
                new Date(
                    data.last_updated
                );


            if (
                !Number.isNaN(
                    lastUpdated.getTime()
                )
            ) {

                dashboardData
                    .lastUpdated
                    .date =
                    lastUpdated
                        .toLocaleDateString(
                            "en-US",
                            {
                                timeZone:
                                    "America/Los_Angeles",
                                month:
                                    "long",
                                day:
                                    "numeric",
                                year:
                                    "numeric"
                            }
                        );


                dashboardData
                    .lastUpdated
                    .time =
                    lastUpdated
                        .toLocaleTimeString(
                            "en-US",
                            {
                                timeZone:
                                    "America/Los_Angeles",
                                hour:
                                    "numeric",
                                minute:
                                    "2-digit"
                            }
                        );

            }

        }


    } catch (error) {

        console.error(
            "Public status loading error:",
            error
        );

    }

}


/* ======================================================
   GET CURRENT SCHEDULED VALUE
   ====================================================== */

function getScheduledValue(
    schedule,
    fallback
) {

    const now =
        new Date();


    let currentValue =
        fallback;


    schedule.forEach(
        item => {

            const effectiveDate =
                new Date(
                    item.effective
                );


            if (
                now >= effectiveDate
            ) {

                currentValue =
                    item.level;

            }

        }
    );


    return currentValue;
}


/* ======================================================
   GET STATUS CSS CLASS
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


    /*
     * IFPL levels do not have their own
     * status-color classes, so use the
     * standard high-status presentation
     * as the safe fallback.
     */
    return "status-high";
}


/* ======================================================
   FIRE SEASON
   ====================================================== */

function updateFireSeason() {

    const seasonStatus =
        document.getElementById(
            "season-status"
        );


    const seasonDay =
        document.getElementById(
            "season-day"
        );


    const seasonStartDate =
        document.getElementById(
            "season-start-date"
        );


    if (
        !seasonStatus ||
        !seasonDay ||
        !seasonStartDate
    ) {
        return;
    }


    seasonStatus.textContent =
        dashboardData
            .fireSeason
            .active
            ? "ACTIVE"
            : "INACTIVE";


    seasonStatus.classList.remove(
        "active",
        "inactive"
    );


    seasonStatus.classList.add(
        dashboardData
            .fireSeason
            .active
            ? "active"
            : "inactive"
    );


    seasonStartDate.textContent =
        dashboardData
            .fireSeason
            .startDate;


    if (
        !dashboardData
            .fireSeason
            .active
    ) {

        seasonDay.textContent =
            "—";

        return;
    }


    const startDate =
        new Date(
            dashboardData
                .fireSeason
                .startDate
        );


    const today =
        new Date();


    startDate.setHours(
        0,
        0,
        0,
        0
    );


    today.setHours(
        0,
        0,
        0,
        0
    );


    const millisecondsPerDay =
        1000 *
        60 *
        60 *
        24;


    const dayCount =
        Math.floor(
            (
                today -
                startDate
            ) /
            millisecondsPerDay
        ) + 1;


    seasonDay.textContent =
        Math.max(
            dayCount,
            1
        );

}


/* ======================================================
   FIRE DANGER + PUBLIC USE RESTRICTIONS
   SYNCHRONIZED
   ====================================================== */

function updateFireRestrictions() {

    const fireDanger =
        document.getElementById(
            "fire-danger"
        );


    const publicUseRestrictions =
        document.getElementById(
            "public-use-restrictions"
        );


    if (
        !fireDanger ||
        !publicUseRestrictions
    ) {
        return;
    }


    const level =
        dashboardData
            .fireRestrictionsLevel;


    fireDanger.textContent =
        level;


    publicUseRestrictions.textContent =
        level;


    const statusClass =
        getStatusClass(
            level
        );


    const fireDangerPill =
        fireDanger.closest(
            ".status-pill"
        );


    const publicUsePill =
        publicUseRestrictions.closest(
            ".status-pill"
        );


    if (
        fireDangerPill
    ) {

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


    if (
        publicUsePill
    ) {

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

    /*
     * Zone-aware IFPL display.
     */
    const zoneContainer =
        document.getElementById(
            "ifpl-zones"
        );


    /*
     * Legacy single IFPL element.
     */
    const legacyIfplLevel =
        document.getElementById(
            "ifpl-level"
        );


    const legacyIfplEffective =
        document.getElementById(
            "ifpl-effective"
        );


    /*
     * If zone data exists, populate
     * each regulation use zone.
     */
    if (
        zoneContainer &&
        Array.isArray(
            dashboardData.ifplZones
        ) &&
        dashboardData.ifplZones.length > 0
    ) {

        const zoneMap =
            new Map(
                dashboardData.ifplZones.map(
                    zone => [
                        zone.zone,
                        zone
                    ]
                )
            );


        IFPL_ZONES.forEach(
            zoneName => {

                const zoneData =
                    zoneMap.get(
                        zoneName
                    );


                const zoneElement =
                    zoneContainer.querySelector(
                        `[data-zone="${zoneName}"]`
                    );


                if (!zoneElement) {
                    return;
                }


                const levelElement =
                    zoneElement.querySelector(
                        ".ifpl-zone-level"
                    );


                const effectiveElement =
                    zoneElement.querySelector(
                        ".ifpl-zone-effective"
                    );


                const pill =
                    zoneElement.querySelector(
                        ".status-pill"
                    );


                const level =
                    zoneData?.level ||
                    "Not set";


                if (
                    levelElement
                ) {

                    levelElement.textContent =
                        level;

                }


                if (
                    effectiveElement
                ) {

                    effectiveElement.textContent =
                        zoneData
                            ?.effective_at
                            ? formatPacificDateTime(
                                zoneData
                                    .effective_at
                            )
                            : "Effective: —";

                }


                if (
                    pill
                ) {

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

                }

            }
        );


        /*
         * Keep hidden legacy elements synchronized
         * for compatibility with the existing markup.
         */
        if (
            legacyIfplLevel
        ) {

            legacyIfplLevel.textContent =
                dashboardData
                    .ifplZones[0]
                    ?.level ||
                dashboardData
                    .ifplLevel;

        }


        if (
            legacyIfplEffective
        ) {

            legacyIfplEffective.textContent =
                dashboardData
                    .ifplZones[0]
                    ?.effective_at
                    ? formatPacificDateTime(
                        dashboardData
                            .ifplZones[0]
                            .effective_at
                    )
                    : "Effective: —";

        }


        return;
    }


    /*
     * Legacy single IFPL fallback.
     */
    if (
        legacyIfplLevel
    ) {

        legacyIfplLevel.textContent =
            dashboardData
                .ifplLevel;

    }


    if (
        legacyIfplEffective
    ) {

        /*
         * The legacy API response is no longer
         * stored separately, so leave this as-is
         * if no zone data exists.
         */
        legacyIfplEffective.textContent =
            "Effective: —";

    }

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


    if (
        lastUpdatedDate
    ) {

        lastUpdatedDate.textContent =
            dashboardData
                .lastUpdated
                .date;

    }


    if (
        lastUpdatedTime
    ) {

        lastUpdatedTime.textContent =
            dashboardData
                .lastUpdated
                .time;

    }

}


/* ======================================================
   WIX AUTO HEIGHT
   ====================================================== */

function sendHeightToWix() {

    const height =
        document.documentElement
            .scrollHeight;


    window.parent.postMessage(
        {
            type:
                "DFPA_DASHBOARD_HEIGHT",
            height
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
     * Watch for changes to the
     * dashboard's size.
     */

    if (
        typeof ResizeObserver !==
        "undefined"
    ) {

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
    async () => {

        await loadPublicStatus();

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
