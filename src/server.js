require("module-alias/register");
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("@/routes/user");
const projectRoutes = require("@/routes/project");
const auth = require("@/middleware/auth");
const { errorHandler } = require("@/error");

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", auth, projectRoutes);
app.use("/api", userRoutes);
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URL).then(() => {
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
  });
});
