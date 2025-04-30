import express from "express";

const router = express.Router();

// landing page
router.route("/").get(async (req, res) => {
    return res.render("home", { title: "Book.it Meeting Scheduler" });
});

// interface for a regular user to interact with a meeting
router
    .route("/:meetingId")
    // serve HTML
    .get(async (req, res) => {
        res.render("viewMeeting", {
            title: "Test Meeting",
            canEdit: true,
            meetingId: "abc123",
            meetingDescription: "The big meetup",
        });
    })
    // submit availability
    .post(async (req, res) => {
        return res.json("implement me");
    });

// meeting owner functionalities
router
    .route("/:meetingId/edit")
    // serve HTML
    .get(async (req, res) => {
        return res.render("editMeeting", {
            title: "Test Meeting EDIT",
            meetingId: "abc123",
            meetingDescription: "The big meetup",
        });
    })
    // edit meeting details or book meeting time
    .patch(async (req, res) => {
        return res.json("implement me");
    });

export default router;
