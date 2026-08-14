import app from "./app.js";
import env from "./config/env.js";
import logger from "./infrastructure/logger/logger.js";
import connectDatabase from "./infrastructure/database/database.js";

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      logger.info({
        event: "server.started",
        port: env.port,
      });
    });
  } catch (error) {
    logger.fatal({
      event: "server.startup_failed",
      error: error.message,
    });

    process.exit(1);
  }
};

startServer();
