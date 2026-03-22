import type { Client } from "colyseus";
import type { GameRoomState } from "../rooms/schema/GameRoomState.js";
import { InventoryService } from "../services/InventoryService.js";
import { getErrorMessage } from "../utils/errors.js";
import type { MoveFurnitureMessage, AuthData } from "../types/index.js";

export async function moveFurniture(
  state: GameRoomState,
  client: Client,
  auth: AuthData,
  message: MoveFurnitureMessage,
  broadcast: (type: string, data: unknown) => void,
): Promise<void> {
  try {
    // Get previous rotation to detect rotation changes
    const furniState = state.furniture.get(message.furnitureItemId);
    const oldRotation = furniState?.rotation;

    const item = await InventoryService.moveFurniture(
      message.furnitureItemId,
      auth.userId,
      message.positionX,
      message.positionY,
      message.rotation,
    );

    if (furniState) {
      furniState.x = item.positionX!;
      furniState.y = item.positionY!;
      furniState.z = item.positionZ;
      furniState.rotation = item.rotation;
    }

    // If rotation changed, broadcast for animation
    if (message.rotation && oldRotation !== message.rotation) {
      broadcast("furniture_rotated", {
        furnitureItemId: message.furnitureItemId,
      });
    }
  } catch (err: unknown) {
    client.send("error", { action: "move_furniture", message: getErrorMessage(err) });
  }
}
