import prisma from "../config/prisma.js";
import { FurnitureConverter } from "../converters/index.js";
import type { FurnitureItemModel } from "../models/index.js";

export type RoomRole = "owner" | "rights" | "none";

export class PermissionService {
  /** Determine the user's role in a room. */
  static async getUserRoleInRoom(roomId: string, userId: string): Promise<RoomRole> {
    const room = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: { rights: { select: { userId: true } } },
    });

    if (room.ownerId === userId) return "owner";
    if (room.rights.some((r) => r.userId === userId)) return "rights";
    return "none";
  }

  /** Grant rights to a user in a room (only room owner can do this). */
  static async grantRights(roomId: string, targetUserId: string, requesterId: string): Promise<void> {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (room.ownerId !== requesterId) {
      throw new Error("Only the room owner can grant rights");
    }

    await prisma.roomRights.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      update: {},
      create: { roomId, userId: targetUserId },
    });
  }

  /**
   * Revoke rights from a user in a room.
   * Automatically removes all furniture placed by that user in the room
   * (returns them to the owner's inventory).
   */
  static async revokeRights(
    roomId: string,
    targetUserId: string,
    requesterId: string,
  ): Promise<{ removedItems: FurnitureItemModel[] }> {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (room.ownerId !== requesterId) {
      throw new Error("Only the room owner can revoke rights");
    }

    // Find all furniture placed by target user in this room
    const placedItems = await prisma.furnitureItem.findMany({
      where: { roomId, placedByUserId: targetUserId },
    });

    // Transaction: revoke rights + return furniture to inventory
    await prisma.$transaction(async (tx) => {
      // Remove rights
      await tx.roomRights.deleteMany({
        where: { roomId, userId: targetUserId },
      });

      // Return all placed furniture by this user to their inventory
      if (placedItems.length > 0) {
        await tx.furnitureItem.updateMany({
          where: { roomId, placedByUserId: targetUserId },
          data: {
            roomId: null,
            placedByUserId: null,
            positionX: null,
            positionY: null,
            placedAt: null,
          },
        });
      }
    });

    return {
      removedItems: placedItems.map(FurnitureConverter.itemToModel),
    };
  }

  /** Get all user IDs that have rights in a room. */
  static async getRoomRightsUserIds(roomId: string): Promise<string[]> {
    const rights = await prisma.roomRights.findMany({
      where: { roomId },
      select: { userId: true },
    });
    return rights.map((r) => r.userId);
  }
}
