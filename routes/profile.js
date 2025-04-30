import express from "express";
import { ValidationError, validateUserId } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as profileUtils from "../utils/profileUtils.js";
import { getUserById, updateUser } from "../data/users.js";

const router = express.Router();

// view or edit your own profile
router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        return res.render("profile", {
            title: "My Profile",
            canEdit: true,
            fullName: "Alex Prikockis",
            pfpUrl: "https://files.alexcheese.com/u/AWmGOQ.png",
        });

        // todo - get current UID from session, then pass user object to HTML template
        // try {
        //     const uid = "";
        //     const user = await userFunctions.getUserById(uid);
        //     return res.render("profilePage", { user: user });
        // } catch (err) {
        //    if (err instanceof ValidationError) {
        //        return routeUtils.renderError(res, 400, err.message);
        //    } else {
        //        return routeUtils.renderError(res, 500, err.message);
        //    }
        // }
    })
    // update current user's profile
    .patch(async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(res, 400, "Request body is empty");
        }

        // validate User ID
        try {
            data.uid = validateUserId(data.uid);
        } catch (err) {
            return routeUtils.renderError(res, 400, err.message);
        }

        // update profile picture, if one is supplied
        try {
            const pfpFile = req.files?.profilePicture;
            if (typeof pfpFile === "object") {
                // make sure only one file is submitted
                if (!Array.isArray(pfpFile)) {
                    data.profilePicture = await profileUtils.updateProfilePicture(data.uid, pfpFile);
                } else {
                    return routeUtils.renderError(res, 400, "Only one image can be submitted");
                }
            }
            // profile picture not provided, so don't change anything existing profile picture
        } catch (err) {
            if (err instanceof ValidationError) {
                return routeUtils.renderError(res, 400, err.message);
            } else {
                return routeUtils.renderError(res, 500, err.message);
            }
        }

        // validate all inputs and add the user to the DB
        try {
            await updateUser(req.body.uid, data);

            return res.redirect("/profile"); // go to the updated profile page
        } catch (err) {
            if (err instanceof ValidationError) {
                return routeUtils.renderError(res, 400, err.message);
            } else {
                return routeUtils.renderError(res, 500, err.message);
            }
        }
    });

// view someone else's profile
router.route("/:uid").get(async (req, res) => {
    // validate ID and retrieve other's profile
    try {
        const user = await getUserById(req.params.uid);
        return res.json(user);

        // return res.render("profilePage", { user: user }); // todo implement HTML template
    } catch (err) {
        if (err instanceof ValidationError) {
            return routeUtils.renderError(res, 400, err.message);
        } else {
            return routeUtils.renderError(res, 404, err.message);
        }
    }
});

export default router;
