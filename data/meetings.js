//Data functions for Meeting objects
import * as validation from "../utils/validation.js";
import { meetingsCollection, usersCollection } from "../config/mongoCollections.js";
import { createMeetingDocument } from "../public/js/documentCreation.js";
import { ObjectId } from "mongodb";
export { createMeetingDocument } from "../public/js/documentCreation.js";

// Create a meeting object save it to the DB, and then return the added object
export async function createMeeting({ name, description, duration, owner, dates, timeStart, timeEnd, users, bookingStatus = 0, bookedTime = null, responses = [], notes = [] }) {
    const ownerExists = !(await validation.isUserIdUnique(owner));
    if (!ownerExists) {
        throw new Error(`User ID: ${owner} could not be found as a valid user!`);
    }
    const meeting = createMeetingDocument({ name, description, duration, owner, dates, timeStart, timeEnd, users, bookingStatus, bookedTime, responses, notes });
    for (let user of users) {
        const userExists = !(await validation.isUserIdUnique(user));
        if (!userExists) {
            throw new Error(`User ID: ${user} could not be found as a valid user!`);
        }
    }
    for (let response of responses) {
        const userExists = !(await validation.isUserIdUnique(response.uid));
        if (!userExists) {
            throw new Error(`User ID: ${response.uid} could not be found as a valid user!`);
        }
    }
    for (let note of notes) {
        const userExists = !(await validation.isUserIdUnique(note.uid));
        if (!userExists) {
            throw new Error(`User ID: ${note.uid} could not be found as a valid user!`);
        }
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
    return meetings;
}

// return the meeting the with passed in mid parameter
export async function getMeetingById(mid) {
    mid = validation.validateStrAsObjectId(mid, "Meeting ID");
    const collection = await usersCollection();
    const meeting = await collection.findOne({ _id: validation.convertStrToObjectId(mid) });
    if (!meeting) throw new Error(`Could not retrieve the meeting with ID: ${mid}`);
    return mid;
}

// delete the meeting with the passed in mid parameter
export async function deleteMeeting(mid) {
    mid = validation.validateStrAsObjectId(mid, "Meeting ID");
    const collection = await meetingsCollection();
    const removed = await collection.findOneAndDelete({ _id: validation.convertStrToObjectId(mid) });
    if (!removed) throw new Error(`Could not delete the meeting with ID: ${mid}`);
    return removed;
}

//

const newMeeting = {
    name: "Test meeting",
    description: "A test meeting",
    duration: 12,
    owner: "Mgreen",
    dates: [new Date()],
    timeStart: 10,
    timeEnd: 20,
    users: ["Mgreen"],
};

console.log(await createMeeting(newMeeting));
