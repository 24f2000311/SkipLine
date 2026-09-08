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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
app.use(cors());
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
