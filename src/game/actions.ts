// ============================================================
// actions.ts — Game action handlers (tool usage, farming, etc.)
// Separates game logic from input/rendering.
// ============================================================

import {
  GameState,
  TileType,
  ItemId,
  CropKind,
  GrowthStage,
  CropData,
  WorldObjectType,
  WorldObject,
} from './types';
import { ITEM_DEFS, SEED_TO_CROP, MAP_COLS, MAP_ROWS, RECIPES, TILE_SIZE } from './constants';
import { isValidTile, getObjectAt } from './world';
import { addItemToInventory, removeItemFromInventory, countItem } from './inventory';

/** Maximum distance (in tiles) the player can interact with */
const MAX_INTERACT_DISTANCE = 1.5;

/** Check if the player is close enough to a tile to interact */
function isWithinReach(state: GameState, col: number, row: number): boolean {
  const tileCenterX = col * TILE_SIZE + TILE_SIZE / 2;
  const tileCenterY = row * TILE_SIZE + TILE_SIZE / 2;
  const dx = state.player.x - tileCenterX;
  const dy = state.player.y - tileCenterY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist <= MAX_INTERACT_DISTANCE * TILE_SIZE;
}

/** Use the currently selected tool/item on a target tile */
export function useItemOnTile(
  state: GameState,
  col: number,
  row: number
): string | null {
  if (!isValidTile(col, row)) return null;

  // Distance check — player must be near the target tile
  if (!isWithinReach(state, col, row)) return null;

  const slot = state.inventory[state.player.selectedSlot];
  if (!slot) return null;

  const def = ITEM_DEFS[slot.itemId];
  if (!def) return null;

  // Tool actions
  if (def.isTool) {
    return useToolOnTile(state, slot.itemId, col, row);
  }

  // Seed planting
  if (def.category === 'seed') {
    return plantSeed(state, slot.itemId, col, row);
  }

  // Buildable placement
  if (def.category === 'buildable') {
    return placeBuildable(state, slot.itemId, col, row);
  }

  return null;
}

/** Handle tool-specific actions */
function useToolOnTile(
  state: GameState,
  toolId: ItemId,
  col: number,
  row: number
): string | null {
  const tile = state.tiles[row][col];

  switch (toolId) {
    case ItemId.Hoe:
      // Hoe: convert grass to tilled soil
      if (tile === TileType.Grass) {
        // Check no object on tile
        if (!getObjectAt(state.objects, col, row)) {
          state.tiles[row][col] = TileType.Tilled;
          return 'Tilled the soil';
        }
      }
      // Hoe can also harvest mature crops
      if (state.crops[row][col]?.stage === GrowthStage.Harvestable) {
        return harvestCrop(state, col, row);
      }
      break;

    case ItemId.WateringCan:
      // Water tilled soil
      if (tile === TileType.Tilled) {
        state.tiles[row][col] = TileType.Watered;
        if (state.crops[row][col]) {
          state.crops[row][col]!.wateredToday = true;
        }
        return 'Watered the soil';
      }
      break;

    case ItemId.Axe:
      // Chop trees
      return damageObject(state, col, row, WorldObjectType.Tree, ItemId.Wood, 2);

    case ItemId.Pickaxe:
      // Break stones
      return damageObject(state, col, row, WorldObjectType.Stone, ItemId.Stone, 2);
  }

  return null;
}

/** Damage a world object and drop resources when destroyed */
function damageObject(
  state: GameState,
  col: number,
  row: number,
  targetType: WorldObjectType,
  dropItem: ItemId,
  dropQty: number
): string | null {
  const obj = getObjectAt(state.objects, col, row);
  if (!obj || obj.type !== targetType) return null;

  obj.health -= 1;

  if (obj.health <= 0) {
    // Remove object
    const idx = state.objects.indexOf(obj);
    if (idx >= 0) state.objects.splice(idx, 1);

    // Add resources to inventory
    addItemToInventory(state.inventory, dropItem, dropQty);

    const name = targetType === WorldObjectType.Tree ? 'tree' : 'stone';
    return `Destroyed ${name}, got ${dropQty} ${ITEM_DEFS[dropItem].name}`;
  }

  return `Hit ${targetType} (${obj.health}/${obj.maxHealth})`;
}

/** Plant a seed on tilled/watered soil */
function plantSeed(
  state: GameState,
  seedId: ItemId,
  col: number,
  row: number
): string | null {
  const tile = state.tiles[row][col];
  if (tile !== TileType.Tilled && tile !== TileType.Watered) return null;
  if (state.crops[row][col]) return null; // already a crop here
  if (getObjectAt(state.objects, col, row)) return null;

  const cropKindStr = SEED_TO_CROP[seedId];
  if (!cropKindStr) return null;

  // Remove 1 seed from inventory
  if (!removeItemFromInventory(state.inventory, seedId, 1)) return null;

  const crop: CropData = {
    kind: cropKindStr as CropKind,
    stage: GrowthStage.Seed,
    wateredToday: tile === TileType.Watered,
    dayPlanted: state.time.day,
  };

  state.crops[row][col] = crop;
  return `Planted ${ITEM_DEFS[seedId].name}`;
}

/** Harvest a mature crop */
export function harvestCrop(state: GameState, col: number, row: number): string | null {
  // Distance check
  if (!isWithinReach(state, col, row)) return null;

  const crop = state.crops[row][col];
  if (!crop || crop.stage !== GrowthStage.Harvestable) return null;

  // Determine harvest item
  let harvestItem: ItemId;
  let qty = 1;
  switch (crop.kind) {
    case CropKind.Radish:
      harvestItem = ItemId.Radish;
      qty = 2;
      break;
    case CropKind.Wheat:
      harvestItem = ItemId.Wheat;
      qty = 3;
      break;
    case CropKind.Pumpkin:
      harvestItem = ItemId.Pumpkin;
      qty = 1;
      break;
    default:
      return null;
  }

  addItemToInventory(state.inventory, harvestItem, qty);

  // Clear crop and revert tile to tilled
  state.crops[row][col] = null;
  state.tiles[row][col] = TileType.Tilled;

  return `Harvested ${qty} ${ITEM_DEFS[harvestItem].name}`;
}

/** Place a buildable object */
function placeBuildable(
  state: GameState,
  itemId: ItemId,
  col: number,
  row: number
): string | null {
  const tile = state.tiles[row][col];
  if (tile === TileType.Water) return null;
  if (getObjectAt(state.objects, col, row)) return null;
  if (state.crops[row][col]) return null;

  // Remove 1 from inventory
  if (!removeItemFromInventory(state.inventory, itemId, 1)) return null;

  let objType: WorldObjectType;
  switch (itemId) {
    case ItemId.Fence:
      objType = WorldObjectType.Fence;
      break;
    case ItemId.Chest:
      objType = WorldObjectType.Chest;
      break;
    case ItemId.Sprinkler:
      objType = WorldObjectType.Sprinkler;
      break;
    default:
      return null;
  }

  const obj: WorldObject = {
    type: objType,
    col,
    row,
    health: 5,
    maxHealth: 5,
  };
  state.objects.push(obj);

  return `Placed ${ITEM_DEFS[itemId].name}`;
}

/** Process end-of-day: advance crops, dry soil, apply sprinklers */
export function processEndOfDay(state: GameState) {
  // First, apply sprinklers (water adjacent tiles)
  for (const obj of state.objects) {
    if (obj.type === WorldObjectType.Sprinkler) {
      const adj = [
        { col: obj.col - 1, row: obj.row },
        { col: obj.col + 1, row: obj.row },
        { col: obj.col, row: obj.row - 1 },
        { col: obj.col, row: obj.row + 1 },
      ];
      for (const pos of adj) {
        if (isValidTile(pos.col, pos.row)) {
          if (state.tiles[pos.row][pos.col] === TileType.Tilled) {
            state.tiles[pos.row][pos.col] = TileType.Watered;
            if (state.crops[pos.row][pos.col]) {
              state.crops[pos.row][pos.col]!.wateredToday = true;
            }
          }
        }
      }
    }
  }

  // Advance crop growth for watered crops, then dry all soil
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const crop = state.crops[row][col];
      if (crop && crop.wateredToday && crop.stage < GrowthStage.Harvestable) {
        // Advance 1 stage per watered day
        // (CROP_GROWTH_DAYS can be used later for slower growth)
        crop.stage = Math.min(GrowthStage.Harvestable, crop.stage + 1) as GrowthStage;
        crop.wateredToday = false;
      }

      // Dry watered soil
      if (state.tiles[row][col] === TileType.Watered) {
        state.tiles[row][col] = TileType.Tilled;
      }
    }
  }

  // Advance day
  state.time.day += 1;
  state.time.hour = 6.0;
}

/** Craft a recipe by index */
export function craftRecipe(state: GameState, recipeIndex: number): string | null {
  if (recipeIndex < 0 || recipeIndex >= RECIPES.length) return null;

  const recipe = RECIPES[recipeIndex];

  // Check ingredients
  for (const ing of recipe.ingredients) {
    if (countItem(state.inventory, ing.itemId) < ing.qty) {
      return `Not enough ${ITEM_DEFS[ing.itemId].name}`;
    }
  }

  // Remove ingredients
  for (const ing of recipe.ingredients) {
    removeItemFromInventory(state.inventory, ing.itemId, ing.qty);
  }

  // Add output
  addItemToInventory(state.inventory, recipe.output, recipe.outputQty);

  return `Crafted ${ITEM_DEFS[recipe.output].name}`;
}
