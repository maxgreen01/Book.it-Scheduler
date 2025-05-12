import express from "express";
import { getMeetingComments } from "../data/comments.js";
import * as routeUtils from "../utils/routeUtils.js";
import { getOwnedMeetings, getUserMeetings } from "../data/users.js";
import { time } from "node:console";

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
    const uid = req.session.user._id;

    const allMeetings = await getUserMeetings(uid);
    let maxUsers = 0; //keep track of the highest number of users in meeting for global display

    const myBookings = []; // bookingStatus == 1
    const myMeetings = []; // bookingStatus != 1 && owned by user
    const myResponses = []; // bookingStatus != 1 && NOT owned by user
    const thisWeekMeetings = []; //booked meetings in the next 7 days
    const today = new Date();
    const nextWeekDays = [];

    for (let meeting of allMeetings) {
        if (meeting.responses.length > maxUsers) maxUsers = meeting.responses.length;
        //transformations applied to all meetings
        meeting.duration /= 2;

        //make date range readable
        const numDays = meeting.dates.length;
        meeting.startDate = routeUtils.formatDateString(meeting.dates[0], false);
        meeting.endDate = numDays == 1 ? null : routeUtils.formatDateString(meeting.dates[numDays - 1], false);

        //filter by category
        if (meeting.bookingStatus === 1) {
            //parse booked time object
            if (meeting.bookedTime.date < today) meeting.isPast = true;
            meeting.bookingDate = routeUtils.formatDateString(meeting.bookedTime.date, false);
            meeting.bookingStart = routeUtils.formatTimeIndex(meeting.bookedTime.startTime);
            meeting.bookingEnd = routeUtils.formatTimeIndex(meeting.bookedTime.endTime);
            myBookings.push(meeting);
        } else if (meeting.owner == uid) {
            //set meeting matrix for calendar display
            meeting.bookingStatus = meeting.bookingStatus == 0 ? "Pending" : "Cancelled";
            meeting.matrix = testMatrix; //todo replace with matrix generated from each meeting data
            myMeetings.push(meeting);
        } else {
            //set meeting matrix for calendar display
            meeting.bookingStatus = meeting.bookingStatus == 0 ? "Pending" : "Cancelled";
            meeting.matrix = testMatrix; //todo replace with matrix generated from each meeting data
            myResponses.push(meeting);
        }
    }

    return res.render("viewAllMeetings", {
        title: "Dashboard",
        myBookings,
        myMeetings,
        myResponses,
        numUsers: maxUsers * 2, //shade at most halfway
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
            return res.render("viewMeeting", {
                title: "Test Meeting",
                comments: comments,
                days: testDays,
                meeting: testMatrix,
                timeColumn: timeColumn,
                numUsers: 4, //TODO: replace this with the actual number of meeting attendees
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
    .get(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    })
    .post(async (req, res) => {
        // TODO
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
