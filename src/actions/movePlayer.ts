import type { GameRoomState } from "../rooms/schema/GameRoomState.js";
import type { MoveMessage, AuthData } from "../types/index.js";

export function movePlayer(
  state: GameRoomState,
  auth: AuthData,
  message: MoveMessage,
): void {
  const player = state.players.get(auth.userId);
  if (!player) return;

  if (
    message.x >= 0 && message.x < state.width &&
    message.y >= 0 && message.y < state.height
  ) {
    player.x = message.x;
    player.y = message.y;
    player.direction = message.direction ?? player.direction;
  }
}
