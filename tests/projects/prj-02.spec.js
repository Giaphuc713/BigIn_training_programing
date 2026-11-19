import { test, expect } from "@playwright/test";
import "dotenv/config";
import { TEST_USER_ID } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};

test.describe("GET /projects", () => {
  // Happy path
  test("PRJ-02 - List projects the caller belong to", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/projects`, {
      headers,
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema({ request }, body, {
      type: "array",
      items: schemaDoc.components.schemas.Project,
    });
  });

  test("PRJ-02 - Return 401 status when authentication is missing", async ({
    request,
  }) => {
    const headers = { "X-User-Id": "" };
    const response = await request.get(`${baseURL}/api/projects`, {
      headers,
    });
    expect(response.status()).toBe(401);
  });
});
