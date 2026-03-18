import { getErrorMessage } from "../utils/errors.js";
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getUserInventory,
  placeFurnitureRest,
  pickupFurnitureRest,
  moveFurnitureRest,
  getRoomFurniture,
} from "../actions/index.js";
import type { FurnitureRotation } from "../models/index.js";

const router = Router();

router.use(authMiddleware);

/** Get current user's inventory. */
router.get("/", async (req, res) => {
  try {
    const items = await getUserInventory(req.userId!);
    res.json(items);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Place a furniture item from inventory into a room. */
router.post("/place", async (req, res) => {
  try {
    const { furnitureItemId, roomId, positionX, positionY, rotation } = req.body;

    if (!furnitureItemId || !roomId || positionX === undefined || positionY === undefined) {
      res.status(400).json({ error: "furnitureItemId, roomId, positionX and positionY are required" });
      return;
    }

    const item = await placeFurnitureRest({
      furnitureItemId,
      roomId,
      userId: req.userId!,
      positionX,
      positionY,
      rotation,
    });
    res.json(item);
  } catch (err: unknown) {
    res.status(403).json({ error: getErrorMessage(err) });
  }
});

/** Pick up a furniture item from a room back to inventory. */
router.post("/pickup", async (req, res) => {
  try {
    const { furnitureItemId } = req.body;

    if (!furnitureItemId) {
      res.status(400).json({ error: "furnitureItemId is required" });
      return;
    }

    const item = await pickupFurnitureRest({ furnitureItemId, userId: req.userId! });
    res.json(item);
  } catch (err: unknown) {
    res.status(403).json({ error: getErrorMessage(err) });
  }
});

/** Move a placed furniture item within its room. */
router.post("/move", async (req, res) => {
  try {
    const { furnitureItemId, positionX, positionY, rotation } = req.body;

    if (!furnitureItemId || positionX === undefined || positionY === undefined) {
      res.status(400).json({ error: "furnitureItemId, positionX and positionY are required" });
      return;
    }

    const item = await moveFurnitureRest(
      furnitureItemId,
      req.userId!,
      positionX,
      positionY,
      rotation as FurnitureRotation | undefined,
    );
    res.json(item);
  } catch (err: unknown) {
    res.status(403).json({ error: getErrorMessage(err) });
  }
});

/** Get furniture placed in a specific room. */
router.get("/room/:roomId", async (req, res) => {
  try {
    const items = await getRoomFurniture(req.params.roomId);
    res.json(items);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

export default router;