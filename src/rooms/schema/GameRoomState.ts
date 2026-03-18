import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id: string = "";
  @type("string") username: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") direction: number = 4; // DOWN
}

export class FurnitureState extends Schema {
  @type("string") id: string = "";
  @type("string") definitionId: string = "";
  @type("string") ownerId: string = "";
  @type("string") ownerUsername: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") rotation: string = "se";
  @type("string") currentState: string = "default";
}

export class GameRoomState extends Schema {
  @type("string") roomId: string = "";
  @type("string") roomName: string = "";
  @type("number") width: number = 6;
  @type("number") height: number = 6;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: FurnitureState }) furniture = new MapSchema<FurnitureState>();
}
