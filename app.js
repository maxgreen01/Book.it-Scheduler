/*
Name: Max Green, Praneeth Vanguru, Brendan Lee, Alex Prikockis
Pledge: I pledge my honor that I have abided by the Stevens Honor System.
*/

import express from "express";
const app = express();
import configRoutes from "./routes/index.js";
import exphbs from "express-handlebars";

const rewriteUnsupportedBrowserMethods = (req, res, next) => {
    // If the user posts to the server with a property called _method, rewrite the request's method to be that method
    if (req.body && req.body._method) {
        req.method = req.body._method;
        delete req.body._method;
    }
    // let the next middleware run
    next();
};

// Express middlewares
app.use("/public", express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// set up Handlebars
app.engine("handlebars", exphbs.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// custom middlewares
app.use(rewriteUnsupportedBrowserMethods);

configRoutes(app);

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log("Your routes will be running on http://localhost:3000");
});
