import type { Client } from "colyseus";
import type { AuthData, UpdateRoomSettingsMessage } from "../types/index.js";
import { RoomService } from "../services/index.js";

/**
 * Update room settings (owner only). Broadcasts changes to all clients.
 */
export async function updateRoomSettings(
  client: Client,
  auth: AuthData,
  message: UpdateRoomSettingsMessage,
  broadcast: (type: string, data: unknown) => void,
) {
  // Validate name if provided
  if (message.name !== undefined) {
    const trimmed = message.name.trim();
    if (trimmed.length < 4 || trimmed.length > 20) {
      client.send("error", { action: "update_room_settings", message: "Il nome deve essere tra 4 e 20 caratteri" });
      return;
    }
    message.name = trimmed;
  }

  // Validate description
  if (message.description !== undefined && message.description.length > 200) {
    client.send("error", { action: "update_room_settings", message: "La descrizione non può superare 200 caratteri" });
    return;
  }

  // Validate accessMode
  if (message.accessMode !== undefined && !["open", "doorbell", "password"].includes(message.accessMode)) {
    client.send("error", { action: "update_room_settings", message: "Modalità di accesso non valida" });
    return;
  }

  // Password is required when switching to password mode
  if (message.accessMode === "password" && (!message.password || message.password.length < 1)) {
    client.send("error", { action: "update_room_settings", message: "Inserisci una password per la stanza" });
    return;
  }

  try {
    const updated = await RoomService.updateRoom(auth.dbRoomId, auth.userId, {
      name: message.name,
      description: message.description,
      accessMode: message.accessMode,
      password: message.password,
      disableTileBlocking: message.disableTileBlocking,
    });

    broadcast("room_settings_updated", {
      name: updated.name,
      description: updated.description,
      accessMode: updated.accessMode,
      score: updated.score,
      disableTileBlocking: updated.disableTileBlocking,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    client.send("error", { action: "update_room_settings", message: msg });
  }
}
