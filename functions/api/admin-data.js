export async function onRequestGet(context) {
    try {
        const now = new Date().toISOString();

        const fireRestrictions = await context.env.DFPA_DB
            .prepare(`
                SELECT *
                FROM fire_restrictions
                WHERE effective_at <= ?
                ORDER BY effective_at DESC
                LIMIT 1
            `)
            .bind(now)
            .first();

        const ifpl = await context.env.DFPA_DB
            .prepare(`
                SELECT *
                FROM ifpl_schedule
                WHERE effective_at <= ?
                ORDER BY effective_at DESC
                LIMIT 1
            `)
            .bind(now)
            .first();

        const upcomingFire = await context.env.DFPA_DB
            .prepare(`
                SELECT *
                FROM fire_restrictions
                WHERE effective_at > ?
                ORDER BY effective_at ASC
            `)
            .bind(now)
            .all();

        const upcomingIfpl = await context.env.DFPA_DB
            .prepare(`
                SELECT *
                FROM ifpl_schedule
                WHERE effective_at > ?
                ORDER BY effective_at ASC
            `)
            .bind(now)
            .all();

     const historyFire = await context.env.DFPA_DB
    .prepare(`
        SELECT *
        FROM fire_restrictions
        WHERE effective_at <= ?
        ORDER BY effective_at DESC
        LIMIT 20
    `)
    .bind(now)
    .all();
        
const historyIfpl = await context.env.DFPA_DB
    .prepare(`
        SELECT *
        FROM ifpl_schedule
        WHERE effective_at <= ?
        ORDER BY effective_at DESC
        LIMIT 20
    `)
    .bind(now)
    .all();

        return Response.json({
            success: true,
            current: {
                fire_restrictions: fireRestrictions,
                ifpl: ifpl
            },
            upcoming: {
                fire_restrictions: upcomingFire.results,
                ifpl: upcomingIfpl.results
            },
            history: {
                fire_restrictions: historyFire.results,
                ifpl: historyIfpl.results
            }
        });

    } catch (error) {
        return Response.json(
            {
                success: false,
                error: error.message
            },
            { status: 500 }
        );
    }
}
