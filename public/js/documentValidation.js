import * as validation from "./clientValidation.js";

// Construct a user document given an object containing the required fields, or throw an error if any fields are invalid.
// Set `allowUndefined` to `true` to ignore `undefined` values, i.e. create partial objects for PATCH requests.
export function createUserDocument({ uid, password, firstName, lastName, description, profilePicture, availability }, allowUndefined = false) {
    // ============= validate inputs =============

    if (!allowUndefined || typeof uid !== "undefined") uid = validation.validateUserId(uid);
    if (!allowUndefined || typeof password !== "undefined") password = validation.validateAndTrimString(password, "Password"); // should be hashed already
    if (!allowUndefined || typeof firstName !== "undefined") firstName = validation.sanitizeSpaces(validation.validateAlphabeticalExtended(firstName, "First Name", 1));
    if (!allowUndefined || typeof lastName !== "undefined") lastName = validation.sanitizeSpaces(validation.validateAlphabeticalExtended(lastName, "Last Name", 1));
    if (!allowUndefined || typeof description !== "undefined") description = validation.validateAndTrimString(description, "Description", true);
    if (!allowUndefined || typeof profilePicture !== "undefined") profilePicture = validation.validateAndTrimString(profilePicture, "Profile Picture");
    if (!allowUndefined || typeof availability !== "undefined") availability = validation.validateArrayElements(availability, "Availability", (timeslot) => timeslot, 7); // todo - validate Timeslot objects

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

    // uid = validateUserId(uid);
    // meetingId = convertStrToObjectId(meetingId, "Meeting ID");
    // body = validateAndTrimString(body, "Comment Text", false);

    //modified validation code since it wasn't working
    uid = validation.validateUserId(uid);
    meetingId = validation.validateAndTrimString(meetingId, "Meeting ID");
    body = validation.validateAndTrimString(body, "Comment Text", false);
    let timestamp = new Date();

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
