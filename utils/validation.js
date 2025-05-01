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

// Throw an error if a string is not valid or is not a valid ObjectId.
// Return the converted ObjectID object if it is valid.
export function convertStrToObjectId(id, label) {
    return ObjectId.createFromHexString(clientValidation.validateStrAsObjectId(id, label));
}
