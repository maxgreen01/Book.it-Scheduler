import express from "express";
import * as movieFuncs from "../data/movies.js";
import utils from "../helpers.js";

const router = express.Router();

router
    .route("/")
    // get an array of all movies, with each entry only containing the movie ID and name
    .get(async (req, res) => {
        try {
            return res.json(await movieFuncs.getAllMoviesProjected());
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    })
    // create a new movie using the supplied data in the request body, and return the new movie
    .post(async (req, res) => {
        // ensure non-empty request body
        let data = req.body;
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ error: "There are no fields in the request body" });
        }

        // validate all inputs
        try {
            data = movieFuncs.createMovieDocument(data);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        // add the movie to the DB
        try {
            const { title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime } = data;
            const movie = await movieFuncs.createMovie(title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime);
            return res.json(movie);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    });

router
    .route("/:movieId")
    // get the full content of the movie with the specified ID
    .get(async (req, res) => {
        // validate ID
        try {
            req.params.movieId = utils.validateObjectId(req.params.movieId);
        } catch (err) {
            return res.status(400).json({ error: "Invalid movie ID parameter" });
        }

        // get the movie
        try {
            return res.json(await movieFuncs.getMovieById(req.params.movieId));
        } catch (err) {
            return res.status(404).send({ error: err.message });
        }
    })
    // completely replace the movie with the specified ID using the supplied data in the request body, leaving review data unchanged
    .put(async (req, res) => {
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
            data = movieFuncs.createMovieDocument(data);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }

        // update the movie in the DB, leaving review data unchanged
        try {
            const { title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime } = data;
            const updated = await movieFuncs.updateMovie(req.params.movieId, title, plot, genres, rating, studio, director, castMembers, dateReleased, runtime);
            return res.json(updated);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    })
    // delete the movie with the specified ID, and return the updated movie object that it belonged to
    .delete(async (req, res) => {
        // validate ID
        try {
            req.params.movieId = utils.validateObjectId(req.params.movieId);
        } catch (err) {
            return res.status(400).json({ error: "Invalid movie ID parameter" });
        }

        // delete the movie
        try {
            await movieFuncs.removeMovie(req.params.movieId);
            return res.json({ movieId: req.params.movieId, deleted: true });
        } catch (err) {
            return res.status(404).send({ error: err.message });
        }
    });

export default router;
