import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiRoot = path.resolve(__dirname, "..", "..");

export const paths = {
  root: apiRoot,
  logs: path.join(apiRoot, "logs"),
  logFile: path.join(apiRoot, "logs", "app.log"),
};
