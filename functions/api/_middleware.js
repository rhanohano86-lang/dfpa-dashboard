export async function onRequest(context) {

    const url =
        new URL(context.request.url);


    /*
     * Admin hostname:
     * Serve admin.html at the root of admin.dfpa.net.
     */
    if (
        url.hostname === "admin.dfpa.net" &&
        url.pathname === "/"
    ) {

        url.pathname = "/admin";

        return context.env.ASSETS.fetch(url);
    }


    /*
     * All other requests continue normally.
     */
    return context.next();
}
