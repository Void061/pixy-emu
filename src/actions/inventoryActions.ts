import { InventoryService } from "../services/index.js";
import { FurnitureService } from "../services/index.js";
import type { FurnitureItemModel, FurnitureDefinitionModel } from "../models/index.js";
import type { FurnitureRotation } from "../models/index.js";

export async function getUserInventory(userId: string): Promise<FurnitureItemModel[]> {
  return InventoryService.getUserInventory(userId);
}

export async function placeFurnitureRest(input: {
  furnitureItemId: string;
  roomId: string;
  userId: string;
  positionX: number;
  positionY: number;
  rotation?: FurnitureRotation;
}): Promise<FurnitureItemModel> {
  return InventoryService.placeFurniture(input);
}

export async function pickupFurnitureRest(input: {
  furnitureItemId: string;
  userId: string;
}): Promise<FurnitureItemModel> {
  return InventoryService.pickupFurniture(input);
}

export async function moveFurnitureRest(
  furnitureItemId: string,
  userId: string,
  positionX: number,
  positionY: number,
  rotation?: FurnitureRotation,
): Promise<FurnitureItemModel> {
  return InventoryService.moveFurniture(furnitureItemId, userId, positionX, positionY, rotation);
}

export async function getRoomFurniture(roomId: string): Promise<FurnitureItemModel[]> {
  return InventoryService.getRoomFurniture(roomId);
}

export async function getCatalog(): Promise<FurnitureDefinitionModel[]> {
  return FurnitureService.getCatalog();
}

export async function getDefinition(id: string): Promise<FurnitureDefinitionModel> {
  return FurnitureService.getDefinition(id);
}

export async function seedCatalog(definitions: Parameters<typeof FurnitureService.seedCatalog>[0]): Promise<number> {
  return FurnitureService.seedCatalog(definitions);
}
