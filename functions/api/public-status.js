export async function onRequestGet(context) {
    try {
        const now = new Date().toISOString();

        const fireRestriction =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        effective_at,
                        level
                    FROM fire_restrictions
                    WHERE effective_at <= ?
                    ORDER BY effective_at DESC
                    LIMIT 1
                `)
                .bind(now)
                .first();

        const ifpl =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        effective_at,
                        level
                    FROM ifpl_schedule
                    WHERE effective_at <= ?
                    ORDER BY effective_at DESC
                    LIMIT 1
                `)
                .bind(now)
                .first();
        
        const lastUpdated =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        value,
                        updated_at,
                        updated_by
                    FROM dashboard_settings
                    WHERE setting = ?
                    LIMIT 1
                `)
                .bind("last_updated")
                .first();
        return Response.json({
            success: true,

            current: {
                fire_restrictions:
                    fireRestriction
                        ? {
                            level:
                                fireRestriction.level,
                            effective_at:
                                fireRestriction.effective_at
                        }
                        : null,

                ifpl:
                    ifpl
                        ? {
                            level:
                                ifpl.level,
                            effective_at:
                                ifpl.effective_at
                        }
                        : null
            },

            last_updated:
                lastUpdated
                    ? lastUpdated.value
                    : null,
            
            generated_at: now
        });

    } catch (error) {

        console.error(
            "Public status error:",
            error
        );

        return Response.json(
            {
                success: false,
                error: "Unable to load current fire status."
            },
            { status: 500 }
        );
    }
}
