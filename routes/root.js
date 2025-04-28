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

router.route("/:meetingId/edit").get(async (req, res) => {
    res.render("editMeeting", {
        title: "Test Meeting EDIT",
        meetingId: "abc123",
        meetingDescription: "The big meetup",
    });
});

export default router;
