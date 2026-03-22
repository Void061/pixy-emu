import type { FurnitureRotation } from "../models/index.js";

export function validatePosition(
  positionX: number,
  positionY: number,
  roomWidth: number,
  roomHeight: number,
): void {
  if (
    positionX < 0 || positionY < 0 ||
    positionX >= roomWidth || positionY >= roomHeight
  ) {
    throw new Error("Invalid position: furniture cannot be placed outside room bounds");
  }
}

/** Compute all tiles occupied by a furniture piece, accounting for rotation. */
export function getOccupiedTilesServer(
  positionX: number,
  positionY: number,
  sizeW: number,
  sizeH: number,
  rotation: FurnitureRotation,
): { x: number; y: number }[] {
  const isFlipped = rotation === "ne" || rotation === "sw";
  const tw = isFlipped ? sizeH : sizeW;
  const th = isFlipped ? sizeW : sizeH;
  const tiles: { x: number; y: number }[] = [];
  for (let dx = 0; dx < tw; dx++) {
    for (let dy = 0; dy < th; dy++) {
      tiles.push({ x: positionX + dx, y: positionY + dy });
    }
  }
  return tiles;
}

/** Validate that ALL tiles of a multi-tile furniture are within room bounds. */
export function validateMultiTilePosition(
  positionX: number,
  positionY: number,
  sizeW: number,
  sizeH: number,
  rotation: FurnitureRotation,
  roomWidth: number,
  roomHeight: number,
): void {
  const tiles = getOccupiedTilesServer(positionX, positionY, sizeW, sizeH, rotation);
  for (const t of tiles) {
    if (t.x < 0 || t.y < 0 || t.x >= roomWidth || t.y >= roomHeight) {
      throw new Error("Invalid position: furniture cannot be placed outside room bounds");
    }
  }
}
