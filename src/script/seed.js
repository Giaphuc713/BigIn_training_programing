require("module-alias/register");
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("@/models/user");
const Project = require("@/models/project");
const Issue = require("@/models/issue");
const Comment = require("@/models/comment");

async function main() {
  await mongoose.connect(process.env.MONGO_URL);

  // 1. Dọn sạch và đảm bảo index (unique) tồn tại
  const models = [User, Project, Issue, Comment];
  await Promise.all(models.map((m) => m.deleteMany({})));
  await Promise.all(models.map((m) => m.syncIndexes()));

  // 2. Users
  const [alice, bob, carol, dan] = await User.insertMany([
    { email: "alice@example.com", displayName: "Alice", isActive: true },
    { email: "bob@example.com", displayName: "Bob", isActive: true },
    { email: "carol@example.com", displayName: "Carol", isActive: true },
    { email: "dan@example.com", displayName: "Dan", isActive: false },
  ]);

  // 3. Projects
  const [web, mob] = await Project.insertMany([
    {
      key: "WEB",
      name: "Website",
      description: "Web application",
      members: [
        { userId: alice._id, role: "Admin" },
        { userId: bob._id, role: "Member" },
        { userId: carol._id, role: "Viewer" },
        { userId: dan._id, role: "Member" },
      ],
    },
    {
      key: "MOB",
      name: "Mobile app",
      description: "Mobile application",
      members: [
        { userId: alice._id, role: "Admin" },
        { userId: carol._id, role: "Member" },
      ],
    },
  ]);

  // 4. Issues: 8 cho WEB, 4 cho MOB, đủ 4 trạng thái
  const webItems = [
    {
      type: "Story",
      title: "User can log in",
      status: "To Do",
      priority: "High",
      assigneeId: bob._id,
      reporterId: alice._id,
    },
    {
      type: "Bug",
      title: "Login button misaligned",
      status: "To Do",
      priority: "Low",
      assigneeId: null,
      reporterId: bob._id,
    },
    {
      type: "Task",
      title: "Set up CI pipeline",
      status: "In Progress",
      priority: "Medium",
      assigneeId: bob._id,
      reporterId: alice._id,
    },
    {
      type: "Bug",
      title: "Crash on empty cart",
      status: "In Progress",
      priority: "High",
      assigneeId: dan._id,
      reporterId: bob._id,
    },
    {
      type: "Story",
      title: "Search products",
      status: "In Review",
      priority: "Medium",
      assigneeId: bob._id,
      reporterId: alice._id,
    },
    {
      type: "Task",
      title: "Write API docs",
      status: "In Review",
      priority: "Low",
      assigneeId: alice._id,
      reporterId: alice._id,
    },
    {
      type: "Task",
      title: "Create project skeleton",
      status: "Done",
      priority: "Medium",
      assigneeId: bob._id,
      reporterId: alice._id,
    },
    {
      type: "Bug",
      title: "Fix typo on home page",
      status: "Done",
      priority: "Low",
      assigneeId: dan._id,
      reporterId: bob._id,
    },
  ];
  const mobItems = [
    {
      type: "Story",
      title: "Push notifications",
      status: "To Do",
      priority: "Medium",
      assigneeId: carol._id,
      reporterId: alice._id,
    },
    {
      type: "Bug",
      title: "App freezes on launch",
      status: "In Progress",
      priority: "High",
      assigneeId: carol._id,
      reporterId: carol._id,
    },
    {
      type: "Task",
      title: "Update app icon",
      status: "In Review",
      priority: "Low",
      assigneeId: null,
      reporterId: alice._id,
    },
    {
      type: "Task",
      title: "Publish beta build",
      status: "Done",
      priority: "Medium",
      assigneeId: alice._id,
      reporterId: alice._id,
    },
  ];

  const build = (project, items) =>
    items.map((it, i) => ({
      ...it,
      projectId: project._id,
      number: i + 1,
      key: `${project.key}-${i + 1}`,
      resolvedAt: it.status === "Done" ? new Date() : null,
    }));

  const issues = await Issue.insertMany([
    ...build(web, webItems),
    ...build(mob, mobItems),
  ]);

  // 5. Đồng bộ nextIssueNumber để khớp số issue đã tạo
  await Project.updateOne(
    { _id: web._id },
    { nextIssueNumber: webItems.length + 1 },
  );
  await Project.updateOne(
    { _id: mob._id },
    { nextIssueNumber: mobItems.length + 1 },
  );

  // 6. Comments: 6 cái
  await Comment.insertMany([
    {
      issueId: issues[0]._id,
      authorId: alice._id,
      body: "Please follow the design in Figma.",
    },
    {
      issueId: issues[0]._id,
      authorId: bob._id,
      body: "Starting on this today.",
    },
    {
      issueId: issues[2]._id,
      authorId: bob._id,
      body: "Pipeline runs on every PR.",
    },
    {
      issueId: issues[3]._id,
      authorId: alice._id,
      body: "Can you reproduce this on staging?",
    },
    {
      issueId: issues[8]._id,
      authorId: carol._id,
      body: "Waiting for the push certificate.",
    },
    {
      issueId: issues[9]._id,
      authorId: alice._id,
      body: "Needs a crash log from the device.",
    },
  ]);

  console.log("Seed done:", {
    users: await User.countDocuments(),
    projects: await Project.countDocuments(),
    issues: await Issue.countDocuments(),
    comments: await Comment.countDocuments(),
  });
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
