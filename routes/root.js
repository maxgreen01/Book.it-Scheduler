import express from "express";

const router = express.Router();

router.route("/").get(async (req, res) => {
    res.render('home', {title: 'Book.it Meeting Scheduler'});
});

export default router;
