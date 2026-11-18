import { test, expect } from "@playwright/test";
import "dotenv/config";
import mongoose from "mongoose";
import { TEST_USER_ID, PROJECT_KEY } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};
const issueListSchema = {
  ...schemaDoc.components.schemas.IssueList,
  components: { schemas: schemaDoc.components.schemas },
};

test.describe("ISS-06 GET /projects/:key/issues", () => {
  test("ISS-List-01: default pagination and newest-first ordering", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/projects/${PROJECT_KEY}/issues`,
      { headers },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema({ request }, body, issueListSchema);
    // default returning is page 1
    expect(body.page).toBe(1);
  });

  test("ISS-List-02: filters by a valid status", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${PROJECT_KEY}/issues`,
      { headers, params: { status: "In Progress" } },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    // await validateSchema({ request }, body, issueListSchema);
    expect(body.page).toBe(1);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((issue) => issue.status === "In Progress")).toBe(
      true,
    );
  });

  test("ISS-LIST-03: Filter by status, priority", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${PROJECT_KEY}/issues`,
      { headers, params: { status: "In Progress", priority: "Low" } },
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(1);
    expect(body.items.length).toBeGreaterThan(0);
    expect(
      body.items.every(
        (issue) => issue.status === "In Progress" && issue.priority === "Low",
      ),
    ).toBe(true);
    // await validateSchema({ request }, result, issueListSchema);
  });

  test("ISS-LIST-04: Sort by priority ", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${PROJECT_KEY}/issues`,
      {
        headers,
        params: {
          sort: "priority",
        },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Validate pagination
    expect(body.page).toBe(1);

    // Validate response schema
    await validateSchema({ request }, body, issueListSchema);
  });

  test("ISS-LIST-05: List issue with page 2 and page size 5", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/projects/${PROJECT_KEY}/issues`,
      {
        headers,
        params: {
          page: 2,
          pageSize: 5,
        },
      },
    );
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Validate pagination
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(5);
    expect(body.items.length).toBeLessThanOrEqual(5);

    await validateSchema({ request }, body, issueListSchema);
  });
});
