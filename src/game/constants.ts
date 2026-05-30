// ============================================================
// constants.ts — Game-wide constants and configuration
// ============================================================

import { ItemDef, ItemId } from './types';

/** Size of each tile in world pixels */
export const TILE_SIZE = 32;

/** Map dimensions in tiles */
export const MAP_COLS = 50;
export const MAP_ROWS = 50;

/** Player movement speed (pixels per second) */
export const PLAYER_SPEED = 120;

/** Tool use duration in seconds */
export const TOOL_USE_DURATION = 0.3;

/** Time: how many real seconds = 1 game minute */
export const REAL_SECONDS_PER_GAME_MINUTE = 0.5;

/** Total inventory slots */
export const INVENTORY_SLOTS = 20;

/** Hotbar slots (first N of inventory) */
export const HOTBAR_SLOTS = 10;

/** Growth days per crop type: how many watered days per stage */
export const CROP_GROWTH_DAYS: Record<string, number> = {
  radish: 1,    // 4 days total (4 stages × 1)
  wheat: 2,     // 8 days total
  pumpkin: 3,   // 12 days total
};

/** Item definitions registry */
export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  // Tools
  [ItemId.Hoe]:         { id: ItemId.Hoe,         name: 'Hoe',          maxStack: 1,  isTool: true,  category: 'tool' },
  [ItemId.WateringCan]: { id: ItemId.WateringCan, name: 'Watering Can', maxStack: 1,  isTool: true,  category: 'tool' },
  [ItemId.Axe]:         { id: ItemId.Axe,         name: 'Axe',          maxStack: 1,  isTool: true,  category: 'tool' },
  [ItemId.Pickaxe]:     { id: ItemId.Pickaxe,     name: 'Pickaxe',      maxStack: 1,  isTool: true,  category: 'tool' },
  // Seeds
  [ItemId.RadishSeed]:  { id: ItemId.RadishSeed,  name: 'Radish Seeds', maxStack: 99, isTool: false, category: 'seed' },
  [ItemId.WheatSeed]:   { id: ItemId.WheatSeed,   name: 'Wheat Seeds',  maxStack: 99, isTool: false, category: 'seed' },
  [ItemId.PumpkinSeed]: { id: ItemId.PumpkinSeed, name: 'Pumpkin Seeds',maxStack: 99, isTool: false, category: 'seed' },
  // Harvested crops
  [ItemId.Radish]:      { id: ItemId.Radish,      name: 'Radish',       maxStack: 99, isTool: false, category: 'crop' },
  [ItemId.Wheat]:       { id: ItemId.Wheat,        name: 'Wheat',        maxStack: 99, isTool: false, category: 'crop' },
  [ItemId.Pumpkin]:     { id: ItemId.Pumpkin,      name: 'Pumpkin',      maxStack: 99, isTool: false, category: 'crop' },
  // Resources
  [ItemId.Wood]:        { id: ItemId.Wood,         name: 'Wood',         maxStack: 99, isTool: false, category: 'resource' },
  [ItemId.Stone]:       { id: ItemId.Stone,        name: 'Stone',        maxStack: 99, isTool: false, category: 'resource' },
  // Buildables
  [ItemId.Fence]:       { id: ItemId.Fence,        name: 'Fence',        maxStack: 99, isTool: false, category: 'buildable' },
  [ItemId.Chest]:       { id: ItemId.Chest,        name: 'Chest',        maxStack: 99, isTool: false, category: 'buildable' },
  [ItemId.Sprinkler]:   { id: ItemId.Sprinkler,    name: 'Sprinkler',    maxStack: 99, isTool: false, category: 'buildable' },
};

/** Seed → Crop kind mapping */
export const SEED_TO_CROP: Partial<Record<ItemId, string>> = {
  [ItemId.RadishSeed]: 'radish',
  [ItemId.WheatSeed]: 'wheat',
  [ItemId.PumpkinSeed]: 'pumpkin',
};

/** Crafting recipes: output → ingredients */
export const RECIPES: { output: ItemId; outputQty: number; ingredients: { itemId: ItemId; qty: number }[] }[] = [
  { output: ItemId.Fence,     outputQty: 1, ingredients: [{ itemId: ItemId.Wood, qty: 2 }] },
  { output: ItemId.Chest,     outputQty: 1, ingredients: [{ itemId: ItemId.Wood, qty: 10 }, { itemId: ItemId.Stone, qty: 5 }] },
  { output: ItemId.Sprinkler, outputQty: 1, ingredients: [{ itemId: ItemId.Stone, qty: 10 }, { itemId: ItemId.Wood, qty: 5 }] },
];
