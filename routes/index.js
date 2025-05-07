import authRoutes from "./auth.js";
import profileRoutes from "./profile.js";
import createRoutes from "./create.js";
import meetingsRoutes from "./meetings.js";
import rootRoutes from "./root.js";

const constructorMethod = (app) => {
    app.use("/profile", profileRoutes);
    app.use("/create", createRoutes);
    app.use("/meetings", meetingsRoutes);
    app.use("/", authRoutes);
    app.use("/", rootRoutes);

    app.use(/(.*)/, (req, res) => {
        return res.status(404).json({ error: "Not found" });
    });
};

export default constructorMethod;
