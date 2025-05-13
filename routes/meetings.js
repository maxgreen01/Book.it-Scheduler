import express from "express";
import { createComment, deleteComment, getCommentById, getMeetingComments } from "../data/comments.js";
import * as routeUtils from "../utils/routeUtils.js";
import { getUserById, getUserMeetings } from "../data/users.js";
import { addResponseToMeeting, getMeetingById, isUserMeetingOwner, setMeetingBooking, updateMeeting, updateMeetingNote } from "../data/meetings.js";
import { computeBestTimes, constructTimeLabels, augmentFormatDate, mergeResponses, formatDateAsMinMaxString, convertIndexToLabel } from "../public/js/helpers.js";
import { Availability } from "../public/js/classes/availabilities.js";
import { convertStrToInt, isSameDay, validateArrayElements, validateCommentNoteBody, validateDateObj, validateIntRange, validateImageFileType, validateUserId, ValidationError } from "../utils/validation.js";

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
    const uid = req.session.user._id;
    const allMeetings = await getUserMeetings(uid);

    let maxUsers = 0; //keep track of the highest number of users in meeting for global display

    //date information
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // these reference dates shouldn't have time info
    const sevenDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    sevenDaysLater.setDate(today.getDate() + 7);

    const myBookings = []; // bookingStatus == 1
    const myMeetings = []; // bookingStatus != 1 && owned by user
    const myResponses = []; // bookingStatus != 1 && NOT owned by user
    const upcomingMeetings = {}; //calendar timeline dictionary

    //fill the calendar timeline w proper keys, initially empty
    for (let i = 0; i < 7; i++) {
        const day = new Date();
        day.setDate(today.getDate() + i);
        const key = routeUtils.formatDateString(day, true);
        upcomingMeetings[key] = [];
    }

    //filter all meetings based on their statuses, and add handlebars fields where needed
    for (const meeting of allMeetings) {
        if (meeting.users.length > maxUsers) maxUsers = meeting.users.length;
        //transformations applied to all meetings
        meeting.duration /= 2;

        //make date range readable
        const numDays = meeting.dates.length;
        meeting.startDate = routeUtils.formatDateString(meeting.dates[0], false);
        meeting.endDate = numDays == 1 ? null : routeUtils.formatDateString(meeting.dates[numDays - 1], false);

        //========== FILTER MEETINGS AROUND PAGE ===========

        //booked meetings
        if (meeting.bookingStatus === 1) {
            const bookedDate = meeting.bookedTime.date;

            //parse booked time object for handlebars render
            meeting.bookingDate = routeUtils.formatDateString(bookedDate, false);
            meeting.bookingStart = convertIndexToLabel(meeting.bookedTime.timeStart);
            meeting.bookingEnd = convertIndexToLabel(meeting.bookedTime.timeEnd);

            //mark past meetings
            if (bookedDate < today) meeting.isPast = true;

            //mark upcoming meetings
            if (bookedDate >= today && bookedDate <= sevenDaysLater) {
                const key = routeUtils.formatDateString(bookedDate, true);

                //push calendar object to value of dictionary
                if (key in upcomingMeetings) {
                    const calendarItem = {
                        _id: meeting._id,
                        name: meeting.name,
                    };
                    upcomingMeetings[key].push(calendarItem);
                }
            }
            myBookings.push(meeting);

            //owned meetings
        } else if (meeting.owner == uid) {
            meeting.bookingStatus = meeting.bookingStatus == 0 ? "Pending" : "Cancelled";

            // process responses on the fly
            const merged = safeMergeResponses(meeting.responses, meeting.dates, meeting.timeStart, meeting.timeEnd);
            // extract the raw data and only display the slots within this meeting's time range
            meeting.processedResponses = merged.map((avail) => avail.slots.slice(meeting.timeStart, meeting.timeEnd));

            myMeetings.push(meeting);

            //responded meetings
        } else {
            meeting.bookingStatus = meeting.bookingStatus == 0 ? "Pending" : "Cancelled";

            // process responses on the fly
            const merged = safeMergeResponses(meeting.responses, meeting.dates, meeting.timeStart, meeting.timeEnd);
            // extract the raw data and only display the slots within this meeting's time range
            meeting.processedResponses = merged.map((avail) => avail.slots.slice(meeting.timeStart, meeting.timeEnd));

            myResponses.push(meeting);
        }
    }

    //split up upcomingMeetings for easier handlebars rendering
    let upcomingDays = Object.keys(upcomingMeetings).map((key) => {
        let tokens = key.split(", "); //split Sun, May 21 -> Sun | May 21
        return { weekday: tokens[0], date: tokens[1] };
    });
    let upcomingDaysContent = Object.values(upcomingMeetings); //{name: , _id: } (for an href)

    return res.render("viewAllMeetings", {
        title: "Dashboard",
        upcomingDays,
        upcomingDaysContent,
        myBookings,
        myMeetings,
        myResponses,
        numUsers: maxUsers * 2, //shade at most halfway
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

            //get user default availability
            let userDefaultAvail = await getUserById(userId);
            userDefaultAvail = userDefaultAvail.availability;
            let userAvail = [];
            for (let date of meeting.dates) {
                const dayIdx = date.getDay();
                const currdayAvail = userDefaultAvail.days[dayIdx].slots;
                const mergedDayAvail = [];
                for (let i = meeting.timeStart; i < meeting.timeEnd; i++) {
                    mergedDayAvail.push(currdayAvail[i]);
                }
                userAvail.push(mergedDayAvail);
            }

            //if the user has responded before overwrite with their response
            for (let response of meeting.responses) {
                if (response.uid === userId) {
                    for (let i = 0; i < response.availabilities.length; i++) {
                        userAvail[i] = response.availabilities[i].slots.slice(meeting.timeStart, meeting.timeEnd);
                    }
                }
            }

            //If a previous meeting has been booked add that to the user's availability
            const userMeetings = await getUserMeetings(userId);
            for (const userMeeting of userMeetings) {
                if (userMeeting.bookingStatus === 1) {
                    for (let i = 0; i < meeting.dates.length; i++) {
                        if (isSameDay(meeting.dates[i], userMeeting.bookedTime.date)) {
                            for (let j = userMeeting.bookedTime.timeStart; j <= userMeeting.bookedTime.timeEnd; j++) {
                                const currMeetingIdx = j - meeting.timeStart;
                                if (currMeetingIdx >= 0 && currMeetingIdx < meeting.timeEnd - meeting.timeStart) {
                                    userAvail[i][currMeetingIdx] = 2;
                                }
                            }
                        }
                    }
                }
            }

            //Add the user's availability and the merged availability to a new array
            /*
            Each Array Index contains two keys one which the merged availability and one with the user's availability
            0: {merged: 2, user: 1};
            */
            const renderResponses = [];
            for (let i = 0; i < processedMerged.length; i++) {
                const dayAvail = [];
                for (let j = 0; j < processedMerged[i].length; j++) {
                    const c = { merged: processedMerged[i][j], user: userAvail[i][j] };
                    dayAvail.push(c);
                }
                renderResponses.push(dayAvail);
            }

            // retrieve and format comments for this meeting
            let comments = await getMeetingComments(meetingId);
            comments = comments.reverse();
            const isOwner = await isUserMeetingOwner(meetingId, userId);
            for (const comment of comments) {
                comment.dateCreated = comment.dateCreated.toLocaleString();
                if (comment.dateUpdated) {
                    comment.dateUpdated = comment.dateUpdated.toLocaleString();
                }
                if (userId === comment.uid || isOwner) {
                    comment.isViewerComment = true;
                }
            }

            let viewerNotResponse = true;
            meeting.responses.map((res) => {
                if (res.uid == userId) viewerNotResponse = false;
            });

            // retrieve the user's private note for this meeting
            const note = meeting.notes[userId];

            return res.render("viewMeeting", {
                meetingId: meetingId,
                title: meeting.name,
                description: meeting.description,
                duration: `${meeting.duration / 2} hour(s)`,
                days: formattedDates,
                processedResponses: renderResponses,
                viewerNotResponse: viewerNotResponse,
                timeColumn: columnLabels,
                numUsers: meeting.users.length,
                bestTimes: bestTimes,
                bestTimesJSON: JSON.stringify(bestTimes), // pass the entire array as JSON so it can be reused by validation
                bookedTime: meeting.bookedTime,
                isCancelled: meeting.bookingStatus == -1,
                comments: comments,
                note: note,
                isOwner,
                ...routeUtils.prepareRenderOptions(req),
            });
        } catch (err) {
            return routeUtils.handleValidationError(req, res, err, 400, 404);
        }
    })
    // submit availability
    .post(async (req, res) => {
        //   note: need to make sure to offset the response data by `timeStart` when constructing Availability Objects
        try {
            const userId = req.session.user._id;
            const response = req.body;
            const meeting = await getMeetingById(req.params.meetingId);

            validateArrayElements(
                response,
                "Response Array",
                (arr) => {
                    validateArrayElements(
                        arr,
                        "Response Int Array",
                        (int) => {
                            validateIntRange(int, "Int of Response Array", 0, 1);
                        },
                        meeting.timeEnd - meeting.timeStart
                    );
                },
                meeting.dates.length
            );

            const userMeetings = await getUserMeetings(userId);
            for (const userMeeting of userMeetings) {
                if (userMeeting.bookingStatus === 1) {
                    for (let i = 0; i < meeting.dates.length; i++) {
                        if (isSameDay(meeting.dates[i], userMeeting.bookedTime.date)) {
                            for (let j = userMeeting.bookedTime.timeStart; j <= userMeeting.bookedTime.timeEnd; j++) {
                                const currMeetingIdx = j - meeting.timeStart;
                                if (currMeetingIdx >= 0 && currMeetingIdx < meeting.timeEnd - meeting.timeStart) {
                                    if (response[i][currMeetingIdx] === 1) {
                                        throw new Error(`Cannot respond to a time where you're already booked for a meeting!`);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            const availabilities = [];
            for (let i = 0; i < meeting.dates.length; i++) {
                const date = meeting.dates[i];
                let intArr = [];
                const prependArr = new Array(meeting.timeStart).fill(0);
                intArr = intArr.concat(prependArr);
                intArr = intArr.concat(response[i]);
                const appendArr = new Array(48 - meeting.timeEnd).fill(0);
                intArr = intArr.concat(appendArr);
                availabilities.push(new Availability(intArr, date));
            }

            await addResponseToMeeting(meeting._id, { uid: userId, availabilities: availabilities });

            return res.status(200).json({ success: "Response Added!" });
        } catch (err) {
            routeUtils.handleValidationError(req, res, err, 400, 404);
        }
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
            isCancelled: meeting.bookingStatus == -1,
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
    // book or unbook the meeting time, or cancel/restore the entire meeting
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
            // book the meeting

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
                await setMeetingBooking(meetingId, bookingStatus);
                return res.redirect(`/meetings/${meetingId}`);
            } catch (err) {
                return routeUtils.handleValidationError(req, res, err);
            }
        } else if (action === "cancel") {
            // cancel the meeting
            try {
                const bookingStatus = -1; // indicates cancelled
                await setMeetingBooking(meetingId, bookingStatus);
                return res.status(200).json({ success: `Canceled Meeting with ID: ${meetingId}` });
            } catch (err) {
                return res.status(400).json({ error: err.message });
            }
        } else if (action === "restore") {
            // restore the meeting
            try {
                const bookingStatus = 0; // indicates pending
                await setMeetingBooking(meetingId, bookingStatus);
                return res.status(200).json({ success: `Restored Meeting with ID: ${meetingId}` });
            } catch (err) {
                return res.status(400).json({ error: err.message });
            }
        } else {
            return res.status(400).json({ error: "Invalid Booking Action" });
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
            const isOwner = await isUserMeetingOwner(meetingId, userId);
            for (const comment of comments) {
                comment.dateCreated = comment.dateCreated.toLocaleString();
                if (comment.dateUpdated) {
                    comment.dateUpdated = comment.dateUpdated.toLocaleString();
                }
                if (userId === comment.uid || isOwner) {
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
            const isOwner = await isUserMeetingOwner(comment.meetingId, userId);
            if (userId !== comment.uid && !isOwner) {
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

router.route("/:meetingId/responses").get(async (req, res) => {
    try {
        const meetingId = req.params.meetingId;
        const meeting = await getMeetingById(meetingId);
        const userId = validateUserId(req.session.user._id);
        return res.status(200).json({ responses: meeting.responses, uid: userId, start: meeting.timeStart, end: meeting.timeEnd });
    } catch (err) {
        return routeUtils.handleValidationError(req, res, err, 400, 404);
    }
});

export default router;
