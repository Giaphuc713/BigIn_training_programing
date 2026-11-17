import { test, expect } from "@playwright/test";
import "dotenv/config";
import mongoose from "mongoose";
import { TEST_USER_ID, ISSUE_KEY } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};

test.describe("ISS-06 GET /projects/:key/issues", () => {
  test("ISS-List-01: default pagination and newest-first ordering", async ({
    request,
  }) => {
    const response = await request.get(
      `${baseURL}/projects/${ISSUE_KEY}/issues`,
      { headers },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema(
      { request },
      body,
      schemaDoc.components.schemas.IssueList,
    );
    // default returning is page 1
    expect(body.page).toBe(1);
  });

  test("ISS-List-02: filters by a valid status", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      { headers, params: { status: "In Progress" } },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema(
      { request },
      body,
      schemaDoc.components.schemas.IssueList,
    );
    expect(body.page).toBe(1);
    expect(body.items.every((issue) => issue.status === "In Progress")).toBe(1);
    const result = body.json();
    await validateSchema(
      { request },
      result,
      schemaDoc.components.schemas.IssueList,
    );
  });

  test("ISS-LIST-03: Filter by status, priority", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
      { headers, params: { status: "In Progress", priority: "Low" } },
    );
    const body = response.json();
    expect(body.page).toBe(1);
    expect(
      body.items.every(
        (issue) => issue.status === "In Progress" && issue.priority === "Low",
      ),
    ).toBe(1);
    await validateSchema(
      { request },
      result,
      schemaDoc.components.schemas.IssueList,
    );
  });

  test("ISS-LIST-04: Sort by priority ", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
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
    await validateSchema(
      { request },
      body,
      schemaDoc.components.schemas.IssueList,
    );
  });

  test("ISS-LIST-05: List issue with page 2", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/projects/${projectKey}/issues`,
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

    await validateSchema(
      { request },
      body,
      schemaDoc.components.schemas.IssueList,
    );
  });
});
