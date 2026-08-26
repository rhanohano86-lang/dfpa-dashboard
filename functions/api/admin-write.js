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


export async function onRequestPost(context) {
    try {

        /*
         * Cloudflare Access provides the authenticated
         * administrator's email address.
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
         * Confirm that the authenticated user is an
         * active DFPA administrator.
         */
        const administrator =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT email, role
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
         * Read request body.
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
         *
         * "all" is the default because most IFPL changes
         * apply to all four regulation use zones.
         */
        const ifplApplyTo =
            body.ifplApplyTo || "all";

        const ifplZone =
            body.ifplZone || null;


        /*
         * Validate change type.
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


        /*
         * Validate level.
         */
        const validLevels =
            changeType === "fire"
                ? FIRE_LEVELS
                : IFPL_LEVELS;

        if (!validLevels.includes(level)) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Invalid level."
                },
                { status: 400 }
            );
        }


        /*
         * Validate IFPL application scope.
         */
        if (changeType === "ifpl") {

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


        /*
         * Validate effective date/time.
         */
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
         * Every IFPL administrative action gets one
         * shared group ID.
         */
        const changeGroupId =
            changeType === "ifpl"
                ? crypto.randomUUID()
                : null;


        /*
         * --------------------------------------------------
         * FIRE DANGER / PUBLIC USE RESTRICTIONS
         * --------------------------------------------------
         *
         * This remains one record exactly as before.
         */
        if (changeType === "fire") {

            const result =
                await context.env.DFPA_DB
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
                    )
                    .run();

            const recordId =
                result.meta.last_row_id;


            const auditDetails =
                JSON.stringify({
                    level,
                    effective_at:
                        normalizedEffectiveAt,
                    zone: null,
                    change_group_id: null,
                    apply_to: null,
                    notes
                });


            await context.env.DFPA_DB.batch([

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
                        VALUES (?, ?, ?, ?, ?)
                    `)
                    .bind(
                        "CREATE",
                        "fire_restrictions",
                        recordId,
                        auditDetails,
                        email
                    ),

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


            return Response.json({
                success: true,
                message:
                    "Change scheduled successfully.",
                records: [
                    {
                        id: recordId,
                        type: "fire",
                        zone: null,
                        change_group_id: null,
                        level,
                        effective_at:
                            normalizedEffectiveAt,
                        created_by: email
                    }
                ]
            });
        }


        /*
         * --------------------------------------------------
         * IFPL
         * --------------------------------------------------
         *
         * "all" creates four zone records.
         * "zone" creates one zone record.
         */
        const zones =
            ifplApplyTo === "all"
                ? IFPL_ZONES
                : [ifplZone];


        /*
         * Insert all IFPL zone records together.
         */
        const insertStatements =
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


        const insertResults =
            await context.env.DFPA_DB.batch(
                insertStatements
            );


        /*
         * Build the exact records created from the
         * database-generated IDs.
         */
        const records =
            zones.map(
                (zone, index) => ({
                    id:
                        insertResults[index]
                            .meta
                            .last_row_id,
                    type: "ifpl",
                    zone,
                    change_group_id:
                        changeGroupId,
                    level,
                    effective_at:
                        normalizedEffectiveAt,
                    created_by:
                        email
                })
            );


        /*
         * Create one audit record for each zone.
         */
        const auditStatements =
            records.map(
                record => {

                    const auditDetails =
                        JSON.stringify({
                            level:
                                record.level,
                            effective_at:
                                record.effective_at,
                            zone:
                                record.zone,
                            change_group_id:
                                record.change_group_id,
                            apply_to:
                                ifplApplyTo,
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
                            VALUES (?, ?, ?, ?, ?)
                        `)
                        .bind(
                            "CREATE",
                            "ifpl_schedule_zoned",
                            record.id,
                            auditDetails,
                            email
                        );
                }
            );


        /*
         * Add the dashboard Last Updated operation
         * to the same audit batch.
         */
        auditStatements.push(

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

        );


        await context.env.DFPA_DB.batch(
            auditStatements
        );


        return Response.json({
            success: true,
            message:
                "Change scheduled successfully.",
            records
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
