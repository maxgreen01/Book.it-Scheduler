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

// Throw an error if a string is not valid or is not a valid ObjectId.
// Return the converted ObjectID object if it is valid.
export function convertStrToObjectId(id, label) {
    return ObjectId.createFromHexString(clientValidation.validateStrAsObjectId(id, label));
}

export async function validMeeting(mid) {
    mid = clientValidation.validateStrAsObjectId(mid);
    const meetingExists = await doesMeetingExist(mid);
    if (!meetingExists) {
        throw new Error(`Could not find the meeting with id: ${mid}`);
    }
}

//Normal validation on the Response Object, but also use the data function to check if the Response Object contains a valid ID
export async function validResponseObjExtended(responseObj) {
    clientValidation.validateResponseObj(responseObj);
    const userExists = !(await isUserIdTaken(responseObj.uid));
    if (!userExists) {
        throw new Error(`User with id ${responseObj.uid} does not exist!`);
    }
    return responseObj;
}

//Normal validation on the Note Object, but also use the data function to check if the Response Object contains a valid ID
export async function validNoteObjExtended(noteObj) {
    clientValidation.validateNoteObj(noteObj);
    const userExists = !(await isUserIdTaken(noteObj.uid));
    if (!userExists) throw new Error(`User with id ${noteObj.uid} does not exist!`);
    return noteObj;
}
