import express from "express";
import { createComment, deleteComment, getCommentById, getMeetingComments } from "../data/comments.js";
import * as routeUtils from "../utils/routeUtils.js";
import { getMeetingById, isUserMeetingOwner, setMeetingBooking, updateMeeting, updateMeetingNote } from "../data/meetings.js";
import { computeBestTimes, constructTimeLabels, augmentFormatDate, mergeResponses, formatDateAsMinMaxString } from "../public/js/helpers.js";
import { Availability } from "../public/js/classes/availabilities.js";
import { convertStrToInt, validateCommentNoteBody, validateDateObj, validateIntRange, validateUserId, ValidationError } from "../utils/validation.js";

const router = express.Router();

// wrapper function to merge responses, or return a list of empty Availabilities if no responses have been submitted yet
const safeMergeResponses = (responses, dates, timeStart, timeEnd) => {
    let merged = [];
    if (responses.length == 0) {
        // no responses, so create empty Availability data
        for (const date of dates) {
            merged.push(Availability.emptyAvailability(date));
        }
    } else {
        // compute merged availability based on responses
        merged = mergeResponses(responses, timeStart, timeEnd);
    }
    return merged;
};

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
        const meetingId = req.params.meetingId;
        let userId;

        // get the meeting and verify the user
        let meeting;
        try {
            meeting = await getMeetingById(meetingId);
            userId = validateUserId(req.session?.user?._id);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }

        const timeStart = meeting.timeStart;
        const timeEnd = meeting.timeEnd;

        // convert and construct meeting fields to display the data, then render the page
        try {
            // convert data to prepare for rendering

            // convert dates into human-readable format
            const formattedDates = meeting.dates.map(augmentFormatDate);

            // construct column labels between the meeting's start and end times (including a `small` indicator for half hours)
            const columnLabels = constructTimeLabels(timeStart, timeEnd, true);

            // process responses on the fly
            const merged = safeMergeResponses(meeting.responses, meeting.dates, timeStart, timeEnd);
            // extract the raw data and only display the slots within this meeting's time range
            const processedMerged = merged.map((avail) => avail.slots.slice(timeStart, timeEnd));

            // compute the best times based on this meeting's availability
            const bestTimes = computeBestTimes(merged, timeStart, timeEnd, meeting.users.length, meeting.duration, true);

            // retrieve and format comments for this meeting
            let comments = await getMeetingComments(meetingId);
            comments = comments.reverse();
            for (const comment of comments) {
                comment.dateCreated = comment.dateCreated.toLocaleString();
                if (comment.dateUpdated) {
                    comment.dateUpdated = comment.dateUpdated.toLocaleString();
                }
                if (userId === comment.uid) {
                    comment.isViewerComment = true;
                }
            }

            // retrieve the user's private note for this meeting
            const note = meeting.notes[userId];

            return res.render("viewMeeting", {
                meetingId: meetingId,
                title: meeting.name,
                description: meeting.description,
                duration: `${meeting.duration / 2} hour(s)`,
                days: formattedDates,
                responses: processedMerged,
                timeColumn: columnLabels,
                numUsers: meeting.users.length,
                bestTimes: bestTimes,
                bestTimesJSON: JSON.stringify(bestTimes), // pass the entire array as JSON so it can be reused by validation
                bookedTime: meeting.bookedTime,
                isCancelled: meeting.bookingStatus == -1,
                comments: comments,
                note: note,
                isOwner: await isUserMeetingOwner(meetingId, userId),
                ...routeUtils.prepareRenderOptions(req),
            });
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }
    })
    // submit availability
    .post(async (req, res) => {
        // TODO
        //   note: need to make sure to offset the response data by `timeStart` when constructing Availability Objects

        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }
        return res.status(404).json({ error: "Route not implemented yet" });
    });

router
    .route("/:meetingId/edit")
    // serve HTML
    .get(async (req, res) => {
        const meetingId = req.params.meetingId;

        // get the meeting
        let meeting;
        try {
            meeting = await getMeetingById(meetingId);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }

        return res.render("editMeeting", {
            meetingId: meetingId,
            title: meeting.name,
            description: meeting.description,
            duration: meeting.duration / 2, // convert from index back into hours
            timeStart: meeting.timeStart,
            timeEnd: meeting.timeEnd,
            ...routeUtils.prepareRenderOptions(req),
        });
    })
    // edit meeting details
    .patch(async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }

        const meetingId = req.params.meetingId;

        // get the existing meeting
        let meeting;
        try {
            meeting = await getMeetingById(meetingId);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }

        // pass the existing time limits to validate the edited `duration`
        data.timeStart = meeting.timeStart;
        data.timeEnd = meeting.timeEnd;

        // validate all inputs and add the meeting to the DB
        try {
            const meeting = await updateMeeting(meetingId, data);
            return res.redirect(`/meetings/${meeting._id}`);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }
    })
    // book or unbook the meeting time
    .post(async (req, res) => {
        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }

        const meetingId = req.params.meetingId;

        // get the existing meeting
        let meeting;
        try {
            meeting = await getMeetingById(meetingId);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }

        // split functionality based on `action` property from submission button
        const action = data.action;
        if (action === "book") {
            // validate new inputs
            let date, timeStart;
            try {
                try {
                    const [year, month, day] = data.date.split("-").map(Number);
                    date = validateDateObj(new Date(year, month - 1, day), "Meeting Booking Date");
                } catch {
                    throw new ValidationError("You must select a valid Date");
                }
                try {
                    timeStart = validateIntRange(convertStrToInt(data.timeStart), "Meeting Booking Time", 0, 47);
                } catch {
                    throw new ValidationError(`You must select a valid Start Time and End Time`);
                }
            } catch (err) {
                return routeUtils.renderError(req, res, 400, err.msg);
            }

            // recompute best times to make sure the selected time matches one of them
            const merged = safeMergeResponses(meeting.responses, meeting.dates, meeting.timeStart, meeting.timeEnd);
            const bestTimes = computeBestTimes(merged, meeting.timeStart, meeting.timeEnd, meeting.users.length, meeting.duration, true);

            // ensure the selected time is valid in the context of this meeting
            let match = false;
            for (const time of bestTimes) {
                // move on if the date doesn't match
                if (formatDateAsMinMaxString(date) !== time.minmaxDate) {
                    continue;
                }

                // check if the selected time is within the date range
                // note: this is where you would make changes to check if the booking time is entirely contained
                if (timeStart >= time.timeStart && timeStart < time.timeEnd) {
                    match = true;
                    break;
                }
                // else the current time doesn't contain the selected date, so keep checking
            }

            if (!match) {
                return routeUtils.renderError(req, res, 400, "Meeting Booking must be (at least partially) contained within one of the computed best times");
            }

            // actually book the meeting in the DB
            try {
                const bookingStatus = 1; // indicates booked
                const bookedTime = {
                    date: date,
                    timeStart: timeStart,
                    timeEnd: timeStart + meeting.duration,
                };
                await setMeetingBooking(meetingId, bookingStatus, bookedTime);
                return res.redirect(`/meetings/${meetingId}`);
            } catch (err) {
                return routeUtils.handleValidationError(req, res, err);
            }
        } else if (action === "unbook") {
            // remove the booking
            try {
                const bookingStatus = 0; // indicates pending
                const bookedTime = null;
                await setMeetingBooking(meetingId, bookingStatus, bookedTime);
                return res.redirect(`/meetings/${meetingId}`);
            } catch (err) {
                return routeUtils.handleValidationError(req, res, err);
            }
        } else {
            return routeUtils.renderError(req, res, 400, "Invalid booking action");
        }
    })
    // delete a meeting entirely
    .delete(async (req, res) => {
        // TODO - ONLY IF THERE'S TIME
        return res.status(404).json({ error: "Route not implemented yet" });
    });

router
    .route("/:meetingId/note")
    // AJAX route for getting a user's private note
    .get(async (req, res) => {
        try {
            const meetingId = req.params.meetingId;
            const meeting = await getMeetingById(meetingId);
            const userId = validateUserId(req.session.user._id);
            return res.status(200).json({ note: meeting.notes[userId] });
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }
    })
    // AJAX route for updating a user's private note
    .post(async (req, res) => {
        try {
            const meetingId = req.params.meetingId;
            const userId = validateUserId(req.session.user._id);
            const note = validateCommentNoteBody(req.body.noteInput, "Note Body");
            await updateMeetingNote(meetingId, userId, note);
            return res.status(200).json({ noteUpdated: `Note for user ${userId} updated to ${note}` });
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }
    });

router
    .route("/:meetingId/comment")
    // AJAX route for getting all comments on a meeting
    .get(async (req, res) => {
        try {
            const meetingId = req.params.meetingId;
            const comments = await getMeetingComments(meetingId);
            const userId = validateUserId(req.session.user._id);
            for (const comment of comments) {
                comment.dateCreated = comment.dateCreated.toLocaleString();
                if (comment.dateUpdated) {
                    comment.dateUpdated = comment.dateUpdated.toLocaleString();
                }
                if (userId === comment.uid) {
                    comment.isViewerComment = true;
                }
            }

            return res.status(200).json({ comments: comments, uid: userId });
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }
    })
    // AJAX route for creating a new comment on a meeting
    .post(async (req, res) => {
        try {
            const meetingId = req.params.meetingId;
            const userId = validateUserId(req.session.user._id);
            const commentBody = validateCommentNoteBody(req.body.commentInput);
            const newComment = await createComment({ uid: userId, meetingId: meetingId, body: commentBody });
            newComment.dateCreated = newComment.dateCreated.toLocaleString();

            return res.status(200).json(newComment);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }
    });

router
    .route("/:meetingId/comment/:commentId")
    // AJAX route for getting a particular comment
    .get(async (req, res) => {
        try {
            const comment = await getCommentById(req.params.commentId);
            comment.dateCreated = comment.dateCreated.toLocaleString();
            return res.status(200).json(comment);
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }
    })
    // AJAX route for deleting a particular comment
    .delete(async (req, res) => {
        try {
            const comment = await getCommentById(req.params.commentId);
            const userId = validateUserId(req.session.user._id);
            if (userId !== comment.uid) {
                return res.status(401).json({ error: `User ${userId} cannot delete the comment created by ${comment.uid}` });
            }
            const deleted = await deleteComment(comment._id);
            return res.status(200).json({ deleted: "success", comment: deleted });
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400);
        }
    })
    // AJAX route for posting a reaction to a particular reaction
    .post(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    })
    // AJAX route for editing a particular comment's body
    .patch(async (req, res) => {
        // TODO
        return res.status(404).json({ error: "Route not implemented yet" });
    });

export default router;
