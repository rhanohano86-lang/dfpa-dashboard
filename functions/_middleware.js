export async function onRequest(context) {

    const url =
        new URL(context.request.url);

    if (
        url.hostname === "admin.dfpa.net" &&
        url.pathname === "/"
    ) {

        url.pathname = "/admin";

        return context.env.ASSETS.fetch(url);
    }

    return context.next();
}
