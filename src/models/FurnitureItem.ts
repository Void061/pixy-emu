import type { FurnitureRotation } from "./FurnitureDefinition.js";

export class FurnitureItemModel {
  constructor(
    public readonly id: string,
    public readonly definitionId: string,
    public readonly ownerId: string,
    public readonly roomId: string | null,
    public readonly placedByUserId: string | null,
    public readonly positionX: number | null,
    public readonly positionY: number | null,
    public readonly rotation: FurnitureRotation,
    public readonly currentState: string,
    public readonly placedAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  /** Whether this item is in the owner's inventory (not placed in any room). */
  get isInInventory(): boolean {
    return this.roomId === null;
  }

  /** Whether this item is currently placed in a room. */
  get isPlaced(): boolean {
    return this.roomId !== null;
  }
}
