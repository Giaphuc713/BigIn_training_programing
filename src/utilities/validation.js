const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { validateSchema } = require("playwright-ajv-schema-validator");
const { parse } = require("yaml");

const schemaDoc = parse(
  readFileSync(resolve(__dirname, "../../openapi.yaml"), "utf8"),
);

module.exports = { schemaDoc, validateSchema };
