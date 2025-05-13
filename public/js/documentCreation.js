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
// `allowCreateInPast` allows meetings to be created using dates that have already passed, but should NEVER be `true` except when seeding the database.
export function createMeetingDocument({ name, description, duration, owner, dateStart, dateEnd, timeStart, timeEnd }, allowUndefined = false, allowCreateInPast = false) {
    // ============= validate inputs =============

    if (!allowUndefined || typeof name !== "undefined") name = validation.sanitizeSpaces(validation.validateAndTrimString(name, "Meeting Name", 3, 60));
    if (!allowUndefined || typeof description !== "undefined") description = validation.validateAndTrimString(description, "Meeting Description", 1, 500);
    if (!allowUndefined || typeof owner !== "undefined") owner = validation.validateUserId(owner);

    if (!allowUndefined || typeof duration !== "undefined") {
        try {
            duration = validation.convertStrToFloat(duration, "Meeting Duration") * 2; // convert string to float, then multiply by 2 to get number of 30-min increments
            duration = validation.validateIntRange(duration, "Meeting Duration", 1, 48);
        } catch {
            throw new validation.ValidationError("Meeting Duration must be a number in hours, only supporting half-hour increments");
        }
    }

    try {
        if (!allowUndefined || typeof dateStart !== "undefined") {
            const [year, month, day] = dateStart.split("-").map(Number);
            dateStart = validation.validateDateObj(new Date(year, month - 1, day), "Meeting Start Date");
        }
        if (!allowUndefined || typeof dateEnd !== "undefined") {
            const [year, month, day] = dateEnd.split("-").map(Number);
            dateEnd = validation.validateDateObj(new Date(year, month - 1, day), "Meeting End Date");
        }
    } catch {
        throw new validation.ValidationError("You must select a valid Start Date and End Date");
    }
    if (dateStart > dateEnd) throw new validation.ValidationError(`Start Date must be earlier than End Date`);
    const now = new Date();
    if (!allowCreateInPast && dateStart < new Date(now.getFullYear(), now.getMonth(), now.getDate())) throw new validation.ValidationError(`Cannot create a meeting for dates that have already passed`);

    let dates;
    if (typeof dateStart !== "undefined" && typeof dateEnd !== "undefined") {
        // create Date range between start and end dates
        dates = [];
        const currDate = dateStart;
        while (currDate <= dateEnd) {
            dates.push(new Date(currDate)); // copy to avoid reference sharing
            currDate.setDate(currDate.getDate() + 1); // increment the day by 1
        }
        // limit number of dates to 20 per meeting
        if (dates.length > 20) throw new validation.ValidationError("Meeting cannot involve more than 20 days");
    }

    try {
        if (!allowUndefined || typeof timeStart !== "undefined") timeStart = validation.validateIntRange(validation.convertStrToInt(timeStart), "Meeting Start Time", 0, 47);
        if (!allowUndefined || typeof timeEnd !== "undefined") timeEnd = validation.validateIntRange(validation.convertStrToInt(timeEnd), "Meeting End Time", 1, 48);
    } catch {
        throw new validation.ValidationError(`You must select a valid Start Time and End Time`);
    }
    if (timeStart >= timeEnd) throw new validation.ValidationError("End Time must be later than Start Time");
    if (duration > timeEnd - timeStart) throw new validation.ValidationError("Duration is too long for the given Start and End Times");

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
