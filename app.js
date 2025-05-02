/*
Name: Max Green, Praneeth Vanguru, Brendan Lee, Alex Prikockis
Pledge: I pledge my honor that I have abided by the Stevens Honor System.
*/

import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import fileUpload from "express-fileupload";
import Handlebars from "handlebars";

//constant defining the darkest a shaded box on the calendar can be
// MAX_USERS = 4 means the the darkest a box can get is if (all) 4 users pick it
// FIXME BL: There is maybe a way to dynamically update this based on # meeting attendees
const MAX_USERS = 4;

const app = express();

//
// ================ Express middlewares ================
//

app.use("/public", express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const profilePictureUpload = fileUpload({
    limits: {
        fileSize: 5000000,
    },
    abortOnLimit: true,
    responseOnLimit: "Profile picture size cannot exceed 5 megabytes!",
});
app.post("/login/signup", profilePictureUpload);
app.patch("/profile", profilePictureUpload);

// Handlebars setup
app.engine("handlebars", handlebars.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

//
// ================ custom middlewares ================
//

// Little handlebars helper to multiply inline the alpha value of the cell background
// Ex: rgba(128, 0, 128, (opacity value)) replace value with {{multiplyOpacity 4}} where 0 is blank
Handlebars.registerHelper("multiplyOpacity", function (value) {
    const opacity = Math.min(1, value / MAX_USERS);
    return opacity.toFixed(2);
});

// Handlebar helper to grab elements from potentially out-of-block arrays by index
// example, grab day array elements while iterating under scope of meeting arrays
// checkout: https://stackoverflow.com/a/18763906
/*

days: [...] <- access this by index (days[i]) out of scope
meetings: [ [@index property refers to this while iterating], [...], [...], ...]
 */
Handlebars.registerHelper("index_of", function (context, index) {
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

configRoutes(app);

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log("Your routes will be running on http://localhost:3000");
});

app.use((err, req, res, next) => {
    console.error("route error:");
    console.error(err);
});
