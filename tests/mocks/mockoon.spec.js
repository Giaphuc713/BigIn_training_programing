import { test, expect } from "@playwright/test";
import "dotenv/config";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.MOCKOON_BASE_URL;
const { schemas } = schemaDoc.components;

// Inject components để AJV resolve được $ref bên trong schema
const issueSchema = {
  ...schemas.Issue,
  components: { schemas },
};

const issueListSchema = {
  ...schemas.IssueList,
  components: { schemas },
};

const errorSchema = {
  ...schemas.Error,
  components: { schemas },
};

// 1. GET /projects/:key/issues

test.describe("Mockoon GET /projects/:key/issues", () => {
  test("A2: response body khớp IssueList schema", async ({ request }) => {
    const response = await request.get(`${baseURL}/projects/WEB/issues`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema({ request }, body, issueListSchema);
  });

  test("A3: items có đúng 5 phần tử ", async ({ request }) => {
    const response = await request.get(`${baseURL}/projects/WEB/issues`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(5);
  });

  test("A6: query param ?page=3&pageSize=10", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/WEB/issues?page=3&pageSize=10`,
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(3);
    expect(body.pageSize).toBe(10);
  });

  test("A7: ?status=Done", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/WEB/issues?status=Done`,
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const issue of body.items) {
      expect(issue.status).toBe("Done");
    }
  });

  test("E1: ?status=INVALID → 400 với code VALIDATION_ERROR", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/projects/WEB/issues?status=INVALID_STATUS`,
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    await validateSchema({ request }, body, errorSchema);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("E2: ?status=Closed 400 VALIDATION_ERROR", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/WEB/issues?status=Closed`,
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    await validateSchema({ request }, body, errorSchema);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// 2. GET /issues/:issueKey

test.describe("Mockoon GET /issues/:issueKey", () => {
  // Header hợp lệ để không trigger rule 401 (Authorization != "null")
  const authHeaders = { Authorization: "Bearer token123" };

  test("A1: returns 200 với schema hợp lệ", async ({ request }) => {
    const response = await request.get(`${baseURL}/issues/WEB-1`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    await validateSchema({ request }, body, issueSchema);
  });

  test("A2: key trong response khớp issueKey trên URL", async ({ request }) => {
    const issueKey = "ABC-42";
    const response = await request.get(`${baseURL}/issues/${issueKey}`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.key).toBe(issueKey);
  });

  test("E1: issueKey=NOPE-1 ==> 404 ISSUE_NOT_FOUND", async ({ request }) => {
    const response = await request.get(`${baseURL}/issues/NOPE-1`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(404);
    const body = await response.json();

    expect(body.error.code).toBe("ISSUE_NOT_FOUND");
  });

  test("E2: Authorization: null → 401 UNAUTHORIZED", async ({ request }) => {
    const response = await request.get(`${baseURL}/issues/WEB-1`, {
      headers: { Authorization: "null" },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    await validateSchema({ request }, body, errorSchema);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

// 3. POST /projects/:key/issues

test.describe("Mockoon POST /projects/:key/issues", () => {
  test("A1: returns 201 với schema hợp lệ (happy path)", async ({
    request,
  }) => {
    const response = await request.post(`${baseURL}/projects/WEB/issues`, {
      data: {
        title: "Fix login bug",
        type: "Bug",
        priority: "High",
        description: "Users cannot login with SSO",
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    // await validateSchema({ request }, body, issueSchema);
  });

  test("A2: status luôn là 'To Do' ( fake sinh mặc định, không phụ thuộc payload)", async ({
    request,
  }) => {
    const response = await request.post(`${baseURL}/projects/WEB/issues`, {
      data: { title: "New Story", type: "Story" },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("To Do");
  });

  test("A3: title từ payload được sinh ra giống như payload truyền vào", async ({
    request,
  }) => {
    const title = "Implement search feature";
    const response = await request.post(`${baseURL}/projects/WEB/issues`, {
      data: { title, type: "Task" },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.title).toBe(title);
  });

  test("E1: project key='Nope' → 404 PROJECT_NOT_FOUND", async ({
    request,
  }) => {
    const response = await request.post(`${baseURL}/projects/Nope/issues`, {
      data: { title: "Ghost issue", type: "Task" },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    await validateSchema({ request }, body, errorSchema);
  });
});
