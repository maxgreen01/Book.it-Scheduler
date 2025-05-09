import express from "express";
import * as routeUtils from "../utils/routeUtils.js";
import { convertStrToInt, ValidationError } from "../utils/validation.js";
import { createMeeting } from "../data/meetings.js";

const router = express.Router();

router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        return res.render("createMeeting", { title: "Create New Meeting", ...routeUtils.prepareRenderOptions(req) });
    })
    // create a meeting
    .post(async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }

        // process/convert special fields
        try {
            data.owner = req.session?.user?._id;
            data.dateStart = new Date(data.dateStart);
            data.dateEnd = new Date(data.dateEnd);
            data.timeStart = convertStrToInt(data.timeStart);
            data.timeEnd = convertStrToInt(data.timeEnd);
        } catch (err) {
            return routeUtils.renderError(req, res, 400, err.message);
        }

        // validate all inputs and add the meeting to the DB
        try {
            const meeting = await createMeeting(data);
            return res.redirect(`/meetings/${meeting._id}`);
        } catch (err) {
            if (err instanceof ValidationError) {
                return routeUtils.renderError(req, res, 400, err.message);
            } else {
                return routeUtils.renderError(req, res, 500, err.message);
            }
        }
    });

export default router;
