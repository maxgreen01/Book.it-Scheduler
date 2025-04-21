import express from "express";

const router = express.Router();

router.route("/").get(async (req, res) => {
    res.render("createMeeting", { title: "Create New Meeting" });
});

export default router;
