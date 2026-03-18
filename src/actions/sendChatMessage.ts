import type { Client } from "colyseus";
import { ChatService } from "../services/ChatService.js";
import type { ChatMessage, AuthData } from "../types/index.js";

export async function sendChatMessage(
  client: Client,
  auth: AuthData,
  message: ChatMessage,
  broadcast: (type: string, data: unknown) => void,
): Promise<void> {
  const text = (message.text ?? "").trim();
  if (!text || text.length > 500) return;

  const saved = await ChatService.sendMessage(
    auth.dbRoomId,
    auth.userId,
    auth.username,
    text,
  );

  broadcast("chat", {
    id: saved.id,
    userId: auth.userId,
    username: auth.username,
    text,
    createdAt: saved.createdAt.toISOString(),
  });
}
