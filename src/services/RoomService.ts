import prisma from "../config/prisma.js";
import { RoomConverter } from "../converters/index.js";
import type { RoomModel, RoomDetailModel, RoomTheme } from "../models/index.js";

export interface CreateRoomInput {
  ownerId: string;
  name: string;
  description?: string;
  maxUsers?: number;
  width?: number;
  height?: number;
  doorTileX?: number;
  doorTileY?: number;
  entranceTileX?: number;
  entranceTileY?: number;
  theme?: RoomTheme;
}

export interface UpdateRoomInput {
  name?: string;
  description?: string;
  maxUsers?: number;
  theme?: RoomTheme;
}

export class RoomService {
  /** List all public rooms (summary). */
  static async listRooms(): Promise<RoomModel[]> {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { username: true } } },
    });
    return rooms.map(RoomConverter.toModel);
  }

  /** List rooms owned by a specific user. */
  static async listUserRooms(userId: string): Promise<RoomModel[]> {
    const rooms = await prisma.room.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { username: true } } },
    });
    return rooms.map(RoomConverter.toModel);
  }

  /** Get full room detail including rights. */
  static async getRoomDetail(roomId: string): Promise<RoomDetailModel> {
    const room = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        rights: { select: { userId: true } },
        owner: { select: { username: true } },
      },
    });
    return RoomConverter.toDetailModel(room);
  }

  static async createRoom(input: CreateRoomInput): Promise<RoomModel> {
    const room = await prisma.room.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        description: input.description ?? "",
        maxUsers: input.maxUsers ?? 25,
        width: input.width ?? 6,
        height: input.height ?? 6,
        doorTileX: input.doorTileX ?? 0,
        doorTileY: input.doorTileY ?? 0,
        entranceTileX: input.entranceTileX ?? 0,
        entranceTileY: input.entranceTileY ?? 0,
        theme: (input.theme as object) ?? {},
      },
    });
    return RoomConverter.toModel(room);
  }

  /** Only the owner can update their room. */
  static async updateRoom(
    roomId: string,
    ownerId: string,
    input: UpdateRoomInput,
  ): Promise<RoomModel> {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (room.ownerId !== ownerId) {
      throw new Error("Only the room owner can update the room");
    }

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.maxUsers !== undefined && { maxUsers: input.maxUsers }),
        ...(input.theme !== undefined && { theme: input.theme as object }),
      },
    });
    return RoomConverter.toModel(updated);
  }

  static async deleteRoom(roomId: string, ownerId: string): Promise<void> {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (room.ownerId !== ownerId) {
      throw new Error("Only the room owner can delete the room");
    }
    await prisma.room.delete({ where: { id: roomId } });
  }
}
