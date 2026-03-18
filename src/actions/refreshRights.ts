import type { Client } from "colyseus";
import type { GameRoomState } from "../rooms/schema/GameRoomState.js";
import { InventoryService } from "../services/InventoryService.js";
import { PermissionService } from "../services/PermissionService.js";
import type { AuthData } from "../types/index.js";

/**
 * Reload room rights from DB, sync furniture state (remove furniture
 * belonging to revoked users), and broadcast updated roles to all clients.
 */
export async function refreshRights(
  state: GameRoomState,
  auth: AuthData,
  clients: Iterable<Client>,
  clientUsers: Map<string, AuthData>,
  broadcast: (type: string, data: unknown) => void,
): Promise<void> {
  const rightsUserIds = await PermissionService.getRoomRightsUserIds(auth.dbRoomId);

  // Check for furniture that was removed (due to revoked rights)
  const currentFurnitureInRoom = await InventoryService.getRoomFurniture(auth.dbRoomId);
  const currentFurnitureIds = new Set(currentFurnitureInRoom.map(f => f.id));

  // Collect ownerIds before deleting so we can notify them
  const affectedOwnerIds = new Set<string>();
  for (const [furniId, furniState] of state.furniture) {
    if (!currentFurnitureIds.has(furniId)) {
      affectedOwnerIds.add(furniState.ownerId);
      state.furniture.delete(furniId);
    }
  }

  // Push updated inventory to each affected owner still in the room
  for (const ownerId of affectedOwnerIds) {
    for (const [sessionId, clientAuth] of clientUsers.entries()) {
      if (clientAuth.userId === ownerId) {
        for (const c of clients) {
          if (c.sessionId === sessionId) {
            const ownerInv = await InventoryService.getGroupedInventory(ownerId);
            c.send("inventory", ownerInv);
            break;
          }
        }
        break;
      }
    }
  }

  broadcast("rights_updated", { rightsUserIds });

  // Send updated role to each client
  for (const [sessionId, clientAuth] of clientUsers) {
    for (const c of clients) {
      if (c.sessionId === sessionId) {
        const role = await PermissionService.getUserRoleInRoom(auth.dbRoomId, clientAuth.userId);
        c.send("role_updated", { role, rightsUserIds });
        break;
      }
    }
  }
}
