/*
Name: Max Green, Praneeth Vanguru, Brendan Lee, Alex Prikockis
Pledge: I pledge my honor that I have abided by the Stevens Honor System.
*/

import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import fileUpload from "express-fileupload";
import { xss } from "express-xss-sanitizer";
import session from "express-session";
import Handlebars from "handlebars";
import { renderError } from "./utils/routeUtils.js";
import { isUserMeetingOwner } from "./data/meetings.js";

const app = express();

//
// ================ Express middlewares ================
//

app.use("/public", express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xss());

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

//
// ================ custom middlewares ================
//

// Logging middleware
app.use("/", async (req, res, next) => {
    const timestamp = new Date().toString();
    const auth = req.session?.user?._id ?? "?";
    console.log(`[${timestamp}]: (${auth}) ${req.method} ${req.path} ${req.body ? JSON.stringify(req.body) : ""}`);
    next();
});

// Little handlebars helper to multiply inline the alpha value of the cell background
// Ex: rgba(128, 0, 128, {{multiplyOpacity 4}}) where 0 is blank
Handlebars.registerHelper("multiplyOpacity", function (value, options) {
    // this a parameter passed to the route in the handlebars context
    // this MUST be explicitly defined in any route that renders a calendar -> numUsers: users.length ... etc
    const numUsers = options.data.root.numUsers;
    const opacity = numUsers > 0 ? Math.min(1, value / numUsers) : 0;
    return opacity.toFixed(2);
});

//Handlebars Helper to check if two numbers are equal to each toher
Handlebars.registerHelper("equal?", function (a, b) {
    return a === b;
});

// Handlebar helper to grab elements from potentially out-of-block arrays by index
// example, grab day array elements while iterating under scope of meeting arrays
// check out: https://stackoverflow.com/a/18763906
/*
days: [...] <- access this by index (days[i]) out of scope
meetings: [ [@index property refers to this while iterating], [...], [...], ...]
 */
Handlebars.registerHelper("at_index", function (context, index) {
    return context && context[index];
});

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
