/* =========================================================
   DFPA Homepage Fire Status Widget

   Loads current status once when the widget opens.

   No polling.
   No automatic refresh.
   No recurring requests.
   ========================================================= */

const fireDangerCard = document.getElementById("fire-danger-card");
const fireDangerStatus = document.getElementById("fire-danger-status");
const ifplCard = document.getElementById("ifpl-card");
const ifplStatus = document.getElementById("ifpl-status");
const fireSeasonStatus = document.getElementById("fire-season-status");
const statusHeader = document.querySelector(".status-header");

const IFPL_ZONES = [
  "DG-1",
  "DG-2",
  "UA-1",
  "UA-2"
];

/* =========================================================
   STATUS FORMATTING
   ========================================================= */

function formatLevel(level) {
  if (!level) {
    return "Information unavailable";
  }

  const text = String(level).trim();

  if (/^LEVEL\s+[1-4]$/i.test(text)) {
    return text.replace(/^LEVEL/i, "Level");
  }

  return text;
}

function getFireDangerStatusClass(level) {
  const normalized = String(level || "")
    .trim()
    .toUpperCase();

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

  return "status-inactive";
}

function getIFPLStatusClass(level) {
  const normalized = String(level || "")
    .trim()
    .toUpperCase();

  if (normalized === "LEVEL 1") {
    return "status-level-1";
  }

  if (normalized === "LEVEL 2") {
    return "status-level-2";
  }

  if (normalized === "LEVEL 3") {
    return "status-level-3";
  }

  if (normalized === "LEVEL 4") {
    return "status-level-4";
  }

  return "status-inactive";
}

/* =========================================================
   CLASS HELPERS
   ========================================================= */

function removeStatusClasses(element) {
  if (!element) {
    return;
  }

  element.classList.remove(
    "status-low",
    "status-moderate",
    "status-high",
    "status-extreme",
    "status-level-1",
    "status-level-2",
    "status-level-3",
    "status-level-4",
    "status-inactive"
  );
}

function applyStatusClass(element, statusClass) {
  if (!element) {
    return;
  }

  removeStatusClasses(element);
  element.classList.add(statusClass);
}

/* =========================================================
   FIRE SEASON
   ========================================================= */

function displayFireSeason(isActive) {
  if (!fireSeasonStatus) {
    return;
  }

   const statusText = isActive
    ? "— ACTIVE"
    : "— INACTIVE";

  fireSeasonStatus.textContent = statusText;

  fireSeasonStatus.setAttribute(
    "aria-label",
    isActive
      ? "Fire Season Status: Active"
      : "Fire Season Status: Inactive"
  );

  if (statusHeader) {
    statusHeader.classList.toggle(
      "status-inactive",
      !isActive
    );
  }
}

/* =========================================================
   FIRE DANGER / PUBLIC USE RESTRICTIONS
   ========================================================= */

function displayFireDanger(level, isActive) {
  if (!fireDangerCard || !fireDangerStatus) {
    return;
  }

  if (!isActive) {
    fireDangerStatus.textContent = "INACTIVE";

    fireDangerStatus.setAttribute(
      "aria-label",
      "Fire Danger and Public Use Restrictions: Inactive because fire season is not active."
    );

    applyStatusClass(
      fireDangerCard,
      "status-inactive"
    );

    applyStatusClass(
      fireDangerStatus,
      "status-inactive"
    );

    return;
  }

  const formattedLevel =
    formatLevel(level);

  const statusClass =
    getFireDangerStatusClass(level);

  fireDangerStatus.textContent =
    formattedLevel;

  fireDangerStatus.setAttribute(
    "aria-label",
    `Fire Danger and Public Use Restrictions: ${formattedLevel}`
  );

  applyStatusClass(
    fireDangerCard,
    statusClass
  );

  applyStatusClass(
    fireDangerStatus,
    statusClass
  );
}

/* =========================================================
   IFPL
   ========================================================= */

function displayIFPL(zones, isActive) {
  if (!ifplCard || !ifplStatus) {
    return;
  }

  /*
   * Fire season inactive:
   * IFPL is inactive regardless of stored values.
   */

  if (!isActive) {
    ifplStatus.replaceChildren();

    const inactive = document.createElement("p");

    inactive.textContent = "INACTIVE";

    inactive.setAttribute(
      "aria-label",
      "Industrial Fire Precaution Level: Inactive because fire season is not active."
    );

    inactive.className =
      "status-pill status-inactive";

    ifplStatus.appendChild(
      inactive
    );

    applyStatusClass(
      ifplCard,
      "status-inactive"
    );

    ifplStatus.setAttribute(
      "aria-label",
      "Industrial Fire Precaution Level: Inactive because fire season is not active."
    );

    return;
  }

  /*
   * Build a map of the four known regulation-use zones.
   */

  const zoneMap = new Map(
    zones.map(zone => [
      zone.zone,
      zone
    ])
  );

  const zoneLevels =
    IFPL_ZONES.map(zoneName => {
      const zone =
        zoneMap.get(zoneName);

      return zone?.level
        ? String(zone.level).trim()
        : null;
    });

  /*
   * If all four zones have the same level,
   * display one compact status pill.
   */

  const availableLevels =
    zoneLevels.filter(Boolean);

  const uniqueLevels = [
    ...new Set(
      availableLevels.map(level =>
        level.toUpperCase()
      )
    )
  ];

  if (
    availableLevels.length ===
      IFPL_ZONES.length &&
    uniqueLevels.length === 1
  ) {
    const level =
      formatLevel(
        availableLevels[0]
      );

    const statusClass =
      getIFPLStatusClass(
        availableLevels[0]
      );

    ifplStatus.replaceChildren();

    const pill =
      document.createElement("p");

    pill.textContent =
      `${level} — All Zones`;

    pill.className =
      `status-pill ${statusClass}`;

    pill.setAttribute(
      "aria-label",
      `Industrial Fire Precaution Level: ${level}, all four zones`
    );

    ifplStatus.appendChild(
      pill
    );

    applyStatusClass(
      ifplCard,
      statusClass
    );

    ifplStatus.setAttribute(
      "aria-label",
      `Industrial Fire Precaution Level: ${level}, all four zones`
    );

    return;
  }

  /*
   * If zones differ, display each zone separately.
   */

  ifplStatus.replaceChildren();

  const list =
    document.createElement("ul");

  list.setAttribute(
    "aria-label",
    "Industrial Fire Precaution Level by zone"
  );

  IFPL_ZONES.forEach(zoneName => {
    const zone =
      zoneMap.get(zoneName);

    const rawLevel =
      zone?.level || null;

    const level =
      rawLevel
        ? formatLevel(rawLevel)
        : "Information unavailable";

    const statusClass =
      rawLevel
        ? getIFPLStatusClass(rawLevel)
        : "status-inactive";

    const item =
      document.createElement("li");

    const zoneLabel =
      document.createElement("span");

    zoneLabel.textContent =
      `${zoneName}:`;

    zoneLabel.className =
      "ifpl-zone-name";

    const pill =
      document.createElement("span");

    pill.textContent =
      level;

    pill.className =
      `status-pill ${statusClass}`;

    pill.setAttribute(
      "aria-label",
      `${zoneName}, Industrial Fire Precaution Level: ${level}`
    );

    item.appendChild(
      zoneLabel
    );

    item.appendChild(
      pill
    );

    list.appendChild(
      item
    );
  });

  ifplStatus.appendChild(
    list
  );

  /*
   * The card accent follows the highest
   * active IFPL level when zones differ.
   */

  const levelPriority = {
    "LEVEL 1": 1,
    "LEVEL 2": 2,
    "LEVEL 3": 3,
    "LEVEL 4": 4
  };

  const highestLevel =
    availableLevels.reduce(
      (highest, current) => {
        const currentPriority =
          levelPriority[
            current.toUpperCase()
          ] || 0;

        const highestPriority =
          levelPriority[
            highest.toUpperCase()
          ] || 0;

        return currentPriority >
          highestPriority
          ? current
          : highest;
      },
      availableLevels[0] ||
        "LEVEL 1"
    );

  applyStatusClass(
    ifplCard,
    getIFPLStatusClass(
      highestLevel
    )
  );

  ifplStatus.setAttribute(
    "aria-label",
    "Industrial Fire Precaution Level varies by zone. Individual zone levels are listed."
  );
}

/* =========================================================
   ERROR HANDLING
   ========================================================= */

function displayUnavailable() {
  if (fireSeasonStatus) {
    fireSeasonStatus.textContent =
      "Status unavailable";

    fireSeasonStatus.setAttribute(
      "aria-label",
      "Fire Season Status: unavailable"
    );
  }

  if (fireDangerCard && fireDangerStatus) {
    fireDangerStatus.textContent =
      "Information unavailable";

    fireDangerStatus.setAttribute(
      "aria-label",
      "Fire Danger and Public Use Restrictions: information unavailable."
    );

    applyStatusClass(
      fireDangerCard,
      "status-inactive"
    );

    applyStatusClass(
      fireDangerStatus,
      "status-inactive"
    );
  }

  if (ifplCard && ifplStatus) {
    ifplStatus.replaceChildren();

    const unavailable =
      document.createElement("p");

    unavailable.textContent =
      "Information unavailable";

    unavailable.className =
      "status-pill status-inactive";

    unavailable.setAttribute(
      "aria-label",
      "Industrial Fire Precaution Level: information unavailable."
    );

    ifplStatus.appendChild(
      unavailable
    );

    applyStatusClass(
      ifplCard,
      "status-inactive"
    );

    ifplStatus.setAttribute(
      "aria-label",
      "Industrial Fire Precaution Level: information unavailable."
    );
  }
}

/* =========================================================
   LOAD CURRENT STATUS
   ========================================================= */

async function loadHomepageStatus() {
  try {
    /*
     * These are the only network requests made by
     * this widget. They happen once, when the widget loads.
     *
     * There is intentionally:
     * - no setInterval
     * - no recurring setTimeout
     * - no automatic reload
     * - no polling
     */

    const [
      statusResponse,
      seasonResponse
    ] = await Promise.all([
      fetch(
        "/api/public-status",
        {
          cache: "no-store"
        }
      ),

      fetch(
        "/api/fire-season",
        {
          cache: "no-store"
        }
      )
    ]);

    if (
      !statusResponse.ok ||
      !seasonResponse.ok
    ) {
      throw new Error(
        "Unable to load current DFPA status."
      );
    }

    const [
      statusData,
      seasonData
    ] = await Promise.all([
      statusResponse.json(),
      seasonResponse.json()
    ]);

    if (
      !statusData.success ||
      !seasonData.success
    ) {
      throw new Error(
        "Unable to load current DFPA status."
      );
    }

    /*
     * The fire-season API returns the active
     * season in "current". When no active season
     * exists, "current" is null.
     */

    const isFireSeasonActive =
      Boolean(
        seasonData.current
      );

    displayFireSeason(
      isFireSeasonActive
    );

    /*
     * Fire Danger / Public Use Restrictions
     * are synchronized and use the same level.
     */

    const fireRestrictionLevel =
      statusData.current
        ?.fire_restrictions
        ?.level;

    displayFireDanger(
      fireRestrictionLevel,
      isFireSeasonActive
    );

    /*
     * Load the four zone-specific IFPL levels.
     */

    const zones =
      Array.isArray(
        statusData.current
          ?.ifpl_zones
      )
        ? statusData.current.ifpl_zones
        : [];

    displayIFPL(
      zones,
      isFireSeasonActive
    );

  } catch (error) {
    console.error(
      "DFPA homepage status widget error:",
      error
    );

    displayUnavailable();
  }
}

/* =========================================================
   INITIAL LOAD ONLY
   ========================================================= */

loadHomepageStatus();
