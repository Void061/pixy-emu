import { Room, Client, CloseCode } from "colyseus";
import { Schema } from "@colyseus/schema";
import { AuthService } from "../services/AuthService.js";
import { OnlineTracker } from "../services/OnlineTracker.js";

class EmptyState extends Schema {}

interface SessionAuthData {
  userId: string;
  username: string;
}

/**
 * Global session room — every authenticated client joins this room.
 * Enforces a single active session per user: if the same user joins
 * from a second tab/browser, the previous connection is kicked.
 */
export class SessionRoom extends Room<{ state: EmptyState }> {
  maxClients = 10000;
  state = new EmptyState();

  /** Maps userId → sessionId of the active client */
  private activeUsers = new Map<string, string>();
  /** Maps sessionId → userId */
  private sessionUsers = new Map<string, string>();

  async onCreate() {
    console.log("SessionRoom created");
  }

  async onAuth(_client: Client, options: { token: string }): Promise<SessionAuthData> {
    if (!options.token) {
      throw new Error("token is required");
    }
    const payload = AuthService.verifyToken(options.token);
    return { userId: payload.userId, username: payload.username };
  }

  async onJoin(client: Client, _options: any, auth: SessionAuthData) {
    // If this user already has an active session, kick the old one
    const existingSessionId = this.activeUsers.get(auth.userId);
    if (existingSessionId && existingSessionId !== client.sessionId) {
      const oldClient = this.clients.find(c => c.sessionId === existingSessionId);
      if (oldClient) {
        oldClient.send("session_kicked", { reason: "Sessione aperta da un'altra finestra" });
        oldClient.leave(CloseCode.CONSENTED);
      }
      this.sessionUsers.delete(existingSessionId);
    }

    this.activeUsers.set(auth.userId, client.sessionId);
    this.sessionUsers.set(client.sessionId, auth.userId);
    OnlineTracker.setOnline(auth.userId, auth.username);
    console.log(`Session: ${auth.username} (${auth.userId}) connected`);
  }

  onLeave(client: Client) {
    const userId = this.sessionUsers.get(client.sessionId);
    if (userId) {
      // Only remove from activeUsers if this is still the active session
      if (this.activeUsers.get(userId) === client.sessionId) {
        this.activeUsers.delete(userId);
        OnlineTracker.setOffline(userId);
      }
      this.sessionUsers.delete(client.sessionId);
      console.log(`Session: ${userId} disconnected`);
    }
  }

  onDispose() {
    console.log("SessionRoom disposing...");
  }
}
