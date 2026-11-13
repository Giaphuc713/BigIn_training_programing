const router = require("express").Router();
const mongoose = require("mongoose");
const { ApiError } = require("@/error");
const Issue = require("@/models/issue");
const Project = require("@/models/project");
const Comment = require("@/models/comment");

router.post("/issues/:issueKey/comments", async (req, res) => {
  const issueKey = req.params.issueKey;
  const userId = req.user._id;
  const { issue } = await findIssueAndProject(issueKey, userId);
  const body = req.body;
  if (!body) {
    throw new ApiError(400, "INVALID_BODY", "Invalid_body");
  }
  const text = body.body.trim();
  if (text.length === 0 || text.length > 2000) {
    throw new ApiError(
      400,
      "INVALID_COMMENT_BODY",
      "body must contains 1 to 2000 characters",
    );
  }
  const comment = await Comment.create({
    issueId: issue._id,
    authorId: req.user._id,
    body: text,
  });
  res.status(201).json(comment);
});

router.get("/issues/:issueKey/comments", async (req, res) => {
  const { issue } = await findIssueAndProject(
    req.params.issueKey,
    req.user._id,
  );
  const comments = await Comment.find(
    { issueId: issue._id }.sort({ createdAt: 1 }),
  );
  res.json(comments);
});

async function findIssueAndProject(issueKey, userId) {
  const key = issueKey.trim().toUpperCase();
  const issue = await Issue.findOne({ key });
  if (!issue) {
    throw new ApiError(404, "ISSUE_NOT_FOUND", "Issue not found");
  }

  const project = await Project.findOne({
    _id: issue.projectId,
    "members.userId": userId,
  });

  if (!project) {
    throw new ApiError(404, "ISSUE_NOT_FOUND", "Issue not found");
  }
  return { issue, project };
}
