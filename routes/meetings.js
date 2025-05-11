import express from "express";
import { createComment, deleteComment, getCommentById, getMeetingComments } from "../data/comments.js";
import * as routeUtils from "../utils/routeUtils.js";
import { getOwnedMeetings, getUserById, getUserMeetings } from "../data/users.js";
import { addResponseToMeeting, getMeetingById, isUserMeetingOwner, updateMeeting, updateMeetingNote } from "../data/meetings.js";
import { mergeResponses } from "../public/js/helpers.js";
import { Availability } from "../public/js/classes/availabilities.js";
import { isSameDay, validateArrayElements, validateCommentNoteBody, validateImageFileType, validateIntRange, validateUserId } from "../utils/validation.js";

const router = express.Router();

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

router.route("/").get(async (req, res) => {
    const uid = req.session.user._id;
    const myMeetings = await getOwnedMeetings(uid);
    const allMeetings = await getUserMeetings(uid);
    // myMeetings.forEach((element) => {
    //     element.matrix = testMatrix;
    // });

    //NOTE: This is a hack to avoid changing the schema,
    //but in the future this should be separated into two lists in the document: Owned Meetings & Responded Meeting

    //filter out meetings user does not own
    const otherMeetings = allMeetings.filter((meeting) => !myMeetings.some((myMeeting) => myMeeting._id.toString() === meeting._id.toString()));

    return res.render("viewAllMeetings", {
        title: "My Meetings",
        myMeetings,
        otherMeetings,
        numUsers: 8, //todo make this number reflect the largest # attendees globally on the page
        //If we wanted to make this card-specific would need to rework the opacity helper
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
            let hours = Math.floor(meeting.timeStart / 2); // round down since "2:30" is still in hour "2"
            for (let i = meeting.timeStart; i < meeting.timeEnd; i++) {
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

            // process responses on the fly
            let merged = [];
            if (meeting.responses.length == 0) {
                // no responses, so create empty Availability data
                for (const date of meeting.dates) {
                    merged.push(Availability.emptyAvailability(date));
                }
            } else {
                // compute merged availability based on responses
                merged = mergeResponses(meeting.responses, meeting.timeStart, meeting.timeEnd);
            }
            // extract the raw data and only display the slots within this meeting's time range
            const processedMerged = merged.map((avail) => avail.slots.slice(meeting.timeStart, meeting.timeEnd));

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

            return res.render("viewMeeting", {
                meetingId: meetingId,
                title: meeting.name,
                description: meeting.description,
                duration: `${meeting.duration / 2} hour(s)`,
                days: formattedDates,
                responses: renderResponses,
                viewerNotResponse: viewerNotResponse,
                timeColumn: columnLabels,
                numUsers: meeting.users.length,
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
    // book the meeting time
    .post(async (req, res) => {
        // TODO

        // ensure non-empty request body
        const data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return routeUtils.renderError(req, res, 400, "Request body is empty");
        }

        return res.status(404).json({ error: "Route not implemented yet" });
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
