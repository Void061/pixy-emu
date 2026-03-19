/**
 * In-memory tracker for online users and their current room.
 * Used by SessionRoom / GameRoom to track presence.
 */

export interface OnlineUser {
  userId: string;
  username: string;
  currentRoomId: string | null;
  currentRoomName: string | null;
}

export class OnlineTracker {
  private static users = new Map<string, OnlineUser>();

  static setOnline(userId: string, username: string): void {
    this.users.set(userId, { userId, username, currentRoomId: null, currentRoomName: null });
  }

  static setOffline(userId: string): void {
    this.users.delete(userId);
  }

  static setCurrentRoom(userId: string, roomId: string, roomName: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.currentRoomId = roomId;
      user.currentRoomName = roomName;
    }
  }

  static clearCurrentRoom(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.currentRoomId = null;
      user.currentRoomName = null;
    }
  }

  static isOnline(userId: string): boolean {
    return this.users.has(userId);
  }

  static getUser(userId: string): OnlineUser | null {
    return this.users.get(userId) ?? null;
  }

  static getOnlineUserIds(): string[] {
    return Array.from(this.users.keys());
  }
}
