import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { PrivateChatService } from "../services/PrivateChatService.js";
import { getErrorMessage } from "../utils/errors.js";

const router = Router();

router.use(authMiddleware);

/** Get conversation with a specific user (optionally since a timestamp). */
router.get("/:userId", async (req, res) => {
  try {
    const since = typeof req.query.since === "string" ? req.query.since : undefined;
    const messages = await PrivateChatService.getConversation(
      req.userId!,
      req.params.userId,
      since,
    );
    res.json(messages);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Send a private message. */
router.post("/:userId", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "message è obbligatorio" });
      return;
    }
    if (message.length > 500) {
      res.status(400).json({ error: "Messaggio troppo lungo (max 500)" });
      return;
    }
    const msg = await PrivateChatService.sendMessage(
      req.userId!,
      req.params.userId,
      message.trim(),
    );
    res.json(msg);
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err) });
  }
});

export default router;
