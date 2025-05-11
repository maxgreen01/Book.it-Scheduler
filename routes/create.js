import express from "express";
import * as routeUtils from "../utils/routeUtils.js";

const router = express.Router();

router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        return res.render("createMeeting", { title: "Create New Meeting", ...routeUtils.prepareRenderOptions(req) });
    })
    // create the meeting
    .post(async (req, res) => {
        return res.json("implement me");
    });

export default router;
