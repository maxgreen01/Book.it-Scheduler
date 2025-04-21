import express from "express";

const router = express.Router();

router.route("/").get(async (req, res) => {
    res.render("home", { title: "Book.it Meeting Scheduler" });
});

router.route("/:meetingId").get(async (req, res) => {
    res.render("viewMeeting", {
        title: "Test Meeting",
        canEdit: true,
        meetingId: "abc123",
        meetingDescription: "The big meetup",
    });
});

export default router;
