import prisma from "../config/prisma.js";
import { OnlineTracker } from "./OnlineTracker.js";

export interface FriendInfo {
  friendshipId: string;
  userId: string;
  username: string;
  online: boolean;
  currentRoomId: string | null;
  currentRoomName: string | null;
}

export interface FriendRequest {
  friendshipId: string;
  senderId: string;
  senderUsername: string;
  createdAt: string;
}

export type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

export class FriendService {
  /** Send a friend request. */
  static async sendRequest(senderId: string, receiverId: string): Promise<void> {
    if (senderId === receiverId) {
      throw new Error("Non puoi aggiungere te stesso come amico");
    }

    // Check if a friendship already exists in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "accepted") {
        throw new Error("Siete già amici");
      }
      if (existing.status === "pending") {
        // If the other person already sent us a request, auto-accept
        if (existing.senderId === receiverId) {
          await prisma.friendship.update({
            where: { id: existing.id },
            data: { status: "accepted" },
          });
          return;
        }
        throw new Error("Richiesta già inviata");
      }
    }

    // Check receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      throw new Error("Utente non trovato");
    }

    await prisma.friendship.create({
      data: { senderId, receiverId, status: "pending" },
    });
  }

  /** Accept a friend request. Only the receiver can accept. */
  static async acceptRequest(friendshipId: string, userId: string): Promise<void> {
    const friendship = await prisma.friendship.findUniqueOrThrow({ where: { id: friendshipId } });

    if (friendship.receiverId !== userId) {
      throw new Error("Solo il destinatario può accettare la richiesta");
    }

    if (friendship.status !== "pending") {
      throw new Error("Questa richiesta non è più in attesa");
    }

    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "accepted" },
    });
  }

  /** Decline a friend request. Only the receiver can decline. */
  static async declineRequest(friendshipId: string, userId: string): Promise<void> {
    const friendship = await prisma.friendship.findUniqueOrThrow({ where: { id: friendshipId } });

    if (friendship.receiverId !== userId) {
      throw new Error("Solo il destinatario può rifiutare la richiesta");
    }

    if (friendship.status !== "pending") {
      throw new Error("Questa richiesta non è più in attesa");
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
  }

  /** Remove a friend. Either party can remove. */
  static async removeFriend(friendshipId: string, userId: string): Promise<void> {
    const friendship = await prisma.friendship.findUniqueOrThrow({ where: { id: friendshipId } });

    if (friendship.senderId !== userId && friendship.receiverId !== userId) {
      throw new Error("Non puoi rimuovere questa amicizia");
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
  }

  /** Get accepted friends for a user, with online status. */
  static async getFriends(userId: string): Promise<FriendInfo[]> {
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

    return friendships.map(f => {
      const friend = f.senderId === userId ? f.receiver : f.sender;
      const onlineInfo = OnlineTracker.getUser(friend.id);
      return {
        friendshipId: f.id,
        userId: friend.id,
        username: friend.username,
        online: OnlineTracker.isOnline(friend.id),
        currentRoomId: onlineInfo?.currentRoomId ?? null,
        currentRoomName: onlineInfo?.currentRoomName ?? null,
      };
    });
  }

  /** Get pending incoming friend requests. */
  static async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await prisma.friendship.findMany({
      where: { receiverId: userId, status: "pending" },
      include: { sender: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
    });

    return requests.map(r => ({
      friendshipId: r.id,
      senderId: r.sender.id,
      senderUsername: r.sender.username,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Get friendship status between two users. */
  static async getStatus(userId: string, targetUserId: string): Promise<FriendshipStatus> {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });

    if (!friendship) return "none";
    if (friendship.status === "accepted") return "accepted";
    if (friendship.senderId === userId) return "pending_sent";
    return "pending_received";
  }

  /** Get the room access mode for a given room (used for "follow" feature). */
  static async getRoomAccessMode(roomId: string): Promise<{ accessMode: string; ownerId: string }> {
    const room = await prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      select: { accessMode: true, ownerId: true },
    });
    return room;
  }
}
