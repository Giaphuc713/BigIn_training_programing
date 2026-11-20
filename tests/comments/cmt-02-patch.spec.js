import { test, expect, request as apiRequest } from "@playwright/test";
import "dotenv/config";
import {
  TEST_USER_ID,
  MEMBER_ID,
  ISSUE_KEY,
} from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};
let commentId;
test.describe("PATCH /comments/:id", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post(
      `${baseURL}/api/issues/${ISSUE_KEY}/comments`,
      {
        headers,
        data: { body: "comment created for cmt-02" },
      },
    );

    expect(response.status()).toBe(201);
    const comment = await response.json();
    commentId = comment._id;
    await validateSchema(
      { request },
      comment,
      schemaDoc.components.schemas.Comment,
    );
  });

  test.afterAll(async ({ request }) => {
    if (!commentId) {
      const response = await request.delete(
        `${baseURL}/api/comments/${commentId}`,
        { headers },
      );
      expect(response.status()).toBe(204);
    }
  });
  test("Return 403 when request update comment isn't author", async ({
    request,
  }) => {
    const response = await request.patch(`${baseURL}/api/comments/${commentId}`, {
      headers: { "X-User-Id": MEMBER_ID },
      data: { body: "updated comment" },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    await validateSchema({ request }, body, schemaDoc.components.schemas.Error);
  });
  test("Update comment by author (happy path)", async ({ request }) => {
    const response = await request.patch(`${baseURL}/api/comments/${commentId}`, {
      headers,
      data: { body: "updated comment" },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    await validateSchema(
      { request },
      body,
      schemaDoc.components.schemas.Comment,
    );
  });
});
