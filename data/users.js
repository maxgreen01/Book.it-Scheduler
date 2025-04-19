// Data functions for user profile objects

import validation from "../utils/validation.js";
import { usersCollection } from "../config/mongoCollections.js";

// Construct a user document given an object containing the required fields, or throw an error if any fields are invalid.
// Set `allowUndefined` to `true` to ignore `undefined` values, i.e. create partial objects for PATCH requests.
export function createUserDocument({ uid, password, firstName, lastName, description, profilePicture, availability }, allowUndefined = false) {
    // ============= validate inputs =============

    if (!allowUndefined || typeof uid !== "undefined") uid = validation.validateUserId(uid);
    if (!allowUndefined || typeof password !== "undefined") password = validation.validateAndTrimString(password, "Password"); // should be hashed already
    if (!allowUndefined || typeof firstName !== "undefined") firstName = validation.sanitizeSpaces(validation.validateAlphabeticalExtended(firstName, "First Name", 1));
    if (!allowUndefined || typeof lastName !== "undefined") lastName = validation.sanitizeSpaces(validation.validateAlphabeticalExtended(lastName, "Last Name", 1));
    if (!allowUndefined || typeof description !== "undefined") description = validation.validateAndTrimString(description, "Description", true);
    if (!allowUndefined || typeof profilePicture !== "undefined") profilePicture = validation.validateAndTrimString(profilePicture, "Profile Picture", true);
    if (!allowUndefined || typeof availability !== "undefined") availability = validation.validateArrayElements(availability, "Availability", (timeslot) => timeslot, 7); // todo MG - validate Timeslot objects

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

// create a user object and save it to the DB, then return the added object
export async function createUser({ uid, password, firstName, lastName, description, profilePicture, availability }) {
    if (!validation.isUserIdUnique(uid)) throw new Error(`User ID "${uid}" is not unique`);

    // set up the document that will be saved to the DB
    const user = createUserDocument({ uid, password, firstName, lastName, description, profilePicture, availability });
    user.meetings = [];

    // run the DB operation
    const collection = await usersCollection();
    const insertResponse = await collection.insertOne(user);
    if (!insertResponse.acknowledged || !insertResponse.insertedId) throw new Error(`Could not add user "${user._id}" to the database`);
    return user;
}

// return an array of all users in the DB
export async function getAllUsers() {
    const collection = await usersCollection();
    const users = await collection.find({}).toArray();
    if (!users) throw new Error("Could not retrieve all users");
    return users;
}

// return an array of all user IDs in the DB
export async function getAllUserIDs() {
    const collection = await usersCollection();
    const users = await collection.find({}).project({ _id: 1 }).toArray();
    if (!users) throw new Error("Could not retrieve all users");
    return users;
}

// return the user with the specified ID
export async function getUserById(uid) {
    uid = validation.validateUserId(uid);
    const collection = await usersCollection();
    const user = await collection.findOne({ _id: uid });
    if (!user) throw new Error(`Could not retrieve the user with ID "${uid}"`);
    return user;
}

// remove the user with the specified ID from the DB, and return true to indicate success
export async function deleteUser(uid) {
    uid = validation.validateUserId(uid);
    const collection = await usersCollection();
    const removed = await collection.findOneAndDelete({ _id: uid });
    if (!removed) throw new Error(`Could not delete the user with ID "${uid}"`);
    return true; // todo MG - maybe return something more useful
}

// update certain fields (only the non-`undefined` ones) for the user with the specified ID, and return the updated user object
export async function updateUser(uid, { password, firstName, lastName, description, profilePicture, availability }) {
    uid = validation.validateUserId(uid);
    const collection = await usersCollection();
    const newFields = createUserDocument({ password, firstName, lastName, description, profilePicture, availability }, true);

    const updated = await collection.findOneAndUpdate({ _id: uid }, { $set: newFields }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the user with ID "${uid}"`);
    return updated;
}

// Add or remove a meeting to the list of responded meetings for a particular user, and return the updated user object.
// `isAdd` should be `true` to add the meetingId to the user, or `false` to remove the meetingId.
export async function modifyUserMeeting(uid, meetingId, isAdd) {
    uid = validation.validateUserId(uid);
    meetingId = validation.validateStrAsObjectId(meetingId);
    const action = isAdd ? "$push" : "$pull";

    const collection = await usersCollection();
    const updated = await collection.findOneAndUpdate({ _id: uid }, { [action]: { meetings: meetingId } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not ${isAdd ? "add" : "remove"} meeting ID "${meetingId}" ${isAdd ? "to" : "from"} the user with ID "${uid}"`);
    return updated;
}
