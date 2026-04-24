import express from "express";
import { query } from "../db.js";

const router = express.Router();

router.get("/health", async (_req, res, next) => {
  try {
    await query("select 1");
    res.json({ ok: true, status: "healthy" });
  } catch (error) {
    next(error);
  }
});

export { router as healthRouter };
