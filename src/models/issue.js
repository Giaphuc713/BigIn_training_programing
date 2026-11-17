const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    number: { type: Number, required: true },
    key: { type: String, required: true, unique: true }, // WEB-12
    type: { type: String, enum: ["Story", "Task", "Bug"], required: true },
    title: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 200,
      trim: true,
    },
    description: { type: String, maxlength: 5000 },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "In Review", "Done"],
      default: "To Do",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    labels: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: 20 }],
      validate: [(arr) => arr.length <= 10, "labels: tối đa 10"],
    },
    storyPoints: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
      validate: {
        validator: (v) => v === null || Number.isInteger(v),
        message: "phải là số nguyên",
      },
    },
    dueDate: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Issue", issueSchema);
