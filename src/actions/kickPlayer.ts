import { Client, CloseCode } from "colyseus";
import { PermissionService } from "../services/PermissionService.js";
import type { KickPlayerMessage, AuthData } from "../types/index.js";

export async function kickPlayer(
  client: Client,
  auth: AuthData,
  message: KickPlayerMessage,
  clients: Iterable<Client>,
  clientUsers: Map<string, AuthData>,
): Promise<void> {
  const requesterRole = await PermissionService.getUserRoleInRoom(auth.dbRoomId, auth.userId);
  const targetRole = await PermissionService.getUserRoleInRoom(auth.dbRoomId, message.targetUserId);

  if (requesterRole !== "owner" && requesterRole !== "rights") {
    client.send("error", { action: "kick_player", message: "Non hai permessi per kickare utenti" });
    return;
  }

  // Nobody can kick the room owner
  if (targetRole === "owner") {
    client.send("error", { action: "kick_player", message: "Non puoi kickare il proprietario della stanza" });
    return;
  }

  const rightsUserIds = await PermissionService.getRoomRightsUserIds(auth.dbRoomId);
  const targetHasRights = rightsUserIds.includes(message.targetUserId);

  // Only owner can kick a rights-holder
  if (requesterRole !== "owner" && targetHasRights) {
    client.send("error", { action: "kick_player", message: "Non puoi kickare un utente con diritti" });
    return;
  }

  for (const [sessionId, targetAuth] of clientUsers) {
    if (targetAuth.userId === message.targetUserId) {
      for (const c of clients) {
        if (c.sessionId === sessionId) {
          c.send("kicked", { message: "Sei stato kickato dalla stanza" });
          c.leave(CloseCode.CONSENTED);
          break;
        }
      }
      break;
    }
  }
}
