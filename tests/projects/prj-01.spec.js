import { test, expect } from "@playwright/test";
import "dotenv/config";
import { TEST_USER_ID } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};

test.describe("POST /projects", () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.delete(`${baseURL}/api/projects/string`, {
      headers,
    });
    expect([204, 404]).toContain(response.status());
  });

  // Happy path
  test("PRJ-01 - Create new project", async ({ request }) => {
    const payload = {
      key: "string",
      name: "string",
      description: "string",
    };
    await validateSchema(
      { request },
      payload,
      schemaDoc.components.schemas.ProjectCreate,
    );
    const response = await request.post(`${baseURL}/api/projects`, {
      headers,
      data: payload,
    });
    expect(response.status()).toBe(201);
  });

  //  Input Validation
  test("returns 400 when 'key' is missing", async ({ request }) => {
    const payload = { name: "string", description: "string" };

    const response = await request.post(`${baseURL}/api/projects`, {
      headers,
      data: payload,
    });

    expect(response.status()).toBe(400);
  });

  test("returns 400 when 'name' is missing", async ({ request }) => {
    const payload = { key: "string", description: "string" };

    const response = await request.post(`${baseURL}/api/projects`, {
      headers,
      data: payload,
    });

    expect(response.status()).toBe(400);
  });

  // duplicate key projects
  test("return 409 when duplicate key project", async ({ request }) => {
    const payload = {
      key: "string",
      name: "string",
      description: "string",
    };
    await validateSchema(
      { request },
      payload,
      schemaDoc.components.schemas.ProjectCreate,
    );
    const response = await request.post(`${baseURL}/api/projects`, {
      headers,
      data: payload,
    });
    expect(response.status()).toBe(201);

    const duplicateResponse = await request.post(`${baseURL}/api/projects`, {
      headers,
      data: payload,
    });
    expect(duplicateResponse.status()).toBe(409);
    expect(await duplicateResponse.json()).toMatchObject({
      error: { code: "CONFLICT" },
    });
  });
});
