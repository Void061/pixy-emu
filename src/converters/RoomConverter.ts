import type { Room as PrismaRoom } from "../generated/prisma/client.js";
import { RoomModel, RoomDetailModel, type RoomTheme } from "../models/index.js";

interface PrismaRoomWithOwner extends PrismaRoom {
  owner?: { username: string };
}

interface PrismaRoomWithRights extends PrismaRoomWithOwner {
  rights: { userId: string }[];
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
      p.owner?.username ?? "",
    );
  }
}
