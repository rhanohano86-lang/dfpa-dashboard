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
   DETERMINE FIRE SEASON YEAR
   ====================================================== */

async function getSeasonYearForEffectiveAt(
    db,
    effectiveAt
) {

    const effectiveDate =
        new Date(effectiveAt);


    if (
        Number.isNaN(
            effectiveDate.getTime()
        )
    ) {
        return null;
    }


    /*
     * Convert the effective timestamp to the
     * Pacific calendar date used by DFPA.
     */
    const pacificDate =
        effectiveDate.toLocaleDateString(
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
        );


    const season =
        await db
            .prepare(`
                SELECT
                    year
                FROM fire_seasons
                WHERE start_date <= ?
                  AND (
                      end_date IS NULL
                      OR end_date >= ?
                  )
                ORDER BY year DESC
                LIMIT 1
            `)
            .bind(
                pacificDate,
                pacificDate
            )
            .first();


    return season?.year || null;
}


/* ======================================================
   ADMIN WRITE
   ====================================================== */

export async function onRequestPost(context) {
    try {

        /*
         * --------------------------------------------------
         * AUTHENTICATION
         * --------------------------------------------------
         */

        const email =
            context.request.headers.get(
                "CF-Access-Authenticated-User-Email"
            );


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
         * Confirm active DFPA administrator.
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
                .bind(email)
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
         * --------------------------------------------------
         * REQUEST BODY
         * --------------------------------------------------
         */

        const body =
            await context.request.json();


        const changeType =
            body.changeType;

        const level =
            body.level;

        const effectiveAt =
            body.effectiveAt;

        const notes =
            body.notes || "";


        /*
         * IFPL application scope.
         */
        const ifplApplyTo =
            body.ifplApplyTo || "all";

        const ifplZone =
            body.ifplZone || null;


        /*
         * --------------------------------------------------
         * VALIDATION
         * --------------------------------------------------
         */

        if (
            !["fire", "ifpl"].includes(
                changeType
            )
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Invalid change type."
                },
                { status: 400 }
            );
        }


        const validLevels =
            changeType === "fire"
                ? FIRE_LEVELS
                : IFPL_LEVELS;


        if (
            !validLevels.includes(
                level
            )
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Invalid level."
                },
                { status: 400 }
            );
        }


        if (
            changeType === "ifpl"
        ) {

            if (
                !["all", "zone"].includes(
                    ifplApplyTo
                )
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Invalid IFPL application scope."
                    },
                    { status: 400 }
                );
            }


            if (
                ifplApplyTo === "zone" &&
                !IFPL_ZONES.includes(
                    ifplZone
                )
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "A valid IFPL zone is required."
                    },
                    { status: 400 }
                );
            }
        }


        if (!effectiveAt) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Effective date and time are required."
                },
                { status: 400 }
            );
        }


        const effectiveDate =
            new Date(effectiveAt);


        if (
            Number.isNaN(
                effectiveDate.getTime()
            )
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Invalid effective date/time."
                },
                { status: 400 }
            );
        }


        const normalizedEffectiveAt =
            effectiveDate.toISOString();


        /*
         * Determine which fire season this event
         * belongs to based on the Pacific effective date.
         */
        const seasonYear =
            await getSeasonYearForEffectiveAt(
                context.env.DFPA_DB,
                normalizedEffectiveAt
            );


        /*
         * Every administrative change gets a
         * change group ID.
         *
         * IFPL uses it for the grouped four-zone
         * operation.
         *
         * FIRE also receives one so the event record
         * can be uniquely associated with this action.
         */
        const changeGroupId =
            crypto.randomUUID();


        /* ==================================================
           FIRE DANGER / PUBLIC USE RESTRICTIONS
           ================================================== */

        if (
            changeType === "fire"
        ) {

            const auditDetails =
                JSON.stringify({
                    level,
                    effective_at:
                        normalizedEffectiveAt,
                    zone: null,
                    change_group_id:
                        changeGroupId,
                    apply_to: null,
                    season_year:
                        seasonYear,
                    notes
                });


            /*
             * All Fire Danger operations are performed
             * together:
             *
             * 1. Create source record
             * 2. Create historical event
             * 3. Create audit entry
             * 4. Update dashboard Last Updated
             */
            const batchResults =
                await context.env.DFPA_DB.batch([

                    /*
                     * Create Fire Danger record.
                     */
                    context.env.DFPA_DB
                        .prepare(`
                            INSERT INTO fire_restrictions
                            (
                                effective_at,
                                level,
                                created_by
                            )
                            VALUES (?, ?, ?)
                        `)
                        .bind(
                            normalizedEffectiveAt,
                            level,
                            email
                        ),


                    /*
                     * Create historical status event.
                     *
                     * The source record ID is obtained by
                     * finding the Fire Danger record created
                     * by this administrator with the same
                     * effective timestamp and level.
                     */
                    context.env.DFPA_DB
                        .prepare(`
                            INSERT INTO status_change_events
                            (
                                category,
                                zone,
                                level,
                                effective_at,
                                season_year,
                                source_table,
                                source_record_id,
                                change_group_id,
                                status,
                                created_by
                            )
                            VALUES (
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                (
                                    SELECT id
                                    FROM fire_restrictions
                                    WHERE effective_at = ?
                                      AND level = ?
                                      AND created_by = ?
                                    ORDER BY id DESC
                                    LIMIT 1
                                ),
                                ?,
                                ?,
                                ?
                            )
                        `)
                        .bind(
                            "FIRE",
                            null,
                            level,
                            normalizedEffectiveAt,
                            seasonYear,
                            "fire_restrictions",
                            normalizedEffectiveAt,
                            level,
                            email,
                            changeGroupId,
                            "ACTIVE",
                            email
                        ),


                    /*
                     * Create audit entry.
                     */
                    context.env.DFPA_DB
                        .prepare(`
                            INSERT INTO audit_log
                            (
                                action,
                                section,
                                record_id,
                                details,
                                performed_by
                            )
                            VALUES (
                                ?,
                                ?,
                                (
                                    SELECT id
                                    FROM fire_restrictions
                                    WHERE effective_at = ?
                                      AND level = ?
                                      AND created_by = ?
                                    ORDER BY id DESC
                                    LIMIT 1
                                ),
                                ?,
                                ?
                            )
                        `)
                        .bind(
                            "CREATE",
                            "fire_restrictions",
                            normalizedEffectiveAt,
                            level,
                            email,
                            auditDetails,
                            email
                        ),


                    /*
                     * Update dashboard Last Updated.
                     */
                    context.env.DFPA_DB
                        .prepare(`
                            INSERT INTO dashboard_settings
                            (
                                setting,
                                value,
                                updated_by
                            )
                            VALUES (?, ?, ?)
                            ON CONFLICT(setting)
                            DO UPDATE SET
                                value =
                                    excluded.value,
                                updated_at =
                                    CURRENT_TIMESTAMP,
                                updated_by =
                                    excluded.updated_by
                        `)
                        .bind(
                            "last_updated",
                            new Date().toISOString(),
                            email
                        )

                ]);


            /*
             * Retrieve the created Fire Danger record.
             */
            const record =
                await context.env.DFPA_DB
                    .prepare(`
                        SELECT
                            id,
                            effective_at,
                            level,
                            created_by
                        FROM fire_restrictions
                        WHERE effective_at = ?
                          AND level = ?
                          AND created_by = ?
                        ORDER BY id DESC
                        LIMIT 1
                    `)
                    .bind(
                        normalizedEffectiveAt,
                        level,
                        email
                    )
                    .first();


            if (!record) {

                console.error(
                    "Fire Danger record not found after batch:",
                    batchResults
                );

                throw new Error(
                    "Unable to verify the Fire Danger record."
                );
            }


            return Response.json({
                success: true,

                message:
                    "Change scheduled successfully.",

                records: [
                    {
                        id:
                            record.id,
                        type:
                            "fire",
                        zone:
                            null,
                        change_group_id:
                            changeGroupId,
                        level,
                        effective_at:
                            normalizedEffectiveAt,
                        season_year:
                            seasonYear,
                        created_by:
                            email
                    }
                ]
            });
        }


        /* ==================================================
           IFPL
           ================================================== */

        /*
         * "all" creates four zone records.
         * "zone" creates one zone record.
         */
        const zones =
            ifplApplyTo === "all"
                ? IFPL_ZONES
                : [ifplZone];


        /*
         * --------------------------------------------------
         * SOURCE RECORD INSERTS
         * --------------------------------------------------
         */

        const sourceInsertStatements =
            zones.map(
                zone =>
                    context.env.DFPA_DB
                        .prepare(`
                            INSERT INTO ifpl_schedule_zoned
                            (
                                zone,
                                effective_at,
                                level,
                                change_group_id,
                                created_by
                            )
                            VALUES (?, ?, ?, ?, ?)
                        `)
                        .bind(
                            zone,
                            normalizedEffectiveAt,
                            level,
                            changeGroupId,
                            email
                        )
            );


        /*
         * --------------------------------------------------
         * HISTORICAL EVENT INSERTS
         * --------------------------------------------------
         */

        const eventStatements =
            zones.map(
                zone =>
                    context.env.DFPA_DB
                        .prepare(`
                            INSERT INTO status_change_events
                            (
                                category,
                                zone,
                                level,
                                effective_at,
                                season_year,
                                source_table,
                                source_record_id,
                                change_group_id,
                                status,
                                created_by
                            )
                            VALUES (
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                (
                                    SELECT id
                                    FROM ifpl_schedule_zoned
                                    WHERE zone = ?
                                      AND effective_at = ?
                                      AND level = ?
                                      AND change_group_id = ?
                                      AND created_by = ?
                                    ORDER BY id DESC
                                    LIMIT 1
                                ),
                                ?,
                                ?,
                                ?
                            )
                        `)
                        .bind(
                            "IFPL",
                            zone,
                            level,
                            normalizedEffectiveAt,
                            seasonYear,
                            "ifpl_schedule_zoned",
                            zone,
                            normalizedEffectiveAt,
                            level,
                            changeGroupId,
                            email,
                            changeGroupId,
                            "ACTIVE",
                            email
                        )
            );


        /*
         * --------------------------------------------------
         * AUDIT INSERTS
         * --------------------------------------------------
         */

        const auditStatements =
            zones.map(
                zone => {

                    const auditDetails =
                        JSON.stringify({
                            level,
                            effective_at:
                                normalizedEffectiveAt,
                            zone,
                            change_group_id:
                                changeGroupId,
                            apply_to:
                                ifplApplyTo,
                            season_year:
                                seasonYear,
                            notes
                        });


                    return context.env.DFPA_DB
                        .prepare(`
                            INSERT INTO audit_log
                            (
                                action,
                                section,
                                record_id,
                                details,
                                performed_by
                            )
                            VALUES (
                                ?,
                                ?,
                                (
                                    SELECT id
                                    FROM ifpl_schedule_zoned
                                    WHERE zone = ?
                                      AND effective_at = ?
                                      AND level = ?
                                      AND change_group_id = ?
                                      AND created_by = ?
                                    ORDER BY id DESC
                                    LIMIT 1
                                ),
                                ?,
                                ?
                            )
                        `)
                        .bind(
                            "CREATE",
                            "ifpl_schedule_zoned",
                            zone,
                            normalizedEffectiveAt,
                            level,
                            changeGroupId,
                            email,
                            auditDetails,
                            email
                        );
                }
            );


        /*
         * --------------------------------------------------
         * LAST UPDATED
         * --------------------------------------------------
         */

        const lastUpdatedStatement =
            context.env.DFPA_DB
                .prepare(`
                    INSERT INTO dashboard_settings
                    (
                        setting,
                        value,
                        updated_by
                    )
                    VALUES (?, ?, ?)
                    ON CONFLICT(setting)
                    DO UPDATE SET
                        value =
                            excluded.value,
                        updated_at =
                            CURRENT_TIMESTAMP,
                        updated_by =
                            excluded.updated_by
                `)
                .bind(
                    "last_updated",
                    new Date().toISOString(),
                    email
                );


        /*
         * --------------------------------------------------
         * COMPLETE IFPL TRANSACTION
         * --------------------------------------------------
         */

        await context.env.DFPA_DB.batch([

            ...sourceInsertStatements,

            ...eventStatements,

            ...auditStatements,

            lastUpdatedStatement

        ]);


        /*
         * --------------------------------------------------
         * VERIFY CREATED RECORDS
         * --------------------------------------------------
         */

        const records =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        zone,
                        effective_at,
                        level,
                        change_group_id,
                        created_by
                    FROM ifpl_schedule_zoned
                    WHERE change_group_id = ?
                    ORDER BY zone ASC
                `)
                .bind(
                    changeGroupId
                )
                .all();


        return Response.json({
            success: true,

            message:
                "Change scheduled successfully.",

            records:
                records.results.map(
                    record => ({
                        id:
                            record.id,
                        type:
                            "ifpl",
                        zone:
                            record.zone,
                        change_group_id:
                            record.change_group_id,
                        level:
                            record.level,
                        effective_at:
                            record.effective_at,
                        season_year:
                            seasonYear,
                        created_by:
                            record.created_by
                    })
                )
        });


    } catch (error) {

        console.error(
            "Admin write error:",
            error
        );


        return Response.json(
            {
                success: false,
                error:
                    "Unable to schedule the change."
            },
            { status: 500 }
        );
    }
}
