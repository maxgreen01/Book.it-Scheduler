// Utility functions for use in routes

import path from "path";
import { fileURLToPath } from "url";
import { ValidationError } from "./validation.js";

// absolute filepath to the root directory of this project
const __filename = fileURLToPath(import.meta.url);
export const __rootdir = path.join(path.dirname(__filename), "..");

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

//helper function that handles error cases
export function handleReqError(res, error) {
    if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
    } else {
        return res.status(500).json({ error: error.message });
    }
}
