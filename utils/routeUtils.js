// Utility functions for use in routes

import path from "node:path";

// absolute filepath to the root directory of this project
export const __rootdir = path.join(import.meta.dirname, "..");

// Create an object of options passed to `res.render()`
export function prepareRenderOptions(req) {
    const userData = req.session?.user;
    return {
        loggedIn: typeof userData !== "undefined",
    };
}

// Shorthand for rendering an the "error" page using a given error code and message
export function renderError(req, res, code, msg) {
    return res.status(code).render("error", { title: "Error", error: msg, ...prepareRenderOptions(req) });
}

// Shorthand for redirecting to the page that made the request, or the root as a backup
export function redirectBack(req, res) {
    return res.redirect(req.get("Referrer") || "/");
}
