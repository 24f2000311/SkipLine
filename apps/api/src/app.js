import express from "express";
import cors from "cors";
import helmet from "helmet";

import apiRouter from "./routes/index.js";
import errorMiddleware from "./middleware/error.middleware.js";
import httpLogger from "./infrastructure/logger/httpLogger.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(httpLogger);

app.use("/api/v1", apiRouter);

app.use(errorMiddleware);
export default app;
