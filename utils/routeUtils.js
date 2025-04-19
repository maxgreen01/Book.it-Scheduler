// Utility functions for use in website routes

// Shorthand for rendering an the "error" page using a given error code and message
export function renderError(res, code, msg) {
    return res.status(code).render("error", { title: "Error", error: msg });
}
