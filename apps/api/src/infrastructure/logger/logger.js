import fs from "fs";
import pino from "pino";

import env from "../../config/env.js";
import { paths } from "../../config/paths.js";

fs.mkdirSync(paths.logs, { recursive: true });

const logger = pino(
  {
    level: env.logLevel,
    base: {
      service: env.appName,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.destination({
    dest: paths.logFile,
    sync: false,
  }),
);

export default logger;
