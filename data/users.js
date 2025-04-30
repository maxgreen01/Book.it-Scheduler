// Data functions for user profile objects

import * as validation from "../utils/validation.js";
import { usersCollection } from "../config/mongoCollections.js";
import { createUserDocument } from "../public/js/documentCreation.js";
export { createUserDocument } from "../public/js/documentCreation.js";

// create a user object and save it to the DB, then return the added object
export async function createUser({ uid, password, firstName, lastName, description, profilePicture, availability }) {
    if (!(await validation.isUserIdUnique(uid))) throw new Error(`User ID "${uid}" is not unique`);

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
    const users = (await collection.find({}).project({ _id: 1 }).toArray()).map((obj) => obj._id); // extract `_id` from each object to get a list of strings
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
    meetingId = validation.validateStrAsObjectId(meetingId, "Meeting ID");
    const action = isAdd ? "$push" : "$pull";

    const collection = await usersCollection();
    const updated = await collection.findOneAndUpdate({ _id: uid }, { [action]: { meetings: meetingId } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not ${isAdd ? "add" : "remove"} meeting ID "${meetingId}" ${isAdd ? "to" : "from"} the user with ID "${uid}"`);
    return updated;
}
