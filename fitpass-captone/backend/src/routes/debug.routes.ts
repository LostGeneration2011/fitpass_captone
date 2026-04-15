import { Router } from "express";
import { prisma } from "../config/prisma";
import { adminOnly } from "../middlewares/rbac";

const router = Router();

// DEBUG endpoint - ADMIN only
router.get("/users", adminOnly(), async (_req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "DB error", error });
  }
});

export default router;