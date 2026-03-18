export type FurnitureRotation = "ne" | "se" | "sw" | "nw";

export interface FurnitureStateInfo {
  id: string;
  label: string;
}

export interface InteractionPointInfo {
  approachTile: { x: number; y: number };
  seatOffset: { x: number; y: number };
}

export class FurnitureDefinitionModel {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly category: string,
    public readonly price: number,
    public readonly sizeW: number,
    public readonly sizeH: number,
    public readonly isWalkable: boolean,
    public readonly isSittable: boolean,
    public readonly isLayable: boolean,
    public readonly isUsable: boolean,
    public readonly rotations: FurnitureRotation[],
    public readonly states: FurnitureStateInfo[],
    public readonly interactionPoints: Partial<Record<FurnitureRotation, InteractionPointInfo>>,
    public readonly zHeight: number,
    public readonly spriteFormat: string,
  ) {}
}
