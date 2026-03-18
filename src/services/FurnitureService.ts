import prisma from "../config/prisma.js";
import { FurnitureConverter } from "../converters/index.js";
import type { FurnitureDefinitionModel } from "../models/index.js";

export class FurnitureService {
  /** Get the full furniture catalog. */
  static async getCatalog(): Promise<FurnitureDefinitionModel[]> {
    const defs = await prisma.furnitureDefinition.findMany({
      orderBy: { name: "asc" },
    });
    return defs.map(FurnitureConverter.definitionToModel);
  }

  /** Get a single furniture definition by ID. */
  static async getDefinition(id: string): Promise<FurnitureDefinitionModel> {
    const def = await prisma.furnitureDefinition.findUniqueOrThrow({
      where: { id },
    });
    return FurnitureConverter.definitionToModel(def);
  }

  /** Seed the catalog from an array of definitions (admin/dev use). */
  static async seedCatalog(
    definitions: {
      id: string;
      name: string;
      category?: string;
      price?: number;
      sizeW: number;
      sizeH: number;
      isWalkable?: boolean;
      isSittable?: boolean;
      isLayable?: boolean;
      isUsable?: boolean;
      rotations: string[];
      states: object[];
      interactionPoints: object;
      zHeight?: number;
      spriteFormat?: string;
    }[],
  ): Promise<number> {
    let count = 0;
    for (const def of definitions) {
      await prisma.furnitureDefinition.upsert({
        where: { id: def.id },
        update: {
          name: def.name,
          category: def.category ?? "uncategorized",
          price: def.price ?? 0,
          sizeW: def.sizeW,
          sizeH: def.sizeH,
          isWalkable: def.isWalkable ?? false,
          isSittable: def.isSittable ?? false,
          isLayable: def.isLayable ?? false,
          isUsable: def.isUsable ?? false,
          rotations: def.rotations,
          states: def.states,
          interactionPoints: def.interactionPoints,
          zHeight: def.zHeight ?? 0,
          spriteFormat: def.spriteFormat ?? "png",
        },
        create: {
          id: def.id,
          name: def.name,
          category: def.category ?? "uncategorized",
          price: def.price ?? 0,
          sizeW: def.sizeW,
          sizeH: def.sizeH,
          isWalkable: def.isWalkable ?? false,
          isSittable: def.isSittable ?? false,
          isLayable: def.isLayable ?? false,
          isUsable: def.isUsable ?? false,
          rotations: def.rotations,
          states: def.states,
          interactionPoints: def.interactionPoints,
          zHeight: def.zHeight ?? 0,
          spriteFormat: def.spriteFormat ?? "png",
        },
      });
      count++;
    }
    return count;
  }
}
