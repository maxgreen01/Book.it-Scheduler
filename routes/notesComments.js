import express from "express";

const router = express.Router();

// todo note -- if this shares lots of helper funcs with `rootRoutes`, maybe these can be combined into one file

// private note functionality
router
    .route("/:meetingId/note")
    // get the user’s private note for a meeting
    .get(async (req, res) => {
        return res.json("implement me");
    })
    // upload a new note
    .post(async (req, res) => {
        return res.json("implement me");
    });

// public comment functionality
router
    .route("/:meetingId/comment")
    // return JSON representation of all the comments on a meeting
    .get(async (req, res) => {
        return res.json("implement me");
    })
    // upload a new comment
    .post(async (req, res) => {
        return res.json("implement me");
    })
    // update a comment
    .patch(async (req, res) => {
        return res.json("implement me");
    })
    // delete a comment
    .delete(async (req, res) => {
        return res.json("implement me");
    });

// update reactions to a public comment
router.route("/:meetingId/:commentId/reaction").post(async (req, res) => {
    return res.json("implement me");
});

export default router;
