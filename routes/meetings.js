import express from "express";

const router = express.Router();

router.route("/").get(async (req, res) => {
    return res.render("viewAllMeetings", {
        title: "My Meetings",
        meetingList: [
            { id: "abc123", name: "Test Meeting" },
            { id: "deadbeef", name: "Secret Meeting" },
        ],
    });
});

export default router;
