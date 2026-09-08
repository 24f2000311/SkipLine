import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import prisma from "../../src/infrastructure/database/prisma.js";

// We need to test the /health routes with and without database connectivity
describe("Health Endpoints", () => {
  
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /health/live", () => {
    it("returns 200 and minimal body when process is alive", async () => {
      const res = await request(app).get("/health/live");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
      expect(res.headers["cache-control"]).toBe("no-store");
    });
    
    it("does not require authentication", async () => {
      const res = await request(app).get("/health/live");
      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).not.toBe(403);
    });
  });

  describe("GET /health/ready", () => {
    it("returns 200 when database is reachable", async () => {
      // Mock prisma.$queryRaw to simulate success without actually hitting DB
      // Or we can just let it hit the test DB, which should be reachable.
      const res = await request(app).get("/health/ready");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: "ready" });
      expect(res.headers["cache-control"]).toBe("no-store");
    });

    it("returns 503 when database connectivity fails", async () => {
      // Mock prisma to throw error
      vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("Connection refused"));
      
      const res = await request(app).get("/health/ready");
      expect(res.statusCode).toBe(503);
      expect(res.body).toEqual({ status: "not_ready" });
      expect(res.headers["cache-control"]).toBe("no-store");
      // ensure we didn't expose the error message
      expect(res.body.error).toBeUndefined();
    });
    
    it("readiness failure does not expose internal database errors", async () => {
      vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("Secret Prisma Credentials Failed"));
      
      const res = await request(app).get("/health/ready");
      expect(res.statusCode).toBe(503);
      expect(res.text).not.toContain("Secret Prisma Credentials Failed");
    });
    
    it("health endpoints do not require authentication", async () => {
      const res = await request(app).get("/health/ready");
      expect(res.statusCode).not.toBe(401);
      expect(res.statusCode).not.toBe(403);
    });
  });
});
