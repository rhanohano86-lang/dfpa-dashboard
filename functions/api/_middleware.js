export async function onRequest(context) {

    const url =
        new URL(context.request.url);

    if (
        url.hostname === "admin.dfpa.net" &&
        url.pathname === "/"
    ) {

        return Response.redirect(
            new URL(
                "/admin",
                url.origin
            ),
            302
        );
    }

    return context.next();
}
