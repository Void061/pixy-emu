import type { Client } from "colyseus";
import type { AuthData, DoorbellResponseMessage } from "../types/index.js";

/**
 * Handle a doorbell response from an owner/rights-holder.
 * Finds the waiting client and either lets them join or rejects.
 */
export function handleDoorbellResponse(
  client: Client,
  auth: AuthData,
  message: DoorbellResponseMessage,
  pendingDoorbell: Map<string, { resolve: (allowed: boolean) => void; username: string }>,
  broadcast: (type: string, data: unknown) => void,
) {
  const pending = pendingDoorbell.get(message.targetUserId);
  if (!pending) {
    client.send("error", { action: "doorbell_response", message: "Nessuna richiesta pendente per questo utente" });
    return;
  }

  pending.resolve(message.allow);
  pendingDoorbell.delete(message.targetUserId);
}
