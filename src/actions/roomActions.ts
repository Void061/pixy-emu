import { RoomService, PermissionService } from "../services/index.js";
import type { CreateRoomInput, UpdateRoomInput } from "../services/RoomService.js";
import type { RoomModel, RoomDetailModel } from "../models/index.js";

export async function listRooms(): Promise<RoomModel[]> {
  return RoomService.listRooms();
}

export async function listUserRooms(userId: string): Promise<RoomModel[]> {
  return RoomService.listUserRooms(userId);
}

export async function getRoomDetail(roomId: string): Promise<RoomDetailModel> {
  return RoomService.getRoomDetail(roomId);
}

export async function createRoom(input: CreateRoomInput): Promise<RoomModel> {
  return RoomService.createRoom(input);
}

export async function updateRoom(
  roomId: string,
  ownerId: string,
  input: UpdateRoomInput,
): Promise<RoomModel> {
  return RoomService.updateRoom(roomId, ownerId, input);
}

export async function deleteRoom(roomId: string, ownerId: string): Promise<void> {
  return RoomService.deleteRoom(roomId, ownerId);
}

export async function grantRights(
  roomId: string,
  targetUserId: string,
  requesterId: string,
): Promise<void> {
  return PermissionService.grantRights(roomId, targetUserId, requesterId);
}

export async function revokeRights(
  roomId: string,
  targetUserId: string,
  requesterId: string,
) {
  return PermissionService.revokeRights(roomId, targetUserId, requesterId);
}

export async function voteRoom(
  roomId: string,
  userId: string,
): Promise<{ score: number }> {
  return RoomService.voteRoom(roomId, userId);
}

export async function hasVoted(
  roomId: string,
  userId: string,
): Promise<boolean> {
  return RoomService.hasVoted(roomId, userId);
}

export async function verifyRoomPassword(
  roomId: string,
  password: string,
): Promise<boolean> {
  return RoomService.verifyRoomPassword(roomId, password);
}
