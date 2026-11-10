require("module-alias/register");
require("dotenv").config();
const mongoose = require("mongoose");
const Task = require("@/models/task");

(async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI environment variable");
    }

    await mongoose.connect(process.env.MONGO_URI);
    const seedTasks = [
      { title: "Write test plan", priority: "High", status: "Todo" },
      { title: "Review user story", priority: "Medium", status: "In Progress" },
      { title: "Close sprint", priority: "Low", status: "Done" },
    ];
    const result = await Task.bulkWrite(
      seedTasks.map((task) => ({
        updateOne: {
          filter: { title: task.title },
          update: { $setOnInsert: task },
          upsert: true,
        },
      })),
    );
    console.log(`Seed complete: ${result.upsertedCount} new task(s) inserted`);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
