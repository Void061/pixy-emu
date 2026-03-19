import type { FurnitureRotation } from "../models/index.js";

// ─── Client → Server Messages ──────────────────────────────────

export interface MoveMessage {
  x: number;
  y: number;
  direction: number;
}

export interface PlaceFurnitureMessage {
  definitionId: string;
  positionX: number;
  positionY: number;
  rotation?: FurnitureRotation;
}

export interface PickupFurnitureMessage {
  furnitureItemId: string;
}

export interface MoveFurnitureMessage {
  furnitureItemId: string;
  positionX: number;
  positionY: number;
  rotation?: FurnitureRotation;
}

export interface ChatMessage {
  text: string;
}

export interface KickPlayerMessage {
  targetUserId: string;
}

export interface BanPlayerMessage {
  targetUserId: string;
}

export interface DoorbellResponseMessage {
  targetUserId: string;
  allow: boolean;
}

export interface UpdateRoomSettingsMessage {
  name?: string;
  description?: string;
  accessMode?: 'open' | 'doorbell' | 'password';
  password?: string;
  disableTileBlocking?: boolean;
}

// ─── Internal Auth Data ────────────────────────────────────────

export interface AuthData {
  userId: string;
  username: string;
  dbRoomId: string;
}

export interface JoinOptions {
  token: string;
  dbRoomId: string;
  password?: string; // for password-locked rooms
}
