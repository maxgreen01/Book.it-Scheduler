import express from "express";

const router = express.Router();

router
    .route("/")
    // serve HTML
    .get(async (req, res) => {
        return res.render("createMeeting", { title: "Create New Meeting" });
    })
    // create the meeting
    .post(async (req, res) => {
        return res.json("implement me");
    });

export default router;
