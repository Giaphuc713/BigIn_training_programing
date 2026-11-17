import { test, expect } from "@playwright/test";
import "dotenv/config";
import { TEST_USER_ID, MEMBER_ID } from "../../src/utilities/constant.js";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.BASE_URL;
const headers = {
  "X-User-Id": TEST_USER_ID,
};
const key =
  "T" +
  Math.random()
    .toString(36)
    .slice(2, 8)
    .replace(/[^a-z]/g, "x")
    .toUpperCase();
test.describe("PRJ-04", () => {
  // Happy path
  test("Admin add a new user with a role", async ({ request }) => {
    // Create new project

    const createdProject = await request.post(`${baseURL}/projects`, {
      headers: headers,
      data: {
        key,
        name: "PRJ-04",
        description: "PRJ-04 test project",
      },
    });
    expect(createdProject.status()).toBe(201);
    const createdProjectBody = await createdProject.json();
    await validateSchema(
      { request },
      createdProjectBody,
      schemaDoc.components.schemas.Project,
    );
    // add new user with a new roles
    const payload = {
      userId: MEMBER_ID,
      role: "Member",
    };
    const response = await request.post(`${baseURL}/projects/${key}/members`, {
      headers: headers,
      data: payload,
    });
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
    const response = await request.post(`${baseURL}/projects/${key}/members`, {
      headers: headers,
      data: payload,
    });
    expect(response.status()).toBe(409);
  });

  test("Admin removes user and return 204 status code", async ({ request }) => {
    const removeMember = await request.delete(
      `${baseURL}/projects/${key}/members/${MEMBER_ID}`,
      { headers },
    );
    expect(removeMember.status()).toBe(204);

    const deleteProject = await request.delete(`${baseURL}/projects/${key}`, {
      headers,
    });
    expect(deleteProject.status()).toBe(204);
  });
});
