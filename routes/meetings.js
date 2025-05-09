import express from "express";
import { getMeetingComments } from "../data/comments.js";
import * as routeUtils from "../utils/routeUtils.js";
import { getMeetingById, updateMeetingNote } from "../data/meetings.js";
import { ValidationError, validateCommentNoteBody, validateUserId } from "../utils/validation.js";

const router = express.Router();

// Dummy code to test viewMeeting without the underlying data structures
let testMatrix = [
    //random generated garbage meeting 7x48
    [1, 0, 2, 0, 1, 1, 0, 3, 1, 2, 0, 0, 2, 1, 0, 0, 1, 1, 2, 0, 0, 0, 1, 1, 3, 1, 1, 2, 0, 0, 1, 1, 4, 2, 0, 0, 1, 1, 2, 0, 3, 1, 0, 0, 1, 2, 1, 0],
    [1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 3, 1, 1, 1, 1, 2, 1, 1, 1, 2, 1, 3, 1, 1, 1, 1, 2, 1, 4, 1, 1, 1, 2, 1, 1, 1, 1],
    [1, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 3, 1, 1, 1, 1, 2, 1, 1, 2, 2, 2, 1, 4, 2, 1, 2, 1, 2, 1, 3, 2, 2, 1, 1, 2, 2, 2, 1],
    [1, 0, 0, 1, 2, 1, 3, 0, 0, 1, 1, 0, 2, 1, 0, 0, 2, 1, 1, 0, 3, 0, 1, 1, 2, 0, 1, 1, 0, 1, 3, 0, 2, 0, 0, 1, 1, 0, 2, 4, 0, 1, 1, 2, 0, 0, 1, 1],
    [0, 1, 1, 0, 2, 1, 1, 0, 0, 1, 2, 0, 1, 0, 3, 1, 1, 2, 0, 0, 1, 1, 0, 3, 1, 2, 0, 1, 0, 0, 2, 1, 1, 0, 3, 1, 1, 0, 0, 4, 1, 2, 0, 1, 1, 0, 2, 1],
    [1, 0, 2, 1, 0, 1, 0, 3, 1, 2, 0, 0, 1, 1, 1, 0, 3, 1, 0, 0, 2, 1, 1, 0, 0, 1, 2, 0, 4, 1, 0, 2, 1, 1, 0, 3, 1, 2, 0, 0, 1, 1, 1, 0, 2, 1, 1, 0],
    [0, 1, 1, 0, 2, 1, 0, 0, 1, 2, 0, 1, 3, 0, 1, 1, 2, 0, 1, 0, 0, 2, 1, 1, 0, 3, 1, 0, 1, 1, 2, 0, 0, 1, 0, 4, 1, 1, 0, 2, 1, 0, 3, 1, 1, 0, 0, 1],
];
let testDays = ["S", "M", "Tu", "W", "Th", "F", "S"]; //pass in the date fields from the time slot objects
let timeColumn = []; //times are going to be dynamically generated from startTime by the route.js to avoid complex handlebars
let hours = 0; //HACK: replace with startTime when its implemented. Need helpers to convert this into HR:MIN timestamp
for (let i = 0; i < testMatrix[0].length; i++) {
    if (i % 2 == 0) {
        timeColumn.push(`${hours}:00`); //HACK: again, replace with proper timestamp logic. These are placeholders
        hours++;
    } else {
        timeColumn.push("");
    }
}

router.route("/").get(async (req, res) => {
    return res.render("viewAllMeetings", {
        title: "My Meetings",
        meetingList: [
            // FIXME populate with actual data
            { id: "1234abcd1234abcd1234abcd", name: "Test Meeting" },
            { id: "deadbeefdeadbeefdeadbeef", name: "Empty Meeting" },
        ],
        ...routeUtils.prepareRenderOptions(req),
    });
});

router
    .route("/:meetingId")
    .get(async (req, res) => {
        //NOTE: not validating until we have real id's
        const meetingId = req.params.meetingId;
        try {
            //plug meeting comments into page from db
            const comments = await getMeetingComments(meetingId);
            const userId = validateUserId(req.session.user._id);
            const meeting = await getMeetingById(meetingId);
            const note = meeting.notes[userId];
            return res.render("viewMeeting", {
                title: "Test Meeting",
                comments: comments,
                days: testDays,
                meeting: testMatrix,
                timeColumn: timeColumn,
                note,
                ...routeUtils.prepareRenderOptions(req),
            });
        } catch (err) {
            return routeUtils.renderError(req, res, 404, err.message);
        }
    })

    .post(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    });

router
    .route("/:meetingId/edit")
    .get(async (req, res) => {
        return res.render("editMeeting", {
            title: "Test Meeting EDIT",
            meetingId: "abc123",
            meetingDescription: "The big meetup",
            ...routeUtils.prepareRenderOptions(req),
        });
    })
    .post(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    })
    .patch(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    })
    .delete(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    });

router
    .route("/:meetingId/note")
    .post(async (req, res) => {
        try {
            const meetingId = req.params.meetingId;
            const userId = validateUserId(req.session.user._id);
            const note = validateCommentNoteBody(req.body.noteInput, "Note Body");
            await updateMeetingNote(meetingId, userId, note);
            return res.status(200).json({ noteUpdated: `Note for user ${userId} updated to ${note}` });
        } catch (e) {
            if (e instanceof ValidationError) {
                return res.status(400).json({ error: e.message });
            } else {
                return res.status(500).json({ error: e.message });
            }
        }
    })
    .get(async (req, res) => {
        try {
            const meetingId = req.params.meetingId;
            const meeting = await getMeetingById(meetingId);
            const userId = validateUserId(req.session.user._id);
            return res.status(200).json({ note: meeting.notes[userId] });
        } catch (e) {}
        return res.status(404).json({ error: "Route not implemented yet" });
    });

router
    .route("/:meetingId/comment")
    .get(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    })
    .post(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    });

router
    .route("/:meetingId/comment/:commentId")
    .get(async (req, res) => {
        // TODO get all comments
        return res.status(404).json({ error: "Route not implemented yet" });
    })
    .post(async (req, res) => {
        // TODO post a reaction
        return res.status(404).json({ error: "Route not implemented yet" });
    })
    .patch(async (req, res) => {
        // TODO edit a comment's body
        return res.status(404).json({ error: "Route not implemented yet" });
    });

export default router;
