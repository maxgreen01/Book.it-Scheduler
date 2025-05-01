//Data functions for Meeting objects
import * as validation from "../utils/validation.js";
import { meetingsCollection, usersCollection } from "../config/mongoCollections.js";
import { createMeetingDocument } from "../public/js/documentCreation.js";
import { ObjectId, ReturnDocument } from "mongodb";
import { Response } from "../public/js/classes/responses.js";
export { createMeetingDocument } from "../public/js/documentCreation.js";

// Create a meeting object save it to the DB, and then return the added object
export async function createMeeting({ name, description, duration, owner, dates, timeStart, timeEnd, users, bookingStatus = 0, bookedTime = null, responses = [], notes = [] }) {
    const ownerExists = await validation.isUserIdTaken(owner);
    if (!ownerExists) {
        throw new Error(`User ID: ${owner} could not be found as a valid user!`);
    }
    const meeting = createMeetingDocument({ name, description, duration, owner, dates, timeStart, timeEnd, users, bookingStatus, bookedTime, responses, notes });
    for (let user of users) {
        const userExists = await validation.isUserIdTaken(user);
        if (!userExists) {
            throw new Error(`User ID: ${user} could not be found as a valid user!`);
        }
    }
    for (let response of responses) {
        validation.validResponseObjExtended(response);
    }
    for (let note of notes) {
        validation.validNoteObjExtended(note);
    }
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
    mid = validation.validateStrAsObjectId(mid, "Meeting ID");
    const collection = await meetingsCollection();
    mid = validation.convertStrToObjectId(mid);
    const meeting = await collection.findOne({ _id: mid });
    if (!meeting) {
        throw new Error(`Could not retrieve the meeting with ID: ${mid}`);
    }
    meeting._id = meeting._id.toString();
    return meeting;
}

// check whether a meeting exists with the specified ID
export async function doesMeetingExist(mid) {
    try {
        await getMeetingById(mid);
        return true;
    } catch (err) {
        return false;
    }
}

// delete the meeting with the passed in mid parameter
export async function deleteMeeting(mid) {
    mid = await validation.validMeeting(mid);
    const collection = await meetingsCollection();
    const removed = await collection.findOneAndDelete({ _id: validation.convertStrToObjectId(mid) });
    if (!removed) throw new Error(`Could not delete the meeting with ID: ${mid}`);
    removed._id = removed._id.toString();
    return removed;
}

//update certain fields (only the non undefined ones) with the meeting with the Object ID
//returns the new Meeting Object
export async function updateMeeting(mid, { name, description, duration, owner, dates, timeStart, timeEnd, users, bookingStatus, bookedTime, responses, notes }) {
    mid = await validation.validMeeting(mid);
    const collection = await meetingsCollection();
    const newMeetingFields = createMeetingDocument({ name, description, duration, owner, dates, timeStart, timeEnd, users, bookingStatus, bookedTime, responses, notes }, true);

    const updated = await collection.findOneAndUpdate({ _id: ObjectId(mid) }, { $set: newMeetingFields }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the meeting with ID: ${mid}`);
    updated._id = updated._id.toString();
    return updated;
}

//Adds the array of responseObjs to the specified meeting with the id
export async function addResponseToMeeting(mid, responseObjArr) {
    mid = await validation.validMeeting(mid);
    const collection = await meetingsCollection();
    const foundMeeting = await getMeetingById(mid);
    let responses = foundMeeting.responses;
    for (let newResponse of responseObjArr) {
        validation.validateResponseObj(newResponse);
        responses.push(newResponse);
    }
    mid = validation.convertStrToObjectId(mid);
    const updated = await collection.findOneAndUpdate({ _id: mid }, { $set: { responses } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the meeting with ID: ${mid}`);
    updated._id = updated._id.toString();
    return updated;
}

//Add the new note, and filter out the old note of that user had a note
export async function modifyNoteOfMeeting(mid, noteObj) {
    mid = await validation.validMeeting(mid);
    noteObj = await validation.validNoteObjExtended(noteObj);
    const collection = await meetingsCollection();
    const foundMeeting = await getMeetingById(mid);
    let notes = foundMeeting.notes;
    notes.filter((note) => {
        return note.uid !== noteObj.uid;
    });
    notes.push(noteObj);
    mid = validation.convertStrToObjectId(mid);
    const updated = await collection.findOneAndUpdate({ _id: mid }, { $set: { notes } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the meeting with ID: ${mid}`);
    updated._id = updated._id.toString();
    return updated;
}

export async function findCommonAvailabilityOfMeeting(mid) {
    mid = validation.validMeeting(mid);
    const foundMeeting = await getMeetingById(mid);
    return Response.mergeResponsesToAvailability(foundMeeting.responses, foundMeeting.timeStart, foundMeeting.timeEnd);
}
