import { ObjectId } from "mongodb";
import { getAllUserIDs } from "../data/users.js";
import "../public/js/clientValidation.js";

// Re-export common validation also used client-side
export * from "../public/js/clientValidation.js";
import * as clientValidation from "../public/js/clientValidation.js";

//
// ============ Database-Related Validation ============
//

// Throw an error if a string is not valid or is not a valid `uid`.
// If the `uid` is valid, return a boolean indicating whether it is already in use in the DB.
export async function isUserIdUnique(uid) {
    uid = clientValidation.validateUserId(uid);
    return !(await getAllUserIDs()).includes(uid); // return `false` if `uid` is already found in the DB
}

// Throw an error if a string is not valid or is not a valid ObjectId.
// Return the converted ObjectID object if it is valid.
export function convertStrToObjectId(id, label) {
    return ObjectId.createFromHexString(clientValidation.validateStrAsObjectId(id, label));
}
