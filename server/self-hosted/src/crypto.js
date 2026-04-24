import crypto from "node:crypto";
import argon2 from "argon2";
import { config } from "./config.js";

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
};

export function withPepper(value) {
  return `${value}${config.PASSWORD_PEPPER ?? ""}`;
}

export async function hashPassword(password) {
  return argon2.hash(withPepper(password), ARGON_OPTIONS);
}

export async function verifyPassword(hash, password) {
  return argon2.verify(hash, withPepper(password), ARGON_OPTIONS);
}

export async function hashOpaqueToken(token) {
  return argon2.hash(token, { ...ARGON_OPTIONS, memoryCost: 4 * 1024, timeCost: 1 });
}

export async function verifyOpaqueToken(hash, token) {
  return argon2.verify(hash, token, { ...ARGON_OPTIONS, memoryCost: 4 * 1024, timeCost: 1 });
}

export function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function createBackupCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", config.encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptSecret(encoded) {
  const input = Buffer.from(encoded, "base64");
  const iv = input.subarray(0, 12);
  const tag = input.subarray(12, 28);
  const ciphertext = input.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", config.encryptionKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
