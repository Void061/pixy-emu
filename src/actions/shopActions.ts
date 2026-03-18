import { ShopService } from "../services/index.js";
import type { CatalogCategory } from "../services/ShopService.js";
import type { FurnitureItemModel } from "../models/index.js";

export async function getCatalogByCategory(): Promise<CatalogCategory[]> {
  return ShopService.getCatalogByCategory();
}

export async function getBalance(userId: string): Promise<number> {
  return ShopService.getBalance(userId);
}

export async function purchaseItem(
  userId: string,
  definitionId: string,
): Promise<{ item: FurnitureItemModel; remainingPixies: number }> {
  return ShopService.purchaseItem(userId, definitionId);
}

export async function setBalance(userId: string, amount: number): Promise<number> {
  return ShopService.setBalance(userId, amount);
}
