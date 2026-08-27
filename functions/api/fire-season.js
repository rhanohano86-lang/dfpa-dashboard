/* ======================================================
   DFPA FIRE SEASON API
   Historical Fire Season Management
   ====================================================== */


/* ======================================================
   GET FIRE SEASON DATA
   ====================================================== */

export async function onRequestGet(context) {
    try {

        /*
         * Get the currently active fire season.
         */
        const activeSeason =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        year,
                        status,
                        start_date,
                        end_date,
                        end_time,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    FROM fire_seasons
                    WHERE status = 'ACTIVE'
                    ORDER BY year DESC
                    LIMIT 1
                `)
                .first();


        /*
         * Get recent fire season history.
         */
        const history =
            await context.env.DFPA_DB
                .prepare(`
                    SELECT
                        id,
                        year,
                        status,
                        start_date,
                        end_date,
                        end_time,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    FROM fire_seasons
                    ORDER BY year DESC
                    LIMIT 20
                `)
                .all();


        return Response.json({
            success: true,

            current:
                activeSeason || null,

            history:
                history.results || []
        });


    } catch (error) {

        console.error(
            "Fire season GET error:",
            error
        );


        return Response.json(
            {
                success: false,
                error:
                    "Unable to load fire season data."
            },
            { status: 500 }
        );
    }
}


/* ======================================================
   START OR END FIRE SEASON
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
         * Confirm active administrator.
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


        const action =
            body.action;


        if (
            !["START", "END"].includes(
                action
            )
        ) {
            return Response.json(
                {
                    success: false,
                    error:
                        "Invalid fire season action."
                },
                { status: 400 }
            );
        }


        /* ==================================================
           START NEW FIRE SEASON
           ================================================== */

        if (
            action === "START"
        ) {

            const year =
                Number(
                    body.year
                );


            const startDate =
                body.startDate;


            /*
             * Validate year.
             */
            if (
                !Number.isInteger(year) ||
                year < 2000 ||
                year > 2100
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Invalid fire season year."
                    },
                    { status: 400 }
                );
            }


            /*
             * Validate start date.
             */
            if (!startDate) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Fire season start date is required."
                    },
                    { status: 400 }
                );
            }


            const parsedStartDate =
                new Date(
                    `${startDate}T00:00:00`
                );


            if (
                Number.isNaN(
                    parsedStartDate.getTime()
                )
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Invalid fire season start date."
                    },
                    { status: 400 }
                );
            }


            /*
             * Prevent more than one active season.
             */
            const activeSeason =
                await context.env.DFPA_DB
                    .prepare(`
                        SELECT
                            id,
                            year,
                            status,
                            start_date,
                            end_date,
                            end_time
                        FROM fire_seasons
                        WHERE status = 'ACTIVE'
                        LIMIT 1
                    `)
                    .first();


            if (activeSeason) {
                return Response.json(
                    {
                        success: false,
                        error:
                            `Fire season ${activeSeason.year} is already active.`
                    },
                    { status: 409 }
                );
            }


            /*
             * Prevent duplicate season years.
             */
            const existingSeason =
                await context.env.DFPA_DB
                    .prepare(`
                        SELECT
                            id,
                            year,
                            status,
                            start_date,
                            end_date,
                            end_time
                        FROM fire_seasons
                        WHERE year = ?
                        LIMIT 1
                    `)
                    .bind(year)
                    .first();


            if (existingSeason) {
                return Response.json(
                    {
                        success: false,
                        error:
                            `A fire season record already exists for ${year}.`
                    },
                    { status: 409 }
                );
            }


            /*
             * Build audit details.
             */
            const auditDetails =
                JSON.stringify({
                    action:
                        "START",
                    year,
                    status:
                        "ACTIVE",
                    start_date:
                        startDate,
                    end_date:
                        null,
                    end_time:
                        null
                });


            /*
             * START is atomic.
             */
            await context.env.DFPA_DB.batch([

                /*
                 * Create the new season.
                 */
                context.env.DFPA_DB
                    .prepare(`
                        INSERT INTO fire_seasons
                        (
                            year,
                            status,
                            start_date,
                            end_date,
                            end_time,
                            created_by,
                            updated_by
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `)
                    .bind(
                        year,
                        "ACTIVE",
                        startDate,
                        null,
                        null,
                        email,
                        email
                    ),


                /*
                 * Create audit record.
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
                        VALUES (
                            ?,
                            ?,
                            (
                                SELECT id
                                FROM fire_seasons
                                WHERE year = ?
                                LIMIT 1
                            ),
                            ?,
                            ?
                        )
                    `)
                    .bind(
                        "CREATE",
                        "fire_seasons",
                        year,
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


            /*
             * Retrieve created season.
             */
            const createdSeason =
                await context.env.DFPA_DB
                    .prepare(`
                        SELECT
                            id,
                            year,
                            status,
                            start_date,
                            end_date,
                            end_time,
                            created_by,
                            created_at,
                            updated_by,
                            updated_at
                        FROM fire_seasons
                        WHERE year = ?
                        LIMIT 1
                    `)
                    .bind(year)
                    .first();


            return Response.json({
                success: true,

                message:
                    "Fire season started successfully.",

                season:
                    createdSeason
            });
        }


        /* ==================================================
           END CURRENT FIRE SEASON
           ================================================== */

        if (
            action === "END"
        ) {

            const endDate =
                body.endDate;

            const endTime =
                body.endTime;


            /*
             * Validate end date.
             */
            if (!endDate) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Fire season end date is required."
                    },
                    { status: 400 }
                );
            }


            /*
             * Validate end time.
             */
            if (!endTime) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Fire season end time is required."
                    },
                    { status: 400 }
                );
            }


            /*
             * Validate date format.
             */
            const parsedEndDate =
                new Date(
                    `${endDate}T00:00:00`
                );


            if (
                Number.isNaN(
                    parsedEndDate.getTime()
                )
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Invalid fire season end date."
                    },
                    { status: 400 }
                );
            }


            /*
             * Validate time format HH:MM.
             */
            if (
                !/^\d{2}:\d{2}$/.test(
                    String(endTime)
                )
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Invalid fire season end time."
                    },
                    { status: 400 }
                );
            }


            const [
                endHour,
                endMinute
            ] =
                String(endTime)
                    .split(":")
                    .map(Number);


            if (
                endHour < 0 ||
                endHour > 23 ||
                endMinute < 0 ||
                endMinute > 59
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Invalid fire season end time."
                    },
                    { status: 400 }
                );
            }


            /*
             * Get active season.
             */
            const activeSeason =
                await context.env.DFPA_DB
                    .prepare(`
                        SELECT
                            id,
                            year,
                            status,
                            start_date,
                            end_date,
                            end_time,
                            created_by,
                            created_at,
                            updated_by,
                            updated_at
                        FROM fire_seasons
                        WHERE status = 'ACTIVE'
                        ORDER BY year DESC
                        LIMIT 1
                    `)
                    .first();


            if (!activeSeason) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "There is no active fire season to end."
                    },
                    { status: 409 }
                );
            }


            /*
             * Compare calendar dates only.
             * Fire-season reporting is operational-day based.
             */
            const startDate =
                new Date(
                    `${activeSeason.start_date}T00:00:00`
                );


            if (
                parsedEndDate < startDate
            ) {
                return Response.json(
                    {
                        success: false,
                        error:
                            "Fire season end date cannot be before the start date."
                    },
                    { status: 400 }
                );
            }


            /*
             * Build audit details.
             */
            const auditDetails =
                JSON.stringify({
                    action:
                        "END",
                    year:
                        activeSeason.year,
                    previous_status:
                        activeSeason.status,
                    new_status:
                        "INACTIVE",
                    start_date:
                        activeSeason.start_date,
                    end_date:
                        endDate,
                    end_time:
                        endTime,
                    original_created_by:
                        activeSeason.created_by,
                    original_created_at:
                        activeSeason.created_at
                });


            /*
             * END is atomic.
             */
            await context.env.DFPA_DB.batch([

                /*
                 * Mark season inactive and preserve
                 * both end date and end time.
                 */
                context.env.DFPA_DB
                    .prepare(`
                        UPDATE fire_seasons
                        SET
                            status = 'INACTIVE',
                            end_date = ?,
                            end_time = ?,
                            updated_by = ?,
                            updated_at =
                                CURRENT_TIMESTAMP
                        WHERE id = ?
                          AND status = 'ACTIVE'
                    `)
                    .bind(
                        endDate,
                        endTime,
                        email,
                        activeSeason.id
                    ),


                /*
                 * Preserve administrative history.
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
                        "UPDATE",
                        "fire_seasons",
                        activeSeason.id,
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


            /*
             * Retrieve updated season.
             */
            const endedSeason =
                await context.env.DFPA_DB
                    .prepare(`
                        SELECT
                            id,
                            year,
                            status,
                            start_date,
                            end_date,
                            end_time,
                            created_by,
                            created_at,
                            updated_by,
                            updated_at
                        FROM fire_seasons
                        WHERE id = ?
                        LIMIT 1
                    `)
                    .bind(activeSeason.id)
                    .first();


            return Response.json({
                success: true,

                message:
                    "Fire season ended successfully.",

                season:
                    endedSeason
            });
        }


        return Response.json(
            {
                success: false,
                error:
                    "Unsupported fire season action."
            },
            { status: 400 }
        );


    } catch (error) {

        console.error(
            "Fire season POST error:",
            error
        );


        return Response.json(
            {
                success: false,
                error:
                    "Unable to update fire season."
            },
            { status: 500 }
        );
    }
}
