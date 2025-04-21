//Data functions for Comment objects.
//(C)reate and (D)elete
import { comments } from "../config/mongoCollections.js";
import { ObjectId } from "mongodb";

const createComment = async (uid, body) => {
    //replace with proper validation logic. Probably input sanitization too.
    let id = new ObjectId();
    uid = uid.trim();
    body = body.trim();
    let timestamp = new Date().toISOString();

    const newComment = {
        _id: id,
        uid: uid,
        body: body,
        timestamp: timestamp,
    };

    //lecuture insert logic using insertOne. Return inserted comment.
    const commentCollection = await comments();
    const inserted = await commentCollection.insertOne(newComment);
    if (!inserted.acknowledged || !inserted.insertedId) throw new Error(`Failed to post comment`);
    return await getCommentById(inserted.insertedId.toString());
};

const getCommentById = async (id) => {
    //replace with proper validation logic
    id = id.trim();

    //lecture logic for get
    const commentCollection = await comments();
    const comment = await commentCollection.findOne({ _id: new ObjectId(id) });
    if (comment === null) throw new Error("No movie with that id");
    comment._id = comment._id.toString();
    return comment;
};

export { createComment, getCommentById };
