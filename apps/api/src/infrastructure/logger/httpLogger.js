import pinoHttp from "pino-http";
import crypto from "crypto";
import logger from "./logger.js";

const httpLogger = pinoHttp({
  logger,

  genReqId: (req, res) => {
    let id = req.headers["x-request-id"];
    if (id && id.length > 100) {
      id = null; // Ignore malformed/huge IDs
    }
    const reqId = id || crypto.randomUUID();
    
    // Assign to req for availability later
    req.requestId = reqId;
    
    // Set response header
    if (res && res.setHeader) {
      res.setHeader("X-Request-Id", reqId);
    }
    
    return reqId;
  },

  customProps: (req) => {
    return {
      requestId: req.requestId,
      userId: req.user?.id || undefined,
    };
  },

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-access-token']", // if any
      "body.password",
    ],
    censor: "[REDACTED]",
  },

  customLogLevel: (req, res, error) => {
    if (error || res.statusCode >= 500) {
      return "error";
    }

    if (res.statusCode >= 400) {
      return "warn";
    }

    return "info";
  },
});

export default httpLogger;
