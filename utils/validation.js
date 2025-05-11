import * as clientValidation from "../public/js/clientValidation.js";
import { ObjectId } from "mongodb";
import { getMeetingById } from "../data/meetings.js";
import { getUserById } from "../data/users.js";

// Re-export client-side validation functions so they can also be used server-side
export * from "../public/js/clientValidation.js";

//
// ============ Database-Related Validation ============
//

// Throw an error if a string is not valid or is not a valid `uid`.
// Returns a MongoDB query property defining a regular expression from a `uid`
// The expression treats the username as case insensitive when used in queries
// USAGE: collection.findOne({ userId: uidToCaseInsensitive(uid) })
export function uidToCaseInsensitive(uid) {
    uid = clientValidation.validateUserId(uid);
    return { $regex: new RegExp(`^${uid}$`, "i") };
}

// Throw an error if a string is not valid or is not a valid ObjectId.
// Return the converted ObjectID object if it is valid.
export function convertStrToObjectId(id, label) {
    return ObjectId.createFromHexString(clientValidation.validateStrAsObjectId(id, label));
}

// Throw an error if a string is not valid or is not a valid `uid`, or if the user with the given ID is not found.
// If the `uid` is valid and the corresponding user exists, return the validated `uid`.
export async function validateUserExists(uid) {
    uid = clientValidation.validateUserId(uid);
    try {
        await getUserById(uid);
        return uid;
    } catch {
        throw new Error(`User with ID "${uid}" not found`);
    }
}

// Throw an error if a string is not valid or is not a valid meeting ID, or if the meeting with the given ID is not found.
// If the meeting ID is valid and the corresponding meeting exists, return the validated meeting ID.
export async function validateMeetingExists(id) {
    id = clientValidation.validateStrAsObjectId(id, "Meeting ID");
    try {
        await getMeetingById(id);
        return id;
    } catch {
        throw new Error(`Meeting with ID "${id}" not found`);
    }
}

// Normal validation on the Response Object, but also use the data function to check if the Response Object contains a valid UID
export async function validResponseObjExtended(responseObj) {
    clientValidation.validateResponseObj(responseObj);
    await validateUserExists(responseObj.uid);
    return responseObj;
}
