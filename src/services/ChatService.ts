import prisma from "../config/prisma.js";

export interface ChatMessageModel {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  createdAt: Date;
}

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
    return msg;
  }

  /** Get chat messages for a room, optionally filtered by a start date (for join-time filtering). */
  static async getRoomMessages(
    roomId: string,
    since?: Date,
    limit: number = 50,
  ): Promise<ChatMessageModel[]> {
    return prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }
}
