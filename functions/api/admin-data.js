export async function onRequestGet(context) {
    try {

        const now =
            new Date().toISOString();


        /*
         * --------------------------------------------------
         * CURRENT FIRE DANGER + PUBLIC USE RESTRICTIONS
         * --------------------------------------------------
         */

        const fireRestrictions =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT *
                    FROM fire_restrictions
                    WHERE effective_at <= ?
                    ORDER BY effective_at DESC
                    LIMIT 1
                `)
                .bind(now)
                .first();


        /*
         * --------------------------------------------------
         * LEGACY SINGLE IFPL VALUE
         *
         * Kept temporarily during the migration.
         * --------------------------------------------------
         */

        const ifpl =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT *
                    FROM ifpl_schedule
                    WHERE effective_at <= ?
                    ORDER BY effective_at DESC
                    LIMIT 1
                `)
                .bind(now)
                .first();


        /*
         * --------------------------------------------------
         * CURRENT ZONE-AWARE IFPL
         *
         * Return the most recent effective record for
         * each regulation use zone.
         * --------------------------------------------------
         */

        const ifplZones =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        z.id,
                        z.zone,
                        z.effective_at,
                        z.level,
                        z.change_group_id,
                        z.created_by,
                        z.created_at
                    FROM ifpl_schedule_zoned AS z
                    WHERE z.effective_at <= ?
                      AND z.effective_at = (
                          SELECT MAX(z2.effective_at)
                          FROM ifpl_schedule_zoned AS z2
                          WHERE z2.zone = z.zone
                            AND z2.effective_at <= ?
                      )
                    ORDER BY z.zone ASC
                `)
                .bind(
                    now,
                    now
                )
                .all();


        /*
         * --------------------------------------------------
         * UPCOMING FIRE DANGER + PUBLIC USE RESTRICTIONS
         * --------------------------------------------------
         */

        const upcomingFire =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT *
                    FROM fire_restrictions
                    WHERE effective_at > ?
                    ORDER BY effective_at ASC
                `)
                .bind(now)
                .all();


        /*
         * --------------------------------------------------
         * LEGACY UPCOMING IFPL
         * --------------------------------------------------
         */

        const upcomingIfpl =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT *
                    FROM ifpl_schedule
                    WHERE effective_at > ?
                    ORDER BY effective_at ASC
                `)
                .bind(now)
                .all();


        /*
         * --------------------------------------------------
         * UPCOMING ZONE-AWARE IFPL
         * --------------------------------------------------
         */

        const upcomingIfplZones =
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
                    WHERE effective_at > ?
                    ORDER BY effective_at ASC, zone ASC
                `)
                .bind(now)
                .all();


        /*
         * --------------------------------------------------
         * FIRE DANGER + PUBLIC USE RESTRICTIONS HISTORY
         * --------------------------------------------------
         */

        const historyFire =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT *
                    FROM fire_restrictions
                    WHERE effective_at <= ?
                    ORDER BY effective_at DESC
                    LIMIT 20
                `)
                .bind(now)
                .all();


        /*
         * --------------------------------------------------
         * LEGACY IFPL HISTORY
         * --------------------------------------------------
         */

        const historyIfpl =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT *
                    FROM ifpl_schedule
                    WHERE effective_at <= ?
                    ORDER BY effective_at DESC
                    LIMIT 20
                `)
                .bind(now)
                .all();


        /*
         * --------------------------------------------------
         * ZONE-AWARE IFPL HISTORY
         * --------------------------------------------------
         */

        const historyIfplZones =
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
                    WHERE effective_at <= ?
                    ORDER BY effective_at DESC, zone ASC
                    LIMIT 100
                `)
                .bind(now)
                .all();


        /*
         * --------------------------------------------------
         * RESPONSE
         * --------------------------------------------------
         */

        return Response.json({

            success: true,

            current: {
                fire_restrictions:
                    fireRestrictions,

                ifpl:
                    ifpl,

                ifpl_zones:
                    ifplZones.results
            },


            upcoming: {
                fire_restrictions:
                    upcomingFire.results,

                ifpl:
                    upcomingIfpl.results,

                ifpl_zones:
                    upcomingIfplZones.results
            },


            history: {
                fire_restrictions:
                    historyFire.results,

                ifpl:
                    historyIfpl.results,

                ifpl_zones:
                    historyIfplZones.results
            }

        });


    } catch (error) {

        console.error(
            "Admin data error:",
            error
        );

        return Response.json(
            {
                success: false,
                error:
                    error.message
            },
            { status: 500 }
        );
    }
}
