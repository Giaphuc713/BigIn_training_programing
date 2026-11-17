const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Member", "Viewer"],
      default: "Member",
    },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true, // "web" -> "WEB", nên unique không phân biệt hoa thường
      trim: true,
      match: /^[A-Z]{2,10}$/,
    },
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 100,
      trim: true,
    },
    description: { type: String, maxlength: 1000, trim: true },
    members: [memberSchema],
    nextIssueNumber: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Project", projectSchema);
