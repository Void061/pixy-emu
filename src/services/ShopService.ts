import prisma from "../config/prisma.js";
import { FurnitureConverter } from "../converters/index.js";
import type { FurnitureDefinitionModel, FurnitureItemModel } from "../models/index.js";

export interface CatalogCategory {
  name: string;
  items: FurnitureDefinitionModel[];
}

export class ShopService {
  /** Get catalog grouped by category. */
  static async getCatalogByCategory(): Promise<CatalogCategory[]> {
    const defs = await prisma.furnitureDefinition.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const grouped = new Map<string, FurnitureDefinitionModel[]>();
    for (const d of defs) {
      const model = FurnitureConverter.definitionToModel(d);
      const list = grouped.get(model.category) ?? [];
      list.push(model);
      grouped.set(model.category, list);
    }

    return Array.from(grouped.entries()).map(([name, items]) => ({ name, items }));
  }

  /** Purchase a furniture item – deducts pixies & creates a FurnitureItem in inventory. */
  static async purchaseItem(
    userId: string,
    definitionId: string,
  ): Promise<{ item: FurnitureItemModel; remainingPixies: number }> {
    const def = await prisma.furnitureDefinition.findUniqueOrThrow({
      where: { id: definitionId },
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.pixies < def.price) {
      throw new Error("Insufficient pixies");
    }

    const [updatedUser, newItem] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { pixies: { decrement: def.price } },
      }),
      prisma.furnitureItem.create({
        data: {
          definitionId,
          ownerId: userId,
        },
      }),
    ]);

    return {
      item: FurnitureConverter.itemToModel(newItem),
      remainingPixies: updatedUser.pixies,
    };
  }

  /** Get user's current pixies balance. */
  static async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return user.pixies;
  }

  /** Set user's pixies balance (admin/dev). */
  static async setBalance(userId: string, amount: number): Promise<number> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { pixies: amount },
    });
    return user.pixies;
  }
}
