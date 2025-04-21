// Utility functions for use in routes

import path from "node:path";

// absolute filepath to the root directory of this project
export const __rootdir = path.join(import.meta.dirname, "..");

// default profile picture filepath
export const defaultProfilePicture = "/public/images/_default.jpg";

// Shorthand for rendering an the "error" page using a given error code and message
export function renderError(res, code, msg) {
    return res.status(code).render("error", { title: "Error", error: msg });
}
