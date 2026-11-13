const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const axios = require("axios");

const api = axios.create({
  baseURL: process.env.API_BASE_URL || "http://localhost:3000/api",
  timeout: 10000,
});

async function request(method, path, options = {}) {
  const { data, userId, expectedStatus = 200 } = options;
  try {
    const response = await api.request({
      method,
      url: path,
      data,
      headers: userId ? { "X-User-Id": userId } : undefined,
    });

    assert.equal(
      response.status,
      expectedStatus,
      `${method} ${path}: expected HTTP ${expectedStatus}`,
    );
    console.log(`${method.toUpperCase()} ${path} -> ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(
      `${method.toUpperCase()} ${path} failed:`,
      error.response
        ? `HTTP ${error.response.status} ${JSON.stringify(error.response.data)}`
        : error.message,
    );
    throw error;
  }
}

async function main() {
  let issueKey;
  let addedMemberId;
  let userId;
  let projectKey;
  let projectCreated = false;

  try {
    const health = await request("get", "/health");
    assert.equal(health.status, "ok");

    const users = await request("get", "/users", {
      userId: process.env.TEST_USER_ID,
    });
    assert.ok(Array.isArray(users), "GET /users should return an array");
    assert.ok(users.length >= 2, "At least two users are required for this test");

    const requestedUser = process.env.TEST_USER_ID
      ? users.find((user) => user._id === process.env.TEST_USER_ID)
      : users.find((user) => user.isActive);
    assert.ok(requestedUser, "TEST_USER_ID was not found");
    assert.ok(requestedUser.isActive, "The test user must be active");
    userId = requestedUser._id;

    const member = users.find((user) => user._id !== userId);
    assert.ok(member, "A second user is required to test project membership");

    projectKey = `T${Array.from(randomBytes(6), (byte) =>
      String.fromCharCode(65 + (byte % 26)),
    ).join("")}`;
    const project = await request("post", "/projects", {
      userId,
      expectedStatus: 201,
      data: {
        key: projectKey,
        name: "Axios API test project",
        description: "Created by src/tests/test-api.js",
      },
    });
    projectCreated = true;
    assert.equal(project.key, projectKey);

    const projects = await request("get", "/projects", { userId });
    assert.ok(
      projects.some((item) => item.key === projectKey),
      "Created project should appear in GET /projects",
    );

    const fetchedProject = await request("get", `/projects/${projectKey}`, {
      userId,
    });
    assert.equal(fetchedProject._id, project._id);

    const addedMember = await request(
      "post",
      `/projects/${projectKey}/members`,
      {
        userId,
        expectedStatus: 201,
        data: { userId: member._id, role: "Member" },
      },
    );
    addedMemberId = member._id;
    assert.equal(addedMember.userId, member._id);
    assert.equal(addedMember.role, "Member");

    const issue = await request("post", `/projects/${projectKey}/issues`, {
      userId,
      expectedStatus: 201,
      data: {
        type: "Task",
        title: "Verify all implemented API routes",
        description: "Created by the Axios API test script",
        priority: "High",
        labels: ["api-test"],
      },
    });
    issueKey = issue.key;
    assert.ok(issueKey.startsWith(`${projectKey}-`));
    assert.equal(issue.status, "To Do");

    const fetchedIssue = await request("get", `/issues/${issueKey}`, {
      userId,
    });
    assert.equal(fetchedIssue._id, issue._id);

    const updatedIssue = await request("patch", `/issues/${issueKey}`, {
      userId,
      data: {
        description: "Updated by the Axios API test script",
        labels: ["api-test", "updated"],
      },
    });
    assert.equal(
      updatedIssue.description,
      "Updated by the Axios API test script",
    );

    for (const status of ["In Progress", "In Review", "Done"]) {
      const transitionedIssue = await request(
        "post",
        `/issues/${issueKey}/transitions`,
        { userId, data: { to: status } },
      );
      assert.equal(transitionedIssue.status, status);
    }

    console.log("All API route checks passed.");
  } finally {
    if (issueKey) {
      await request("delete", `/issues/${issueKey}`, {
        userId,
        expectedStatus: 204,
      });
    }
    if (addedMemberId) {
      await request(
        "delete",
        `/projects/${projectKey}/members/${addedMemberId}`,
        { userId, expectedStatus: 204 },
      );
    }
    if (projectCreated) {
      console.log(
        `Test project ${projectKey} remains in MongoDB because no project-delete route is implemented.`,
      );
    }
  }
}

main().catch((error) => {
  console.error("API test run failed:", error.message);
  process.exitCode = 1;
});