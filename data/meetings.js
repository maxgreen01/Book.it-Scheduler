// Data functions for Meeting objects

import * as validation from "../utils/validation.js";
import { meetingsCollection } from "../config/mongoCollections.js";
import { createMeetingDocument } from "../public/js/documentCreation.js";
export { createMeetingDocument } from "../public/js/documentCreation.js";
import { modifyUserMeeting, updateUserInviteStatus } from "./users.js";

// Create a meeting object save it to the DB, and then return the added object
// `allowCreateInPast` allows meetings to be created using dates that have already passed, but should NEVER be `true` except when seeding the database.
export async function createMeeting({ name, description, duration, owner, dateStart, dateEnd, timeStart, timeEnd }, allowCreateInPast = false) {
    // set up the document that will be saved to the DB
    const meeting = createMeetingDocument({ name, description, duration, owner, dateStart, dateEnd, timeStart, timeEnd }, false, allowCreateInPast);
    meeting.bookingStatus = 0; // todo make an enum for status code meanings
    meeting.bookedTime = null;
    meeting.users = [];
    meeting.responses = [];
    meeting.notes = {};
    meeting.invitations = null;

    // make sure owner actually exists
    await validation.validateUserExists(meeting.owner);

    // run the DB operation
    const collection = await meetingsCollection();
    const insertResponse = await collection.insertOne(meeting);
    if (!insertResponse.acknowledged || !insertResponse.insertedId) throw new Error(`Could not add meeting "${meeting.name}" to the database`);
    meeting._id = meeting._id.toString();

    // add the newly created meeting to the owner's profile
    await modifyUserMeeting(owner, meeting._id, true);

    return meeting;
}

// return an array of all meetings in the DB
export async function getAllMeetings() {
    const collection = await meetingsCollection();
    const meetings = await collection.find({}).toArray();
    if (!meetings) throw new Error("Could not retrieve all meetings");
    meetings.map((meeting) => meeting._id.toString());
    return meetings;
}

// return the meeting the with passed in mid parameter
export async function getMeetingById(mid) {
    const collection = await meetingsCollection();
    const meeting = await collection.findOne({ _id: validation.convertStrToObjectId(mid) });
    if (!meeting) {
        throw new Error(`Could not retrieve the meeting`);
    }
    meeting._id = meeting._id.toString();
    return meeting;
}

// return a boolean indicating whether a user is involved in a meeting, i.e. is the owner of the meeting or has responded to it
export async function isUserInMeeting(mid, uid) {
    const meeting = await getMeetingById(mid);
    uid = validation.validateUserId(uid);
    return meeting.users.includes(uid) || meeting.owner === uid;
}

export async function isUserMeetingOwner(mid, uid) {
    const meeting = await getMeetingById(mid);
    uid = validation.validateUserId(uid);
    return meeting.owner === uid;
}

// delete the meeting with the passed in mid parameter
export async function deleteMeeting(mid) {
    // make sure meeting actually exists
    mid = await validation.validateMeetingExists(mid);

    const collection = await meetingsCollection();
    const removed = await collection.findOneAndDelete({ _id: validation.convertStrToObjectId(mid) });
    if (!removed) throw new Error(`Could not delete the meeting with ID "${mid}"`);
    removed._id = removed._id.toString();
    for (let user of removed.users) {
        await modifyUserMeeting(user, removed._id, false);
    }
    await modifyUserMeeting(removed.owner, removed._id, false);
    return removed; // FIXME MG - maybe we want to return `true` for success instead of the actual object?
}

// Update the "easy" fields of the meeting with the specified ID.
// `timeStart` and `timeEnd` are never actually updated, and are only provided for validating `duration`.
// Return the updated meeting object if operation is successful.
export async function updateMeeting(mid, { name, description, duration, timeStart, timeEnd }) {
    // make sure meeting actually exists
    mid = await validation.validateMeetingExists(mid);

    const collection = await meetingsCollection();
    const newFields = createMeetingDocument({ name, description, duration, timeStart, timeEnd }, true);

    // don't actually update these fields
    delete newFields.timeStart;
    delete newFields.timeEnd;

    const updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: newFields }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the meeting with ID "${mid}"`);
    updated._id = updated._id.toString();
    return updated;
}

// Add a Response Object to a meeting, and add this meeting to the user's account
export async function addResponseToMeeting(mid, response) {
    // make sure meeting actually exists
    mid = await validation.validateMeetingExists(mid);
    response = validation.validateResponseObj(response);

    const collection = await meetingsCollection();
    const foundMeeting = await getMeetingById(mid);

    // don't allow responses if the meeting is booked or cancelled
    if (foundMeeting.bookingStatus !== 0) throw new Error("Cannot submit a response to a booked or cancelled meeting");

    //initial check that there is at least one response to the meeting so mongo won't error on traversing through a field that doesn't exist
    let currResponses = foundMeeting.responses;
    currResponses = currResponses.filter((currResponse) => {
        return currResponse.uid !== response.uid;
    });

    for (let i = 0; i < foundMeeting.dates.length; i++) {
        if (!validation.isSameDay(foundMeeting.dates[i], response.availabilities[i].date)) {
            throw new Error(`Expect Response to have date ${foundMeeting.dates[i]} but instead found ${response.availabilities[i].date}`);
        }
    }

    currResponses.push(response);

    // add the Response (and corresponding user ID) to the meeting
    let updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: { responses: currResponses }, $addToSet: { users: response.uid } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not add a response to the meeting with ID "${mid}"`);
    updated._id = updated._id.toString();

    // add this meeting ID to the user document
    await modifyUserMeeting(response.uid, mid, true);

    return updated;
}

// Update (or add) a user's note on a meeting
export async function updateMeetingNote(mid, uid, body) {
    // make sure meeting and user actually exist
    mid = await validation.validateMeetingExists(mid);
    uid = await validation.validateUserExists(uid);

    body = validation.validateCommentNoteBody(body);

    const collection = await meetingsCollection();
    const updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: { [`notes.${uid}`]: body } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update a note on the meeting with ID "${mid}"`);
    updated._id = updated._id.toString();
    return updated;
}

//Set the Meeting Status and Booked Time of the Meeting
//Booking Status:  Integer from 1 to -1
//Booked Time:  null unless bookingStatus == 1, otherwise Object like { date, timeStart, timeEnd }
export async function setMeetingBooking(mid, bookingStatus, bookedTime = null) {
    mid = await validation.validateMeetingExists(mid);
    bookingStatus = validation.validateIntRange(bookingStatus, "Booking Status", -1, 1);

    const collection = await meetingsCollection();
    const meeting = await getMeetingById(mid);
    const users = meeting.users;

    // process invitation logic based on the new booking status
    let invitations;
    if (bookingStatus === 1) {
        bookedTime = validation.validateBookedTimeObj(bookedTime);

        // "send" invitations
        invitations = {};
        for (const user of [...users, meeting.owner]) {
            invitations[user] = 0; // pending invite status
            await updateUserInviteStatus(user, mid, 0);
        }
    } else {
        bookedTime = null; // enforce no booked time
        invitations = null; // reset all invitations

        // "remove" invitations
        for (const user of [...users, meeting.owner]) {
            await updateUserInviteStatus(user, mid, null);
        }
    }

    const updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: { bookingStatus, bookedTime, invitations } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not set the Booking information for the meeting with ID "${mid}"`);
    updated._id = updated._id.toString();
    return updated;
}

// update the meeting's invite status for a particular user, where status is an int between -1 and 1
export async function updateMeetingInviteStatus(mid, uid, inviteStatus) {
    // make sure meeting and user actually exist, and that the user is a part of the meeting
    mid = await validation.validateMeetingExists(mid);
    uid = await validation.validateUserExists(uid);
    inviteStatus = validation.validateIntRange(inviteStatus, "Invite Status", -1, 1);

    const meeting = await getMeetingById(mid);
    if (!meeting.users.includes(uid) && meeting.owner !== uid) throw new Error("User cannot respond to an invitation for a meeting they aren't involved in");
    if (meeting.bookingStatus !== 1) throw new Error("User cannot respond to an invitation for a meeting that hasn't been booked");

    const collection = await meetingsCollection();
    const updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: { [`invitations.${uid}`]: inviteStatus } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not set the Invite Status information for the meeting with ID "${mid} and the user with ID "${uid}"`);
    updated._id = updated._id.toString();
    return updated;
}

// either accept, decline, or reset an invitation to a meeting, simultaneously updating the invite status for both the meeting and user objects
export async function replyToMeetingInvitation(mid, uid, inviteStatus) {
    await updateMeetingInviteStatus(mid, uid, inviteStatus);
    await updateUserInviteStatus(uid, mid, inviteStatus);
}
