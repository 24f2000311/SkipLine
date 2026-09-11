import dotenv from "dotenv";

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 8000,
  appName: process.env.APP_NAME || "Skipline",
  appVersion: process.env.APP_VERSION || "1.0.0",
  logLevel: process.env.LOG_LEVEL || "info",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "skipline_dev_jwt_secret_key_change_in_prod",
  corsOrigin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "",
};

export default env;
