import { test, expect } from "@playwright/test";
import "dotenv/config";
import { TEST_USER_ID, MEMBER_ID } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";
import crypto from "crypto";
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

test.describe("PRJ-04", () => {
  test.beforeAll(async ({ request }) => {
    // Generate unique key for each test
    key = generateKey();
    const response = await request.post(`${baseURL}/api/projects`, {
      headers,
      data: {
        key,
        name: "PRJ-04",
        description: "PRJ-04 test project",
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

  // Happy path
  test("Admin add a new user with a role", async ({ request }) => {
    // add new user with a new roles
    const payload = {
      userId: MEMBER_ID,
      role: "Member",
    };
    const response = await request.post(
      `${baseURL}/api/projects/${key}/members`,
      {
        headers: headers,
        data: payload,
      },
    );
    expect(response.status()).toBe(201);
    const responseBody = await response.json();
    await validateSchema(
      { request },
      responseBody,
      schemaDoc.components.schemas.ProjectMember,
    );
  });

  test("Returning 409 status when user has already a member", async ({
    request,
  }) => {
    const payload = {
      userId: MEMBER_ID,
      role: "Member",
    };
    const firstResponse = await request.post(
      `${baseURL}/api/projects/${key}/members`,
      { headers, data: payload },
    );
    expect(firstResponse.status()).toBe(201);

    const duplicateResponse = await request.post(
      `${baseURL}/api/projects/${key}/members`,
      { headers, data: payload },
    );
    expect(duplicateResponse.status()).toBe(409);
  });

  test("Admin removes user and return 204 status code", async ({ request }) => {
    const addMember = await request.post(
      `${baseURL}/api/projects/${key}/members`,
      {
        headers,
        data: {
          userId: MEMBER_ID,
          role: "Member",
        },
      },
    );
    expect(addMember.status()).toBe(201);

    const removeMember = await request.delete(
      `${baseURL}/api/projects/${key}/members/${MEMBER_ID}`,
      { headers },
    );
    expect(removeMember.status()).toBe(204);
  });

  test.afterAll(async ({ request }) => {
    // Cleanup project after each test
    const response = await request.delete(`${baseURL}/api/projects/${key}`, {
      headers,
    });
    expect(response.status()).toBe(204);
  });
});
