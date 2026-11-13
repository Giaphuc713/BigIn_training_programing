const router = require("express").Router();
const mongoose = require("mongoose");
const { ApiError } = require("@/error");
const Issue = require("@/models/issue");
const Project = require("@/models/project");
const Comment = require("@/models/comment");

const allowedTransitions = new Map([
  ["To Do", ["In Progress"]],
  ["In Progress", ["In Review"]],
  ["In Review", ["Done"]],
  ["Done", []],
]);

router.get("/issues/:issueKey", async (req, res) => {
  const { issue } = await findIssueAndProject(
    req.params.issueKey,
    req.user._id,
  );
  res.json(issue);
});

router.patch("/issues/:issueKey", async (req, res) => {
  const { issue } = await findIssueAndProject(
    req.params.issueKey,
    req.user._id,
  );
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_BODY", "Request body must be an object");
  }

  const allowedFields = new Set([
    "title",
    "description",
    "type",
    "priority",
    "assigneeId",
    "labels",
    "storyPoints",
    "dueDate",
  ]);
  const fields = Object.keys(body);
  const unknownFields = fields.filter((field) => !allowedFields.has(field));

  if (unknownFields.length > 0) {
    throw new ApiError(
      400,
      "INVALID_FIELDS",
      "Request contains unsupported fields",
      unknownFields,
    );
  }

  if (fields.length === 0) {
    throw new ApiError(400, "EMPTY_UPDATE", "At least one field is required");
  }

  const updatedIssue = await Issue.findOneAndUpdate(
    { _id: issue._id },
    { $set: body },
    { new: true, runValidators: true },
  );

  if (!updatedIssue) {
    throw new ApiError(404, "ISSUE_NOT_FOUND", "Issue not found");
  }

  res.json(updatedIssue);
});

router.post("/issues/:issueKey/transitions", async (req, res) => {
  const { issue } = await findIssueAndProject(
    req.params.issueKey,
    req.user._id,
  );
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_BODY", "Request body must be an object");
  }

  const bodyFields = Object.keys(body);
  if (
    bodyFields.length !== 1 ||
    bodyFields[0] !== "to" ||
    typeof body.to !== "string"
  ) {
    throw new ApiError(
      400,
      "INVALID_BODY",
      'Body must contain only a string "to"',
    );
  }

  if (!allowedTransitions.get(issue.status).includes(body.to)) {
    throw new ApiError(
      422,
      "INVALID_TRANSITION",
      `Cannot transition issue from ${issue.status} to ${body.to}`,
    );
  }

  const updatedIssue = await Issue.findOneAndUpdate(
    { _id: issue._id, status: issue.status },
    {
      $set: {
        status: body.to,
        resolvedAt: body.to === "Done" ? new Date() : null,
      },
    },
    { new: true, runValidators: true },
  );

  if (!updatedIssue) {
    throw new ApiError(
      422,
      "INVALID_TRANSITION",
      "Issue status changed before the transition could be applied",
    );
  }

  res.json(updatedIssue);
});

router.delete("/issues/:issueKey", async (req, res) => {
  const { issue, project } = await findIssueAndProject(
    req.params.issueKey,
    req.user._id,
  );
  const membership = project.members.find((member) =>
    member.userId.equals(req.user._id),
  );

  if (!membership || membership.role !== "Admin") {
    throw new ApiError(403, "FORBIDDEN", "Project admin permission required");
  }

  await Comment.deleteMany({ issueId: issue._id });
  const result = await Issue.deleteOne({ _id: issue._id });

  if (result.deletedCount === 0) {
    throw new ApiError(404, "ISSUE_NOT_FOUND", "Issue not found");
  }

  res.status(204).end();
});

router.post("/projects/:key/issues", async (req, res) => {
  const key = req.params.key.trim().toUpperCase();
  const project = await Project.findOne({ key });
  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const isMember = project.members.some((member) => {
    member.userId.equals(req.user._id);
  });

  if (!isMember) {
    throw new ApiError(403, "FORBIDDEN", "Project member is required");
  }

  const projectWithAllocatedNumber = await Project.findOneAndUpdate(
    { _id: project._id },
    { $inc: { nextIssueNumber: 1 } },
    { new: false },
  );

  const number = projectWithAllocatedNumber.nextIssueNumber;
  const body = req.body || {};

  const issue = await Issue.create({
    projectId: project._id,
    number,
    key: `${project.key}-${number}`,
    type: body.type,
    title: body.title,
    description: body.description,
    priority: body.priority,
    assigneeId: body.assigneeId,
    labels: body.labels,
    storyPoints: body.storyPoints,
    dueDate: body.dueDate,
    status: "To Do",
    reporterId: req.user._id,
  });

  res.status(201).json(issue);
});

router.get("/projects/:key/issues", async (req, res) => {
  const key = req.params.key.trim().toUpperCase();
  const project = Project.findOne({ key, "members.userId": req.user._id });
  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "project not found");
  }
  // get page, page sizes
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  if (pageSize > 100) {
    throw new ApiError(400, "INVALID_PAGE_SIZE", "invalid page size");
  }

  //Sort By
  const sortBy = req.query.sort === underfine ? "createdAt" : req.query.sort;
  const sortField = new Set(["createdAt", "priority", "dueDate"]);
  if (!sortField.has(sortBy)) {
    throw new ApiError(
      400,
      "INVALID SORT",
      "sorted must be createdAt, priority or dueDate",
    );
  }
  const sortOrder = sortBy === "priority" ? 1 : -1;

  // Filter 
  const filter = { projectId: project._id }
  const { status, priority, type, assigneeId, label } = req.query;

  const VALID_STATUSES = new Set(["To Do", "In Progress", "In Review", "Done"]);
  const VALID_PRIORITIES = new Set(["Low", "Medium", "High"]);
  const VALID_TYPES = new Set(["Story", "Task", "Bug"]);
  if (status !== undefined) {
    if (!VALID_STATUSES.has(status))
      throw new ApiError(400, "INVALID_STATUS", "Invalid status value");
    filter.status = status;
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.has(priority))
      throw new ApiError(400, "INVALID_PRIORITY", "Invalid priority value");
    filter.priority = priority;
  }
  if (type !== undefined) {
    if (!VALID_TYPES.has(type))
      throw new ApiError(400, "INVALID_TYPE", "Invalid type value");
    filter.type = type;
  }

  if (assigneedId !== underfine) {
    filter.assigneeId = assigneeId;
  }
  if (label !== underfine) {
    filter.label = label;
  }

  //5. Query
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([Issue.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(pageSize), Issue.countDocuments(filter)]);

  // Response
  res.json({ items, total, page, pageSize });

});



module.exports = router;

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
