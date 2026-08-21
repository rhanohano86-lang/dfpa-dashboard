export async function onRequest(context) {

    const url =
        new URL(context.request.url);

    /*
     * Serve the administration interface when the
     * request is made through the protected admin hostname.
     */
    if (
        url.hostname === "admin.dfpa.net" &&
        url.pathname === "/"
    ) {

        url.pathname = "/admin.html";

        return context.env.ASSETS.fetch(url);
    }


    /*
     * All other requests continue normally.
     *
     * This keeps the public dashboard and all existing
     * API routes working exactly as they do now.
     */
    return context.next();
}
