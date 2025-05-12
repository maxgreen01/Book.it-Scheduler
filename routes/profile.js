import express from "express";
import { xss } from "express-xss-sanitizer";
import { validateUserId } from "../utils/validation.js";
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
            fullName: `${req.session.user.firstName} ${req.session.user.lastName}`,
            pfpUrl: profileUtils.profilePictureToPath(req.session.user.profilePicture),
            ...routeUtils.prepareRenderOptions(req),
        });

        // todo - get current UID from session, then pass user object to HTML template
        // try {
        //     const user = req.session.;
        //     return res.render("profilePage", { user: user, ...routeUtils.prepareRenderOptions(req) });
        // } catch (err) {
        //    return routeUtils.handleValidationError(req, res, err, 404);
        // }
    })
    // update current user's profile
    .patch(xss(), async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }

        // validate User ID
        try {
            data.uid = validateUserId(data.uid);
        } catch (err) {
            return routeUtils.renderError(req, res, 400, err.message);
        }

        // update profile picture, if one is supplied
        try {
            const pfpFile = req.files?.profilePicture;
            if (typeof pfpFile === "object") {
                // make sure only one file is submitted
                if (!Array.isArray(pfpFile)) {
                    data.profilePicture = await profileUtils.updateProfilePicture(data.uid, pfpFile);
                } else {
                    return routeUtils.renderError(req, res, 400, "Only one image can be submitted");
                }
            }
            // profile picture not provided, so don't change anything existing profile picture
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }

        // validate all inputs and add the user to the DB
        try {
            await updateUser(req.body.uid, data);

            return res.redirect("/profile"); // go to the updated profile page
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }
    });

// view someone else's profile
router.route("/:uid").get(async (req, res) => {
    // validate ID and retrieve other's profile
    try {
        const user = await getUserById(req.params.uid);
        return res.render("profile", {
            title: `${user.firstName}'s Profile`,
            canEdit: false,
            fullName: `${user.firstName} ${user.lastName}`,
            pfpUrl: `/public/images/${user.profilePicture}`,
            ...routeUtils.prepareRenderOptions(req),
        });
    } catch (err) {
        return routeUtils.handleValidationError(req, res, err, 400, 404);
    }
});

export default router;
