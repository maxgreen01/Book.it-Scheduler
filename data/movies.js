import utils from "../helpers.js";
import { movies } from "../config/mongoCollections.js";

// construct a movie document given an object containing the required fields, or throw an error if any fields are invalid
function createMovieDocument({ title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime }) {
    // ============= validate simple inputs =============

    title = utils.validateAlphanumeric(title, 2);
    plot = utils.validateAndTrimString(plot);
    genres = utils.validateArrayElements(genres, (str) => utils.validateAlphabetical(str, 5));
    studio = utils.validateAlphabetical(studio, 5);
    director = utils.validateName(director);
    castMembers = utils.validateArrayElements(castMembers, (str) => utils.validateName(str));

    // ============= validate more complex inputs =============

    // `rating` must be one of the predefined values
    rating = utils.validateAndTrimString(rating);
    if (!["G", "PG", "PG-13", "R", "NC-17"].includes(rating)) throw new Error("Rating is not valid");

    // `dateReleased` be a valid date in "mm/dd/yyyy" format
    dateReleased = utils.validateAndTrimString(dateReleased);
    if (!dateReleased.match(/^\d{2}\/\d{2}\/\d{4}$/)) throw new Error(`Date "${dateReleased}" does not have the proper format "mm/dd/yyy"`);
    try {
        const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const dateParts = dateReleased.split("/");
        const month = utils.convertStrToInt(dateParts[0], 1, 12);
        const day = utils.convertStrToInt(dateParts[1], 1, daysInMonths[month - 1]);
        const year = utils.convertStrToInt(dateParts[2], 1900, new Date().getFullYear() + 2);
    } catch (err) {
        throw new Error(`Date "${dateReleased}" is not valid`);
    }

    // `runtime` must be a valid duration in "#h #min" format
    runtime = utils.validateAndTrimString(runtime);
    const runtimeMatch = runtime.match(/^(\d+)h (\d{1,2})min$/); // validate format and capture the numbers
    if (!runtimeMatch) throw new Error(`Runtime "${runtime}" does not have the proper format "#h #min"`);
    try {
        const hr = utils.convertStrToInt(runtimeMatch[1], 0, Number.POSITIVE_INFINITY);
        const min = utils.convertStrToInt(runtimeMatch[2], 0, 59);
        if (hr == 0 && min <= 30) throw new Error(); // min length
    } catch (err) {
        throw new Error(`Runtime "${runtime}" is not valid`);
    }

    // ============= construct the document =============
    const movie = {
        title,
        plot,
        genres,
        rating,
        studio,
        director,
        castMembers,
        dateReleased,
        runtime,
    };
    return movie;
}

// create a movie object and save it to the DB, then return the added object
const createMovie = async (title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime) => {
    // set up the document that will be saved to the DB
    const movie = createMovieDocument({ title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime });
    movie.reviews = [];
    movie.overallRating = 0;

    // run the DB operation
    const movieCollection = await movies();
    const insertResponse = await movieCollection.insertOne(movie);
    if (!insertResponse.acknowledged || !insertResponse.insertedId) throw new Error("Could not add the movie to the DB");

    // add the generated ID before returning
    movie._id = insertResponse.insertedId.toString();
    return movie;
};

// return an array of all movies in the DB
const getAllMovies = async () => {
    const movieCollection = await movies();
    const movieList = await movieCollection.find({}).toArray();
    if (!movieList) throw new Error("Could not retrieve all movies");

    movieList.forEach((movie) => (movie._id = movie._id.toString()));
    return movieList;
};

// return an array of all movies in the DB, only returning the ID and title of each
const getAllMoviesProjected = async () => {
    const movieCollection = await movies();
    const movieList = await movieCollection.find({}).project({ _id: 1, title: 1 }).toArray();
    if (!movieList) throw new Error("Could not retrieve all movies");

    movieList.forEach((movie) => (movie._id = movie._id.toString()));
    return movieList;
};

// return the movie with the specified ID
const getMovieById = async (id) => {
    const movieCollection = await movies();
    const movie = await movieCollection.findOne({ _id: utils.convertStrToObjectId(id) });
    if (!movie) throw new Error(`Could not retrieve the movie with ID "${id}"`);

    movie._id = movie._id.toString();
    return movie;
};

// remove the movie with the specified ID from the DB
const removeMovie = async (id) => {
    const movieCollection = await movies();
    const removed = await movieCollection.findOneAndDelete({ _id: utils.convertStrToObjectId(id) });
    if (!removed) throw new Error(`Could not remove the movie with ID "${id}"`);

    return `${removed.title} has been successfully deleted!`;
};

// update ALL the data of the movie with the specified ID in the DB, and return the updated movie
const updateMovie = async (id, title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime) => {
    const movieCollection = await movies();
    const newMovie = createMovieDocument({ title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime });

    // copy `reviews` and `overallRating` from old object and copy it over to the new one
    try {
        const existing = await getMovieById(id);
        newMovie.reviews = existing.reviews;
        newMovie.overallRating = existing.overallRating;
    } catch (err) {
        // movie not found, so can't copy fields
    }

    const updated = await movieCollection.findOneAndUpdate({ _id: utils.convertStrToObjectId(id) }, { $set: newMovie }, { returnDocument: "after" });
    if (!updated) throw new Error(`Could not update the movie with ID "${id}"`);

    updated._id = updated._id.toString();
    return updated;
};

export { createMovieDocument, createMovie, getAllMovies, getAllMoviesProjected, getMovieById, removeMovie, updateMovie };
