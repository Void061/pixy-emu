import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { RoomConverter } from "../converters/index.js";
import type { RoomModel, RoomDetailModel, RoomTheme, RoomAccessMode } from "../models/index.js";

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
  accessMode?: RoomAccessMode;
  password?: string; // plain-text, will be hashed
  disableTileBlocking?: boolean;
}

const ROOM_INCLUDE = {
  owner: { select: { username: true } },
  _count: { select: { votes: true } },
} as const;

const ROOM_DETAIL_INCLUDE = {
  ...ROOM_INCLUDE,
  rights: { select: { userId: true, user: { select: { username: true } } } },
} as const;

export class RoomService {
  /** List all public rooms (summary). */
  static async listRooms(): Promise<RoomModel[]> {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: "desc" },
      include: ROOM_INCLUDE,
    });
    return rooms.map(RoomConverter.toModel);
  }

  /** List rooms owned by a specific user. */
  static async listUserRooms(userId: string): Promise<RoomModel[]> {
    const rooms = await prisma.room.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      include: ROOM_INCLUDE,
    });
    return rooms.map(RoomConverter.toModel);
  }

  /** Get full room detail including rights. */
  static async getRoomDetail(roomId: string): Promise<RoomDetailModel> {
    const room = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: ROOM_DETAIL_INCLUDE,
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
      include: ROOM_INCLUDE,
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

    // Build the update data
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.maxUsers !== undefined) data.maxUsers = input.maxUsers;
    if (input.theme !== undefined) data.theme = input.theme as object;
    if (input.disableTileBlocking !== undefined) data.disableTileBlocking = input.disableTileBlocking;

    if (input.accessMode !== undefined) {
      data.accessMode = input.accessMode;
      // Clear password when switching away from password mode
      if (input.accessMode !== "password") {
        data.password = null;
      }
    }

    if (input.password !== undefined && (input.accessMode === "password" || room.accessMode === "password")) {
      data.password = await bcrypt.hash(input.password, 12);
    }

    const updated = await prisma.room.update({
      where: { id: roomId },
      data,
      include: ROOM_INCLUDE,
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

  /** Verify a room's password. Returns true if the password matches. */
  static async verifyRoomPassword(roomId: string, plainPassword: string): Promise<boolean> {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (!room.password) return false;
    return bcrypt.compare(plainPassword, room.password);
  }

  /** Vote for a room. One vote per user, owner cannot vote own room. */
  static async voteRoom(roomId: string, userId: string): Promise<{ score: number }> {
    const room = await prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (room.ownerId === userId) {
      throw new Error("Non puoi votare la tua stanza");
    }

    // Upsert — if already voted, this is a no-op
    await prisma.roomVote.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: {},
      create: { roomId, userId },
    });

    const score = await prisma.roomVote.count({ where: { roomId } });
    return { score };
  }

  /** Check if a user has already voted for a room. */
  static async hasVoted(roomId: string, userId: string): Promise<boolean> {
    const vote = await prisma.roomVote.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return vote !== null;
  }

  /** Get vote score for a room. */
  static async getScore(roomId: string): Promise<number> {
    return prisma.roomVote.count({ where: { roomId } });
  }
}
