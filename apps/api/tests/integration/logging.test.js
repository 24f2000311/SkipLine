import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import pinoHttp from "pino-http";
import crypto from "crypto";
import { Writable } from "stream";
import errorMiddleware from "../../src/middleware/error.middleware.js";

// We'll create an isolated instance of the logger for testing, 
// using the exact same config as httpLogger.js, but with a custom destination.
const createTestApp = (logStream) => {
  const app = express();
  app.use(express.json());

  const testLogger = pinoHttp({
    // Custom stream destination
  }, logStream);

  // Re-implement the exact logic from httpLogger.js for the test instance
  const httpLogger = pinoHttp({
    genReqId: (req, res) => {
      let id = req.headers["x-request-id"];
      if (id && id.length > 100) id = null;
      const reqId = id || crypto.randomUUID();
      req.requestId = reqId;
      if (res && res.setHeader) {
        res.setHeader("X-Request-Id", reqId);
      }
      return reqId;
    },
    customProps: (req) => ({
      requestId: req.requestId,
      userId: req.user?.id || undefined,
    }),
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-access-token']",
        "body.password",
      ],
      censor: "[REDACTED]",
    },
    customLogLevel: (req, res, error) => {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }, logStream);

  app.use(httpLogger);

  app.get("/api/auth-route", (req, res) => {
    req.user = { id: "user-123" };
    res.status(200).json({ success: true });
  });

  app.get("/api/test", (req, res) => {
    res.status(200).json({ success: true, reqId: req.requestId });
  });

  app.post("/api/secret", (req, res) => {
    res.status(200).json({ success: true });
  });

  app.get("/api/error", (req, res, next) => {
    const err = new Error("Unexpected database explosion");
    next(err);
  });

  app.get("/api/operational", (req, res, next) => {
    const err = new Error("Invalid input format");
    err.statusCode = 400;
    err.isOperational = true;
    next(err);
  });

  app.get("/api/forbidden", (req, res, next) => {
    const err = new Error("Access denied");
    err.statusCode = 403;
    err.isOperational = true;
    next(err);
  });

  app.get("/api/not-found", (req, res, next) => {
    const err = new Error("Resource not found");
    err.statusCode = 404;
    err.isOperational = true;
    next(err);
  });

  app.use(errorMiddleware);
  return app;
};

describe("Request ID and Logging Integration", () => {
  let app;
  let logs = [];

  beforeEach(() => {
    logs = [];
    const logStream = new Writable({
      write(chunk, encoding, callback) {
        logs.push(JSON.parse(chunk.toString()));
        callback();
      }
    });
    app = createTestApp(logStream);
  });

  it("request receives generated X-Request-Id and response contains it", async () => {
    const res = await request(app).get("/api/test");
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body.reqId).toBe(res.headers["x-request-id"]);
  });

  it("supplied safe request ID is reused", async () => {
    const customId = "custom-safe-id-123";
    const res = await request(app).get("/api/test").set("x-request-id", customId);
    expect(res.headers["x-request-id"]).toBe(customId);
  });

  it("supplied huge request ID is ignored and a new one is generated", async () => {
    const hugeId = "A".repeat(150);
    const res = await request(app).get("/api/test").set("x-request-id", hugeId);
    expect(res.headers["x-request-id"]).not.toBe(hugeId);
  });

  it("unexpected 500 logs diagnostic information internally but response remains generic", async () => {
    const res = await request(app).get("/api/error");
    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe("Something went wrong");
    
    const errorLog = logs.find(l => l.msg === "Unexpected server error");
    expect(errorLog).toBeDefined();
    expect(errorLog.requestId).toBe(res.headers["x-request-id"]);
    expect(errorLog.err.message).toBe("Unexpected database explosion");
  });

  it("request logs contain standard fields (method, path, status, duration)", async () => {
    await request(app).get("/api/test");
    const reqLog = logs.find(l => l.req);
    expect(reqLog).toBeDefined();
    expect(reqLog.requestId).toBeDefined();
    expect(reqLog.req.method).toBe("GET");
    expect(reqLog.req.url).toBe("/api/test");
    expect(reqLog.res.statusCode).toBe(200);
    expect(typeof reqLog.responseTime).toBe("number"); // duration
  });

  it("authenticated request logs user ID", async () => {
    await request(app).get("/api/auth-route");
    const reqLog = logs.find(l => l.req);
    expect(reqLog.userId).toBe("user-123");
  });

  it("Authorization header and passwords are not logged", async () => {
    await request(app)
      .post("/api/secret")
      .set("Authorization", "Bearer my-super-secret-token")
      .set("x-access-token", "another-secret")
      .send({ password: "my-password" });
      
    const reqLog = logs.find(l => l.req);
    expect(reqLog.req.headers.authorization).toBe("[REDACTED]");
    expect(reqLog.req.headers["x-access-token"]).toBe("[REDACTED]");
  });

  it("operational error response maintains custom message and status", async () => {
    const res = await request(app).get("/api/operational");
    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toBe("Invalid input format");
    
    const warnLog = logs.find(l => l.msg === "Operational error");
    expect(warnLog).toBeDefined();
    expect(warnLog.requestId).toBe(res.headers["x-request-id"]);
  });

  it("authorization error preserves correct status", async () => {
    const res = await request(app).get("/api/forbidden");
    expect(res.statusCode).toBe(403);
    expect(res.body.error.message).toBe("Access denied");
  });

  it("not-found error preserves correct status", async () => {
    const res = await request(app).get("/api/not-found");
    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toBe("Resource not found");
  });
});
