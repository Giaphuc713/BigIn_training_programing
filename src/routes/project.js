const router = require("express").Router();
const Project = require("../models/project");

router.post("/projects", async (req, res) => {
  const project = await Project.create({
    key: req.body.key,
    name: req.body.name,
    description: req.body.description,
    members: [{ userId: req.user._id, role: "Admin" }],
  });
  res.status(201).json(project);
});

router.get("/projects", async (req, res) => {
  res.json(await Project.find({ "members.userId": req.user._id }));
});

router.get("/projects/:key", async (req, res) => {
  const key = req.params.key.trim().toUpperCase();
  const project = await Project.findOne({
    key,
    "members.userId": req.user._id,
  }).populate("members.userId", "displayName email");
  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");
  }
  res.json(project);
});

router.post("/projects/:key/members", async (req, res) => {
  const key = req.params.key.trim().toUpperCase();

  const project = await findProjectForAdmin(key, req.user._id);

  const { userId, role } = req.body;
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "INVALID_USER_ID", "A valid userId is required");
  }

  const validRoles = ["Admin", "Member", "Viewer"];
  if (!validRoles.includes(role)) {
    throw new ApiError(
      400,
      "INVALID_ROLE",
      "role must be Admin, Member or Viewer",
    );
  }

  const alreadyMember = project.members.some((member) =>
    member.userId.equals(userId),
  );

  if (alreadyMember) {
    throw new ApiError(
      409,
      "ALREADY_MEMBER",
      "User is already a project member",
    );
  }

  project.members.push({ userId, role });
  await project.save();
  res.status(201).json({ userId, role });
});

router.delete("/projects/:key/members/:userId", async (req, res) => {
  const key = req.params.key.trim().toUpperCase();
  const userId = req.params.userId;
  const project = await findProjectForAdmin(key, req.user._id);

  const memberIndex = project.members.findIndex((member) =>
    member.userId.equals(userId),
  );

  if (memberIndex === -1) {
    throw new ApiError(404, "MEMBER_NOT_FOUND", "Project member not found");
  }

  project.members.splice(memberIndex, 1);
  await project.save();
  res.status(204).end();
});

router.post("/projects/:key/issues", async (req, res) => {});
async function findProjectForAdmin(key, userId) {
  const project = await Project.findOne({ key });

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const membership = project.members.find((member) =>
    member.userId.equals(userId),
  );

  if (!membership || membership.role !== "Admin") {
    throw new ApiError(403, "FORBIDDEN", "Project admin permission required");
  }

  return project;
}

module.exports = router;
