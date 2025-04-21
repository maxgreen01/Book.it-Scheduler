//Data functions for Comment objects.
//(C)reate and (D)elete
import { commentsCollection } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";
import { validateStrAsObjectId } from "../utils/validation.js";

//Constructor for comment documents
// Set `allowUndefined` to `true` to ignore `undefined` values, i.e. create partial objects for PATCH requests.
export async function createCommentDocument({ uid, meetingId, body }, allowUndefined = false) {
    // TODO BL: Validate input parameters properly
    let id = new ObjectId();
    uid = uid.trim();
    meetingId = meetingId.trim();
    body = body.trim();
    let timestamp = new Date();

    // create and return document
    const comment = {
        _id: id,
        uid: uid,
        body: body,
        timestamp: timestamp,
    };

    if (allowUndefined) {
        // delete undefined properties from the final object
        for (const key of Object.keys(comment)) if (comment[key] === undefined) delete comment[key];
    }
    return comment;
}

// insert to DB using insertOne. Return inserted comment.
export async function createComment({ uid, meetingId, body }) {
    const comment = createCommentDocument({ uid, meetingId, body });
    const collection = await commentsCollection();
    const insertResponse = await collection.insertOne(comment);
    if (!insertResponse.acknowledged || !insertResponse.insertedId) throw new Error(`User ${uid} failed to post a new comment: ${body}`);
    return comment;
}

//return comment with the given comment id
export async function getCommentById(id) {
    id = validateStrAsObjectId(id);
    const collection = await commentsCollection();
    const comment = await commentCollection.findOne({ _id: new ObjectId(id) });
    if (!comment) throw new Error(`No comment found with ID: ${id}`);

    // return comment with its ids converted to strings
    comment._id = comment._id.toString();
    comment.meetingId = comment.meetingId.toString();
    return comment;
}

//get all comments for a given meeting
export async function getMeetingComments(meetingId) {
    //implement me
}

//get all comments that a user has posted
export async function getUserComments(uid) {
    //implement me
}
