require("module-alias/register");
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("@/models/user");
const Project = require("@/models/project");
const Issue = require("@/models/issue");

const TOTAL = 1000;
const BATCH_SIZE = 250;
const PREFIX = "PERF-04 fixture";

const TYPES = ["Story", "Task", "Bug"];
const STATUSES = ["To Do", "In Progress", "In Review", "Done"];
const PRIORITIES = ["Low", "Medium", "High"];
const LABELS = ["frontend", "backend", "login", "cart", "search", "docs", "ci"];

async function main() {
  await mongoose.connect(process.env.MONGO_URL);

  const web = await Project.findOne({ key: "WEB" });
  if (!web) {
    throw new Error('Project "WEB" chưa tồn tại. Hãy chạy `pnpm seed` trước.');
  }

  const memberIds = web.members
    .filter((m) => m.role !== "Viewer")
    .map((m) => m.userId);
  const users = await User.find({ _id: { $in: memberIds }, isActive: true });
  if (users.length === 0)
    throw new Error("Không có user phù hợp để gán issue.");
  const reporters = users;
  const assignees = [null, ...users]; // có cả issue chưa assign

  // 1. Dọn fixture large cũ để chạy lại vẫn ra đúng 1000 issue
  const removed = await Issue.deleteMany({
    projectId: web._id,
    title: new RegExp(`^${PREFIX} `),
  });

  // 2. Cấp phát dải số issue một cách atomic (an toàn nếu có issue được tạo song song)
  const updated = await Project.findOneAndUpdate(
    { _id: web._id },
    { $inc: { nextIssueNumber: TOTAL } },
    { new: true },
  );
  const startNumber = updated.nextIssueNumber - TOTAL;

  // 3. Sinh dữ liệu (deterministic theo index để kết quả lặp lại được)
  const now = Date.now();
  const docs = Array.from({ length: TOTAL }, (_, i) => {
    const number = startNumber + i;
    const status = STATUSES[i % STATUSES.length];
    const createdAt = new Date(now - (TOTAL - i) * 60 * 1000);
    return {
      projectId: web._id,
      number,
      key: `${web.key}-${number}`,
      type: TYPES[i % TYPES.length],
      title: `${PREFIX} ${i + 1}`,
      status,
      priority: PRIORITIES[(i * 7) % PRIORITIES.length],
      assigneeId: assignees[i % assignees.length]?._id ?? null,
      reporterId: reporters[i % reporters.length]._id,
      labels: [LABELS[i % LABELS.length]],
      resolvedAt: status === "Done" ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
    };
  });

  // 4. Insert theo batch
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await Issue.insertMany(docs.slice(i, i + BATCH_SIZE), { ordered: true });
  }

  console.log("Seed large done:", {
    removedPrevious: removed.deletedCount,
    inserted: TOTAL,
    range: `${web.key}-${startNumber} .. ${web.key}-${startNumber + TOTAL - 1}`,
    webIssuesTotal: await Issue.countDocuments({ projectId: web._id }),
    nextIssueNumber: updated.nextIssueNumber,
  });
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => { });
  process.exit(1);
});
