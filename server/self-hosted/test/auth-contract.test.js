import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "src/routes/auth.js"), "utf8");

[
  "/register",
  "/login",
  "/logout",
  "/me",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/request-magic-link",
  "/consume-magic-link",
  "/mfa/enroll",
  "/mfa/verify",
  "/mfa/disable",
  "/passkey/register",
  "/passkey/login",
  "/refresh",
  "/revoke",
].forEach((routeName) => {
  test(`Route vorhanden: ${routeName}`, () => {
    assert.match(source, new RegExp(routeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});
