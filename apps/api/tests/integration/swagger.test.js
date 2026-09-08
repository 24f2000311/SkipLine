import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("Swagger UI Integration", () => {
  it("GET /api-docs is reachable and responds successfully with HTML", async () => {
    const res = await request(app).get("/api-docs/");
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("swagger-ui");
  });

  it("Swagger UI references the intended OpenAPI title", async () => {
    const res = await request(app).get("/api-docs/");
    // Swagger UI initializes with our custom title or default swagger configuration
    expect(res.text).toContain("SkipLine API");
  });

  it("existing API routes remain unaffected", async () => {
    // Health checks should still work
    const healthRes = await request(app).get("/health/live");
    expect(healthRes.statusCode).toBe(200);

    // Missing v1 route should 404 cleanly via error middleware, not HTML
    const apiRes = await request(app).get("/api/v1/unknown-route-that-doesnt-exist");
    expect(apiRes.statusCode).toBe(404);
    expect(apiRes.body.error).toBeDefined();
  });

  it("no secrets appear in documentation responses", async () => {
    const res = await request(app).get("/api-docs/");
    const content = res.text.toLowerCase();
    
    // Assert no raw credential strings
    expect(content).not.toContain("root123");
    expect(content).not.toContain("postgresql://");
    expect(content).not.toContain("accesstokenhash");
    expect(content).not.toContain("passwordhash");
    expect(content).not.toContain("sessionid");
  });
});
