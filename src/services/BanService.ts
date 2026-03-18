import prisma from "../config/prisma.js";
import { PermissionService } from "./PermissionService.js";

export interface BannedUser {
  userId: string;
  username: string;
}

export class BanService {
  /** Ban a player from a room. Only owner and rights holders can ban. */
  static async banPlayer(roomId: string, targetUserId: string, requesterId: string): Promise<void> {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });

    // Owner can NEVER be banned
    if (room.ownerId === targetUserId) {
      throw new Error("Non puoi bannare il proprietario della stanza");
    }

    const requesterRole = await PermissionService.getUserRoleInRoom(roomId, requesterId);
    const targetRole = await PermissionService.getUserRoleInRoom(roomId, targetUserId);

    // Only owner and rights holders can ban
    if (requesterRole !== "owner" && requesterRole !== "rights") {
      throw new Error("Non hai permessi per bannare utenti");
    }

    // Rights holders cannot ban the owner (already checked above) — extra safety
    // Rights holders CAN ban other rights holders and regular users
    if (requesterRole === "rights" && targetRole === "owner") {
      throw new Error("Non puoi bannare il proprietario della stanza");
    }

    await prisma.roomBan.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      update: {},
      create: { roomId, userId: targetUserId },
    });
  }

  /** Unban a player from a room. Only owner can unban. */
  static async unbanPlayer(roomId: string, targetUserId: string, requesterId: string): Promise<void> {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (room.ownerId !== requesterId) {
      throw new Error("Solo il proprietario della stanza può sbannare utenti");
    }

    await prisma.roomBan.deleteMany({
      where: { roomId, userId: targetUserId },
    });
  }

  /** Check if a user is banned from a room. */
  static async isBanned(roomId: string, userId: string): Promise<boolean> {
    const ban = await prisma.roomBan.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return ban !== null;
  }

  /** Get all banned users in a room (with usernames). */
  static async getRoomBannedUsers(roomId: string): Promise<BannedUser[]> {
    const bans = await prisma.roomBan.findMany({
      where: { roomId },
      include: { user: { select: { username: true } } },
    });
    return bans.map((b) => ({ userId: b.userId, username: b.user.username }));
  }
}
