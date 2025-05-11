import express from "express";
import * as routeUtils from "../utils/routeUtils.js";
import { convertStrToInt } from "../utils/validation.js";
import { createMeeting } from "../data/meetings.js";

const router = express.Router();

router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        return res.render("createMeeting", { title: "Create New Meeting", todayStr: todayStr, ...routeUtils.prepareRenderOptions(req) });
    })
    // create a meeting
    .post(async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }

        // process/convert special fields
        // note that dates are parsed as strings by `createMeeting`
        try {
            data.owner = req.session?.user?._id;
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
            return routeUtils.handleValidationError(req, res, err, 400);
        }
    });

export default router;
