import type { Room as PrismaRoom } from "../generated/prisma/client.js";
import { RoomModel, RoomDetailModel, type RoomTheme, type RoomAccessMode } from "../models/index.js";

interface PrismaRoomWithOwner extends PrismaRoom {
  owner?: { username: string };
  _count?: { votes: number };
}

interface PrismaRoomWithRights extends PrismaRoomWithOwner {
  rights: { userId: string; user: { username: string } }[];
}

export class RoomConverter {
  static toModel(p: PrismaRoomWithOwner): RoomModel {
    return new RoomModel(
      p.id,
      p.ownerId,
      p.name,
      p.description,
      p.maxUsers,
      p.width,
      p.height,
      p.doorTileX,
      p.doorTileY,
      p.entranceTileX,
      p.entranceTileY,
      p.theme as unknown as RoomTheme,
      p.createdAt,
      p.updatedAt,
      p.owner?.username ?? "",
      p.accessMode as RoomAccessMode,
      p._count?.votes ?? 0,
    );
  }

  static toDetailModel(p: PrismaRoomWithRights): RoomDetailModel {
    return new RoomDetailModel(
      p.id,
      p.ownerId,
      p.name,
      p.description,
      p.maxUsers,
      p.width,
      p.height,
      p.doorTileX,
      p.doorTileY,
      p.entranceTileX,
      p.entranceTileY,
      p.theme as unknown as RoomTheme,
      p.createdAt,
      p.updatedAt,
      p.rights.map((r) => r.userId),
      p.rights.map((r) => ({ userId: r.userId, username: r.user.username })),
      p.owner?.username ?? "",
      p.accessMode as RoomAccessMode,
      p._count?.votes ?? 0,
    );
  }
}
