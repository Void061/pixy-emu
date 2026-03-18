import type { Client } from "colyseus";
import { InventoryService } from "../services/InventoryService.js";
import type { AuthData } from "../types/index.js";

export async function refreshInventory(
  client: Client,
  auth: AuthData,
): Promise<void> {
  const inv = await InventoryService.getGroupedInventory(auth.userId);
  client.send("inventory", inv);
}
