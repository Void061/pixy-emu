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
