// Data functions for user profile objects

import bcrypt from "bcrypt";
import * as validation from "../utils/validation.js";
import { meetingsCollection, usersCollection } from "../config/mongoCollections.js";
import { createUserDocument } from "../public/js/documentCreation.js";
export { createUserDocument } from "../public/js/documentCreation.js";

// create a user object and save it to the DB, then return the added object
export async function createUser({ uid, password, firstName, lastName, description, profilePicture, availability }) {
    // set up the document that will be saved to the DB
    const user = createUserDocument({ uid, password, firstName, lastName, description, profilePicture, availability });
    user.meetings = [];

    // make sure username (which is already validated) is unique in the DB
    try {
        await getUserById(user._id);
        // if no error occurs, then the user already exists
        throw new Error(`User ID "${user._id}" is already taken`);
    } catch {
        // if an error is thrown, then the username should be available (which is a good thing)
        // todo - maybe add some way to identify and NOT ignore MongoDB errors here
    }

    // hash password
    user.password = await bcrypt.hash(user.password, 10);

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
    const user = await collection.findOne({ _id: validation.uidToCaseInsensitive(uid) });
    if (!user) throw new Error(`Could not retrieve the user with ID "${uid}"`);
    return user;
}

//return all meetings user has responded to
export async function getUserMeetings(uid) {
    uid = validation.validateUserId(uid);
    const user = await getUserById(uid);
    if (!user && !user.meetings) throw new Error(`Could not retrieve meetings from the user with ID "${uid}"`);
    const collection = await meetingsCollection();
    const meetingIds = user.meetings.map((id) => validation.convertStrToObjectId(id));
    const meetings = await collection.find({ _id: { $in: meetingIds } }).toArray();
    if (!meetings) throw new Error(`Could not retrieve user ${uid}'s meetings`);
    meetings.map((meeting) => meeting._id.toString());
    return meetings;
}

//return all meetings user is the owner of
export async function getOwnedMeetings(uid) {
    uid = await validation.validateUserExists(uid);
    const collection = await meetingsCollection();
    const meetings = await collection.find({ owner: validation.uidToCaseInsensitive(uid) }).toArray();
    if (!meetings) throw new Error(`Could not retrieve user ${uid}'s meetings`);
    meetings.map((meeting) => meeting._id.toString());
    return meetings;
}

// remove the user with the specified ID from the DB, and return true to indicate success
export async function deleteUser(uid) {
    uid = validation.validateUserId(uid);
    const collection = await usersCollection();
    const removed = await collection.findOneAndDelete({ _id: validation.uidToCaseInsensitive(uid) });
    if (!removed) throw new Error(`Could not delete the user with ID "${uid}"`);
    return true; // FIXME MG - maybe return something more useful
}

// Update certain fields (only the non-`undefined` ones) of the user with the specified ID.
// Return the updated user object if operation is successful.
export async function updateUser(uid, { password, firstName, lastName, description, profilePicture, availability }) {
    uid = validation.validateUserId(uid);
    const collection = await usersCollection();
    const newFields = createUserDocument({ password, firstName, lastName, description, profilePicture, availability }, true);

    const updated = await collection.findOneAndUpdate({ _id: validation.uidToCaseInsensitive(uid) }, { $set: newFields }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the user with ID "${uid}"`);
    return updated;
}

// Add or remove a meeting to the list of responded meetings for a particular user, and return the updated user object.
// Attempting to add a meeting ID that's already present in the DB will not change anything.
// `isAdd` should be `true` to add the meetingId to the user, or `false` to remove the meetingId.
export async function modifyUserMeeting(uid, meetingId, isAdd) {
    uid = validation.validateUserId(uid);
    meetingId = validation.validateStrAsObjectId(meetingId, "Meeting ID");
    const action = isAdd ? "$addToSet" : "$pull";

    const collection = await usersCollection();
    const updated = await collection.findOneAndUpdate({ _id: validation.uidToCaseInsensitive(uid) }, { [action]: { meetings: meetingId } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not ${isAdd ? "add" : "remove"} meeting ID "${meetingId}" ${isAdd ? "to" : "from"} the user with ID "${uid}"`);
    return updated;
}
