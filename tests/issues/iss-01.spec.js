import { test, expect } from "@playwright/test";
import "dotenv/config";
import { TEST_USER_ID } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";
const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};
let key;
const generateKey = () =>
  "T" +
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((value) => String.fromCharCode(65 + (value % 26)))
    .join("");

test.describe("POST /projects/:key/issues", () => {
  test.beforeAll(async ({ request }) => {
    // Generate unique key for each test
    key = generateKey();
    const response = await request.post(`${baseURL}/projects`, {
      headers,
      data: {
        key,
        name: "PROJECT_TEST_ISSUE",
        description: "PROJECT_TEST_ISSUE",
      },
    });
    expect(response.status()).toBe(201);
    const resultBody = await response.json();
    await validateSchema(
      { request },
      resultBody,
      schemaDoc.components.schemas.Project,
    );
  });
  test("ISS-01 Create issue (API sets key, status To Do, reporterId) (happy path)", async ({
    request,
  }) => {
    const payload = { title: "Create the firsts issue", type: "Story" };

    const response = await request.post(`${baseURL}/projects/${key}/issues`, {
      headers,
      data: payload,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    await validateSchema({ request }, body, schemaDoc.components.schemas.Issue);
  });

  test.afterAll(async ({ request }) => {
    // Cleanup project after each test
    const response = await request.delete(`${baseURL}/projects/${key}`, {
      headers,
    });
    expect(response.status()).toBe(204);
  });
});
