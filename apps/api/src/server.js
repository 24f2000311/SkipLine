import app from "./app.js";
import env from "./config/env.js";
import logger from "./infrastructure/logger/logger.js";
import connectDatabase from "./infrastructure/database/database.js";
import { initWebSocketServer } from "./infrastructure/websocket/websocket.server.js";

const startServer = async () => {
  try {
    await connectDatabase();

    const host = "0.0.0.0";
    const server = app.listen(env.port, host, () => {
      logger.info({
        event: "server.started",
        port: env.port,
        host,
      });
    });

    initWebSocketServer(server);
  } catch (error) {
    logger.fatal({
      event: "server.startup_failed",
      error: error.message,
    });

    process.exit(1);
  }
};

startServer();

// Trigger nodemon restart
