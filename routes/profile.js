import express from "express";

const router = express.Router();

router.route("/").get(async (req, res) => {
    res.render('profile', {
        title: 'My Profile',
        canEdit: true,
        fullName: "Alex Prikockis",
        pfpUrl: 'https://files.alexcheese.com/u/AWmGOQ.png'
    });
});

export default router;
