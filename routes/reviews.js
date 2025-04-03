import express from "express";
import * as reviewFuncs from "../data/reviews.js";
import * as movieFuncs from "../data/movies.js";
import utils from "../helpers.js";

const router = express.Router();

router
    .route("/:movieId")
    // return an array of all reviews associated with the movie with the specified ID
    .get(async (req, res) => {
        // validate ID
        try {
            req.params.movieId = utils.validateObjectId(req.params.movieId);
        } catch (err) {
            return res.status(400).json({ error: "Invalid movie ID parameter" });
        }

        // get reviews for the movie
        try {
            const reviews = await reviewFuncs.getAllReviews(req.params.movieId);
            if (reviews.length == 0) {
                return res.status(404).send({ error: "The specified movie does not have any reviews" });
            }

            return res.json(reviews);
        } catch (err) {
            return res.status(404).send({ error: err.message });
        }
    })
    // create a review using the supplied data in the request body, and return the entire associated movie object
    .post(async (req, res) => {
        // ensure non-empty request body
        let data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ error: "There are no fields in the request body" });
        }

        // validate ID
        try {
            req.params.movieId = utils.validateObjectId(req.params.movieId);
        } catch (err) {
            return res.status(400).json({ error: "Invalid movie ID parameter" });
        }

        // validate all inputs
        try {
            data = reviewFuncs.createReviewDocument(data);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        // add the review to the DB
        try {
            const { reviewTitle, reviewerName, review, rating } = data;
            await reviewFuncs.createReview(req.params.movieId, reviewTitle, reviewerName, review, rating);

            // `createReview` returns the review object, so re-query to get the updated movie object
            return res.json(await movieFuncs.getMovieById(req.params.movieId));
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });

router
    .route("/review/:reviewId")
    // get the review with the specified ID
    .get(async (req, res) => {
        // validate ID
        try {
            req.params.reviewId = utils.validateObjectId(req.params.reviewId);
        } catch (err) {
            return res.status(400).json({ error: "Invalid review ID parameter" });
        }

        // get the review
        try {
            return res.json(await reviewFuncs.getReview(req.params.reviewId));
        } catch (err) {
            return res.status(404).send({ error: err.message });
        }
    })
    // delete the review with the specified ID, and return the updated movie object that it belonged to
    .delete(async (req, res) => {
        // validate ID
        try {
            req.params.reviewId = utils.validateObjectId(req.params.reviewId);
        } catch (err) {
            return res.status(400).json({ error: "Invalid review ID parameter" });
        }

        // delete the review
        try {
            return res.json(await reviewFuncs.removeReview(req.params.reviewId));
        } catch (err) {
            console.error(err);
            return res.status(404).send({ error: err.message });
        }
    });

export default router;
