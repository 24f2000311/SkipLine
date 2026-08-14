import prisma from "./prisma.js";
import logger from "../logger/logger.js";

const connectDatabase = async () => {
  try {
    await prisma.$connect();

    logger.info({
      event: "database.connected",
    });
  } catch (error) {
    logger.error({
      event: "database.connection_failed",
      error: error.message,
    });

    throw error;
  }
};

export default connectDatabase;
