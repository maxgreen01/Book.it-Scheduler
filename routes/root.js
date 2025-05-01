import express from "express";
import { getAllComments, getMeetingComments } from "../data/comments.js";
import { renderError } from "../utils/routeUtils.js";

const router = express.Router();

// landing page
router.route("/").get(async (req, res) => {
    return res.render("home", { title: "Book.it Meeting Scheduler" });
});

router
    .route("/:meetingId")
    .get(async (req, res) => {
        //NOTE: dont do validation for now so we can use test Ids
        // can render a 400 with route-level validation once we do
        const meetingId = req.params.meetingId;

        try {
            //plug meeting comments into page from db
            // const comments = await getAllComments();
            const comments = await getMeetingComments(meetingId);
            res.render("viewMeeting", {
                title: "Test Meeting",
                comments: comments,
            });
        } catch (e) {
            return renderError(res, 404, e);
        }
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
