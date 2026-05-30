// ============================================================
// camera.ts — Camera that follows the player with smooth lerp
// ============================================================

import { Camera, Player } from './types';
import { MAP_COLS, MAP_ROWS, TILE_SIZE } from './constants';

/** Create initial camera centered at player */
export function createCamera(player: Player): Camera {
  return {
    x: player.x,
    y: player.y,
    zoom: 2, // 2x zoom for nice close-up view
  };
}

/** Smoothly follow the player each frame */
export function updateCamera(
  cam: Camera,
  player: Player,
  canvasW: number,
  canvasH: number,
  dt: number
) {
  // Lerp towards player position
  const lerpSpeed = 5;
  cam.x += (player.x - cam.x) * Math.min(1, lerpSpeed * dt);
  cam.y += (player.y - cam.y) * Math.min(1, lerpSpeed * dt);

  // Clamp so we don't show outside the map
  const halfViewW = canvasW / (2 * cam.zoom);
  const halfViewH = canvasH / (2 * cam.zoom);
  const mapW = MAP_COLS * TILE_SIZE;
  const mapH = MAP_ROWS * TILE_SIZE;

  cam.x = Math.max(halfViewW, Math.min(mapW - halfViewW, cam.x));
  cam.y = Math.max(halfViewH, Math.min(mapH - halfViewH, cam.y));
}

/** Convert screen coordinates to world coordinates */
export function screenToWorld(
  cam: Camera,
  screenX: number,
  screenY: number,
  canvasW: number,
  canvasH: number
): { wx: number; wy: number } {
  const wx = (screenX - canvasW / 2) / cam.zoom + cam.x;
  const wy = (screenY - canvasH / 2) / cam.zoom + cam.y;
  return { wx, wy };
}

/** Convert world coordinates to screen coordinates */
export function worldToScreen(
  cam: Camera,
  worldX: number,
  worldY: number,
  canvasW: number,
  canvasH: number
): { sx: number; sy: number } {
  const sx = (worldX - cam.x) * cam.zoom + canvasW / 2;
  const sy = (worldY - cam.y) * cam.zoom + canvasH / 2;
  return { sx, sy };
}

/** Get visible tile range for culling */
export function getVisibleTiles(
  cam: Camera,
  canvasW: number,
  canvasH: number
): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
  const halfW = canvasW / (2 * cam.zoom);
  const halfH = canvasH / (2 * cam.zoom);

  const minCol = Math.max(0, Math.floor((cam.x - halfW) / TILE_SIZE) - 1);
  const maxCol = Math.min(MAP_COLS - 1, Math.ceil((cam.x + halfW) / TILE_SIZE) + 1);
  const minRow = Math.max(0, Math.floor((cam.y - halfH) / TILE_SIZE) - 1);
  const maxRow = Math.min(MAP_ROWS - 1, Math.ceil((cam.y + halfH) / TILE_SIZE) + 1);

  return { minCol, maxCol, minRow, maxRow };
}
