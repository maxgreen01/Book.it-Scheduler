/*
Name: Max Green, Praneeth Vanguru, Brendan Lee, Alex Prikockis
Pledge: I pledge my honor that I have abided by the Stevens Honor System.
*/

import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import fileUpload from "express-fileupload";
import session from "express-session";
import favicon from "serve-favicon";
import path from "node:path";
import Handlebars from "handlebars";
import { __rootdir, renderError } from "./utils/routeUtils.js";
import { isUserMeetingOwner } from "./data/meetings.js";
import { convertIndexToLabel } from "./public/js/helpers.js";

const app = express();

//
// ================ Express middlewares ================
//

app.use("/public", express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handlebars setup
app.engine("handlebars", handlebars.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// File uploading
const profilePictureUpload = fileUpload({
    limits: {
        fileSize: 5000000,
    },
    abortOnLimit: true,
    responseOnLimit: "Profile picture size cannot exceed 5 megabytes!",
});

// Session
app.use(
    session({
        name: "AuthenticationState",
        secret: "some secret string!",
        resave: false,
        saveUninitialized: false,
    })
);

// send favicon
app.use(favicon(path.join(__rootdir, "/public/icons/favicon.ico")));

//
// ================ Handlebars helpers ================
//

// Handlebars helper to multiply inline the alpha value of the cell background
// Ex: rgba(128, 0, 128, {{#multiplyOpacity 4}}) where 0 is blank
Handlebars.registerHelper("multiplyOpacity", function (value, options) {
    // this a parameter passed to the route in the handlebars context
    // this MUST be explicitly defined in any route that renders a calendar -> maxUsers: numUsers ... and so on
    const numUsers = options.data.root.numUsers;
    const opacity = numUsers > 0 ? Math.min(1, value / numUsers) : 0;
    return opacity.toFixed(2);
});

// Handlebars helper to grab elements from potentially out-of-block arrays by index
// example, grab day array elements while iterating under scope of meeting arrays
// check out: https://stackoverflow.com/a/18763906
/*
days: [...] <- access this by index (days[i]) out of scope
meetings: [ [@index property refers to this while iterating], [...], [...], ...]
 */
Handlebars.registerHelper("at_index", function (context, index) {
    return context && context[index];
});

// Handlebars helper to return the last element of an array
Handlebars.registerHelper("last_elem", function (array) {
    return array[array.length - 1];
});

// Handlebars helper to get a property of an object, like `context.property`.
// Note that `property` should be a string!
Handlebars.registerHelper("get_prop", function (context, property) {
    return context[property];
});

// Handlebars helper to emulate a `for` loop.
// Use `{{this}}` to refer to the loop index.
Handlebars.registerHelper("for", function (from, to, inc, options) {
    let accum = "";
    for (let i = from; i < to; i += inc) accum += options.fn(i);
    return accum;
});

// Handlebars helper to convert a timeslot index into the corresponding human-readable time label
Handlebars.registerHelper("convertIndexToLabel", function (context) {
    return convertIndexToLabel(context);
});

//
// ================ custom middlewares ================
//

const rewriteUnsupportedBrowserMethods = (req, res, next) => {
    // If the user posts to the server with a property called _method, rewrite the request's method to be that method
    if (req.body && req.body._method) {
        req.method = req.body._method;
        delete req.body._method;
    }
    // let the next middleware run
    next();
};
app.use(rewriteUnsupportedBrowserMethods);

// Logging middleware
app.use("/", async (req, res, next) => {
    const timestamp = new Date().toString();
    const auth = req.session?.user?._id ?? "?";
    console.log(`[${timestamp}]: (${auth}) ${req.method} ${req.path} ${req.body ? JSON.stringify(req.body) : ""}`);
    next();
});

// prevent unauthenticated access to meeting and profile routes
app.use(["/meetings", "/profile", "/create", "/signout"], async (req, res, next) => {
    if (typeof req.session?.user !== "undefined") next();
    else res.redirect("/login");
});

// prevent authenticated users from viewing auth-related routes
app.use(["/login", "/signup"], async (req, res, next) => {
    if (typeof req.session?.user !== "undefined") res.redirect("/profile");
    else next();
});

// prevent users from editing a meeting that they don't own
app.use("/meetings/:meetingId/edit", async (req, res, next) => {
    if (await isUserMeetingOwner(req.params.meetingId, req.session?.user?._id)) next();
    else res.redirect(`/meetings/${req.params.meetingId}`);
});

// Fallback error handler
app.use((err, req, res, next) => {
    console.error("Unhandled route error:");
    console.error(err);
    return renderError(req, res, 500, "Internal Server Error");
});

//
// ================ routing ================
//

app.post("/signup", profilePictureUpload);
app.patch("/profile", profilePictureUpload);

configRoutes(app);

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log("Your routes will be running on http://localhost:3000");
});
