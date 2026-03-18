import { getErrorMessage } from "../utils/errors.js";
import { Router } from "express";
import { matchMaker } from "@colyseus/core";
import { authMiddleware } from "../middleware/auth.js";
import { RoomService, PermissionService } from "../services/index.js";

const router = Router();

// All room routes require authentication
router.use(authMiddleware);

/** Live player counts from Colyseus matchmaker. */
router.get("/live", async (_req, res) => {
  try {
    const colyseusRooms = await matchMaker.query({ name: "game_room" });
    const counts: Record<string, { clients: number; maxClients: number }> = {};
    for (const r of colyseusRooms) {
      const dbId = r.metadata?.roomId;
      if (dbId) {
        // Multiple Colyseus rooms can map to same roomId — sum clients
        if (counts[dbId]) {
          counts[dbId].clients += r.clients;
        } else {
          counts[dbId] = { clients: r.clients, maxClients: r.maxClients };
        }
      }
    }
    res.json(counts);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** List all rooms. */
router.get("/", async (_req, res) => {
  try {
    const rooms = await RoomService.listRooms();
    res.json(rooms);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** List rooms owned by the current user. */
router.get("/mine", async (req, res) => {
  try {
    const rooms = await RoomService.listUserRooms(req.userId!);
    res.json(rooms);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Get room detail (including rights). */
router.get("/:roomId", async (req, res) => {
  try {
    const room = await RoomService.getRoomDetail(req.params.roomId);
    res.json(room);
  } catch (err: unknown) {
    res.status(404).json({ error: getErrorMessage(err) });
  }
});

/** Create a new room. */
router.post("/", async (req, res) => {
  try {
    const { name, description, width, height, doorTileX, doorTileY, entranceTileX, entranceTileY, maxUsers, theme } = req.body;

    // Validate name
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Room name is required" });
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 4 || trimmedName.length > 20) {
      res.status(400).json({ error: "Room name must be between 4 and 20 characters" });
      return;
    }

    // Validate dimensions
    if (width !== undefined && (typeof width !== "number" || width < 2 || width > 50)) {
      res.status(400).json({ error: "Width must be between 2 and 50" });
      return;
    }
    if (height !== undefined && (typeof height !== "number" || height < 2 || height > 50)) {
      res.status(400).json({ error: "Height must be between 2 and 50" });
      return;
    }

    const room = await RoomService.createRoom({
      ownerId: req.userId!,
      name: trimmedName,
      description: typeof description === "string" ? description.slice(0, 200) : undefined,
      width,
      height,
      doorTileX,
      doorTileY,
      entranceTileX,
      entranceTileY,
      maxUsers: maxUsers !== undefined ? Math.min(Math.max(1, Number(maxUsers) || 25), 100) : undefined,
      theme,
    });
    res.status(201).json(room);
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err) });
  }
});

/** Update a room (owner only). */
router.patch("/:roomId", async (req, res) => {
  try {
    const room = await RoomService.updateRoom(req.params.roomId, req.userId!, req.body);
    res.json(room);
  } catch (err: unknown) {
    res.status(403).json({ error: getErrorMessage(err) });
  }
});

/** Delete a room (owner only). */
router.delete("/:roomId", async (req, res) => {
  try {
    await RoomService.deleteRoom(req.params.roomId, req.userId!);
    res.status(204).send();
  } catch (err: unknown) {
    res.status(403).json({ error: getErrorMessage(err) });
  }
});

/** Grant rights to a user. */
router.post("/:roomId/rights/:targetUserId", async (req, res) => {
  try {
    await PermissionService.grantRights(req.params.roomId, req.params.targetUserId, req.userId!);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(403).json({ error: getErrorMessage(err) });
  }
});

/** Revoke rights from a user (auto-removes their furniture). */
router.delete("/:roomId/rights/:targetUserId", async (req, res) => {
  try {
    const result = await PermissionService.revokeRights(req.params.roomId, req.params.targetUserId, req.userId!);
    res.json(result);
  } catch (err: unknown) {
    res.status(403).json({ error: getErrorMessage(err) });
  }
});

export default router;