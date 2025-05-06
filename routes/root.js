import express from "express";
import * as routeUtils from "../utils/routeUtils.js";

const router = express.Router();

// landing page
router.route("/").get(async (req, res) => {
    return res.render("home", { title: "Book.it Meeting Scheduler", ...routeUtils.prepareRenderOptions(req) });
});

export default router;
