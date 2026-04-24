import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { query } from "./db.js";
import { logger } from "./logger.js";

const sql = fs.readFileSync(path.join(process.cwd(), "sql/001_auth_schema.sql"), "utf8");

await query(sql);
logger.info("Self-hosted Auth-Schema angewendet.");
