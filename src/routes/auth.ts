import { getErrorMessage } from "../utils/errors.js";
import { Router } from "express";
import { AuthService } from "../services/index.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "username, email and password are required" });
      return;
    }

    const result = await AuthService.register(username, email, password);
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err.message ?? "Registration failed";
    const status = message.includes("Unique constraint") ? 409 : 500;
    res.status(status).json({ error: message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err: unknown) {
    res.status(401).json({ error: err.message ?? "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await AuthService.getProfile(req.userId!);
    res.json(user);
  } catch (err: unknown) {
    res.status(500).json({ error: err.message ?? "Failed to get profile" });
  }
});

export default router;