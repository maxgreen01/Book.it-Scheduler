import express from "express";
import { ValidationError } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as userFunctions from "../data/users.js";

const router = express.Router();

// view or edit your own profile
router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        return res.json("implement me");

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
    // validate ID and retrieve
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
