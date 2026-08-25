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
        
        const ifplZones = await context.env.DFPA_DB
            .prepare(`
                SELECT
                    id,
                    zone,
                    effective_at,
                    level,
                    created_by,
                    created_at
                FROM ifpl_schedule_zoned
                WHERE effective_at <= ?
                ORDER BY zone ASC, effective_at DESC
            `)
            .bind(now)
            .all();
        
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

                const upcomingIfplZones = await context.env.DFPA_DB
            .prepare(`
                SELECT
                    id,
                    zone,
                    effective_at,
                    level,
                    created_by,
                    created_at
                FROM ifpl_schedule_zoned
                WHERE effective_at > ?
                ORDER BY effective_at ASC, zone ASC
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

        const historyIfplZones = await context.env.DFPA_DB
            .prepare(`
                SELECT
                    id,
                    zone,
                    effective_at,
                    level,
                    created_by,
                    created_at
                FROM ifpl_schedule_zoned
                WHERE effective_at <= ?
                ORDER BY effective_at DESC, zone ASC
                LIMIT 100
            `)
            .bind(now)
            .all();          
        
        return Response.json({
            success: true,
            current: {
    fire_restrictions: fireRestrictions,
    ifpl: ifpl,
    ifpl_zones: ifplZones.results
},
           upcoming: {
    fire_restrictions: upcomingFire.results,
    ifpl: upcomingIfpl.results,
    ifpl_zones: upcomingIfplZones.results
},
   history: {
    fire_restrictions: historyFire.results,
    ifpl: historyIfpl.results,
    ifpl_zones: historyIfplZones.results
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
