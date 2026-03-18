export interface RoomTheme {
  tileFill: string;
  tileBorder: string;
  wallLight: string;
  wallDark: string;
}

export type RoomAccessMode = 'open' | 'doorbell' | 'password';

export class RoomModel {
  constructor(
    public readonly id: string,
    public readonly ownerId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly maxUsers: number,
    public readonly width: number,
    public readonly height: number,
    public readonly doorTileX: number,
    public readonly doorTileY: number,
    public readonly entranceTileX: number,
    public readonly entranceTileY: number,
    public readonly theme: RoomTheme,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly ownerUsername: string = "",
    public readonly accessMode: RoomAccessMode = "open",
    public readonly score: number = 0,
  ) {}
}

export interface RightsUser {
  userId: string;
  username: string;
}

/** Room enriched with rights user IDs — used for full room loads. */
export class RoomDetailModel extends RoomModel {
  constructor(
    id: string,
    ownerId: string,
    name: string,
    description: string,
    maxUsers: number,
    width: number,
    height: number,
    doorTileX: number,
    doorTileY: number,
    entranceTileX: number,
    entranceTileY: number,
    theme: RoomTheme,
    createdAt: Date,
    updatedAt: Date,
    public readonly rightsUserIds: string[],
    public readonly rightsUsers: RightsUser[],
    ownerUsername: string = "",
    accessMode: RoomAccessMode = "open",
    score: number = 0,
  ) {
    super(
      id, ownerId, name, description, maxUsers,
      width, height, doorTileX, doorTileY,
      entranceTileX, entranceTileY, theme, createdAt, updatedAt, ownerUsername,
      accessMode, score,
    );
  }
}
