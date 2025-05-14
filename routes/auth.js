import express from "express";
import bcrypt from "bcrypt";
import { xss } from "express-xss-sanitizer";
import { validateUserExists, validateUserId } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as profileUtils from "../utils/profileUtils.js";
import { createUser, createUserDocument, getUserById } from "../data/users.js";
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
        const formattedDates = [
            {
                dow: "Sunday",
            },
            {
                dow: "Monday",
            },
            {
                dow: "Tuesday",
            },
            {
                dow: "Wednesday",
            },
            {
                dow: "Thursday",
            },
            {
                dow: "Friday",
            },
            {
                dow: "Saturday",
            },
        ];
        const columnLabels = [];
        let hours = 0; // round down since "2:30" is still in hour "2"
        for (let i = 0; i < 48; i++) {
            // calculate the AM/PM hour
            const pm = hours >= 12;
            let adjustedHours = hours % 12;
            if (adjustedHours == 0) adjustedHours = 12; // midnight

            if (i % 2 == 0) {
                columnLabels.push({ label: `${adjustedHours}:00 ${pm ? "PM" : "AM"}`, small: false });
            } else {
                columnLabels.push({ label: `${adjustedHours}:30 ${pm ? "PM" : "AM"}`, small: true });
                hours++; // move to the next hour on the next iteration
            }
        }
        const responses = new Array(7).fill(null).map(() => new Array(48).fill({ user: 1 }));
        return res.render("signup", { title: "Sign up", days: formattedDates, timeColumn: columnLabels, responses: responses, ...routeUtils.prepareRenderOptions(req) });
    })
    // create a new profile (i.e. "sign up")
    .post(xss(), async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ error: "Request body is empty" });
        }

        // validate user (including profile picture)
        let pfpFile;
        try {
            // validate profile picture if one was provided, otherwise use default (handled by validation func)
            data.profilePicture = profileUtils.defaultProfilePicture;

            const file = req.files?.profilePicture;
            if (typeof file === "object") {
                // make sure only one file is submitted
                if (!Array.isArray(file)) {
                    pfpFile = file;
                } else {
                    return res.status(400).json({ error: "Only one profile picture can be submitted!" });
                }
            }

            // parse Weekly Availability into proper object
            data.availability = new WeeklyAvailability(JSON.parse(data.availability));

            // validate fields
            createUserDocument(data);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        // ensure the uid is unique
        try {
            await validateUserExists(data.uid);
            return res.status(400).json({ error: `This username is already taken!` });
        } catch {
            // expected to error
        }

        // upload profile picture (and save its name) if one has been supplied
        try {
            if (pfpFile) {
                data.profilePicture = await profileUtils.uploadProfilePicture(data.uid, pfpFile);
            }
        } catch (err) {
            // should only happen on filesystem errors
            return res.status(500).json({ error: "Internal Server Error" });
        }

        // actually add the user to the DB
        let user;
        try {
            user = await createUser(data);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        delete user.password;
        req.session.user = user;

        return res.status(200).json({ success: `Created a new profile for ${user._id}` }); // go to the newly created profile page
    });

export default router;
