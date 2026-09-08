import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "yaml";

describe("OpenAPI Specification", () => {
  const specPath = path.resolve(__dirname, "../../openapi/openapi.yaml");
  let apiSpec;

  it("OpenAPI file exists", () => {
    expect(fs.existsSync(specPath)).toBe(true);
  });

  it("document parses successfully as YAML", () => {
    const fileContent = fs.readFileSync(specPath, "utf8");
    apiSpec = yaml.parse(fileContent);
    expect(apiSpec).toBeDefined();
  });

  it("OpenAPI version is valid", () => {
    expect(apiSpec.openapi).toMatch(/^3\.0\.\d+$/); // Validates 3.0.x
  });

  it("security schemes are valid", () => {
    expect(apiSpec.components.securitySchemes).toHaveProperty("bearerAuth");
    expect(apiSpec.components.securitySchemes.bearerAuth.type).toBe("http");
    expect(apiSpec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
    
    expect(apiSpec.components.securitySchemes).toHaveProperty("customerToken");
    expect(apiSpec.components.securitySchemes.customerToken.type).toBe("http");
  });

  it("all currently registered V1 routes intended for public/API use are represented", () => {
    const paths = Object.keys(apiSpec.paths);
    
    // Auth routes
    expect(paths).toContain("/auth/register");
    expect(paths).toContain("/auth/login");
    expect(paths).toContain("/auth/refresh");
    expect(paths).toContain("/auth/logout");
    expect(paths).toContain("/auth/me");

    // Events routes
    expect(paths).toContain("/events");
    expect(paths).toContain("/events/{id}");

    // Queues routes
    expect(paths).toContain("/queues");
    expect(paths).toContain("/events/{eventId}/queues");
    expect(paths).toContain("/queues/{id}");
    expect(paths).toContain("/queues/{id}/public");

    // Queue entries routes
    expect(paths).toContain("/queues/{queueId}/entries");
    expect(paths).toContain("/queue-entries/session/{sessionId}");
    expect(paths).toContain("/queue-entries/{id}");
    expect(paths).toContain("/queue-entries/{id}/leave");
    expect(paths).toContain("/queues/{queueId}/call-next");
    expect(paths).toContain("/queue-entries/{id}/start");
    expect(paths).toContain("/queue-entries/{id}/no-show");
    expect(paths).toContain("/queue-entries/{id}/complete");

    // Health endpoints
    expect(paths).toContain("/live");
    expect(paths).toContain("/ready");
  });

  it("referenced schemas resolve and validate using SwaggerParser", async () => {
    // This parses and validates all $ref instances across the document
    const validatedSpec = await SwaggerParser.validate(specPath);
    expect(validatedSpec).toBeDefined();
  });

  it("health endpoints are documented", () => {
    expect(apiSpec.paths["/live"].get).toBeDefined();
    expect(apiSpec.paths["/ready"].get).toBeDefined();
  });

  it("no sensitive schema fields are exposed in QueueEntry", () => {
    const queueEntryProps = apiSpec.components.schemas.QueueEntry.properties;
    expect(queueEntryProps).not.toHaveProperty("accessTokenHash");
    expect(queueEntryProps).not.toHaveProperty("sessionId");
    expect(queueEntryProps).not.toHaveProperty("passwordHash");
  });
  
  it("no sensitive schema fields are exposed in User", () => {
    const userProps = apiSpec.components.schemas.User.properties;
    expect(userProps).not.toHaveProperty("password");
    expect(userProps).not.toHaveProperty("passwordHash");
  });
});
