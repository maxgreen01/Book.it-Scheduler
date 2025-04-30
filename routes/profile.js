import express from "express";
import { ValidationError, validateUserId } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as userFunctions from "../data/users.js";
import path from "node:path";
import fs from "node:fs/promises";

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
        const pfpFile = req.files?.profilePicture;
        if (pfpFile) {
            // remove the existing profile picture (if it isn't the default)
            try {
                const user = await userFunctions.getUserById(data.uid);

                if (user.profilePicture !== routeUtils.defaultProfilePicture) {
                    await fs.unlink(user.profilePicture);
                }
            } catch (err) {
                return routeUtils.renderError(res, 500, err.message);
            }

            // rename the file
            const extension = pfpFile.name.split(".").pop();
            const filepath = `/public/images/${data.uid}.${extension}`;

            // upload the file to the server
            try {
                await pfpFile.mv(path.join(routeUtils.__rootdir, filepath));
            } catch (err) {
                return routeUtils.renderError(res, 500, err.message);
            }

            // file successfully uploaded, so save its path
            data.profilePicture = filepath;
        }

        // validate all inputs and add the user to the DB
        try {
            await userFunctions.updateUser(req.body.uid, data);
            return res.redirect(req.get("Referrer") || "/"); // return to the page that called this route
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
        const user = await userFunctions.getUserById(req.params.uid);
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
