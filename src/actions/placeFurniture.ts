import type { Client } from "colyseus";
import { FurnitureState, type GameRoomState } from "../rooms/schema/GameRoomState.js";
import { InventoryService } from "../services/InventoryService.js";
import { getErrorMessage } from "../utils/errors.js";
import type { PlaceFurnitureMessage, AuthData } from "../types/index.js";

export async function placeFurniture(
  state: GameRoomState,
  client: Client,
  auth: AuthData,
  message: PlaceFurnitureMessage,
): Promise<void> {
  try {
    const item = await InventoryService.placeByDefinition({
      userId: auth.userId,
      definitionId: message.definitionId,
      roomId: auth.dbRoomId,
      positionX: message.positionX,
      positionY: message.positionY,
      rotation: message.rotation,
    });

    const furniState = new FurnitureState();
    furniState.id = item.id;
    furniState.definitionId = item.definitionId;
    furniState.ownerId = item.ownerId;
    furniState.ownerUsername = auth.username;
    furniState.x = item.positionX!;
    furniState.y = item.positionY!;
    furniState.z = item.positionZ;
    furniState.rotation = item.rotation;
    furniState.currentState = item.currentState;

    state.furniture.set(item.id, furniState);

    const inv = await InventoryService.getGroupedInventory(auth.userId);
    client.send("inventory", inv);
    client.send("place_furniture_ok", { itemId: item.id });
  } catch (err: unknown) {
    client.send("error", { action: "place_furniture", message: getErrorMessage(err) });
  }
}
