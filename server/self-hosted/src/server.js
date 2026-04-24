import "dotenv/config";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, baseUrl: config.APP_BASE_URL }, "Self-hosted Auth-Service gestartet");
});
