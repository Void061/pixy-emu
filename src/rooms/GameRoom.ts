import { Room, Client, CloseCode } from "colyseus";
import { GameRoomState, PlayerState, FurnitureState } from "./schema/GameRoomState.js";
import { AuthService } from "../services/AuthService.js";
import { RoomService } from "../services/RoomService.js";
import { InventoryService } from "../services/InventoryService.js";
import { PermissionService } from "../services/PermissionService.js";
import { ChatService } from "../services/ChatService.js";
import { getErrorMessage } from "../utils/errors.js";
import prisma from "../config/prisma.js";
import type { FurnitureRotation } from "../models/index.js";

interface JoinOptions {
  token: string;
  roomId: string;
}

interface AuthData {
  userId: string;
  username: string;
  dbRoomId: string;
}

export class GameRoom extends Room<{ state: GameRoomState }> {
  maxClients = 25;
  state = new GameRoomState();

  private clientUsers = new Map<string, AuthData>();

  /** Find the connected client for a given userId, or undefined if not online. */
  private getClientByUserId(userId: string): Client | undefined {
    for (const [sessionId, auth] of this.clientUsers.entries()) {
      if (auth.userId === userId) {
        return this.clients.find(c => c.sessionId === sessionId);
      }
    }
    return undefined;
  }

  messages = {
    /** Player movement. */
    move: (client: Client, message: { x: number; y: number; direction: number }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;

      const player = this.state.players.get(auth.userId);
      if (!player) return;

      if (message.x >= 0 && message.x < this.state.width &&
          message.y >= 0 && message.y < this.state.height) {
        player.x = message.x;
        player.y = message.y;
        player.direction = message.direction ?? player.direction;
      }
    },

    /** Place furniture from inventory into this room by definitionId. */
    place_furniture: async (client: Client, message: {
      definitionId: string;
      positionX: number;
      positionY: number;
      rotation?: FurnitureRotation;
    }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;

      console.log(`[GameRoom] place_furniture:`, {
        user: auth.username,
        userId: auth.userId,
        roomId: auth.dbRoomId,
        definitionId: message.definitionId,
        position: { x: message.positionX, y: message.positionY },
        rotation: message.rotation,
      });

      try {
        const item = await InventoryService.placeByDefinition({
          userId: auth.userId,
          definitionId: message.definitionId,
          roomId: auth.dbRoomId,
          positionX: message.positionX,
          positionY: message.positionY,
          rotation: message.rotation,
        });

        const furniState = new FurnitureState();
        furniState.id = item.id;
        furniState.definitionId = item.definitionId;
        furniState.ownerId = item.ownerId;
        furniState.ownerUsername = auth.username;
        furniState.x = item.positionX!;
        furniState.y = item.positionY!;
        furniState.rotation = item.rotation;
        furniState.currentState = item.currentState;

        this.state.furniture.set(item.id, furniState);

        // Send updated inventory to the placing client
        const inv = await InventoryService.getGroupedInventory(auth.userId);
        client.send("inventory", inv);
        client.send("place_furniture_ok", { itemId: item.id });
      } catch (err: unknown) {
        client.send("error", { action: "place_furniture", message: getErrorMessage(err) });
      }
    },

    /** Pick up furniture from this room back to inventory. */
    pickup_furniture: async (client: Client, message: { furnitureItemId: string }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;

      try {
        const item = await InventoryService.pickupFurniture({
          furnitureItemId: message.furnitureItemId,
          userId: auth.userId,
        });

        this.state.furniture.delete(message.furnitureItemId);

        // Send updated inventory to the picking-up client
        const inv = await InventoryService.getGroupedInventory(auth.userId);
        client.send("inventory", inv);
        client.send("pickup_furniture_ok", { itemId: message.furnitureItemId });

        // If a room owner picked up someone else's furniture, also refresh
        // that player's inventory immediately (if they're in the room).
        if (item.ownerId !== auth.userId) {
          const ownerClient = this.getClientByUserId(item.ownerId);
          if (ownerClient) {
            const ownerInv = await InventoryService.getGroupedInventory(item.ownerId);
            ownerClient.send("inventory", ownerInv);
          }
        }
      } catch (err: unknown) {
        client.send("error", { action: "pickup_furniture", message: getErrorMessage(err) });
      }
    },

    /** Move furniture within the room. */
    move_furniture: async (client: Client, message: {
      furnitureItemId: string;
      positionX: number;
      positionY: number;
      rotation?: FurnitureRotation;
    }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;

      try {
        const oldItem = await prisma.furnitureItem.findUniqueOrThrow({
          where: { id: message.furnitureItemId },
        });
        const oldRotation = oldItem.rotation;

        const item = await InventoryService.moveFurniture(
          message.furnitureItemId,
          auth.userId,
          message.positionX,
          message.positionY,
          message.rotation,
        );

        const furniState = this.state.furniture.get(item.id);
        if (furniState) {
          furniState.x = item.positionX!;
          furniState.y = item.positionY!;
          furniState.rotation = item.rotation;
        }

        // If rotation changed, broadcast to all clients for animation
        if (message.rotation && oldRotation !== message.rotation) {
          this.broadcast("furniture_rotated", {
            furnitureItemId: message.furnitureItemId,
          });
        }
      } catch (err: unknown) {
        client.send("error", { action: "move_furniture", message: getErrorMessage(err) });
      }
    },

    /** Chat message. */
    chat: async (client: Client, message: { text: string }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;

      const text = (message.text ?? "").trim();
      if (!text || text.length > 500) return;

      // Persist to DB
      const saved = await ChatService.sendMessage(
        auth.dbRoomId,
        auth.userId,
        auth.username,
        text,
      );

      // Broadcast to all clients in the room
      this.broadcast("chat", {
        id: saved.id,
        userId: auth.userId,
        username: auth.username,
        text,
        createdAt: saved.createdAt.toISOString(),
      });
    },

    /** Refresh inventory (e.g. after purchase via REST API). */
    refresh_inventory: async (client: Client) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;

      const inv = await InventoryService.getGroupedInventory(auth.userId);
      client.send("inventory", inv);
    },

    /** Refresh room rights after grant/revoke via REST API. */
    refresh_rights: async (client: Client) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;

      // Reload rights from DB
      const rightsUserIds = await PermissionService.getRoomRightsUserIds(auth.dbRoomId);
      
      // Check for furniture that was removed (due to revoked rights)
      const currentFurnitureInRoom = await InventoryService.getRoomFurniture(auth.dbRoomId);
      const currentFurnitureIds = new Set(currentFurnitureInRoom.map(f => f.id));

      // Collect ownerIds before deleting so we can notify them
      const affectedOwnerIds = new Set<string>();
      for (const [furniId, furniState] of this.state.furniture) {
        if (!currentFurnitureIds.has(furniId)) {
          affectedOwnerIds.add(furniState.ownerId);
          this.state.furniture.delete(furniId);
        }
      }

      // Push updated inventory to each affected owner who is still in the room
      for (const ownerId of affectedOwnerIds) {
        const ownerClient = this.getClientByUserId(ownerId);
        if (ownerClient) {
          const ownerInv = await InventoryService.getGroupedInventory(ownerId);
          ownerClient.send("inventory", ownerInv);
        }
      }
      
      // Broadcast to all clients in the room
      this.broadcast("rights_updated", { rightsUserIds });
      
      // Also send updated role to each client
      for (const [sessionId, clientAuth] of this.clientUsers) {
        const targetClient = this.clients.find(c => c.sessionId === sessionId);
        if (targetClient) {
          const role = await PermissionService.getUserRoleInRoom(auth.dbRoomId, clientAuth.userId);
          targetClient.send("role_updated", { role, rightsUserIds });
        }
      }
    },

    kick_player: async (client: Client, message: { targetUserId: string }) => {
      const auth = this.clientUsers.get(client.sessionId);
      if (!auth) return;

      const requesterRole = await PermissionService.getUserRoleInRoom(auth.dbRoomId, auth.userId);
      const targetRole = await PermissionService.getUserRoleInRoom(auth.dbRoomId, message.targetUserId);

      if (requesterRole !== 'owner' && requesterRole !== 'rights') {
        client.send('error', { action: 'kick_player', message: 'Non hai permessi per kickare utenti' });
        return;
      }

      // Nobody can kick the room owner
      if (targetRole === 'owner') {
        client.send('error', { action: 'kick_player', message: 'Non puoi kickare il proprietario della stanza' });
        return;
      }

      const rightsUserIds = await PermissionService.getRoomRightsUserIds(auth.dbRoomId);
      const targetHasRights = rightsUserIds.includes(message.targetUserId);

      // Only owner can kick a rights-holder.
      if (requesterRole !== 'owner' && targetHasRights) {
        client.send('error', { action: 'kick_player', message: 'Non puoi kickare un utente con diritti' });
        return;
      }

      for (const [sessionId, targetAuth] of this.clientUsers) {
        if (targetAuth.userId === message.targetUserId) {
          const targetClient = this.clients.find(c => c.sessionId === sessionId);
          if (targetClient) {
            targetClient.send('kicked', { message: 'Sei stato kickato dalla stanza' });
            targetClient.leave(CloseCode.CONSENTED);
          }
          break;
        }
      }
    },
  };

  async onCreate(options: JoinOptions) {
    console.log("GameRoom created with roomId:", options.roomId);
    
    // Set metadata for matchmaking - each DB room gets its own Colyseus instance
    if (options.roomId) {
      await this.setMetadata({ roomId: options.roomId });
    }
  }

  /**
   * Verify JWT and check the player has access to the requested room.
   * Also verify that this Colyseus instance is for the correct DB room.
   * Returning data from onAuth makes it available as `client.auth`.
   */
  async onAuth(_client: Client, options: JoinOptions): Promise<AuthData> {
    if (!options.token || !options.roomId) {
      throw new Error("token and roomId are required");
    }

    const payload = AuthService.verifyToken(options.token);

    // Verify the room exists
    const room = await RoomService.getRoomDetail(options.roomId);

    // Verify this Colyseus instance is for the right DB room
    const meta = this.metadata as { roomId?: string } | undefined;
    if (meta?.roomId && meta.roomId !== options.roomId) {
      throw new Error(`This room instance is for ${meta.roomId}, not ${options.roomId}`);
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
    }
  }

  onDispose() {
    console.log("GameRoom", this.roomId, "disposing...");
    this.clientUsers.clear();
  }
}
