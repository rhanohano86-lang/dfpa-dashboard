/* ======================================================
   DFPA ADMIN DELETE / CANCEL API
   Preserves status history by marking events CANCELLED
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
         * Confirm the authenticated user is an
         * active DFPA administrator.
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


        const table =
            body.table;


        const recordId =
            Number(body.id);


        const reason =
            body.reason ||
            "Scheduled change cancelled by administrator.";


        /*
         * Only supported schedule tables can be
         * cancelled through this endpoint.
         */
        const allowedTables = [
            "fire_restrictions",
            "ifpl_schedule_zoned"
        ];


        if (
            !allowedTables.includes(
                table
            )
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Invalid schedule table."
                },
                { status: 400 }
            );
        }


        /*
         * --------------------------------------------------
         * VALIDATE RECORD ID
         * --------------------------------------------------
         */

        if (
            !Number.isInteger(
                recordId
            ) ||
            recordId <= 0
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Invalid scheduled change ID."
                },
                { status: 400 }
            );
        }


        /* ==================================================
           FIRE DANGER / PUBLIC USE RESTRICTIONS
           ================================================== */

        if (
            table === "fire_restrictions"
        ) {

            /*
             * Find the scheduled record.
             */
            const record =
                await context.env.DFPA_DB
                    .prepare(`
                        SELECT
                            id,
                            effective_at,
                            level,
                            created_by,
                            created_at
                        FROM fire_restrictions
                        WHERE id = ?
                        LIMIT 1
                    `)
                    .bind(recordId)
                    .first();


            if (!record) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Scheduled change not found."
                    },
                    { status: 404 }
                );
            }


            /*
             * Only future changes can be cancelled.
             */
            const now =
                new Date();


            const effectiveDate =
                new Date(
                    record.effective_at
                );


            if (
                Number.isNaN(
                    effectiveDate.getTime()
                )
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Scheduled change contains an invalid effective date."
                    },
                    { status: 500 }
                );
            }


            if (
                effectiveDate <= now
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "This change is already effective and cannot be cancelled."
                    },
                    { status: 409 }
                );
            }


            /*
             * Build audit details.
             */
            const auditDetails =
                JSON.stringify({
                    reason,
                    level:
                        record.level,
                    effective_at:
                        record.effective_at,
                    zone:
                        null,
                    change_group_id:
                        null,
                    created_by:
                        record.created_by,
                    created_at:
                        record.created_at
                });


            /*
             * Cancel the historical event, delete the
             * scheduled source record, and create the
             * audit record.
             *
             * IMPORTANT:
             * The status-change event is retained rather
             * than deleted.
             */
            await context.env.DFPA_DB.batch([

                /*
                 * Mark the corresponding event cancelled.
                 */
                context.env.DFPA_DB
                    .prepare(`
                        UPDATE status_change_events
                        SET
                            status = 'CANCELLED'
                        WHERE source_table = ?
                          AND source_record_id = ?
                          AND status = 'ACTIVE'
                    `)
                    .bind(
                        "fire_restrictions",
                        recordId
                    ),


                /*
                 * Delete the future scheduled source record.
                 */
                context.env.DFPA_DB
                    .prepare(`
                        DELETE FROM fire_restrictions
                        WHERE id = ?
                    `)
                    .bind(
                        recordId
                    ),


                /*
                 * Preserve the administrative cancellation
                 * in the audit log.
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
                        VALUES (?, ?, ?, ?, ?)
                    `)
                    .bind(
                        "DELETE",
                        "fire_restrictions",
                        recordId,
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


            return Response.json({
                success: true,

                message:
                    "Scheduled change cancelled successfully.",

                records: [
                    {
                        id:
                            recordId,
                        type:
                            "fire",
                        zone:
                            null,
                        change_group_id:
                            null,
                        level:
                            record.level,
                        effective_at:
                            record.effective_at,
                        cancelled_by:
                            email
                    }
                ]
            });
        }


        /* ==================================================
           IFPL
           ================================================== */

        /*
         * One IFPL administrative action is represented
         * by one change_group_id.
         *
         * Apply to All → all four records are cancelled.
         * Individual Zone → one record is cancelled.
         */
        const selectedRecord =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        zone,
                        effective_at,
                        level,
                        change_group_id,
                        created_by,
                        created_at
                    FROM ifpl_schedule_zoned
                    WHERE id = ?
                    LIMIT 1
                `)
                .bind(
                    recordId
                )
                .first();


        if (!selectedRecord) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Scheduled IFPL change not found."
                },
                { status: 404 }
            );
        }


        if (
            !selectedRecord.change_group_id
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Scheduled IFPL change is missing its change group."
                },
                { status: 409 }
            );
        }


        /*
         * Retrieve the complete administrative group.
         */
        const group =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        zone,
                        effective_at,
                        level,
                        change_group_id,
                        created_by,
                        created_at
                    FROM ifpl_schedule_zoned
                    WHERE change_group_id = ?
                    ORDER BY zone ASC
                `)
                .bind(
                    selectedRecord.change_group_id
                )
                .all();


        const groupRecords =
            group.results || [];


        if (
            groupRecords.length === 0
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Scheduled IFPL change group not found."
                },
                { status: 404 }
            );
        }


        /*
         * Make sure every record in the group is still
         * in the future before cancelling any of them.
         */
        const now =
            new Date();


        for (
            const record
            of groupRecords
        ) {

            const effectiveDate =
                new Date(
                    record.effective_at
                );


            if (
                Number.isNaN(
                    effectiveDate.getTime()
                )
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "One or more IFPL records contain an invalid effective date."
                    },
                    { status: 500 }
                );
            }


            if (
                effectiveDate <= now
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "This IFPL change group is already effective and cannot be cancelled."
                    },
                    { status: 409 }
                );
            }
        }


        /*
         * --------------------------------------------------
         * BUILD TRANSACTION
         * --------------------------------------------------
         */

        const statements = [];


        /*
         * Mark every corresponding event CANCELLED.
         */
        statements.push(
            context.env.DFPA_DB
                .prepare(`
                    UPDATE status_change_events
                    SET
                        status = 'CANCELLED'
                    WHERE source_table = ?
                      AND change_group_id = ?
                      AND status = 'ACTIVE'
                `)
                .bind(
                    "ifpl_schedule_zoned",
                    selectedRecord.change_group_id
                )
        );


        /*
         * Build one DELETE audit record for each zone.
         */
        for (
            const record
            of groupRecords
        ) {

            const auditDetails =
                JSON.stringify({
                    reason,
                    level:
                        record.level,
                    effective_at:
                        record.effective_at,
                    zone:
                        record.zone,
                    change_group_id:
                        record.change_group_id,
                    created_by:
                        record.created_by,
                    created_at:
                        record.created_at
                });


            statements.push(
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
                        "DELETE",
                        "ifpl_schedule_zoned",
                        record.id,
                        auditDetails,
                        email
                    )
            );
        }


        /*
         * Delete the entire IFPL source group.
         */
        statements.push(
            context.env.DFPA_DB
                .prepare(`
                    DELETE FROM ifpl_schedule_zoned
                    WHERE change_group_id = ?
                `)
                .bind(
                    selectedRecord.change_group_id
                )
        );


        /*
         * Update dashboard Last Updated.
         */
        statements.push(
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


        /*
         * Execute everything together.
         */
        await context.env.DFPA_DB.batch(
            statements
        );


        return Response.json({
            success: true,

            message:
                "Scheduled IFPL change cancelled successfully.",

            records:
                groupRecords.map(
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
                        cancelled_by:
                            email
                    })
                )
        });


    } catch (error) {

        console.error(
            "Admin delete error:",
            error
        );


        return Response.json(
            {
                success: false,
                error:
                    "Unable to cancel the scheduled change."
            },
            { status: 500 }
        );
    }
}
