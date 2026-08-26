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

        const table =
            body.table;

        const recordId =
            Number(body.id);

        const reason =
            body.reason ||
            "Scheduled change cancelled by administrator.";


        /*
         * Only these schedule tables may be
         * cancelled through this endpoint.
         */
        const allowedTables = [
            "fire_restrictions",
            "ifpl_schedule_zoned"
        ];

        if (!allowedTables.includes(table)) {
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
         * Validate record ID.
         */
        if (
            !Number.isInteger(recordId) ||
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


        /*
         * --------------------------------------------------
         * FIRE DANGER / PUBLIC USE RESTRICTIONS
         * --------------------------------------------------
         *
         * One record = one scheduled change.
         */
        if (table === "fire_restrictions") {

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


            if (effectiveDate <= now) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "This change is already effective and cannot be cancelled."
                    },
                    { status: 409 }
                );
            }


            const auditDetails =
                JSON.stringify({
                    reason,
                    level:
                        record.level,
                    effective_at:
                        record.effective_at,
                    zone: null,
                    change_group_id: null,
                    created_by:
                        record.created_by,
                    created_at:
                        record.created_at
                });


            /*
             * Delete the Fire/PUR record and preserve
             * its DELETE audit entry in the same batch.
             */
            await context.env.DFPA_DB.batch([

                context.env.DFPA_DB
                    .prepare(`
                        DELETE FROM fire_restrictions
                        WHERE id = ?
                    `)
                    .bind(recordId),

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
                        zone: null,
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


        /*
         * --------------------------------------------------
         * IFPL
         * --------------------------------------------------
         *
         * One IFPL administrative action is represented
         * by one change_group_id.
         *
         * Therefore:
         *
         * Apply to All → four records deleted together.
         * Individual Zone → one record deleted.
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
                .bind(recordId)
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


        if (!selectedRecord.change_group_id) {
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


        if (groupRecords.length === 0) {
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
         * in the future before deleting any of them.
         */
        const now =
            new Date();

        for (const record of groupRecords) {

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


            if (effectiveDate <= now) {
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
         * Build one DELETE audit record for each zone.
         */
        const statements = [];


        for (const record of groupRecords) {

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
         * Delete the entire IFPL group.
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
         * Execute the audit inserts and group deletion
         * together.
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
