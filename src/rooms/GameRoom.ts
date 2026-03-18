import { Room, Client, CloseCode } from "colyseus";
import { GameRoomState, PlayerState, FurnitureState } from "./schema/GameRoomState.js";
import { AuthService } from "../services/AuthService.js";
import { RoomService } from "../services/RoomService.js";
import { InventoryService } from "../services/InventoryService.js";
import { PermissionService } from "../services/PermissionService.js";
import { BanService } from "../services/BanService.js";
import {
  movePlayer,
  placeFurniture,
  pickupFurniture,
  moveFurniture,
  sendChatMessage,
  refreshInventory,
  refreshRights,
  kickPlayer,
  banPlayer,
  handleDoorbellResponse,
  updateRoomSettings,
} from "../actions/index.js";
import type {
  AuthData,
  JoinOptions,
  MoveMessage,
  PlaceFurnitureMessage,
  PickupFurnitureMessage,
  MoveFurnitureMessage,
  ChatMessage,
  KickPlayerMessage,
  BanPlayerMessage,
  DoorbellResponseMessage,
  UpdateRoomSettingsMessage,
} from "../types/index.js";

export class GameRoom extends Room<{ state: GameRoomState }> {
  maxClients = 25;
  state = new GameRoomState();

  private clientUsers = new Map<string, AuthData>();
  private pendingDoorbell = new Map<string, { resolve: (allowed: boolean) => void; username: string }>();

  messages = {
    move: (client: Client, message: MoveMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      movePlayer(this.state, auth, message);
    },

    place_furniture: async (client: Client, message: PlaceFurnitureMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await placeFurniture(this.state, client, auth, message);
    },

    pickup_furniture: async (client: Client, message: PickupFurnitureMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await pickupFurniture(this.state, client, auth, message, this.clients, this.clientUsers);
    },

    move_furniture: async (client: Client, message: MoveFurnitureMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await moveFurniture(this.state, client, auth, message, this.broadcast.bind(this));
    },

    chat: async (client: Client, message: ChatMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await sendChatMessage(client, auth, message, this.broadcast.bind(this));
    },

    refresh_inventory: async (client: Client) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await refreshInventory(client, auth);
    },

    refresh_rights: async (client: Client) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await refreshRights(this.state, auth, this.clients, this.clientUsers, this.broadcast.bind(this));
    },

    kick_player: async (client: Client, message: KickPlayerMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await kickPlayer(client, auth, message, this.clients, this.clientUsers);
    },

    doorbell_response: (client: Client, message: DoorbellResponseMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      handleDoorbellResponse(client, auth, message, this.pendingDoorbell, this.broadcast.bind(this));
    },

    ban_player: async (client: Client, message: BanPlayerMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await banPlayer(client, auth, message, this.clients, this.clientUsers);
    },

    update_room_settings: async (client: Client, message: UpdateRoomSettingsMessage) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;
      await updateRoomSettings(client, auth, message, this.broadcast.bind(this));
    },
  };

  async onCreate(options: JoinOptions) {
    console.log("GameRoom created with dbRoomId:", options.dbRoomId);
    
    // Set metadata for matchmaking - each DB room gets its own Colyseus instance
    if (options.dbRoomId) {
      await this.setMetadata({ dbRoomId: options.dbRoomId, playerCount: 0 });
    }
  }

  /**
   * Verify JWT and check the player has access to the requested room.
   * Also verify that this Colyseus instance is for the correct DB room.
   * Returning data from onAuth makes it available as `client.auth`.
   */
  async onAuth(_client: Client, options: JoinOptions): Promise<AuthData> {
    if (!options.token || !options.dbRoomId) {
      throw new Error("token and dbRoomId are required");
    }

    const payload = AuthService.verifyToken(options.token);
    const room = await RoomService.getRoomDetail(options.dbRoomId);

    // Ban check — banned users cannot enter at all
    const isBanned = await BanService.isBanned(options.dbRoomId, payload.userId);
    if (isBanned) {
      throw new Error("BANNED_FROM_ROOM");
    }

    const isOwner = room.ownerId === payload.userId;
    const hasRights = room.rightsUserIds.includes(payload.userId);

    // Access control
    if (room.accessMode === "password" && !isOwner) {
      // Rights holders still need password
      if (!options.password) {
        throw new Error("PASSWORD_REQUIRED");
      }
      const valid = await RoomService.verifyRoomPassword(options.dbRoomId, options.password);
      if (!valid) {
        throw new Error("PASSWORD_INVALID");
      }
    }

    if (room.accessMode === "doorbell" && !isOwner && !hasRights) {
      // Non-privileged user must ring the doorbell
      // Find privileged users currently in the room (owner/rights)
      const privilegedClients: Client[] = [];
      for (const [sessionId, auth] of this.clientUsers) {
        const isPrivileged = auth.userId === room.ownerId
          || room.rightsUserIds.includes(auth.userId);
        if (isPrivileged) {
          const c = this.clients.find(cl => cl.sessionId === sessionId);
          if (c) privilegedClients.push(c);
        }
      }

      // Auto-deny if no owner or rights holder is in the room
      if (privilegedClients.length === 0) {
        throw new Error("DOORBELL_DENIED");
      }

      // Notify privileged users about the doorbell ring
      for (const c of privilegedClients) {
        c.send("doorbell_ring", { userId: payload.userId, username: payload.username });
      }

      // Wait for a response with a timeout
      const allowed = await new Promise<boolean>((resolve) => {
        this.pendingDoorbell.set(payload.userId, { resolve, username: payload.username });
        setTimeout(() => {
          if (this.pendingDoorbell.has(payload.userId)) {
            this.pendingDoorbell.delete(payload.userId);
            resolve(false);
          }
        }, 30000); // 30 second timeout
      });

      if (!allowed) {
        throw new Error("DOORBELL_DENIED");
      }
    }

    return {
      userId: payload.userId,
      username: payload.username,
      dbRoomId: room.id,
    };
  }

  async onJoin(client: Client, _options: JoinOptions, auth: AuthData) {
    console.log(`${auth.username} (${auth.userId}) joined room ${auth.dbRoomId}`);

    // Kick previous session of the same user (duplicate tab / reconnect)
    for (const [sessionId, existing] of this.clientUsers) {
      if (existing.userId === auth.userId && sessionId !== client.sessionId) {
        const oldClient = this.clients.find(c => c.sessionId === sessionId);
        if (oldClient) {
          oldClient.send("error", { action: "kicked", message: "Sessione aperta da un'altra finestra" });
          oldClient.leave(CloseCode.CONSENTED);
        }
        // Clean up immediately so onLeave doesn't double-remove the player
        this.clientUsers.delete(sessionId);
        this.state.players.delete(existing.userId);
        break;
      }
    }

    this.clientUsers.set(client.sessionId, auth);

    // Load room data if first player
    if (this.state.players.size === 0) {
      const room = await RoomService.getRoomDetail(auth.dbRoomId);
      this.state.roomId = room.id;
      this.state.roomName = room.name;
      this.state.width = room.width;
      this.state.height = room.height;

      // Load existing furniture
      const roomFurniture = await InventoryService.getRoomFurniture(auth.dbRoomId);
      for (const item of roomFurniture) {
        const furniState = new FurnitureState();
        furniState.id = item.id;
        furniState.definitionId = item.definitionId;
        furniState.ownerId = item.ownerId;
        furniState.ownerUsername = item.ownerUsername;
        furniState.x = item.positionX!;
        furniState.y = item.positionY!;
        furniState.rotation = item.rotation;
        furniState.currentState = item.currentState;
        this.state.furniture.set(item.id, furniState);
      }
    }

    // Add player to state
    const player = new PlayerState();
    player.id = auth.userId;
    player.username = auth.username;

    // Place at room entrance by default
    const room = await RoomService.getRoomDetail(auth.dbRoomId);
    player.x = room.entranceTileX;
    player.y = room.entranceTileY;

    this.state.players.set(auth.userId, player);

    // Update metadata so live endpoint reflects actual joined players
    await this.setMetadata({ ...this.metadata, playerCount: this.state.players.size });

    // Send the user their role in this room
    const role = await PermissionService.getUserRoleInRoom(auth.dbRoomId, auth.userId);
    const rightsUserIds = await PermissionService.getRoomRightsUserIds(auth.dbRoomId);
    console.log(`[GameRoom] User ${auth.username} (${auth.userId}) role in room ${auth.dbRoomId}: ${role}`);
    
    const roomJoinedData = {
      role,
      roomId: room.id,
      roomName: room.name,
      ownerUsername: room.ownerUsername,
      ownerUserId: room.ownerId,
      rightsUserIds,
      accessMode: room.accessMode,
      score: room.score,
      description: room.description,
    };
    console.log('[GameRoom] Sending room_joined message:', JSON.stringify(roomJoinedData));
    client.send("room_joined", roomJoinedData);

    // Send user's inventory
    const inventory = await InventoryService.getGroupedInventory(auth.userId);
    client.send("inventory", inventory);
  }

  onLeave(client: Client, _code: CloseCode) {
    const auth = this.clientUsers.get(client.sessionId);
    if (auth) {
      console.log(`${auth.username} left room ${auth.dbRoomId}`);
      this.state.players.delete(auth.userId);
      this.clientUsers.delete(client.sessionId);
      // Update metadata so live endpoint reflects actual joined players
      this.setMetadata({ ...this.metadata, playerCount: this.state.players.size });
    }
  }

  onDispose() {
    console.log("GameRoom", this.roomId, "disposing...");
    // Reject any pending doorbell requests
    for (const [, pending] of this.pendingDoorbell) {
      pending.resolve(false);
    }
    this.pendingDoorbell.clear();
    this.clientUsers.clear();
  }
}
