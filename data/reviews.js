import utils from "../helpers.js";
import { ObjectId } from "mongodb";
import { movies } from "../config/mongoCollections.js";

// construct a review document given an object containing the required fields, or throw an error if any fields are invalid
function createReviewDocument({ reviewTitle, reviewerName, review, rating }) {
    // validate inputs
    reviewTitle = utils.validateAndTrimString(reviewTitle);
    reviewerName = utils.validateAndTrimString(reviewerName);
    review = utils.validateAndTrimString(review);
    rating = utils.validateNumber(rating, 1, 5);

    const reviewObj = {
        reviewTitle,
        reviewerName,
        review,
        rating,
    };
    return reviewObj;
}

// create a review object and save it to the DB under the corresponding movie, then return the created review
const createReview = async (movieId, reviewTitle, reviewerName, review, rating) => {
    // set up the document that will be saved to the DB
    const reviewObj = createReviewDocument({ reviewTitle, reviewerName, review, rating });

    const now = new Date();
    const reviewDate = String(now.getMonth() + 1).padStart(2, "0") + "/" + String(now.getDate()).padStart(2, "0") + "/" + String(now.getFullYear());
    reviewObj._id = new ObjectId();
    reviewObj.reviewDate = reviewDate;

    const movieCollection = await movies();
    const objId = utils.convertStrToObjectId(movieId);
    let updated = await movieCollection.findOneAndUpdate({ _id: objId }, { $push: { reviews: reviewObj } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not create a review for the movie with ID "${movieId}"`);

    // recalculate the movie's `overallRating` as the average of all its reviews
    let avg = updated.reviews.reduce((acc, review) => acc + review.rating, 0) / (updated.reviews.length || 1);
    avg = Math.trunc(avg * 10) / 10; // truncate to 1 decimal place
    updated = await movieCollection.findOneAndUpdate({ _id: objId }, { $set: { overallRating: avg } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the overall rating for the movie with ID "${movieId}"`);

    // return the newly added review object
    reviewObj._id = reviewObj._id.toString();
    return reviewObj;
};

// return an array of reviews for the movie with the specified ID
const getAllReviews = async (movieId) => {
    const movieCollection = await movies();
    const movie = await movieCollection.findOne({ _id: utils.convertStrToObjectId(movieId) });
    if (!movie) throw new Error(`Could not retrieve the reviews for the movie with ID "${movieId}"`);

    return movie.reviews;
};

// return the review with the specified ID
const getReview = async (reviewId) => {
    const movieCollection = await movies();
    // retrieve an object with just a `reviews` field containing only the matched review
    const movie = await movieCollection.findOne({ "reviews._id": utils.convertStrToObjectId(reviewId) }, { projection: { _id: 0, "reviews.$": 1 } });
    if (!movie) throw new Error(`Could not retrieve the review with ID "${reviewId}"`);

    return movie.reviews[0];
};

// remove the review with the specified ID from the DB, and return the updated movie object that it belonged to
const removeReview = async (reviewId) => {
    const movieCollection = await movies();
    const objId = utils.convertStrToObjectId(reviewId);
    let updated = await movieCollection.findOneAndUpdate({ "reviews._id": objId }, { $pull: { reviews: { _id: objId } } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not remove the review with ID "${reviewId}"`);

    // recalculate the movie's `overallRating` as the average of all its reviews
    let avg = updated.reviews.reduce((acc, review) => acc + review.rating, 0) / (updated.reviews.length || 1);
    avg = Math.trunc(avg * 10) / 10; // truncate to 1 decimal place
    updated = await movieCollection.findOneAndUpdate({ _id: updated._id }, { $set: { overallRating: avg } }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the overall rating for the movie that used to contain the review with ID "${reviewId}"`);

    // return the entire updated movie object
    updated._id = updated._id.toString();
    return updated;
};

export { createReviewDocument, createReview, getAllReviews, getReview, removeReview };
