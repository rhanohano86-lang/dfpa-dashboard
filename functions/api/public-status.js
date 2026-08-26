export async function onRequestGet(context) {
    try {

        const now =
            new Date().toISOString();


        /*
         * --------------------------------------------------
         * FIRE DANGER + PUBLIC USE RESTRICTIONS
         * --------------------------------------------------
         */

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


        /*
         * --------------------------------------------------
         * LEGACY IFPL VALUE
         *
         * Kept temporarily for backward compatibility
         * while the public dashboard is migrated to
         * zone-aware IFPL.
         * --------------------------------------------------
         */

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


        /*
         * --------------------------------------------------
         * ZONE-AWARE IFPL
         *
         * Get the most recent effective IFPL record
         * for each regulation use zone.
         * --------------------------------------------------
         */

        const ifplZones =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        zone,
                        effective_at,
                        level
                    FROM ifpl_schedule_zoned AS z
                    WHERE effective_at <= ?
                      AND effective_at = (
                          SELECT MAX(z2.effective_at)
                          FROM ifpl_schedule_zoned AS z2
                          WHERE z2.zone = z.zone
                            AND z2.effective_at <= ?
                      )
                    ORDER BY zone ASC
                `)
                .bind(
                    now,
                    now
                )
                .all();


        /*
         * --------------------------------------------------
         * DASHBOARD LAST UPDATED
         * --------------------------------------------------
         */

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


        /*
         * --------------------------------------------------
         * RESPONSE
         * --------------------------------------------------
         */

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


                /*
                 * Legacy single IFPL value.
                 */
                ifpl:
                    ifpl
                        ? {
                            level:
                                ifpl.level,
                            effective_at:
                                ifpl.effective_at
                        }
                        : null,


                /*
                 * New zone-aware IFPL values.
                 */
                ifpl_zones:
                    ifplZones.results.map(
                        zone => ({
                            zone:
                                zone.zone,
                            level:
                                zone.level,
                            effective_at:
                                zone.effective_at
                        })
                    )
            },


            last_updated:
                lastUpdated
                    ? lastUpdated.value
                    : null,


            generated_at:
                now
        });


    } catch (error) {

        console.error(
            "Public status error:",
            error
        );


        return Response.json(
            {
                success: false,
                error:
                    "Unable to load current fire status."
            },
            { status: 500 }
        );
    }
}
