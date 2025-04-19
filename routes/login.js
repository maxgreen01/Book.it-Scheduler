import express from "express";
import { ValidationError } from "../utils/validation.js";
import * as routeUtils from "../utils/routeUtils.js";
import * as userFunctions from "../data/users.js";

const router = express.Router();

router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        res.json("implement me");
    })
    // todo login to an existing profile (i.e. "log in") -- which route?

    //
    // create a new profile (i.e. "sign up")
    .post(async (req, res) => {
        // ensure non-empty request body
        let data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(res, 400, "Request body is empty");
        }

        // todo profile pic file input stuff here
        req.body.profilePicture = "/public/images/myPFP.jpg";

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
