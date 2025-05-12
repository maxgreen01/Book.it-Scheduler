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

//enum helper to not have to copy/paste Max's 48 lines of HTML :)
export function formatTimeIndex(index) {
    if (index === undefined) throw new Error("Unable to format time index: no index given");
    const hours24 = Math.floor(index / 2);
    const minutes = index % 2 === 0 ? "00" : "30";
    const meridian = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${minutes} ${meridian}`;
}

export function formatDateString(dateString, showWeekday = false) {
    const date = new Date(dateString);
    let options = {
        month: "short",
        day: "numeric",
    };
    if (showWeekday) options.weekday = "short";

    return date.toLocaleDateString("en-US", options);
}

// When an error occurs, return a different error code if the error is a ValidationError or regular Error
export function handleValidationError(req, res, err, validationCode = 400, regularCode = 500) {
    if (err instanceof ValidationError) {
        return renderError(req, res, validationCode, err.message);
    } else {
        return renderError(req, res, regularCode, err.message);
    }
}
