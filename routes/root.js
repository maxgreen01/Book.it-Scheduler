import express from "express";
import * as routeUtils from "../utils/routeUtils.js";

const router = express.Router();

// landing page
router.route("/").get(async (req, res) => {
    return res.render("home", { title: "Book.it Meeting Scheduler", ...routeUtils.prepareRenderOptions(req) });
});

router.route("/favicon.ico").get(async (req, res) => {
    return res.sendFile(routeUtils.__rootdir + "/public/icons/notebook-svgrepo-com.svg");
});

export default router;
