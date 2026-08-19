export async function onRequestGet(context) {
    try {
        const tables = [
            "fire_restrictions",
            "ifpl_schedule",
            "administrators",
            "audit_log"
        ];

        const schema = {};

        for (const table of tables) {
            const result = await context.env.DFPA_DB
                .prepare(`PRAGMA table_info(${table})`)
                .all();

            schema[table] = result.results;
        }

        return Response.json({
            success: true,
            database: "dfpa-dashboard-db",
            schema
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
