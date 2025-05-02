import * as clientValidation from "../public/js/clientValidation.js";
import { ObjectId } from "mongodb";
import { doesUserExist } from "../data/users.js";

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
