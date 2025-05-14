import express from "express";
import { xss } from "express-xss-sanitizer";
import { validateUserExists, validateUserId } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as profileUtils from "../utils/profileUtils.js";
import { createUserDocument, deleteUser, getUserById, updateUser } from "../data/users.js";
import { WeeklyAvailability } from "../public/js/classes/availabilities.js";

const router = express.Router();

// view or edit your own profile
router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        const userID = req.session.user._id;
        let user = undefined;
        try {
            user = await getUserById(userID);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }

        const userDefaultAvail = user.availability.days;
        let userAvail = [];
        for (let day of userDefaultAvail) {
            let dayAvail = [];
            for (let slot of day.slots) {
                dayAvail.push({ user: slot });
            }
            userAvail.push(dayAvail);
        }

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

        return res.render("profile", {
            title: "Your Profile",
            userId: req.session.user._id,
            canEdit: true,
            firstName: req.session.user.firstName,
            lastName: req.session.user.lastName,
            description: req.session.user.description,
            days: formattedDates,
            timeColumn: columnLabels,
            responses: userAvail,
            pfpUrl: profileUtils.profilePictureToPath(req.session.user.profilePicture),
            ...routeUtils.prepareRenderOptions(req),
        });
    })
    // update current user's profile
    .post(xss(), async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ error: "Request body is empty" });
        }

        if (data.password === "") delete data.password;

        // validate data
        try {
            data.availability = new WeeklyAvailability(JSON.parse(data.availability));
            createUserDocument(data, true);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        // update profile picture, if one is supplied
        try {
            const pfpFile = req.files?.profilePicture;
            if (typeof pfpFile === "object") {
                // make sure only one file is submitted
                if (!Array.isArray(pfpFile)) {
                    data.profilePicture = await profileUtils.updateProfilePicture(req.session.user._id, pfpFile);
                } else {
                    return res.status(400).json({ error: "Only one image can be submitted!" });
                }
            }
            // profile picture not provided, so don't change anything existing profile picture
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        // validate all inputs and add the user to the DB
        try {
            req.session.user = await updateUser(req.session.user._id, data);
            return res.status(200).json({ success: "Updated the profile data!" }); // go to the updated profile page
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    })
    .delete(async (req, res) => {
        try {
            let uid = req.session.user._id;
            await profileUtils.deleteProfilePicture(uid);
            await deleteUser(uid);
            req.session.destroy();
            return res.sendStatus(204);
        } catch (err) {
            return routeUtils.renderError(req, res, 500, "Internal server error");
        }
    });

// view someone else's profile
router.route("/:uid").get(async (req, res) => {
    // validate ID and retrieve other's profile
    if (req.params.uid === req.session.user._id) {
        return res.redirect("/profile");
    }
    try {
        const user = await getUserById(req.params.uid);
        const userDefaultAvail = user.availability.days;
        let userAvail = [];
        for (let day of userDefaultAvail) {
            let dayAvail = [];
            for (let slot of day.slots) {
                dayAvail.push({ user: slot });
            }
            userAvail.push(dayAvail);
        }

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

        return res.render("profile", {
            title: `${user.firstName}'s Profile`,
            canEdit: false,
            firstName: user.firstName,
            lastName: user.lastName,
            description: user.description,
            days: formattedDates,
            timeColumn: columnLabels,
            responses: userAvail,
            pfpUrl: profileUtils.profilePictureToPath(user.profilePicture),
            ...routeUtils.prepareRenderOptions(req),
        });
    } catch (err) {
        return routeUtils.handleValidationError(req, res, err, 400, 404);
    }
});

export default router;
