import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { FriendService } from "../services/FriendService.js";
import { getErrorMessage } from "../utils/errors.js";

const router = Router();

router.use(authMiddleware);

/** List accepted friends with online status. */
router.get("/", async (req, res) => {
  try {
    const friends = await FriendService.getFriends(req.userId!);
    res.json(friends);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** List pending incoming friend requests. */
router.get("/requests", async (req, res) => {
  try {
    const requests = await FriendService.getPendingRequests(req.userId!);
    res.json(requests);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Get friendship status with a specific user. */
router.get("/status/:userId", async (req, res) => {
  try {
    const status = await FriendService.getStatus(req.userId!, req.params.userId);
    res.json({ status });
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Send a friend request. */
router.post("/request", async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      res.status(400).json({ error: "targetUserId è obbligatorio" });
      return;
    }
    await FriendService.sendRequest(req.userId!, targetUserId);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err) });
  }
});

/** Accept a friend request. */
router.post("/:id/accept", async (req, res) => {
  try {
    await FriendService.acceptRequest(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err) });
  }
});

/** Decline a friend request. */
router.post("/:id/decline", async (req, res) => {
  try {
    await FriendService.declineRequest(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err) });
  }
});

/** Remove a friend. */
router.delete("/:id", async (req, res) => {
  try {
    await FriendService.removeFriend(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(400).json({ error: getErrorMessage(err) });
  }
});

export default router;
