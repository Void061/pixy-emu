import { getErrorMessage } from "../utils/errors.js";
import { Router } from "express";
import { registerUser, loginUser, getUserProfile } from "../actions/index.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "username, email and password are required" });
      return;
    }

    const result = await registerUser(username, email, password);
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = getErrorMessage(err);
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

    const result = await loginUser(email, password);
    res.json(result);
  } catch (err: unknown) {
    res.status(401).json({ error: getErrorMessage(err) });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await getUserProfile(req.userId!);
    res.json(user);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;