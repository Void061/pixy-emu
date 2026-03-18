import { Client, CloseCode } from "colyseus";
import { PermissionService } from "../services/PermissionService.js";
import { BanService } from "../services/BanService.js";
import type { BanPlayerMessage, AuthData } from "../types/index.js";

export async function banPlayer(
  client: Client,
  auth: AuthData,
  message: BanPlayerMessage,
  clients: Iterable<Client>,
  clientUsers: Map<string, AuthData>,
): Promise<void> {
  const requesterRole = await PermissionService.getUserRoleInRoom(auth.dbRoomId, auth.userId);
  const targetRole = await PermissionService.getUserRoleInRoom(auth.dbRoomId, message.targetUserId);

  // Only owner and rights holders can ban
  if (requesterRole !== "owner" && requesterRole !== "rights") {
    client.send("error", { action: "ban_player", message: "Non hai permessi per bannare utenti" });
    return;
  }

  // Nobody can ban the room owner
  if (targetRole === "owner") {
    client.send("error", { action: "ban_player", message: "Non puoi bannare il proprietario della stanza" });
    return;
  }

  // Persist ban in DB
  await BanService.banPlayer(auth.dbRoomId, message.targetUserId, auth.userId);

  // If target is online in this room, kick them
  for (const [sessionId, targetAuth] of clientUsers) {
    if (targetAuth.userId === message.targetUserId) {
      for (const c of clients) {
        if (c.sessionId === sessionId) {
          c.send("banned", { message: "Sei stato bannato da questa stanza" });
          c.leave(CloseCode.CONSENTED);
          break;
        }
      }
      break;
    }
  }
}
