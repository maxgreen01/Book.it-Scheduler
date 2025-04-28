import express from "express";
import { ValidationError, validateUserId } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as userFunctions from "../data/users.js";
import path from "node:path";

const router = express.Router();

router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        res.render("login", { title: "Login" });
    });
// todo login to an existing profile (i.e. "log in") -- which route?
router
    .route("/signup")
    .get(async (req, res) => {
        res.render("signup", { title: "Sign up" });
    })
    //
    // create a new profile (i.e. "sign up")
    .post(async (req, res) => {
        // ensure non-empty request body
        let data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(res, 400, "Request body is empty");
        }

        // validate User ID
        try {
            data.uid = validateUserId(data.uid);
        } catch (err) {
            return routeUtils.renderError(res, 400, err.message);
        }

        // process profile picture, if one is supplied
        // fixme MG - move this into a function somewhere (duplicated in `profile.js`). don't want to pass a bunch of vars or deal with handling returns/throws
        const pfpFile = req.files?.profilePicture;
        if (pfpFile) {
            // rename the file
            const extension = pfpFile.name.split(".").pop();
            const filepath = `/public/images/${data.uid}.${extension}`;

            // upload the file to the server
            try {
                await pfpFile.mv(path.join(routeUtils.__rootdir, filepath));
            } catch (err) {
                // todo MG - maybe fail with a warning instead of stopping everything
                return routeUtils.renderError(res, 500, err.message);
            }

            // file successfully uploaded, so save its path
            data.profilePicture = filepath;
        } else {
            // assign default profile picture
            data.profilePicture = routeUtils.defaultProfilePicture;
        }

        // validate all inputs and add the user to the DB
        let user;
        try {
            user = await userFunctions.createUser(data);
        } catch (err) {
            if (err instanceof ValidationError) {
                return routeUtils.renderError(res, 400, err.message);
            } else {
                return routeUtils.renderError(res, 500, err.message);
            }
        }

        // todo create auth session here?

        return res.redirect("/profile"); // go to the newly created profile page
    });

export default router;
