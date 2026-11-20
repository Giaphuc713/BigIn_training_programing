import { test, expect } from "@playwright/test";
import "dotenv/config";
import { schemaDoc, validateSchema } from "../../src/utilities/validation.js";

const baseURL = process.env.MOCK_BASE_URL;
const issueListSchema = {
  ...schemaDoc.components.schemas.IssueList,
  components: { schemas: schemaDoc.components.schemas },
};

test.describe("Mock JSON GET /issues", () => {
  test("A2: returns the issue list with exactly the documented schema keys", async ({
    request,
  }) => {
    const response = await request.get(`${baseURL}/api/issues`);
    expect(response.status()).toBe(200);
    const body = await response.json();

    await validateSchema({ request }, body, issueListSchema);
  });

  test("E1: mock ignores status=Done and returns the full issue list", async ({
    request,
  }) => {
    const [allResponse, filteredResponse] = await Promise.all([
      request.get(`${baseURL}/api/issues`),
      request.get(`${baseURL}/api/issues?status=Done`),
    ]);

    expect(allResponse.status()).toBe(200);
    expect(filteredResponse.status()).toBe(200);

    const allIssues = await allResponse.json();
    const queriedIssues = await filteredResponse.json();
    expect(queriedIssues).toEqual(allIssues);
  });
});
