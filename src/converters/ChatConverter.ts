import type { ChatMessage } from "../generated/prisma/client.js";
import type { ChatMessageModel } from "../models/ChatMessage.js";

export class ChatConverter {
  static toModel(entity: ChatMessage): ChatMessageModel {
    return {
      id: entity.id,
      roomId: entity.roomId,
      userId: entity.userId,
      username: entity.username,
      message: entity.message,
      createdAt: entity.createdAt,
    };
  }
}
