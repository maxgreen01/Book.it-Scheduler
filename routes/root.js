import express from "express";

const router = express.Router();

// landing page
router.route("/").get(async (req, res) => {
    return res.render("home", { title: "Book.it Meeting Scheduler" });
});

export default router;
