import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";
import swaggerUi from "swagger-ui-express";

import apiRouter from "./routes/index.js";
import healthRouter from "./routes/health.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import httpLogger from "./infrastructure/logger/httpLogger.js";

import env from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());

const allowedOrigins = env.corsOrigin
  ? env.corsOrigin.split(",").map((o) => o.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (server-to-server, curl, health checks)
    if (!origin) return callback(null, true);

    // If wildcard or no specific origin configured, allow all
    if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // Always allow localhost in development
    if (env.nodeEnv === "development" && (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin))) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(httpLogger);

// Setup Swagger UI
const openApiPath = path.resolve(__dirname, "../openapi/openapi.yaml");
if (fs.existsSync(openApiPath)) {
  const fileContent = fs.readFileSync(openApiPath, "utf8");
  const swaggerDocument = yaml.parse(fileContent);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "SkipLine API Documentation"
  }));
}

app.use("/health", healthRouter);
app.use("/api/v1", apiRouter);

import AppError from "./shared/errors/AppError.js";

app.use((req, res, next) => {
  next(new AppError("Route not found", 404, "NOT_FOUND"));
});

app.use(errorMiddleware);
export default app;
