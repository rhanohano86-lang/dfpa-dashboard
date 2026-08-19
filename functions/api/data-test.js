export async function onRequestGet(context) {
    try {
        const fireRestrictions = await context.env.DFPA_DB
            .prepare(`
                SELECT *
                FROM fire_restrictions
                ORDER BY effective_at DESC
            `)
            .all();

        const ifplSchedule = await context.env.DFPA_DB
            .prepare(`
                SELECT *
                FROM ifpl_schedule
                ORDER BY effective_at DESC
            `)
            .all();

        return Response.json({
            success: true,
            fire_restrictions: fireRestrictions.results,
            ifpl_schedule: ifplSchedule.results
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
