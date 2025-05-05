// Data functions for Meeting objects

import * as validation from "../utils/validation.js";
import { meetingsCollection } from "../config/mongoCollections.js";
import { createMeetingDocument } from "../public/js/documentCreation.js";
export { createMeetingDocument } from "../public/js/documentCreation.js";
import { Response } from "../public/js/classes/responses.js";

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

// delete the meeting with the passed in mid parameter
export async function deleteMeeting(mid) {
    // make sure meeting actually exists
    mid = await validation.validateMeetingExists(mid);

    const collection = await meetingsCollection();
    const removed = await collection.findOneAndDelete({ _id: validation.convertStrToObjectId(mid) });
    if (!removed) throw new Error(`Could not delete the meeting with ID "${mid}"`);
    removed._id = removed._id.toString();
    return removed;
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

//Adds the array of responseObjs to the specified meeting with the id
export async function addResponseToMeeting(mid, responseObjArr) {
    // make sure meeting actually exists
    mid = await validation.validateMeetingExists(mid);

    const collection = await meetingsCollection();
    const foundMeeting = await getMeetingById(mid);
    let responses = foundMeeting.responses;
    for (let newResponse of responseObjArr) {
        validation.validateResponseObj(newResponse);
        responses.push(newResponse);
    }
    const updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: { responses } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the meeting with ID "${mid}"`);
    updated._id = updated._id.toString();
    return updated;
}

// Update (or add) a user's note on a meeting
export async function updateMeetingNote(mid, uid, body) {
    // make sure meeting and user actually exist
    mid = await validation.validateMeetingExists(mid);
    uid = await validation.validateUserExists(uid);

    body = validation.validateNoteBody(body);

    const collection = await meetingsCollection();
    // todo make sure case-insensitivity works as intended here
    const updated = await collection.findOneAndUpdate({ _id: validation.convertStrToObjectId(mid) }, { $set: { [`notes.${uid}`]: body } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the meeting with ID "${mid}"`);
    updated._id = updated._id.toString();
    return updated;
}

// todo add data func for editing booking status (including bookingTime and cancellation)

export async function findCommonAvailabilityOfMeeting(mid) {
    // make sure meeting actually exists
    mid = await validation.validateMeetingExists(mid);

    const foundMeeting = await getMeetingById(mid);
    return Response.mergeResponsesToAvailability(foundMeeting.responses, foundMeeting.timeStart, foundMeeting.timeEnd);
}
