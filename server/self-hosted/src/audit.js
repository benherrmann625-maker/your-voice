import { query } from "./db.js";
import { logger } from "./logger.js";

function extractIp(req) {
  return req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || null;
}

export async function audit(req, { userId = null, eventType, status, metadata = {} }) {
  const safeMetadata = JSON.parse(JSON.stringify(metadata, (_, value) => {
    if (typeof value === "string" && value.length > 256) return `${value.slice(0, 253)}...`;
    return value;
  }));

  logger.info({ eventType, status, userId, metadata: safeMetadata }, "Audit-Event");

  await query(
    `insert into audit_logs (user_id, event_type, ip, user_agent, status, metadata)
     values ($1, $2, $3, $4, $5, $6)`,
    [userId, eventType, extractIp(req), req.get("user-agent") ?? null, status, safeMetadata],
  );
}
