import express from "express";
import { getMeetingComments } from "../data/comments.js";
import * as routeUtils from "../utils/routeUtils.js";
import { getMeetingById } from "../data/meetings.js";
import { mergeResponses } from "../public/js/helpers.js";

const router = express.Router();

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

// view information about a particular meeting
router
    .route("/:meetingId")
    // serve HTML
    .get(async (req, res) => {
        // get the meeting
        let meeting;
        try {
            meeting = await getMeetingById(req.params.meetingId);
        } catch (err) {
            return routeUtils.renderError(req, res, 404, err.message);
        }

        // convert and construct meeting fields to display the data, then render the page
        try {
            // convert data to prepare for rendering

            // transform each date into an object with properties `date` and `dow`, representing the formatted date and corresponding day of the week
            const formattedDates = meeting.dates.map((date) => {
                const month = monthNames[date.getMonth()];
                const dayOfMonth = date.getDate();
                const dayOfWeek = daysOfWeek[date.getDay()];
                return { date: `${month} ${dayOfMonth}`, dow: `${dayOfWeek}` };
            });

            // construct column labels between the meeting's start and end times (in 1-hour increments)
            const columnLabels = [];
            let hours = Math.ceil(meeting.timeStart / 2); // round up to only show times that are in the range
            for (let i = meeting.timeStart; i <= meeting.timeEnd; i++) {
                // calculate the AM/PM hour
                const pm = hours >= 12;
                let adjustedHours = hours % 12;
                if (adjustedHours == 0) adjustedHours = 12; // midnight

                if (i % 2 == 0) {
                    columnLabels.push({ label: `${adjustedHours}:00 ${pm ? "PM" : "AM"}`, small: false });
                } else {
                    columnLabels.push({ label: `${adjustedHours}:30 ${pm ? "PM" : "AM"}`, small: true });
                    hours++; // move to the next hour on the next iteration
                }
            }

            // compute merged availability based on responses
            const merged = mergeResponses(meeting.responses, meeting.timeStart, meeting.timeEnd);
            // extract the raw data and only display the slots within this meeting's time range
            const processedMerged = merged.map((avail) => avail.slots.slice(meeting.timeStart, meeting.timeEnd + 1));

            return res.render("viewMeeting", {
                title: meeting.name,
                days: formattedDates,
                responses: processedMerged,
                timeColumn: columnLabels,
                numUsers: meeting.users.length,
                comments: await getMeetingComments(req.params.meetingId),
                ...routeUtils.prepareRenderOptions(req),
            });
        } catch (err) {
            return routeUtils.renderError(req, res, 404, err.message);
        }
    })
    // submit availability
    .post(async (req, res) => {
        // TODO
        //   note: need to make sure to offset the response data by `timeStart` when constructing Availability Objects
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
