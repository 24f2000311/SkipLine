import pinoHttp from "pino-http";
import crypto from "crypto";
import logger from "./logger.js";

const httpLogger = pinoHttp({
  logger,

  genReqId: (req) => {
    return req.headers["x-request-id"] || crypto.randomUUID();
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
