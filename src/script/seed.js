require("module-alias/register");
require("dotenv").config();
const mongoose = require("mongoose");
const Task = require("@/models/task");

(async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("Missing MONGO_URL environment variable");
    }

    await mongoose.connect(process.env.MONGO_URL);
    const seedTasks = [
      { title: "Write test plan", priority: "High", status: "Todo" },
      {
        title: "Review user story",
        priority: "Medium",
        status: "In Progress",
      },
      { title: "Close sprint", priority: "Low", status: "Done" },
      {
        title: "Set up CI/CD pipeline",
        priority: "High",
        status: "In Progress",
      },
      { title: "Design database schema", priority: "High", status: "Done" },
      {
        title: "Implement login API",
        priority: "High",
        status: "In Progress",
      },
      {
        title: "Fix pagination bug on forum list",
        priority: "Medium",
        status: "Todo",
      },
      {
        title: "Write unit tests for UserService",
        priority: "Medium",
        status: "Todo",
      },
      {
        title: "Add JWT refresh token flow",
        priority: "High",
        status: "Todo",
      },
      {
        title: "Update README documentation",
        priority: "Low",
        status: "Done",
      },
      {
        title: "Refactor PostController",
        priority: "Medium",
        status: "In Progress",
      },
      {
        title: "Configure CORS for frontend",
        priority: "Medium",
        status: "Done",
      },
      {
        title: "Optimize slow JPA queries",
        priority: "High",
        status: "Todo",
      },
      {
        title: "Create Dockerfile for backend",
        priority: "Medium",
        status: "Todo",
      },
      {
        title: "Build task board UI component",
        priority: "High",
        status: "In Progress",
      },
      { title: "Add dark mode toggle", priority: "Low", status: "Todo" },
      {
        title: "Integrate Swagger API docs",
        priority: "Low",
        status: "Done",
      },
      {
        title: "Review pull request #42",
        priority: "Medium",
        status: "In Progress",
      },
      {
        title: "Set up error logging with Sentry",
        priority: "Medium",
        status: "Todo",
      },
      {
        title: "Write E2E tests for checkout flow",
        priority: "High",
        status: "Todo",
      },
      {
        title: "Prepare sprint retrospective notes",
        priority: "Low",
        status: "Todo",
      },
      {
        title: "Deploy staging environment",
        priority: "High",
        status: "Done",
      },
      {
        title: "Migrate legacy data to new schema",
        priority: "Medium",
        status: "In Progress",
      },
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
