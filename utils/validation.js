import * as clientValidation from "../public/js/clientValidation.js";
import { ObjectId } from "mongodb";
import { doesUserExist } from "../data/users.js";
import { doesMeetingExist } from "../data/meetings.js";

// Re-export client-side validation functions so they can also be used server-side
export * from "../public/js/clientValidation.js";

//
// ============ Database-Related Validation ============
//

// Throw an error if a string is not valid or is not a valid `uid`.
// If the `uid` is valid, return a boolean indicating whether it is already in use in the DB.
export async function isUserIdTaken(uid) {
    uid = clientValidation.validateUserId(uid);
    return doesUserExist(uid);
}

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

export async function validMeeting(id) {
    id = clientValidation.validateStrAsObjectId(id);
    const meetingExists = await doesMeetingExist(id);
    if (!meetingExists) {
        throw new Error(`Could not find the meeting with id: ${id}`);
    }
    return id;
}

//Normal validation on the Response Object, but also use the data function to check if the Response Object contains a valid ID
export async function validResponseObjExtended(responseObj) {
    clientValidation.validateResponseObj(responseObj);
    const userExists = await isUserIdTaken(responseObj.uid);
    if (!userExists) {
        throw new Error(`User with id ${responseObj.uid} does not exist!`);
    }
    return responseObj;
}

//Normal validation on the Note Object, but also use the data function to check if the Response Object contains a valid ID
export async function validNoteObjExtended(noteObj) {
    clientValidation.validateNotesObj(noteObj);
    const userExists = await isUserIdTaken(noteObj.uid);
    if (!userExists) throw new Error(`User with id ${noteObj.uid} does not exist!`);
    return noteObj;
}
