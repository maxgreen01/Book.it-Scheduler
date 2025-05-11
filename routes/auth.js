import express from "express";
import bcrypt from "bcrypt";
import { validateUserId } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as profileUtils from "../utils/profileUtils.js";
import { createUser, getUserById, updateUser } from "../data/users.js";
import { WeeklyAvailability } from "../public/js/classes/availabilities.js";

const router = express.Router();

// log in to an existing account
router
    .route("/login")
    // serve HTML
    .get(async (req, res) => {
        return res.render("login", { title: "Login", ...routeUtils.prepareRenderOptions(req) });
    })
    // log in
    .post(async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }

        try {
            const userId = validateUserId(req.body.uid);
            const user = await getUserById(userId);
            if (!(await bcrypt.compare(req.body.password, user.password))) {
                return routeUtils.renderError(req, res, 400, "Either username or password is invalid");
            }
            delete user.password;
            req.session.user = user;
            res.redirect("/profile");
        } catch {
            return routeUtils.renderError(req, res, 400, "Either username or password is invalid");
        }
    });

// sign out, removing session info
router.route("/signout").get(async (req, res) => {
    req.session.destroy();
    return res.render("signout", { title: "Signed out", ...routeUtils.prepareRenderOptions(req) });
});

// create a new account
router
    .route("/signup")
    // serve HTML
    .get(async (req, res) => {
        return res.render("signup", { title: "Sign up", ...routeUtils.prepareRenderOptions(req) });
    })
    // create a new profile (i.e. "sign up")
    .post(async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }

        // assign default profile picture (which may be updated later in this route)
        data.profilePicture = profileUtils.defaultProfilePicture;

        // validate all inputs and add the user to the DB
        let user;
        try {
            // TODO: remove this temp fix when availability can be entered on the page
            data.availability = new WeeklyAvailability(Array(7).fill(Array(48).fill(1)));
            user = await createUser(data);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }

        // upload & assign profile picture, if one is supplied
        // note: profile picture logic happens AFTER creating the account to ensure all user info is valid before modifying the server's filesystem
        try {
            const pfpFile = req.files?.profilePicture;
            if (typeof pfpFile === "object") {
                // make sure only one file is submitted
                if (!Array.isArray(pfpFile)) {
                    const profilePicture = await profileUtils.uploadProfilePicture(data.uid, pfpFile);

                    // update the user's profile picture in the database
                    await updateUser(req.body.uid, { profilePicture: profilePicture });
                } else {
                    return routeUtils.renderError(req, res, 400, "Only one image can be submitted");
                }
            }
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }

        // todo create auth session here?
        delete user.password;
        req.session.user = user;

        return res.redirect("/profile"); // go to the newly created profile page
    });

export default router;
