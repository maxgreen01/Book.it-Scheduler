import express from "express";
import { createComment, deleteComment, getCommentById, getMeetingComments } from "../data/comments.js";
import * as routeUtils from "../utils/routeUtils.js";
import { getUserById, getUserMeetings } from "../data/users.js";
import { addResponseToMeeting, getMeetingById, isUserMeetingOwner, replyToMeetingInvitation, setMeetingBooking, updateMeeting, updateMeetingNote } from "../data/meetings.js";
import { computeBestTimes, constructTimeLabels, augmentFormatDate, mergeResponses, formatDateAsMinMaxString, filterByInviteStatus, categorizeInvitations, convertIndexToLabel } from "../public/js/helpers.js";
import { Availability } from "../public/js/classes/availabilities.js";
import { convertStrToInt, isSameDay, validateArrayElements, validateCommentNoteBody, validateDateObj, validateIntRange, validateImageFileType, validateUserId, ValidationError, validateMeetingExists } from "../utils/validation.js";

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

        // shorten meeting description if needed
        if (meeting.description.length > 50) {
            meeting.description = meeting.description.slice(0, 50) + "...";
        }

        //========== FILTER MEETINGS AROUND PAGE ===========

        //booked meetings
        if (meeting.bookingStatus === 1) {
            const bookedDate = meeting.bookedTime.date;
            const bookedTimeStart = meeting.bookedTime.timeStart;
            const bookedTimeEnd = meeting.bookedTime.timeEnd;

            //parse booked time object for handlebars render
            meeting.bookingDate = routeUtils.formatDateString(bookedDate, false);
            meeting.bookingStart = convertIndexToLabel(bookedTimeStart);
            meeting.bookingEnd = convertIndexToLabel(bookedTimeEnd);

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

            // mark current user's invitation reply
            meeting.ownInvitationReply = meeting.invitations[uid] == 1 ? "Accepted" : meeting.invitations[uid] == 0 ? "Pending" : "Declined";

            // check if this meeting time conflicts with any other booked meetings -- this will prevent them from accepting
            meeting.hasConflict = false;
            const userMeetings = await getUserMeetings(uid);
            for (const bookedMeeting of userMeetings) {
                if (bookedMeeting.bookingStatus !== 1) continue; // ignore pending or cancelled meetings
                if (bookedMeeting.invitations[uid] !== 1) continue; // ignore booked meetings that the user didn't accept

                const otherBooking = bookedMeeting.bookedTime;
                if (!isSameDay(bookedDate, otherBooking.date)) continue; // ignore meetings booked on different days

                // check if the other meeting's booked time intersects with this one
                // note: this is a standard mathematical way of checking whether two intervals intersect
                if (bookedTimeStart < otherBooking.timeEnd && bookedTimeEnd > otherBooking.timeStart) {
                    meeting.hasConflict = true;
                    break;
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

    // sort booked meetings by date, from soonest to farthest away (by date then by start time)
    myBookings.sort((a, b) => {
        return a.bookedTime.date - b.bookedTime.date || a.bookedTime.timeStart - b.bookedTime.timeStart;
    });

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
            // ===== convert data to prepare for rendering =====

            // prepare string to display the start and end times of the entire meeting in a readable format
            const formattedStartDate = meeting.dates[0].toLocaleDateString("en-US", { year: "numeric", month: "long", weekday: "long", day: "numeric" });
            let dateString;
            if (meeting.dates.length == 1) {
                dateString = `on ${formattedStartDate}`;
            } else {
                const formattedEndDate = meeting.dates[meeting.dates.length - 1].toLocaleDateString("en-US", { year: "numeric", month: "long", weekday: "long", day: "numeric" });
                dateString = `from ${formattedStartDate} to ${formattedEndDate}`;
            }
            dateString += `, between ${convertIndexToLabel(meeting.timeStart)} and ${convertIndexToLabel(meeting.timeEnd)}.`;

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

            // get user's default availability
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

            //if the user has responded before, overwrite with their response
            for (let response of meeting.responses) {
                if (response.uid === userId) {
                    for (let i = 0; i < response.availabilities.length; i++) {
                        userAvail[i] = response.availabilities[i].slots.slice(meeting.timeStart, meeting.timeEnd);
                    }
                }
            }

            // If a other meetings have already been booked within this timeframe, block them out in the user's availability
            const userMeetings = await getUserMeetings(userId);
            for (const bookedMeeting of userMeetings) {
                if (bookedMeeting.bookingStatus !== 1) continue; // ignore pending or cancelled meetings
                if (bookedMeeting.invitations[userId] !== 1) continue; // ignore booked meetings that the user didn't accept

                for (let i = 0; i < meeting.dates.length; i++) {
                    // find the day (if any) where the booked date lines up with this meeting's calendar
                    if (!isSameDay(meeting.dates[i], bookedMeeting.bookedTime.date)) continue;

                    // block out the user's availability for the timeslots that intersect with the booked meeting
                    for (let j = bookedMeeting.bookedTime.timeStart; j < bookedMeeting.bookedTime.timeEnd; j++) {
                        const timeslotIdx = j - meeting.timeStart;
                        // make sure the timeslot is valid within this meeting
                        if (timeslotIdx >= 0 && timeslotIdx < meeting.timeEnd - meeting.timeStart) {
                            userAvail[i][timeslotIdx] = 2;
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
            for (const comment of comments) {
                comment.dateCreated = comment.dateCreated.toLocaleString();
                if (comment.dateUpdated) {
                    comment.dateUpdated = comment.dateUpdated.toLocaleString();
                }
                if (userId === comment.uid) {
                    comment.isViewerComment = true;
                }
            }

            let viewerNotResponse = true;
            meeting.responses.map((res) => {
                if (res.uid == userId) viewerNotResponse = false;
            });

            // retrieve the user's private note for this meeting
            const note = meeting.notes[userId];

            // additional logic that only happens if the meeting is booked

            let invitationReplies, ownInvitationReply, hasConflict;
            if (meeting.bookingStatus == 1) {
                // create lists based on the users' invitation replies
                invitationReplies = categorizeInvitations(meeting.invitations);
                ownInvitationReply = meeting.invitations !== null ? meeting.invitations[userId] : null;

                // check if this meeting's booked time conflicts with any other booked meetings -- this will prevent the user from accepting
                hasConflict = false;
                for (const bookedMeeting of userMeetings) {
                    if (bookedMeeting.bookingStatus !== 1) continue; // ignore pending or cancelled meetings
                    if (bookedMeeting.invitations[userId] !== 1) continue; // ignore booked meetings that the user didn't accept

                    const otherBooking = bookedMeeting.bookedTime;
                    if (!isSameDay(meeting.bookedTime.date, otherBooking.date)) continue; // ignore meetings booked on different days

                    // check if the other meeting's booked time intersects with this one
                    // note: this is a standard mathematical way of checking whether two intervals intersect
                    if (meeting.bookedTime.timeStart < otherBooking.timeEnd && meeting.bookedTime.timeEnd > otherBooking.timeStart) {
                        hasConflict = true;
                        break;
                    }
                }
            }

            return res.render("viewMeeting", {
                meetingId: meetingId,
                title: meeting.name,
                dateString: dateString,
                description: meeting.description,
                duration: `${meeting.duration / 2} hour(s)`,
                days: formattedDates,
                processedResponses: renderResponses,
                viewerNotResponse: viewerNotResponse,
                timeColumn: columnLabels,
                numUsers: meeting.users.length,
                bestTimeExists: bestTimes.length !== 0,
                bestTimes: bestTimes,
                bestTimesJSON: JSON.stringify(bestTimes), // pass the entire array as JSON so it can be reused by validation
                bookedTime: meeting.bookedTime,
                isCancelled: meeting.bookingStatus == -1,
                comments: comments,
                note: note,
                isOwner: await isUserMeetingOwner(meetingId, userId),
                invitationReplies: invitationReplies,
                ownInvitationReply: ownInvitationReply,
                hasConflict: hasConflict,
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
            for (const bookedMeeting of userMeetings) {
                if (bookedMeeting.bookingStatus !== 1) continue; // ignore pending or cancelled meetings
                if (bookedMeeting.invitations[userId] !== 1) continue; // ignore booked meetings that the user didn't accept

                for (let i = 0; i < meeting.dates.length; i++) {
                    // find the day (if any) where the booked date lines up with this meeting's calendar
                    if (!isSameDay(meeting.dates[i], bookedMeeting.bookedTime.date)) continue;

                    // prevent the user from responding "available" during the timeslots that intersect with the booked meeting
                    for (let j = bookedMeeting.bookedTime.timeStart; j < bookedMeeting.bookedTime.timeEnd; j++) {
                        const timeslotIdx = j - meeting.timeStart;
                        // make sure the timeslot is valid within this meeting
                        if (timeslotIdx >= 0 && timeslotIdx < meeting.timeEnd - meeting.timeStart) {
                            if (response[i][timeslotIdx] === 1) {
                                throw new Error(`Cannot respond to a time where you're already booked for a different meeting`);
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
            isPending: meeting.bookingStatus === 0,
            isBooked: meeting.bookingStatus === 1,
            isCancelled: meeting.bookingStatus === -1,
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

        // disallow editing cancelled or booked meetings
        if (meeting.bookingStatus !== 0) return routeUtils.renderError(req, res, 400, "Cannot update a cancelled or booked meeting");

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
    // note: calls to this route must have an `action` property in the body with one of the following values:  "book", "unbook", "cancel", "restore"
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
            let date, timeStart, timeEnd;
            try {
                try {
                    const [year, month, day] = data.date.split("-").map(Number);
                    date = validateDateObj(new Date(year, month - 1, day), "Meeting Booking Date");
                } catch {
                    throw new ValidationError("You must select a valid Date");
                }
                try {
                    timeStart = validateIntRange(convertStrToInt(data.timeStart), "Meeting Booking Start Time", 0, 47);
                } catch {
                    throw new ValidationError("You must select a valid Start Time and End Time");
                }
                try {
                    timeEnd = validateIntRange(timeStart + meeting.duration, "Meeting Booking End Time", 1, 48);
                } catch {
                    throw new ValidationError("Meeting Bookings cannot span multiple days");
                }
            } catch (err) {
                return routeUtils.renderError(req, res, 400, err.message);
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
                    timeEnd: timeEnd,
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
            return res.status(400).json({ error: "Invalid Meeting Booking Action" });
        }
    })
    // delete a meeting entirely
    .delete(async (req, res) => {
        // TODO - extra feature
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
            return res.status(400).json({ error: err.message });
        }
    })
    // AJAX route for updating a user's private note
    .post(async (req, res) => {
        try {
            const meetingId = await validateMeetingExists(req.params.meetingId);
            const userId = validateUserId(req.session.user._id);
            const note = validateCommentNoteBody(req.body.noteInput, "Note Body");
            await updateMeetingNote(meetingId, userId, note);
            return res.status(200).json({ noteUpdated: `Note for user ${userId} has been updated` });
        } catch (err) {
            return res.status(400).json({ error: err.message });
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
            return res.status(400).json({ error: err.message });
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
            return res.status(400).json({ error: err.message });
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
            return res.status(400).json({ error: err.message });
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
            return res.status(400).json({ error: err.message });
        }
    })
    // AJAX route for posting a reaction to a particular reaction
    .post(async (req, res) => {
        // TODO - extra feature
        return res.status(404).json({ error: "Route not implemented yet" });
    })
    // AJAX route for editing a particular comment's body
    .patch(async (req, res) => {
        // TODO - extra feature
        return res.status(404).json({ error: "Route not implemented yet" });
    });

// AJAX route for getting meeting responses
router.route("/:meetingId/responses").get(async (req, res) => {
    try {
        const meetingId = req.params.meetingId;
        const meeting = await getMeetingById(meetingId);
        const userId = validateUserId(req.session.user._id);
        return res.status(200).json({ responses: meeting.responses, uid: userId, start: meeting.timeStart, end: meeting.timeEnd });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// reply to a meeting invitation
// note: calls to this route must have an `action` property in the body with one of the following values:  "accept", "reset", "decline"
router.route("/:meetingId/inviteReply").post(async (req, res) => {
    // determine the status code that should be used for this request
    const actionToCode = {
        accept: 1,
        reset: 0,
        decline: -1,
    };
    const inviteStatus = actionToCode[req.body.action];
    if (typeof inviteStatus === "undefined") return routeUtils.renderError(req, res, 400, "Invalid meeting invite action");

    // actually update the invite status in the DB
    try {
        await replyToMeetingInvitation(req.params.meetingId, req.session.user?._id, inviteStatus);
        return routeUtils.redirectBack(req, res);
    } catch (err) {
        return routeUtils.handleValidationError(req, res, err);
    }
});

export default router;
