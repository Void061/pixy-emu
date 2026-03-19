import prisma from "../config/prisma.js";

export interface PrivateMessageInfo {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  message: string;
  createdAt: string;
}

export class PrivateChatService {
  /** Send a private message (sender and receiver must be accepted friends). */
  static async sendMessage(
    senderId: string,
    receiverId: string,
    message: string,
  ): Promise<PrivateMessageInfo> {
    // Verify friendship exists
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "accepted",
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });
    if (!friendship) throw new Error("Non siete amici");

    const msg = await prisma.privateMessage.create({
      data: { senderId, receiverId, message },
      include: { sender: { select: { username: true } }, receiver: { select: { username: true } } },
    });

    return {
      id: msg.id,
      senderId: msg.senderId,
      senderUsername: msg.sender.username,
      receiverId: msg.receiverId,
      receiverUsername: msg.receiver.username,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  /** Get conversation between two users (most recent N messages, optionally since a date). */
  static async getConversation(
    userId: string,
    otherUserId: string,
    since?: string,
    limit: number = 50,
  ): Promise<PrivateMessageInfo[]> {
    const messages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
        ...(since ? { createdAt: { gte: new Date(since) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: { sender: { select: { username: true } }, receiver: { select: { username: true } } },
    });

    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderUsername: m.sender.username,
      receiverId: m.receiverId,
      receiverUsername: m.receiver.username,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /** Get all conversations with latest message for a user (inbox). */
  static async getInbox(userId: string): Promise<{ friendId: string; friendUsername: string; lastMessage: string; lastMessageAt: string; unread: boolean }[]> {
    // Get all friends to build inbox
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "accepted",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    const inbox: { friendId: string; friendUsername: string; lastMessage: string; lastMessageAt: string; unread: boolean }[] = [];

    for (const f of friendships) {
      const friendId = f.senderId === userId ? f.receiverId : f.senderId;
      const friendUsername = f.senderId === userId ? f.receiver.username : f.sender.username;

      const lastMsg = await prisma.privateMessage.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      if (lastMsg) {
        inbox.push({
          friendId,
          friendUsername,
          lastMessage: lastMsg.message,
          lastMessageAt: lastMsg.createdAt.toISOString(),
          unread: lastMsg.senderId !== userId,
        });
      }
    }

    return inbox.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }
}
