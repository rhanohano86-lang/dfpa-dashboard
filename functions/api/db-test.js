export async function onRequest(context) {
    try {
        const result = await context.env.DFPA_DB
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
            .all();

        return Response.json({
            success: true,
            database: "dfpa-dashboard-db",
            tables: result.results
        });

    } catch (error) {
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
