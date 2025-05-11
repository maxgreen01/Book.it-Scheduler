import * as validation from "./clientValidation.js";

// Construct a user document given an object containing the required fields, or throw an error if any fields are invalid.
// Fields like `meetings` should never be modified directly by the user, so they are excluded from this function and should instead be handled by other server routes.
// Set `allowUndefined` to `true` to ignore `undefined` values, i.e. create partial objects for PATCH requests.
export function createUserDocument({ uid, password, firstName, lastName, description, profilePicture, availability }, allowUndefined = false) {
    // ============= validate inputs =============

    if (!allowUndefined || typeof uid !== "undefined") uid = validation.validateUserId(uid);
    if (!allowUndefined || typeof password !== "undefined") password = validation.validatePassword(password);
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

// Construct a comment document given an object containing the required fields, or throw an error if any fields are invalid.
// Fields like `dateCreated` and `reactions` should never be modified directly by the user, so they are excluded from this function and should instead be handled by other server routes.
export function createCommentDocument({ uid, meetingId, body }) {
    // ============= validate inputs =============

    uid = validation.validateUserId(uid);
    meetingId = validation.validateStrAsObjectId(meetingId, "Meeting ID");
    body = validation.validateCommentNoteBody(body, "Comment Body");

    // create and return document
    const comment = {
        uid: uid,
        meetingId: meetingId,
        body: body,
    };

    return comment;
}

// Construct a meeting document given an object containing the required fields, or throw an error if any fields are invalid.
// Fields like `bookingStatus` and `responses` should never be modified directly by the user, so they are excluded from this function and should instead be handled by other server routes.
// Set `allowUndefined` to `true` to ignore `undefined` values, i.e. create partial objects for PATCH requests.
export function createMeetingDocument({ name, description, duration, owner, dates, timeStart, timeEnd }, allowUndefined = false) {
    // ============= validate inputs =============

    if (!allowUndefined || typeof name !== "undefined") name = validation.sanitizeSpaces(validation.validateAndTrimString(name, "Meeting Name", 3, 60));
    if (!allowUndefined || typeof description !== "undefined") description = validation.validateAndTrimString(description, "Meeting Description", 1, 500);
    if (!allowUndefined || typeof owner !== "undefined") owner = validation.validateUserId(owner);
    if (!allowUndefined || typeof duration !== "undefined") duration = validation.validateIntRange(duration, "Meeting Duration", 1, 48);
    if (!allowUndefined || typeof dates !== "undefined") dates = validation.validateArrayElements(dates, "Meeting Dates", (date) => validation.validateDateObj(date));
    if (!allowUndefined || typeof timeStart !== "undefined") timeStart = validation.validateIntRange(timeStart, "Meeting Starting Time", 1, 48);
    if (!allowUndefined || typeof timeEnd !== "undefined") timeEnd = validation.validateIntRange(timeEnd, "Meeting Ending Time", 1, 48);

    // ============= construct the document =============

    const meeting = {
        name,
        description,
        duration,
        owner,
        dates,
        timeStart,
        timeEnd,
    };

    if (allowUndefined) {
        // delete undefined properties from the final object
        for (const key of Object.keys(meeting)) if (meeting[key] === undefined) delete meeting[key];
    }
    return meeting;
}
