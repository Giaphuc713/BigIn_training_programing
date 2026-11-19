import { test, expect } from "@playwright/test";
import "dotenv/config";
import { TEST_USER_ID, ISSUE_KEY } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";
const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};

test.describe("POST /issues/:issueKey/comments", () => {
  test("Add a new comment (happy path)", async ({ request }) => {
    const response = await request.post(
      `${baseURL}/api/issues/${ISSUE_KEY}/comments`,
      {
        headers,
        data: { body: "new comment" },
      },
    );
    expect(response.status()).toBe(201);
    const body = await response.json();
    await validateSchema(
      { request },
      body,
      schemaDoc.components.schemas.Comment,
    );
    expect(body.body).toBe("new comment");
    expect(body.authorId).toBe(TEST_USER_ID);
  });

  test("[List comments oldest first ]", async ({ request }) => {
    const response = await request.get(
      `${baseURL}/api/issues/${ISSUE_KEY}/comments`,
      {
        headers,
      },
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema({ request }, body, {
      type: "array",
      items: schemaDoc.components.schemas.Comment,
    });
  });
});
