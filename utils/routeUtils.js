// Utility functions for use in routes

import path from "node:path";

// absolute filepath to the root directory of this project
export const __rootdir = path.join(import.meta.dirname, "..");

// Shorthand for rendering an the "error" page using a given error code and message
export function renderError(res, code, msg, loggedIn) {
    return res.status(code).render("error", { title: "Error", error: msg, loggedIn });
}

// Shorthand for redirecting to the page that made the request, or the root as a backup
export function redirectBack(req, res) {
    return res.redirect(req.get("Referrer") || "/");
}
