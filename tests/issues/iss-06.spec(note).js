import { test, expect } from "@playwright/test";
import "dotenv/config";
import mongoose from "mongoose";
import User from "../../src/models/user.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.BASE_URL;
const headers = {};
const issueCount = 25;

let projectKey;
let projectCreated = false;
let testUserId;
let otherAssigneeId;
let nonexistentAssigneeId;
let createdIssues = [];

const generateKey = () =>
  "T" +
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((value) => String.fromCharCode(65 + (value % 26)))
    .join("");

const getExpectedIssues = (filter) =>
  createdIssues.filter((issue) =>
    Object.entries(filter).every(([field, value]) => {
      if (field === "label") {
        return issue.labels.includes(value);
      }
      return issue[field] === value;
    }),
  );

const expectIssueKeys = (actualItems, expectedIssues) => {
  expect(actualItems.map((issue) => issue.key).sort()).toEqual(
    expectedIssues.map((issue) => issue.key).sort(),
  );
};

const expectErrorResponse = async (response, status) => {
  expect(response.status()).toBe(status);
  const body = await response.json();
  expect(body.error).toEqual(
    expect.objectContaining({
      code: expect.any(String),
      message: expect.any(String),
    }),
  );
};

test.describe("ISS-06 GET /projects/:key/issues", () => {
  test.beforeAll(async ({ request }) => {
    expect(process.env.MONGO_URL).toBeTruthy();
    await mongoose.connect(process.env.MONGO_URL);
    try {
      const activeUser = await User.findOne({ isActive: true })
        .select("_id")
        .lean();
      expect(activeUser).not.toBeNull();
      testUserId = String(activeUser._id);
    } finally {
      await mongoose.disconnect();
    }

    headers["X-User-Id"] = testUserId;
    otherAssigneeId = new mongoose.Types.ObjectId().toString();
    nonexistentAssigneeId = new mongoose.Types.ObjectId().toString();

    projectKey = generateKey();
    const projectResponse = await request.post(`${baseURL}/projects`, {
      headers,
      data: {
        key: projectKey,
        name: "ISS-06 list test project",
        description: "Isolated project for ISS-06 list tests",
      },
    });
    expect(projectResponse.status()).toBe(201);
    projectCreated = true;

    createdIssues = [];
    const issueTypes = ["Story", "Task", "Bug"];
    const priorities = ["Low", "Medium", "High"];
    const statusRanges = [
      { end: 6, status: "To Do", transitions: [] },
      { end: 12, status: "In Progress", transitions: ["In Progress"] },
      {
        end: 18,
        status: "In Review",
        transitions: ["In Progress", "In Review"],
      },
      {
        end: issueCount,
        status: "Done",
        transitions: ["In Progress", "In Review", "Done"],
      },
    ];

    for (let index = 0; index < issueCount; index += 1) {
      const statusConfig = statusRanges.find((range) => index < range.end);
      const labels =
        index % 2 === 0
          ? ["frontend", ...(index % 5 === 0 ? ["urgent"] : [])]
          : ["backend"];
      const dueDate =
        index % 7 === 0
          ? null
          : new Date(Date.UTC(2027, 0, index + 1)).toISOString();
      const payload = {
        title: `ISS-06 fixture issue ${index + 1}`,
        type: issueTypes[index % issueTypes.length],
        priority: priorities[index % priorities.length],
        assigneeId:
          index % 5 === 0
            ? null
            : index % 2 === 0
              ? testUserId
              : otherAssigneeId,
        labels,
        dueDate,
      };

      const createResponse = await request.post(
        `${baseURL}/projects/${projectKey}/issues`,
        { headers, data: payload },
      );
      expect(createResponse.status()).toBe(201);
      const issue = await createResponse.json();
      createdIssues.push({
        ...issue,
        ...payload,
        status: "To Do",
      });

      for (const to of statusConfig.transitions) {
        const transitionResponse = await request.post(
          `${baseURL}/issues/${issue.key}/transitions`,
          { headers, data: { to } },
        );
        expect(transitionResponse.status()).toBe(200);
      }
      createdIssues[index].status = statusConfig.status;
    }
  });

  test("returns the default first page with newest issues first", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      { headers },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema(
      { request },
      body,
      schemaDoc.components.schemas.IssueList,
    );
    expect(body).toMatchObject({
      total: issueCount,
      page: 1,
      pageSize: 20,
    });
    expect(body.items).toHaveLength(20);

    const timestamps = body.items.map((issue) =>
      new Date(issue.createdAt).getTime(),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  test("filters by each supported status", async ({ request }) => {
    for (const status of ["To Do", "In Progress", "In Review", "Done"]) {
      const response = await request.get(
        `${baseURL}/projects/${projectKey}/issues`,
        { headers, params: { status, pageSize: String(issueCount) } },
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      const expected = getExpectedIssues({ status });
      expect(body.total).toBe(expected.length);
      expectIssueKeys(body.items, expected);
    }
  });

  test("filters by each supported priority", async ({ request }) => {
    for (const priority of ["Low", "Medium", "High"]) {
      const response = await request.get(
        `${baseURL}/projects/${projectKey}/issues`,
        { headers, params: { priority, pageSize: String(issueCount) } },
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      const expected = getExpectedIssues({ priority });
      expect(body.total).toBe(expected.length);
      expectIssueKeys(body.items, expected);
    }
  });

  test("filters by each supported issue type", async ({ request }) => {
    for (const type of ["Story", "Task", "Bug"]) {
      const response = await request.get(
        `${baseURL}/projects/${projectKey}/issues`,
        { headers, params: { type, pageSize: String(issueCount) } },
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      const expected = getExpectedIssues({ type });
      expect(body.total).toBe(expected.length);
      expectIssueKeys(body.items, expected);
    }
  });

  test("filters by assigneeId, including an empty result", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      {
        headers,
        params: {
          assigneeId: testUserId,
          pageSize: String(issueCount),
        },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    const expected = getExpectedIssues({ assigneeId: testUserId });
    expect(body.total).toBe(expected.length);
    expectIssueKeys(body.items, expected);

    const noMatchesResponse = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      {
        headers,
        params: {
          assigneeId: nonexistentAssigneeId,
          pageSize: String(issueCount),
        },
      },
    );
    expect(noMatchesResponse.status()).toBe(200);
    const noMatchesBody = await noMatchesResponse.json();
    expect(noMatchesBody.items).toEqual([]);
    expect(noMatchesBody.total).toBe(0);
  });

  test("filters by label membership in the labels array", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      { headers, params: { label: "frontend", pageSize: String(issueCount) } },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    const expected = getExpectedIssues({ label: "frontend" });
    expect(body.total).toBe(expected.length);
    expectIssueKeys(body.items, expected);
    expect(
      body.items.every((issue) => issue.labels.includes("frontend")),
    ).toBe(true);

    const noMatchesResponse = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      { headers, params: { label: "not-present" } },
    );
    expect(noMatchesResponse.status()).toBe(200);
    const noMatchesBody = await noMatchesResponse.json();
    expect(noMatchesBody.items).toEqual([]);
    expect(noMatchesBody.total).toBe(0);
  });

  test("combines filters with AND semantics", async ({ request }) => {
    const filter = {
      status: "To Do",
      priority: "High",
      type: "Bug",
      assigneeId: testUserId,
      label: "frontend",
    };
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      { headers, params: { ...filter, pageSize: String(issueCount) } },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    const expected = getExpectedIssues(filter);
    expect(body.total).toBe(expected.length);
    expectIssueKeys(body.items, expected);
  });

  test("returns the requested page and keeps total independent of pagination", async ({
    request,
  }) => {
    const firstResponse = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      { headers, params: { page: "1", pageSize: "10" } },
    );
    const secondResponse = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      { headers, params: { page: "2", pageSize: "10" } },
    );

    expect(firstResponse.status()).toBe(200);
    expect(secondResponse.status()).toBe(200);
    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();
    expect(firstBody).toMatchObject({ total: issueCount, page: 1, pageSize: 10 });
    expect(secondBody).toMatchObject({ total: issueCount, page: 2, pageSize: 10 });
    expect(firstBody.items).toHaveLength(10);
    expect(secondBody.items).toHaveLength(10);
    expect(
      firstBody.items.some((first) =>
        secondBody.items.some((second) => second.key === first.key),
      ),
    ).toBe(false);
  });

  test("accepts pageSize boundaries 1 and 100", async ({ request }) => {
    for (const pageSize of [1, 100]) {
      const response = await request.get(
        `${baseURL}/projects/${projectKey}/issues`,
        { headers, params: { pageSize: String(pageSize) } },
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.pageSize).toBe(pageSize);
      expect(body.items.length).toBeLessThanOrEqual(pageSize);
    }
  });

  test("sorts by createdAt when explicitly requested", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      {
        headers,
        params: { sort: "createdAt", pageSize: String(issueCount) },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    const timestamps = body.items.map((issue) =>
      new Date(issue.createdAt).getTime(),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  test("sorts priority from High to Low", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      {
        headers,
        params: { sort: "priority", pageSize: String(issueCount) },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    const ranks = body.items.map((issue) => priorityRank[issue.priority]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  test("sorts due dates from soonest to latest", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      {
        headers,
        params: { sort: "dueDate", pageSize: String(issueCount) },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    const dueDates = body.items
      .filter((issue) => issue.dueDate !== null)
      .map((issue) => new Date(issue.dueDate).getTime());
    expect(dueDates).toEqual([...dueDates].sort((a, b) => a - b));
  });

  test("returns 400 for invalid filter and sort values", async ({ request }) => {
    const invalidQueries = [
      { status: "Unknown" },
      { priority: "Urgent" },
      { type: "Epic" },
      { sort: "title" },
    ];

    for (const params of invalidQueries) {
      const response = await request.get(
        `${baseURL}/projects/${projectKey}/issues`,
        { headers, params },
      );
      await expectErrorResponse(response, 400);
    }
  });

  test("returns 400 for invalid pageSize values", async ({ request }) => {
    for (const pageSize of ["0", "-1", "101", "1.5", "abc"]) {
      const response = await request.get(
        `${baseURL}/projects/${projectKey}/issues`,
        { headers, params: { pageSize } },
      );
      await expectErrorResponse(response, 400);
    }
  });

  test("returns 400 for invalid page values", async ({ request }) => {
    for (const page of ["0", "-1", "1.5", "abc"]) {
      const response = await request.get(
        `${baseURL}/projects/${projectKey}/issues`,
        { headers, params: { page } },
      );
      await expectErrorResponse(response, 400);
    }
  });

  test("returns 401 when the user header is missing", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
    );
    await expectErrorResponse(response, 401);
  });

  test("returns 404 for an unknown project", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/UNKNOWN/issues`,
      { headers },
    );
    await expectErrorResponse(response, 404);
  });

  test.afterAll(async ({ request }) => {
    for (const issue of createdIssues) {
      const response = await request.delete(
        `${baseURL}/issues/${issue.key}`,
        { headers },
      );
      expect(response.status()).toBe(204);
    }

    if (projectCreated) {
      const response = await request.delete(
        `${baseURL}/projects/${projectKey}`,
        { headers },
      );
      expect(response.status()).toBe(204);
    }
  });
});
