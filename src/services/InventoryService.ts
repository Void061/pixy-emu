import prisma from "../config/prisma.js";
import { FurnitureConverter } from "../converters/index.js";
import type { FurnitureItemModel, FurnitureRotation } from "../models/index.js";
import { validateMultiTilePosition, getOccupiedTilesServer } from "../utils/validation.js";

export interface PlaceFurnitureInput {
  furnitureItemId: string;
  roomId: string;
  userId: string;
  positionX: number;
  positionY: number;
  rotation?: FurnitureRotation;
}

export interface PickupFurnitureInput {
  furnitureItemId: string;
  userId: string;
}

export class InventoryService {
  /**
   * Calculate the positionZ for furniture placed at a given tile.
   * If there's stackable furniture beneath, stack on top; otherwise ground level.
   */
  private static async calculateStackZ(
    roomId: string,
    positionX: number,
    positionY: number,
    excludeItemId?: string,
  ): Promise<number> {
    const existing = await prisma.furnitureItem.findMany({
      where: {
        roomId,
        positionX,
        positionY,
        ...(excludeItemId && { id: { not: excludeItemId } }),
      },
      include: { definition: true },
      orderBy: { positionZ: "desc" },
    });

    if (existing.length === 0) return 0;

    const topItem = existing[0];
    if (!topItem.definition.isStackable) {
      throw new Error("Cannot stack on non-stackable furniture");
    }

    return topItem.positionZ + topItem.definition.stackHeight;
  }

  /**
   * Check that a furniture piece does not overlap with existing non-walkable furniture.
   * Throws if any occupied tile conflicts.
   */
  private static async checkOverlap(
    roomId: string,
    positionX: number,
    positionY: number,
    sizeW: number,
    sizeH: number,
    rotation: FurnitureRotation,
    excludeItemId?: string,
  ): Promise<void> {
    const newTiles = getOccupiedTilesServer(positionX, positionY, sizeW, sizeH, rotation);

    // Get all placed furniture in the room (with definitions for size info)
    const roomItems = await prisma.furnitureItem.findMany({
      where: {
        roomId,
        positionX: { not: null },
        positionY: { not: null },
        ...(excludeItemId && { id: { not: excludeItemId } }),
      },
      include: { definition: true },
    });

    for (const existing of roomItems) {
      if (existing.definition.isWalkable) continue;
      const existingTiles = getOccupiedTilesServer(
        existing.positionX!,
        existing.positionY!,
        existing.definition.sizeW,
        existing.definition.sizeH,
        existing.rotation as FurnitureRotation,
      );
      for (const et of existingTiles) {
        if (newTiles.some(nt => nt.x === et.x && nt.y === et.y)) {
          throw new Error("Cannot place furniture: tile is occupied by another furniture");
        }
      }
    }
  }

  /** Get all items in a user's inventory (not placed in any room). */
  static async getUserInventory(userId: string): Promise<FurnitureItemModel[]> {
    const items = await prisma.furnitureItem.findMany({
      where: { ownerId: userId, roomId: null },
      orderBy: { createdAt: "desc" },
    });
    return items.map(FurnitureConverter.itemToModel);
  }

  /**
   * Place a furniture item from inventory into a room.
   * Rules:
   * - The item must be in the user's inventory (owner + roomId null).
   * - The user must be owner or have rights in the target room.
   */
  static async placeFurniture(input: PlaceFurnitureInput): Promise<FurnitureItemModel> {
    const item = await prisma.furnitureItem.findUniqueOrThrow({
      where: { id: input.furnitureItemId },
      include: { definition: true },
    });

    if (item.ownerId !== input.userId) {
      throw new Error("You can only place your own furniture");
    }
    if (item.roomId !== null) {
      throw new Error("This item is already placed in a room");
    }

    // Check room permissions
    const room = await prisma.room.findUniqueOrThrow({
      where: { id: input.roomId },
      include: { rights: { select: { userId: true } } },
    });

    const isOwner = room.ownerId === input.userId;
    const hasRights = room.rights.some((r) => r.userId === input.userId);

    if (!isOwner && !hasRights) {
      throw new Error("You don't have permission to place furniture in this room");
    }

    const rotation = input.rotation ?? "se";
    const { sizeW, sizeH } = item.definition;

    // Validate ALL occupied tiles are within room bounds
    validateMultiTilePosition(input.positionX, input.positionY, sizeW, sizeH, rotation, room.width, room.height);

    // Check overlap with existing furniture (non-walkable)
    await InventoryService.checkOverlap(
      input.roomId, input.positionX, input.positionY, sizeW, sizeH, rotation,
    );

    const positionZ = await InventoryService.calculateStackZ(
      input.roomId,
      input.positionX,
      input.positionY,
    );

    const updated = await prisma.furnitureItem.update({
      where: { id: input.furnitureItemId },
      data: {
        roomId: input.roomId,
        placedByUserId: input.userId,
        positionX: input.positionX,
        positionY: input.positionY,
        positionZ,
        rotation,
        placedAt: new Date(),
      },
    });

    return FurnitureConverter.itemToModel(updated);
  }

  /**
   * Pick up a furniture item from a room back to inventory.
   * Rules:
   * - Room owner can pick up ANY furniture in their room.
   * - Rights holder can only pick up their own furniture.
   */
  static async pickupFurniture(input: PickupFurnitureInput): Promise<FurnitureItemModel> {
    const item = await prisma.furnitureItem.findUniqueOrThrow({
      where: { id: input.furnitureItemId },
    });

    if (item.roomId === null) {
      throw new Error("This item is already in inventory");
    }

    // Check room permissions
    const room = await prisma.room.findUniqueOrThrow({
      where: { id: item.roomId },
      include: { rights: { select: { userId: true } } },
    });

    const isRoomOwner = room.ownerId === input.userId;
    const hasRights = room.rights.some((r) => r.userId === input.userId);
    const isFurniOwner = item.ownerId === input.userId;

    // Room owner can pick up any furniture; rights holder only their own
    if (!isRoomOwner && !isFurniOwner) {
      throw new Error("You can only pick up your own furniture");
    }

    // Must have access to the room
    if (!isRoomOwner && !hasRights) {
      throw new Error("You don't have permission to modify furniture in this room");
    }

    const updated = await prisma.furnitureItem.update({
      where: { id: input.furnitureItemId },
      data: {
        roomId: null,
        placedByUserId: null,
        positionX: null,
        positionY: null,
        placedAt: null,
      },
    });

    return FurnitureConverter.itemToModel(updated);
  }

  /** Get all furniture items placed in a specific room. */
  static async getRoomFurniture(roomId: string): Promise<(FurnitureItemModel & { ownerUsername: string })[]> {
    const items = await prisma.furnitureItem.findMany({
      where: { roomId },
      orderBy: { placedAt: "asc" },
      include: { owner: { select: { username: true } } },
    });
    return items.map(item => Object.assign(FurnitureConverter.itemToModel(item), { ownerUsername: item.owner.username }));
  }

  /**
   * Get user inventory grouped by definitionId with quantity.
   */
  static async getGroupedInventory(
    userId: string,
  ): Promise<{ definitionId: string; quantity: number }[]> {
    const groups = await prisma.furnitureItem.groupBy({
      by: ["definitionId"],
      where: { ownerId: userId, roomId: null },
      _count: { id: true },
    });
    return groups.map((g) => ({
      definitionId: g.definitionId,
      quantity: g._count.id,
    }));
  }

  /**
   * Place a furniture item by definitionId.
   * Picks the first available inventory item of that type.
   */
  static async placeByDefinition(input: {
    userId: string;
    definitionId: string;
    roomId: string;
    positionX: number;
    positionY: number;
    rotation?: FurnitureRotation;
  }): Promise<FurnitureItemModel> {
    // Find an unplaced item of this type owned by the user
    const item = await prisma.furnitureItem.findFirst({
      where: {
        ownerId: input.userId,
        definitionId: input.definitionId,
        roomId: null,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!item) {
      throw new Error("You don't have this furniture in your inventory");
    }

    // Delegate to placeFurniture which handles permission checks
    return InventoryService.placeFurniture({
      furnitureItemId: item.id,
      roomId: input.roomId,
      userId: input.userId,
      positionX: input.positionX,
      positionY: input.positionY,
      rotation: input.rotation,
    });
  }

  /**
   * Move a placed furniture item within the same room.
   * Rules:
    * - Room owner can move ANY furniture in their room.
    * - Rights holder can move furniture in that room.
   */
  static async moveFurniture(
    furnitureItemId: string,
    userId: string,
    positionX: number,
    positionY: number,
    rotation?: FurnitureRotation,
  ): Promise<FurnitureItemModel> {
    const item = await prisma.furnitureItem.findUniqueOrThrow({
      where: { id: furnitureItemId },
      include: { definition: true },
    });

    if (item.roomId === null) {
      throw new Error("Item is not placed in any room");
    }

    // Check room permissions
    const room = await prisma.room.findUniqueOrThrow({
      where: { id: item.roomId },
      include: { rights: { select: { userId: true } } },
    });

    const isRoomOwner = room.ownerId === userId;
    const hasRights = room.rights.some((r) => r.userId === userId);
    // Room owner and rights-holder can move furniture in the room.
    if (!isRoomOwner && !hasRights) {
      throw new Error("You don't have permission to modify furniture in this room");
    }

    const finalRotation = rotation ?? (item.rotation as FurnitureRotation);
    const { sizeW, sizeH } = item.definition;

    // Validate ALL occupied tiles are within room bounds
    validateMultiTilePosition(positionX, positionY, sizeW, sizeH, finalRotation, room.width, room.height);

    // Check overlap with existing furniture (exclude self)
    await InventoryService.checkOverlap(
      item.roomId, positionX, positionY, sizeW, sizeH, finalRotation, furnitureItemId,
    );

    const positionZ = await InventoryService.calculateStackZ(
      item.roomId,
      positionX,
      positionY,
      furnitureItemId,
    );

    const updated = await prisma.furnitureItem.update({
      where: { id: furnitureItemId },
      data: {
        positionX,
        positionY,
        positionZ,
        ...(rotation !== undefined && { rotation }),
      },
    });

    return FurnitureConverter.itemToModel(updated);
  }
}
