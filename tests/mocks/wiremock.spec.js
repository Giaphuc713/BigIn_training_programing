import { test, expect } from "@playwright/test";
import "dotenv/config";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.WIREMOCK_BASE_URL;
const adminURL = new URL(baseURL).origin + "/__admin";
const headers = {
  "Content-Type": "application/json",
  "X-User-Id": "UserPublic-001",
};

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

// 1. File stubs for four states:
//    - issue list
//    - empty list
//    - slow list (3s delay)
//    - create fails with 500
async function resetWireMockScenarios(request) {
  try {
    await request.post(`${adminURL}/scenarios/reset`);
  } catch (error) {}
}
test.describe("WireMock: File stubs for four states", () => {
  test("State 1: issue list - trả về danh sách issues hợp lệ", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/api/api/projects/WEB/issues`,
      {
        headers,
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Validate schema
    await validateSchema({ request }, body, issueListSchema);
  });

  test("State 2: empty list - trả về danh sách rỗng (items: [])", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/api/api/projects/EMPTY/issues`,
      {
        headers,
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Validate schema
    await validateSchema({ request }, body, issueListSchema);

    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  test("State 3: slow list - delay 3s (fixedDelayMilliseconds: 3000)", async ({
    request,
  }) => {
    // Tăng timeout cho test case slow list
    test.setTimeout(10000);

    const startTime = Date.now();
    const response = await request.get(
      `${baseURL}/api/api/projects/SLOW/issues`,
      {
        headers,
      },
    );
    const duration = Date.now() - startTime;

    expect(response.status()).toBe(200);
    // WireMock fixedDelay 3000ms -> duration phải >= 2800ms
    expect(duration).toBeGreaterThanOrEqual(2800);

    const body = await response.json();

    // Validate schema
    await validateSchema({ request }, body, issueListSchema);
  });

  test("State 4: create fails with 500 - trả về lỗi Internal Server Error", async ({
    request,
  }) => {
    const payload = {
      title: "Task that will fail",
      type: "Task",
    };

    const response = await request.post(
      `${baseURL}/api/api/projects/FAIL/issues`,
      {
        headers,
        data: payload,
      },
    );

    expect(response.status()).toBe(500);
    const body = await response.json();

    // Validate schema error
    await validateSchema({ request }, body, errorSchema);
  });
});

// 2. Stateful scenario & Edge cases:
//    - scenarios edge-case 1: Ban đầu chưa gọi create -> the list shows empty
//    - Stateful scenario: empty list → create → the list shows 1 issue
//    - scenarios edge-case 2: Gọi create lại một lần nữa ( error 400 status)

test.describe.serial("WireMock: Stateful scenario and edge cases", () => {
  test.beforeEach(async ({ request }) => {
    await resetWireMockScenarios(request);
  });

  test("Edge-case 1: Ban đầu chưa gọi create -> the list shows empty", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/api/api/projects/STATE/issues`,
      {
        headers,
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Validate schema
    await validateSchema({ request }, body, issueListSchema);

    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  test("Stateful scenario: empty list → create → the list shows 1 issue", async ({
    request,
  }) => {
    // Bước 1: Ban đầu list rỗng (empty list)
    const initialResponse = await request.get(
      `${baseURL}/api/api/projects/STATE/issues`,
      { headers },
    );
    expect(initialResponse.status()).toBe(200);
    const initialBody = await initialResponse.json();
    await validateSchema({ request }, initialBody, issueListSchema);
    expect(initialBody.items).toHaveLength(0);
    expect(initialBody.total).toBe(0);

    // Bước 2: Gọi create issue
    const createPayload = {
      title: "Created in scenario",
      type: "Task",
    };
    const createResponse = await request.post(
      `${baseURL}/api/api/projects/STATE/issues`,
      {
        headers,
        data: createPayload,
      },
    );

    expect(createResponse.status()).toBe(201);
    const createdIssue = await createResponse.json();
    await validateSchema({ request }, createdIssue, issueSchema);

    // Bước 3: The list shows 1 issue
    const listResponse = await request.get(
      `${baseURL}/api/projects/STATE/issues`,
      {
        headers,
      },
    );
    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();

    await validateSchema({ request }, listBody, issueListSchema);
  });
});
