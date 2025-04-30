import { response } from "express";
import * as validation from "./clientValidation.js";

// Construct a user document given an object containing the required fields, or throw an error if any fields are invalid.
// Set `allowUndefined` to `true` to ignore `undefined` values, i.e. create partial objects for PATCH requests.
export function createUserDocument({ uid, password, firstName, lastName, description, profilePicture, availability }, allowUndefined = false) {
    // ============= validate inputs =============

    if (!allowUndefined || typeof uid !== "undefined") uid = validation.validateUserId(uid);
    if (!allowUndefined || typeof password !== "undefined") password = validation.validateAndTrimString(password, "Password"); // should be hashed already // todo MG this needs to be revised and be given a min/max length
    if (!allowUndefined || typeof firstName !== "undefined") firstName = validation.sanitizeSpaces(validation.validateAlphabeticalExtended(firstName, "First Name", 1, 30));
    if (!allowUndefined || typeof lastName !== "undefined") lastName = validation.sanitizeSpaces(validation.validateAlphabeticalExtended(lastName, "Last Name", 1, 30));
    if (!allowUndefined || typeof description !== "undefined") description = validation.validateAndTrimString(description, "Description", 0, 300);
    if (!allowUndefined || typeof profilePicture !== "undefined") profilePicture = validation.validateAndTrimString(profilePicture, "Profile Picture");
    if (!allowUndefined || typeof availability !== "undefined") availability = validation.validateWeeklyAvailabilityObj(availability);

    // ============= construct the document =============
    const user = {
        _id: uid,
        password,
        firstName,
        lastName,
        description,
        profilePicture,
        availability,
    };

    if (allowUndefined) {
        // delete undefined properties from the final object
        for (const key of Object.keys(user)) if (user[key] === undefined) delete user[key];
    }
    return user;
}

// Constructor for comment documents
export function createCommentDocument({ uid, meetingId, body }) {
    // TODO BL: Sanitize comment body for security vulnerabilities
    // (currently only validated as string)

    uid = validation.validateUserId(uid);
    meetingId = validation.validateStrAsObjectId(meetingId, "Meeting ID");
    body = validation.validateAndTrimString(body, "Comment Body", 1, 500);
    const timestamp = new Date();
    // create and return document
    const comment = {
        uid: uid,
        meetingId: meetingId,
        body: body,
        dateCreated: timestamp,
        dateUpdated: timestamp,
        reactions: {
            likes: [],
            dislikes: [],
        },
    };

    return comment;
}

//Constructor for meeting documents
export function createMeetingDocument({ name, description, duration, owner, dates, timeStart, timeEnd, users, bookingStatus = 0, bookedTime = null, responses = [], notes = [] }, allowUndefined = false) {
    if (!allowUndefined || typeof name !== "undefined") name = validation.sanitizeSpaces(validation.validateAndTrimString(name, "Meeting Name", 3));
    if (!allowUndefined || typeof description !== "undefined") description = validation.validateAndTrimString(description, "Meeting Description", true);
    if (!allowUndefined || typeof owner !== "undefined") owner = validation.validateUserId(owner);
    if (!allowUndefined || typeof duration !== "undefined") duration = validation.validateIntRange(duration, "Meeting Duration", 1, 48);
    if (!allowUndefined || typeof dates !== "undefined") {
        for (let date of dates) {
            if (!(date instanceof Date)) {
                throw new validation.ValidationError(`The date ${date} is not a valid Date Object!`);
            }
        }
    }
    if (!allowUndefined || typeof timeStart !== "undefined") timeStart = validation.validateIntRange(timeStart, "Meeting Starting Time", 1, 48);
    if (!allowUndefined || typeof timeEnd !== "undefined") timeEnd = validation.validateIntRange(timeEnd, "Meeting Ending Time", 1, 48);
    if (!allowUndefined || typeof users !== "undefined") {
        if (!Array.isArray(users)) {
            throw new validation.ValidationError(`${users} was expected to be an array!`);
        }
        users.map((user) => validation.validateUserId(user));
    }
    if (!allowUndefined || typeof bookingStatus !== "undefined") bookingStatus = validation.validateIntRange(bookingStatus, "Meeting Booking Status", -1, 1);
    if (!allowUndefined || typeof bookedTime !== "undefined") {
        if (bookedTime !== null) {
            bookedTime = validation.validateAvailabilityObj(bookedTime);
        }
    }
    if (!allowUndefined || typeof responses !== "undefined") {
        if (!Array.isArray(responses)) {
            throw new validation.ValidationError(`${responses} was expected to be an array!`);
        }
        responses.map((response) => {
            validation.validateResponseObj(response);
        });
    }
    if (!allowUndefined || typeof notes !== "undefined") {
        if (!Array.isArray(notes)) {
            throw new validation.ValidationError(`${notes} was expected to be an array!`);
        }
        notes.map((note) => validation.validateNoteObj(note));
    }
    const meeting = {
        name,
        description,
        duration,
        owner,
        bookingStatus,
        bookedTime,
        dates,
        timeStart,
        timeEnd,
        users,
        responses,
        notes,
    };
    if (allowUndefined) {
        // delete undefined properties from the final object
        for (const key of Object.keys(meeting)) if (meeting[key] === undefined) delete meeting[key];
    }
    return meeting;
}
