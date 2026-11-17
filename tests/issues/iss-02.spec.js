import { test, expect } from "@playwright/test";
import "dotenv/config";
import { TEST_USER_ID, ISSUE_KEY } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";
const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};

test.describe("GET /issues/:issueKey", () => {
  test("ISS-02 Get one issue (happy path)", async ({ request }) => {
    const response = await request.get(`${baseURL}/issues/${ISSUE_KEY}`, {
      headers,
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema({ request }, body, schemaDoc.components.schemas.Issue);
  });
});
