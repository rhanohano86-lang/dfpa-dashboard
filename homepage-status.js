/* =========================================================
   DFPA Homepage Fire Status Widget
   Loads current status once when the widget opens.
   No polling or automatic refresh.
   ========================================================= */

const fireDangerStatus = document.getElementById("fire-danger-status");
const publicUseStatus = document.getElementById("public-use-status");
const ifplStatus = document.getElementById("ifpl-status");

const IFPL_ZONES = [
  "DG-1",
  "DG-2",
  "UA-1",
  "UA-2"
];

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

function setUnavailable(message) {
  fireDangerStatus.textContent = message;
  publicUseStatus.textContent = message;

  ifplStatus.textContent = message;
}

function displayIFPL(zones) {
  const zoneMap = new Map(
    zones.map(zone => [
      zone.zone,
      zone
    ])
  );

  const zoneLevels = IFPL_ZONES.map(zoneName => {
    const zone = zoneMap.get(zoneName);

    return zone?.level
      ? String(zone.level).trim()
      : null;
  });

  const availableLevels = zoneLevels.filter(Boolean);

  /*
   * If all available zones have the same level,
   * display one concise "All Zones" message.
   */
  const uniqueLevels = [
    ...new Set(
      availableLevels.map(level =>
        level.toUpperCase()
      )
    )
  ];

  if (
    availableLevels.length === IFPL_ZONES.length &&
    uniqueLevels.length === 1
  ) {
    const level = formatLevel(availableLevels[0]);

    ifplStatus.textContent =
      `${level} — All Zones`;

    ifplStatus.setAttribute(
      "aria-label",
      `Industrial Fire Precaution Level: ${level}, all zones`
    );

    return;
  }

  /*
   * If the zones have different levels, display
   * each zone individually.
   */
  const heading = document.createElement("p");
  heading.textContent = "Current levels by zone:";
  heading.setAttribute("aria-hidden", "true");

  const list = document.createElement("ul");

  list.setAttribute(
    "aria-label",
    "Current Industrial Fire Precaution Level by zone"
  );

  IFPL_ZONES.forEach(zoneName => {
    const zone = zoneMap.get(zoneName);
    const level = zone?.level
      ? formatLevel(zone.level)
      : "Information unavailable";

    const item = document.createElement("li");

    item.textContent =
      `${zoneName}: ${level}`;

    item.setAttribute(
      "aria-label",
      `${zoneName}, current Industrial Fire Precaution Level: ${level}`
    );

    list.appendChild(item);
  });

  ifplStatus.replaceChildren(
    heading,
    list
  );

  ifplStatus.setAttribute(
    "aria-label",
    "Industrial Fire Precaution Level varies by zone"
  );
}

async function loadHomepageStatus() {
  try {
    /*
     * One request only.
     * There is intentionally no polling,
     * setInterval, recurring timeout, or reload.
     */
    const response = await fetch(
      "/api/public-status",
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Unable to load current DFPA status."
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        "Unable to load current DFPA status."
      );
    }

    /*
     * Fire Danger and Public Use Restrictions
     * use the same current restriction level.
     */
    const fireRestrictionLevel =
      data.current
        ?.fire_restrictions
        ?.level;

    const formattedLevel =
      formatLevel(fireRestrictionLevel);

    fireDangerStatus.textContent =
      formattedLevel;

    publicUseStatus.textContent =
      formattedLevel;

    fireDangerStatus.setAttribute(
      "aria-label",
      `Current Fire Danger: ${formattedLevel}`
    );

    publicUseStatus.setAttribute(
      "aria-label",
      `Current Public Use Restrictions: ${formattedLevel}`
    );

    /*
     * Load the four zone-specific IFPL levels.
     */
    const zones =
      Array.isArray(
        data.current?.ifpl_zones
      )
        ? data.current.ifpl_zones
        : [];

    displayIFPL(zones);

  } catch (error) {
    console.error(
      "DFPA homepage status widget error:",
      error
    );

    setUnavailable(
      "Current status information is unavailable."
    );
  }
}

/*
 * Initial load only.
 * This function is called exactly once.
 */
loadHomepageStatus();
