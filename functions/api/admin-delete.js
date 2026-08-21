export async function onRequestPost(context) {
    try {

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


        const body =
            await context.request.json();

        const table =
            body.table;

        const recordId =
            Number(body.id);

        const reason =
            body.reason ||
            "Scheduled change cancelled by administrator.";


        const allowedTables = [
            "fire_restrictions",
            "ifpl_schedule"
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


        const record =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        effective_at,
                        level,
                        created_by,
                        created_at
                    FROM ${table}
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
                created_by:
                    record.created_by,
                created_at:
                    record.created_at
            });


        /*
         * Delete the scheduled record and create
         * the audit entry as one D1 batch operation.
         */
        await context.env.DFPA_DB.batch([

            context.env.DFPA_DB
                .prepare(`
                    DELETE FROM ${table}
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
                    table,
                    recordId,
                    auditDetails,
                    email
                )

        ]);


        return Response.json({
            success: true,
            message:
                "Scheduled change cancelled successfully.",
            record: {
                id: recordId,
                table,
                level:
                    record.level,
                effective_at:
                    record.effective_at,
                cancelled_by:
                    email
            }
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
