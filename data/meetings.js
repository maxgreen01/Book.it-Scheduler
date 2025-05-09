// Data functions for Meeting objects

import * as validation from "../utils/validation.js";
import { meetingsCollection } from "../config/mongoCollections.js";
import { createMeetingDocument } from "../public/js/documentCreation.js";
export { createMeetingDocument } from "../public/js/documentCreation.js";
import { Response } from "../public/js/classes/responses.js";
import { modifyUserMeeting } from "./users.js";

// Create a meeting object save it to the DB, and then return the added object
export async function createMeeting({ name, description, duration, owner, dates, timeStart, timeEnd }) {
    // set up the document that will be saved to the DB
    const meeting = createMeetingDocument({ name, description, duration, owner, dates, timeStart, timeEnd });
    meeting.bookingStatus = 0; // todo make an enum for status code meanings
    meeting.bookedTime = null;
    meeting.users = [];
    meeting.responses = [];
    meeting.notes = {};

    // make sure owner actually exists
    await validation.validateUserExists(meeting.owner);

    // run the DB operation
    const collection = await meetingsCollection();
    const insertResponse = await collection.insertOne(meeting);
    if (!insertResponse.acknowledged || !insertResponse.insertedId) throw new Error(`Could not add meeting "${meeting.name}" to the database`);
    meeting._id = meeting._id.toString();
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
        throw new Error(`Could not retrieve the meeting with ID "${mid}"`);
    }
    meeting._id = meeting._id.toString();
    return meeting;
}

// TODO uncomment if we implement private meetings (i.e. for checking whether a user is allowed to respond)
/* // return a boolean indicating whether a user is involved in a meeting, i.e. is the owner of the meeting or has responded to it
export async function isUserInMeeting(mid, uid) {
    const meeting = await getMeetingById(mid);
    uid = validation.validateUserId(uid);
    return meeting.users.includes(uid) || meeting.owner === uid;
} */

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

// Update certain fields (only the non-`undefined` ones) of the meeting with the specified ID.
// Return the updated meeting object if operation is successful.
export async function updateMeeting(mid, { name, description, duration }) {
    // make sure meeting actually exists
    mid = await validation.validateMeetingExists(mid);

    const collection = await meetingsCollection();
    const newFields = createMeetingDocument({ name, description, duration }, true);

    const updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: newFields }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the meeting with ID "${mid}"`);
    updated._id = updated._id.toString();
    return updated;
}

// Add a Response Object to a meeting, and add this meeting to the user's account
export async function addResponseToMeeting(mid, response) {
    // make sure meeting actually exists
    mid = await validation.validateMeetingExists(mid);

    const collection = await meetingsCollection();
    response = validation.validateResponseObj(response);

    //initial check that there is at least one response to the meeting so mongo won't error on traversing through a field that doesn't exist
    const foundMeeting = await getMeetingById(mid);
    const currResponses = foundMeeting.responses;
    currResponses.filter((currResponse) => {
        currResponse.uid !== response.uid;
    });
    currResponses.push(response);
    // add the Response to the meeting
    let updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: { responses: currResponses } }, { returnDocument: "after" });
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
    // todo make sure case-insensitivity works as intended here
    const updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: { [`notes.${uid}`]: body } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update a note on the meeting with ID "${mid}"`);
    updated._id = updated._id.toString();
    return updated;
}

//Set the Meeting Status and Booked Time of the Meeting
//Booking Status = Integer from 1 to -1
//Booked Time = Availability Object
export async function setBooking(mid, bookingStatus, bookedTime) {
    mid = await validation.validateMeetingExists(mid);
    bookingStatus = validation.validateIntRange(bookingStatus, "Booking Status", -1, 1);
    bookedTime = validation.validateAvailabilityObj(bookedTime);
    const collection = await meetingsCollection();
    const updated = await collection.findOneAndUpdate(
        { _id: mid },
        {
            $set: {
                bookingStatus,
                bookedTime,
            },
        },
        { returnDocument: "after" }
    );
    if (!updated) throw new Error(`Could not set the Booking information on the meeting with ID ${mid}`);
    updated._id = updated._id.toString();
    return updated;
}
