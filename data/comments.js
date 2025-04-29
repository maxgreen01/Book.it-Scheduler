//Data functions for Comment objects.
import { commentsCollection } from "../config/mongoCollections.js";
import { convertStrToObjectId, validateAndTrimString, validateStrAsObjectId, validateUserId } from "../utils/validation.js";
import { createCommentDocument } from "../public/js/documentCreation.js";
export { createCommentDocument } from "../public/js/documentCreation.js";

// insert to DB using insertOne. Return inserted comment.
export async function createComment({ uid, meetingId, body }) {
    const comment = createCommentDocument({ uid, meetingId, body });
    const collection = await commentsCollection();
    const insertResponse = await collection.insertOne(comment);
    if (!insertResponse.acknowledged || !insertResponse.insertedId) throw new Error(`User ${uid} failed to post a new comment with body "${body}"`);

    // return comment with its ids converted to strings
    comment._id = comment._id.toString();
    return comment;
}

// return comment with the given comment id
export async function getCommentById(id) {
    id = convertStrToObjectId(id, "Comment ID");
    const collection = await commentsCollection();
    const comment = await collection.findOne({ _id: id });
    if (!comment) throw new Error(`No comment found with ID "${id}"`);

    // return comment with its ids converted to strings
    comment._id = comment._id.toString();
    return comment;
}

// get all comments from entire comments database
export async function getAllComments() {
    const collection = await commentsCollection();
    let comments = await collection.find({}).toArray();
    if (!comments) throw new Error("Could not get all comments");

    //return all comments with id's mapped to strings
    comments = comments.map((comm) => {
        comm._id = comm._id.toString();
        return comm;
    });
    return comments;
}

// get all comments that a user has posted
export async function getUserComments(uid) {
    //TODO MG: Good idea to query users DB if UID is a real ID
    //Throw if it isn't.
    uid = validateUserId(uid);
    const collection = await commentsCollection();
    let comments = await collection.find({ uid: uid }).toArray();
    if (!comments) throw new Error(`Could not get user ${uid}'s comments`);

    //return all comments with id's mapped to strings
    comments = comments.map((comm) => {
        comm._id = comm._id.toString();
        return comm;
    });
    return comments;
}

// get all comments for a given meeting
export async function getMeetingComments(meetingId) {
    //TODO PV: Good idea to query meetings DB if meetingId is a real ID
    //Throw if it isn't.
    meetingId = validateStrAsObjectId(meetingId, "Meeting ID");
    const collection = await commentsCollection();
    let comments = await collection.find({ meetingId: meetingId }).toArray();
    if (!comments) throw new Error(`Could not get comments from meeting ID "${meetingId}"`);

    //return all comments with id's mapped to strings
    comments = comments.map((comm) => {
        comm._id = comm._id.toString();
        return comm;
    });
    return comments;
}

//remove comment and return it back
export async function deleteComment(id) {
    id = convertStrToObjectId(id, "Comment ID");
    const collection = await commentsCollection();
    const removed = await collection.findOneAndDelete({ _id: id });
    if (!removed) throw new Error(`Failed to delete comment with ID "${id}"`);

    // return comment with its ids converted to strings
    removed._id = removed._id.toString();
    return removed;
}

//edit and save new text to an existing comment, returning the updated comment
export async function updateComment(id, newBody) {
    id = convertStrToObjectId(id, "Comment ID");
    newBody = validateAndTrimString(newBody, "Comment Body", false);
    let timestamp = new Date();

    const collection = await commentsCollection();
    const updated = await collection.findOneAndUpdate({ _id: id }, { $set: { body: newBody, dateUpdated: timestamp } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Failed to update comment with ID "${id}"`);

    // return comment with its ids converted to strings
    updated._id = updated._id.toString();
    return updated;
}

//add a unique reaction to a comment --> "like" or "dislike"
export async function reactToComment(id, uid, reaction) {
    //TODO BL: remove this for final project, this is a dev sanity check
    if (reaction != "like" && reaction != "dislike") {
        throw new Error("reactToComment: Set reaction to either like or dislike");
    }

    uid = validateUserId(uid);
    const comment = await getCommentById(id);
    const commentId = convertStrToObjectId(comment._id);
    const collection = await commentsCollection();

    //check for existing reactions (only like or dislike once) and toggle off
    const hasLiked = comment.reactions.likes.includes(uid);
    const hasDisliked = comment.reactions.dislikes.includes(uid);

    //toggle off existing reaction
    const updated = await collection.updateOne(
        { _id: commentId },
        {
            $pull: {
                "reactions.likes": uid,
                "reactions.dislikes": uid,
            },
        }
    );
    if (!updated) throw new Error(`Failed to react to comment with ID "${comment._id}"`);

    //the operation was an "un-react", so early return
    if ((hasLiked && reaction == "like") || (hasDisliked && reaction == "dislike")) {
        return;
    }

    //add reaction to respective set.
    if (reaction === "like") {
        await collection.updateOne({ _id: commentId }, { $addToSet: { "reactions.likes": uid } });
    } else if (reaction === "dislike") {
        await collection.updateOne({ _id: commentId }, { $addToSet: { "reactions.dislikes": uid } });
    }
}
