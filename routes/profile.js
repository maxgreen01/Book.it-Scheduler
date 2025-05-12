import express from "express";
import { validateUserId } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as profileUtils from "../utils/profileUtils.js";
import { deleteUser, getUserById, updateUser } from "../data/users.js";

const router = express.Router();

// view or edit your own profile
router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        return res.render("profile", {
            title: "My Profile",
            canEdit: true,
            firstName: req.session.user.firstName,
            lastName: req.session.user.lastName,
            description: req.session.user.description,
            pfpUrl: profileUtils.profilePictureToPath(req.session.user.profilePicture),
            ...routeUtils.prepareRenderOptions(req),
        });
    })
    // update current user's profile
    .post(async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
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
            req.session.user = await updateUser(req.session.user._id, data);

            return res.redirect("/profile"); // go to the updated profile page
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
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
