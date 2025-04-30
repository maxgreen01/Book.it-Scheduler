import loginRoutes from "./login.js";
import profileRoutes from "./profile.js";
import createRoutes from "./create.js";
import meetingsRoutes from "./meetings.js";
import rootRoutes from "./root.js";
import notesCommentsRoutes from "./notesComments.js";

const constructorMethod = (app) => {
    app.use("/login", loginRoutes);
    app.use("/profile", profileRoutes);
    app.use("/create", createRoutes);
    app.use("/meetings", meetingsRoutes);
    app.use("/", rootRoutes);
    app.use("/", notesCommentsRoutes);

    app.use(/(.*)/, (req, res) => {
        return res.status(404).json({ error: "Not found" });
    });
};

export default constructorMethod;
