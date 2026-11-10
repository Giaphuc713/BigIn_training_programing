require("module-alias/register");
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Task = require("@/models/task");

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/tasks", async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await Task.find(filter).sort({ createdAt: -1 }));
});

app.post("/api/tasks", async (req, res) => {
  try {
    res.status(201).json(await Task.create(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  task ? res.json(task) : res.status(404).json({ error: "Task not found" });
});

app.delete("/api/tasks/:id", async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  task
    ? res.status(204).end()
    : res.status(404).json({ error: "Task not found" });
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
  });
});
