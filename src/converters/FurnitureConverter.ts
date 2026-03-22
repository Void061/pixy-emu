import type { FurnitureDefinition as PrismaDef } from "../generated/prisma/client.js";
import type { FurnitureItem as PrismaItem } from "../generated/prisma/client.js";
import { FurnitureDefinitionModel, type FurnitureRotation, type FurnitureStateInfo, type InteractionPointInfo } from "../models/index.js";
import { FurnitureItemModel } from "../models/index.js";

export class FurnitureConverter {
  static definitionToModel(p: PrismaDef): FurnitureDefinitionModel {
    return new FurnitureDefinitionModel(
      p.id,
      p.name,
      p.category,
      p.price,
      p.sizeW,
      p.sizeH,
      p.isWalkable,
      p.isSittable,
      p.isLayable,
      p.isUsable,
      p.rotations as FurnitureRotation[],
      p.states as unknown as FurnitureStateInfo[],
      p.interactionPoints as unknown as Partial<Record<FurnitureRotation, InteractionPointInfo>>,
      p.zHeight,
      p.spriteFormat,
      p.isStackable,
      p.stackHeight,
    );
  }

  static itemToModel(p: PrismaItem): FurnitureItemModel {
    return new FurnitureItemModel(
      p.id,
      p.definitionId,
      p.ownerId,
      p.roomId,
      p.placedByUserId,
      p.positionX,
      p.positionY,
      p.positionZ,
      p.rotation as FurnitureRotation,
      p.currentState,
      p.placedAt,
      p.createdAt,
    );
  }
}
