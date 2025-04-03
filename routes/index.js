import rootRoutes from "./root.js";
import meetingsRoutes from "./meetings.js";
import createRoutes from "./create.js";
import profileRoutes from "./profile.js";

const constructorMethod = (app) => {
    app.use("/", rootRoutes);
    app.use("/profile", profileRoutes);
    app.use("/create", createRoutes);
    app.use("/meetings", meetingsRoutes);

    app.use(/(.*)/, (req, res) => {
        return res.status(404).json({ error: "Not found" });
    });
};

export default constructorMethod;
