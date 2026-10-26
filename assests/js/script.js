/* ======================================================
   DFPA FIRE DANGER LEVEL STATUS DASHBOARD
   Zone-aware IFPL, official fire-season status,
   accessibility support, and responsive Wix height.
   ====================================================== */


/* ======================================================
   DASHBOARD DATA
   ====================================================== */

const dashboardData = {
    fireSeason: {
        active: null,
        startDate: "—",
        loaded: false
    },
    fireRestrictionsLevel: "LOW",
    ifplLevel: "LEVEL 1",
    ifplZones: [],
    lastUpdated: {
        date: "",
        time: ""
    }
};

const IFPL_ZONES = ["DG-1", "DG-2", "UA-1", "UA-2"];


/* ======================================================
   DATE FORMATTING
   ====================================================== */

function formatPacificDateTime(timestamp) {
    if (!timestamp) return "Effective: —";

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Effective: —";

    return "Effective: " + date.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function formatSeasonDate(dateValue) {
    if (!dateValue) return "—";

    // Parse YYYY-MM-DD as a calendar date to prevent
    // timezone conversion from shifting the displayed date.
    const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
        const date = new Date(Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        ));

        return date.toLocaleDateString("en-US", {
            timeZone: "UTC",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-US", {
        timeZone: "America/Los_Angeles",
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}


/* ======================================================
   ACCESSIBILITY HELPERS
   ====================================================== */

function setAccessibleLabel(element, label) {
    if (element) {
        element.setAttribute("aria-label", label);
    }
}

function setAccessibleText(element, text) {
    if (element) {
        element.textContent = text;
    }
}


/* ======================================================
   LOAD OFFICIAL FIRE SEASON STATUS

   The admin fire-season record is authoritative.
   When no season is active, the latest season in
   history is used to display the official status.
   ====================================================== */

async function loadFireSeasonStatus() {
    try {
        const response = await fetch("/api/fire-season", {
            cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                "Unable to load current fire season status."
            );
        }

        const season = data.current || (
            Array.isArray(data.history)
                ? data.history[0]
                : null
        );

        if (!season) {
            dashboardData.fireSeason.active = false;
            dashboardData.fireSeason.startDate = "—";
            dashboardData.fireSeason.loaded = true;
            return;
        }

        dashboardData.fireSeason.active =
            String(season.status || "").toUpperCase() === "ACTIVE";

        dashboardData.fireSeason.startDate =
            formatSeasonDate(season.start_date);

        dashboardData.fireSeason.loaded = true;

    } catch (error) {
        dashboardData.fireSeason.loaded = false;

        console.error(
            "Public fire season loading error:",
            error
        );
    }
}


/* ======================================================
   LOAD CURRENT PUBLIC FIRE STATUS
   ====================================================== */

async function loadPublicStatus() {
    try {
        const response = await fetch("/api/public-status", {
            cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error("Unable to load current fire status.");
        }

        // Preserve the recorded Fire Danger/PUR level.
        // The PUR display is changed to INACTIVE below
        // whenever the official fire season is inactive.
        if (data.current?.fire_restrictions) {
            dashboardData.fireRestrictionsLevel =
                data.current.fire_restrictions.level ||
                dashboardData.fireRestrictionsLevel;
        }

        const fireRestrictionsEffective = document.getElementById(
            "fire-restrictions-effective"
        );

        if (fireRestrictionsEffective) {
            fireRestrictionsEffective.textContent =
                formatPacificDateTime(
                    data.current?.fire_restrictions?.effective_at
                );
        }

        // Load zone-specific IFPL data.
        if (
            Array.isArray(data.current?.ifpl_zones) &&
            data.current.ifpl_zones.length > 0
        ) {
            dashboardData.ifplZones = data.current.ifpl_zones;

            dashboardData.ifplLevel =
                data.current.ifpl_zones[0]?.level ||
                dashboardData.ifplLevel;

        } else if (data.current?.ifpl) {
            // Fallback for older, single-level IFPL data.
            dashboardData.ifplLevel =
                data.current.ifpl.level ||
                dashboardData.ifplLevel;
        }

        // Load the authoritative last-updated timestamp.
        if (data.last_updated) {
            const lastUpdated = new Date(data.last_updated);

            if (!Number.isNaN(lastUpdated.getTime())) {
                dashboardData.lastUpdated.date =
                    lastUpdated.toLocaleDateString("en-US", {
                        timeZone: "America/Los_Angeles",
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                    });

                dashboardData.lastUpdated.time =
                    lastUpdated.toLocaleTimeString("en-US", {
                        timeZone: "America/Los_Angeles",
                        hour: "numeric",
                        minute: "2-digit"
                    });
            }
        }

    } catch (error) {
        console.error("Public status loading error:", error);
    }
}


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
   STATUS CSS CLASS
   ====================================================== */

function getStatusClass(level) {
    const normalized = String(level || "").toUpperCase();

    if (normalized === "LOW") return "status-low";
    if (normalized === "MODERATE") return "status-moderate";
    if (normalized === "HIGH") return "status-high";
    if (normalized === "EXTREME") return "status-extreme";

    // Existing fallback for level labels without
    // a dedicated color class.
    return "status-high";
}


/* ======================================================
   FIRE SEASON DISPLAY
   ====================================================== */

function updateFireSeason() {
    const seasonStatus = document.getElementById("season-status");
    const seasonDay = document.getElementById("season-day");
    const seasonStartDate = document.getElementById("season-start-date");

    if (!seasonStatus || !seasonDay || !seasonStartDate) {
        return;
    }

    // Never display a stale or assumed status when the
    // authoritative fire-season record cannot be retrieved.
    if (!dashboardData.fireSeason.loaded) {
        seasonStatus.textContent = "UNAVAILABLE";

        seasonStatus.classList.remove("active", "inactive");

        seasonDay.textContent = "—";
        seasonStartDate.textContent = "—";

        setAccessibleLabel(
            seasonStatus,
            "Fire Season Status: Unavailable"
        );

        setAccessibleLabel(
            seasonDay,
            "Current Fire Season Day: Unavailable"
        );

        setAccessibleLabel(
            seasonStartDate,
            "Fire Season start date: Unavailable"
        );

        return;
    }

    const seasonIsActive = dashboardData.fireSeason.active;
    const statusText = seasonIsActive ? "ACTIVE" : "INACTIVE";

    seasonStatus.textContent = statusText;

    seasonStatus.classList.remove("active", "inactive");
    seasonStatus.classList.add(
        seasonIsActive ? "active" : "inactive"
    );

    setAccessibleLabel(
        seasonStatus,
        `Fire Season Status: ${statusText}`
    );

    seasonStartDate.textContent =
        dashboardData.fireSeason.startDate;

    setAccessibleLabel(
        seasonStartDate,
        `Fire Season start date: ${dashboardData.fireSeason.startDate}`
    );

    if (!seasonIsActive) {
        seasonDay.textContent = "—";

        setAccessibleLabel(
            seasonDay,
            "Current Fire Season Day: Not active"
        );

        return;
    }

    // Count inclusive calendar days from the official start date.
    const startDate = new Date(
        dashboardData.fireSeason.startDate
    );

    const today = new Date();

    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    const currentDay = Math.max(
        Math.floor((today - startDate) / millisecondsPerDay) + 1,
        1
    );

    seasonDay.textContent = currentDay;

    setAccessibleLabel(
        seasonDay,
        `Current Fire Season Day: ${currentDay}`
    );
}


/* ======================================================
   FIRE DANGER + PUBLIC USE RESTRICTIONS
   Show INACTIVE when fire season has ended.
   ====================================================== */

function updateFireRestrictions() {
    const fireDanger = document.getElementById("fire-danger");

    const publicUseRestrictions = document.getElementById(
        "public-use-restrictions"
    );

    if (!fireDanger || !publicUseRestrictions) {
        return;
    }

    const seasonIsInactive =
        dashboardData.fireSeason.loaded &&
        dashboardData.fireSeason.active === false;

    const recordedLevel =
        dashboardData.fireRestrictionsLevel || "Not set";

    const displayLevel =
        seasonIsInactive ? "INACTIVE" : recordedLevel;

    // Display current season status for both fields.
    fireDanger.textContent = displayLevel;
    publicUseRestrictions.textContent = displayLevel;

    const statusClass = seasonIsInactive
        ? "inactive"
        : getStatusClass(recordedLevel);

    const fireDangerPill = fireDanger.closest(".status-pill");
    const publicUsePill =
        publicUseRestrictions.closest(".status-pill");

    [fireDangerPill, publicUsePill].forEach(pill => {
        if (!pill) {
            return;
        }

        pill.classList.remove(
            "status-low",
            "status-moderate",
            "status-high",
            "status-extreme",
            "inactive"
        );

        pill.classList.add(statusClass);

        setAccessibleLabel(
            pill,
            seasonIsInactive
                ? "Status: INACTIVE — Fire season has ended"
                : `Current Status: ${recordedLevel}`
        );
    });

    setAccessibleLabel(
        fireDanger,
        seasonIsInactive
            ? "Fire Danger: INACTIVE — Fire season has ended"
            : `Current Fire Danger Level: ${recordedLevel}`
    );

    setAccessibleLabel(
        publicUseRestrictions,
        seasonIsInactive
            ? "Public Use Restrictions: INACTIVE — Fire season has ended"
            : `Current Public Use Restrictions Level: ${recordedLevel}`
    );
}
/* ======================================================
   INDUSTRIAL FIRE PRECAUTION LEVELS (IFPL)

   All four zones display INACTIVE when the official
   fire season is inactive. The recorded IFPL data
   remains unchanged in the database.
   ====================================================== */

function updateIFPL() {
    const zoneContainer = document.getElementById("ifpl-zones");

    const legacyIfplLevel = document.getElementById("ifpl-level");

    const legacyIfplEffective = document.getElementById(
        "ifpl-effective"
    );

    const seasonIsInactive =
        dashboardData.fireSeason.loaded &&
        dashboardData.fireSeason.active === false;

    // Update DG-1, DG-2, UA-1 and UA-2 when zone markup exists.
    if (
        zoneContainer &&
        Array.isArray(dashboardData.ifplZones) &&
        dashboardData.ifplZones.length > 0
    ) {
        const zoneMap = new Map(
            dashboardData.ifplZones.map(
                zone => [zone.zone, zone]
            )
        );

        IFPL_ZONES.forEach(zoneName => {
            const zoneData = zoneMap.get(zoneName);

            const zoneElement = zoneContainer.querySelector(
                `[data-zone="${zoneName}"]`
            );

            if (!zoneElement) {
                return;
            }

            const levelElement = zoneElement.querySelector(
                ".ifpl-zone-level"
            );

            const effectiveElement = zoneElement.querySelector(
                ".ifpl-zone-effective"
            );

            const pill = zoneElement.querySelector(
                ".status-pill"
            );

            const level = seasonIsInactive
                ? "INACTIVE"
                : (zoneData?.level || "Not set");

            if (levelElement) {
                levelElement.textContent = level;

                setAccessibleLabel(
                    levelElement,
                    seasonIsInactive
                        ? `${zoneName}: Industrial Fire Precaution Level INACTIVE`
                        : `${zoneName} current Industrial Fire Precaution Level: ${level}`
                );
            }

            if (effectiveElement) {
                const effectiveText = seasonIsInactive
                    ? "Inactive for the season"
                    : (
                        zoneData?.effective_at
                            ? formatPacificDateTime(
                                zoneData.effective_at
                            )
                            : "Effective: —"
                    );

                effectiveElement.textContent = effectiveText;

                setAccessibleLabel(
                    effectiveElement,
                    `${zoneName}: ${effectiveText}`
                );
            }

            if (pill) {
                pill.classList.remove(
                    "status-low",
                    "status-moderate",
                    "status-high",
                    "status-extreme",
                    "inactive"
                );

                pill.classList.add(
                    seasonIsInactive
                        ? "inactive"
                        : getStatusClass(level)
                );

                setAccessibleLabel(
                    pill,
                    seasonIsInactive
                        ? `${zoneName}: Industrial Fire Precaution Level INACTIVE`
                        : `${zoneName} current Industrial Fire Precaution Level: ${level}`
                );
            }

            setAccessibleLabel(
                zoneElement,
                seasonIsInactive
                    ? `${zoneName}: Industrial Fire Precaution Level INACTIVE`
                    : `${zoneName}: Industrial Fire Precaution Level ${level}`
            );
        });

        // Keep any existing single-level/legacy fields synchronized.
        if (legacyIfplLevel) {
            const legacyLevel = seasonIsInactive
                ? "INACTIVE"
                : (
                    dashboardData.ifplZones[0]?.level ||
                    dashboardData.ifplLevel
                );

            legacyIfplLevel.textContent = legacyLevel;

            setAccessibleLabel(
                legacyIfplLevel,
                seasonIsInactive
                    ? "Industrial Fire Precaution Level: INACTIVE"
                    : `Industrial Fire Precaution Level: ${legacyLevel}`
            );
        }

        if (legacyIfplEffective) {
            legacyIfplEffective.textContent = seasonIsInactive
                ? "Inactive for the season"
                : (
                    dashboardData.ifplZones[0]?.effective_at
                        ? formatPacificDateTime(
                            dashboardData.ifplZones[0].effective_at
                        )
                        : "Effective: —"
                );
        }

        return;
    }

    // Fallback for older markup that has only one IFPL display.
    if (legacyIfplLevel) {
        const level = seasonIsInactive
            ? "INACTIVE"
            : dashboardData.ifplLevel;

        legacyIfplLevel.textContent = level;

        setAccessibleLabel(
            legacyIfplLevel,
            seasonIsInactive
                ? "Industrial Fire Precaution Level: INACTIVE"
                : `Industrial Fire Precaution Level: ${level}`
        );
    }

    if (legacyIfplEffective) {
        legacyIfplEffective.textContent = seasonIsInactive
            ? "Inactive for the season"
            : "Effective: —";
    }
}


/* ======================================================
   DASHBOARD UPDATED
   ====================================================== */

function updateLastUpdated() {
    const lastUpdatedDate = document.getElementById(
        "last-updated-date"
    );

    const lastUpdatedTime = document.getElementById(
        "last-updated-time"
    );

    const lastUpdatedAccessible = document.getElementById(
        "last-updated-accessible"
    );

    if (lastUpdatedDate) {
        lastUpdatedDate.textContent =
            dashboardData.lastUpdated.date;
    }

    if (lastUpdatedTime) {
        lastUpdatedTime.textContent =
            dashboardData.lastUpdated.time;
    }

    if (lastUpdatedAccessible) {
        const date = dashboardData.lastUpdated.date;
        const time = dashboardData.lastUpdated.time;

        lastUpdatedAccessible.textContent =
            date && time
                ? `${date} at ${time}`
                : "Not available";
    }
}


/* ======================================================
   WIX AUTO HEIGHT
   ====================================================== */

function getDashboardHeight() {
    const documentHeight = document.documentElement
        ? document.documentElement.scrollHeight
        : 0;

    const bodyHeight = document.body
        ? document.body.scrollHeight
        : 0;

    const offsetHeight = document.documentElement
        ? document.documentElement.offsetHeight
        : 0;

    return Math.max(
        documentHeight,
        bodyHeight,
        offsetHeight
    );
}

function sendHeightToWix() {
    window.parent.postMessage(
        {
            type: "DFPA_DASHBOARD_HEIGHT",
            height: getDashboardHeight()
        },
        "*"
    );
}

function initializeHeightMessaging() {
    sendHeightToWix();

    // Recheck height after initial rendering settles.
    [100, 300, 500, 1000, 1500, 2500].forEach(delay => {
        setTimeout(sendHeightToWix, delay);
    });

    // Watch for layout changes.
    if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(sendHeightToWix);

        observer.observe(document.documentElement);

        if (document.body) {
            observer.observe(document.body);
        }
    }

    window.addEventListener("resize", sendHeightToWix);

    window.addEventListener("orientationchange", () => {
        setTimeout(sendHeightToWix, 100);
        setTimeout(sendHeightToWix, 500);
    });

    // Handle mobile viewport changes.
    if (window.visualViewport) {
        window.visualViewport.addEventListener(
            "resize",
            sendHeightToWix
        );

        window.visualViewport.addEventListener(
            "scroll",
            sendHeightToWix
        );
    }
}


/* ======================================================
   INITIALIZE DASHBOARD
   ====================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([
        loadPublicStatus(),
        loadFireSeasonStatus()
    ]);

    updateFireSeason();
    updateFireRestrictions();
    updateIFPL();
    updateLastUpdated();
    initializeHeightMessaging();
});


/* ======================================================
   WINDOW LOAD
   ====================================================== */

window.addEventListener("load", () => {
    sendHeightToWix();
});
