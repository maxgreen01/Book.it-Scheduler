/*
Name: Max Green, Praneeth Vanguru, Brendan Lee, Alex Prikockis
Pledge: I pledge my honor that I have abided by the Stevens Honor System.
*/

import express from "express";
import configRoutes from "./routes/index.js";
import handlebars from "express-handlebars";
import fileUpload from "express-fileupload";

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
