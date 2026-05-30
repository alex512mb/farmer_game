// ============================================================
// world.ts — Map generation and tile management
// ============================================================

import {
  GameState,
  TileType,
  WorldObject,
  WorldObjectType,
  ItemId,
  InventorySlot,
  CropData,
} from './types';
import { MAP_COLS, MAP_ROWS, HOTBAR_SLOTS, INVENTORY_SLOTS } from './constants';
import { createPlayer } from './player';

/** Simple seeded pseudo-random for deterministic map gen */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Generate the initial game state with terrain, objects, and starting items */
export function createGameState(): GameState {
  const rand = seededRandom(42);

  // --- Generate tiles ---
  const tiles: TileType[][] = [];
  const crops: (CropData | null)[][] = [];

  for (let row = 0; row < MAP_ROWS; row++) {
    tiles[row] = [];
    crops[row] = [];
    for (let col = 0; col < MAP_COLS; col++) {
      crops[row][col] = null;

      // Create a small pond in center area
      const cx = MAP_COLS / 2;
      const cy = MAP_ROWS / 2;
      const distToCenter = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2);

      if (distToCenter < 3) {
        tiles[row][col] = TileType.Water;
      }
      // Dirt paths around edges
      else if (row < 2 || row >= MAP_ROWS - 2 || col < 2 || col >= MAP_COLS - 2) {
        tiles[row][col] = TileType.Dirt;
      }
      // Some random dirt patches
      else if (rand() < 0.03) {
        tiles[row][col] = TileType.Dirt;
      }
      else {
        tiles[row][col] = TileType.Grass;
      }
    }
  }

  // --- Spawn trees and stones ---
  const objects: WorldObject[] = [];

  for (let row = 3; row < MAP_ROWS - 3; row++) {
    for (let col = 3; col < MAP_COLS - 3; col++) {
      if (tiles[row][col] !== TileType.Grass) continue;

      // Don't spawn near player start (col ~25, row ~25)
      const distToSpawn = Math.abs(col - 25) + Math.abs(row - 25);
      if (distToSpawn < 5) continue;

      const r = rand();
      if (r < 0.04) {
        // Tree
        objects.push({
          type: WorldObjectType.Tree,
          col,
          row,
          health: 3,
          maxHealth: 3,
        });
      } else if (r < 0.06) {
        // Stone
        objects.push({
          type: WorldObjectType.Stone,
          col,
          row,
          health: 3,
          maxHealth: 3,
        });
      }
    }
  }

  // --- Starting inventory ---
  const inventory: InventorySlot[] = new Array(INVENTORY_SLOTS).fill(null);
  inventory[0] = { itemId: ItemId.Hoe, quantity: 1 };
  inventory[1] = { itemId: ItemId.WateringCan, quantity: 1 };
  inventory[2] = { itemId: ItemId.Axe, quantity: 1 };
  inventory[3] = { itemId: ItemId.Pickaxe, quantity: 1 };
  inventory[4] = { itemId: ItemId.RadishSeed, quantity: 15 };
  inventory[5] = { itemId: ItemId.WheatSeed, quantity: 10 };
  inventory[6] = { itemId: ItemId.PumpkinSeed, quantity: 5 };

  // Spawn player south-east of the pond (pond center is 25,25 with radius 3)
  return {
    player: createPlayer(20, 20),
    tiles,
    crops,
    objects,
    inventory,
    hotbarSize: HOTBAR_SLOTS,
    time: { day: 1, hour: 6.0 },
    mapWidth: MAP_COLS,
    mapHeight: MAP_ROWS,
  };
}

/** Check if a tile coordinate is valid */
export function isValidTile(col: number, row: number): boolean {
  return col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS;
}

/** Get world object at a specific tile (if any) */
export function getObjectAt(objects: WorldObject[], col: number, row: number): WorldObject | undefined {
  return objects.find(o => o.col === col && o.row === row);
}

/** Check if a tile is walkable (no solid objects, not water) */
export function isTileWalkable(state: GameState, col: number, row: number): boolean {
  if (!isValidTile(col, row)) return false;
  if (state.tiles[row][col] === TileType.Water) return false;
  const obj = getObjectAt(state.objects, col, row);
  if (obj && (obj.type === WorldObjectType.Tree || obj.type === WorldObjectType.Stone || obj.type === WorldObjectType.Fence)) {
    return false;
  }
  return true;
}
