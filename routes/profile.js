import express from "express";

const router = express.Router();

router.route("/").get(async (req, res) => {
    res.json("implement me");
});

export default router;
