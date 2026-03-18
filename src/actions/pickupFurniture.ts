import type { Client } from "colyseus";
import type { GameRoomState } from "../rooms/schema/GameRoomState.js";
import { InventoryService } from "../services/InventoryService.js";
import { getErrorMessage } from "../utils/errors.js";
import type { PickupFurnitureMessage, AuthData } from "../types/index.js";

/**
 * Find the connected client for a given userId.
 */
function findClientByUserId(
  clients: Iterable<Client>,
  clientUsers: Map<string, AuthData>,
  userId: string,
): Client | undefined {
  for (const [sessionId, auth] of clientUsers.entries()) {
    if (auth.userId === userId) {
      for (const c of clients) {
        if (c.sessionId === sessionId) return c;
      }
    }
  }
  return undefined;
}

export async function pickupFurniture(
  state: GameRoomState,
  client: Client,
  auth: AuthData,
  message: PickupFurnitureMessage,
  clients: Iterable<Client>,
  clientUsers: Map<string, AuthData>,
): Promise<void> {
  try {
    const item = await InventoryService.pickupFurniture({
      furnitureItemId: message.furnitureItemId,
      userId: auth.userId,
    });

    state.furniture.delete(message.furnitureItemId);

    const inv = await InventoryService.getGroupedInventory(auth.userId);
    client.send("inventory", inv);
    client.send("pickup_furniture_ok", { itemId: message.furnitureItemId });

    // If room owner picked up someone else's furniture, refresh their inventory too
    if (item.ownerId !== auth.userId) {
      const ownerClient = findClientByUserId(clients, clientUsers, item.ownerId);
      if (ownerClient) {
        const ownerInv = await InventoryService.getGroupedInventory(item.ownerId);
        ownerClient.send("inventory", ownerInv);
      }
    }
  } catch (err: unknown) {
    client.send("error", { action: "pickup_furniture", message: getErrorMessage(err) });
  }
}
