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

export async function onRequestPost(context) {
    try {
        /*
         * Cloudflare Access provides the authenticated user's
         * email after the request has passed Access authentication.
         */
        const email =
            context.request.headers.get(
                "CF-Access-Authenticated-User-Email"
            );

        if (!email) {
            return Response.json(
                {
                    success: false,
                    error: "Authenticated administrator identity not found."
                },
                { status: 401 }
            );
        }

        /*
         * Confirm that this authenticated email is an
         * active administrator in our own database.
         */
        const administrator = await context.env.DFPA_DB
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
                    error: "You are not an active DFPA administrator."
                },
                { status: 403 }
            );
        }

        const body = await context.request.json();

        const changeType = body.changeType;
        const level = body.level;
        const effectiveAt = body.effectiveAt;
        const notes = body.notes || "";

        /*
         * Validate change type.
         */
        if (!["fire", "ifpl"].includes(changeType)) {
            return Response.json(
                {
                    success: false,
                    error: "Invalid change type."
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
                    error: "Invalid level."
                },
                { status: 400 }
            );
        }

        /*
         * Validate effective date/time.
         */
        if (!effectiveAt) {
            return Response.json(
                {
                    success: false,
                    error: "Effective date and time are required."
                },
                { status: 400 }
            );
        }

        const effectiveDate = new Date(effectiveAt);

        if (Number.isNaN(effectiveDate.getTime())) {
            return Response.json(
                {
                    success: false,
                    error: "Invalid effective date/time."
                },
                { status: 400 }
            );
        }

        const normalizedEffectiveAt =
            effectiveDate.toISOString();

        /*
         * Insert the scheduled change.
         */
        const table =
            changeType === "fire"
                ? "fire_restrictions"
                : "ifpl_schedule";

        const result = await context.env.DFPA_DB
            .prepare(`
                INSERT INTO ${table}
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

        const recordId = result.meta.last_row_id;

        /*
         * Store administrative notes and change details
         * in the audit log.
         */
        const auditDetails = JSON.stringify({
            level,
            effective_at: normalizedEffectiveAt,
            notes
        });

        await context.env.DFPA_DB
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
                changeType === "fire"
                    ? "fire_restrictions"
                    : "ifpl_schedule",
                recordId,
                auditDetails,
                email
            )
            .run();

                /*
         * Update the dashboard-level "Last Updated" timestamp.
         * This records when an administrator made a successful
         * status change, independently of the effective date.
         */
        await context.env.DFPA_DB
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
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = excluded.updated_by
            `)
            .bind(
                "last_updated",
                new Date().toISOString(),
                email
            )
            .run();

        return Response.json({
            success: true,
            message: "Change scheduled successfully.",
            record: {
                id: recordId,
                type: changeType,
                level,
                effective_at: normalizedEffectiveAt,
                created_by: email
            }
        });

    } catch (error) {
        console.error("Admin write error:", error);

        return Response.json(
            {
                success: false,
                error: "Unable to schedule the change."
            },
            { status: 500 }
        );
    }
}
