import prisma from "../config/prisma.js";
import { ChatConverter } from "../converters/index.js";
import type { ChatMessageModel } from "../models/index.js";

export class ChatService {
  /** Save a chat message to the database. */
  static async sendMessage(
    roomId: string,
    userId: string,
    username: string,
    message: string,
  ): Promise<ChatMessageModel> {
    const msg = await prisma.chatMessage.create({
      data: { roomId, userId, username, message },
    });
    return ChatConverter.toModel(msg);
  }

  /** Get chat messages for a room, optionally filtered by a start date (for join-time filtering). */
  static async getRoomMessages(
    roomId: string,
    since?: Date,
    limit: number = 50,
  ): Promise<ChatMessageModel[]> {
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return messages.map(ChatConverter.toModel);
  }
}
