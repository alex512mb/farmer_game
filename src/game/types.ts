// ============================================================
// types.ts — All game data types and interfaces
// ============================================================

/** 2D position in world coordinates (pixels) */
export interface Vec2 {
  x: number;
  y: number;
}

/** Grid coordinate (tile column/row) */
export interface GridPos {
  col: number;
  row: number;
}

// ---- Tile System ----

export enum TileType {
  Grass = 'grass',
  Dirt = 'dirt',         // un-tillable path/dirt
  Tilled = 'tilled',    // hoe'd soil ready for planting
  Watered = 'watered',  // tilled + watered
  Water = 'water',       // water source tile
}

// ---- Crop System ----

export enum CropKind {
  Radish = 'radish',
  Wheat = 'wheat',
  Pumpkin = 'pumpkin',
}

export enum GrowthStage {
  Seed = 0,
  Sprout = 1,
  Medium = 2,
  Mature = 3,
  Harvestable = 4,
}

export interface CropData {
  kind: CropKind;
  stage: GrowthStage;
  wateredToday: boolean;
  dayPlanted: number;
}

// ---- Items ----

export enum ItemId {
  // Tools
  Hoe = 'hoe',
  WateringCan = 'watering_can',
  Axe = 'axe',
  Pickaxe = 'pickaxe',
  // Seeds
  RadishSeed = 'radish_seed',
  WheatSeed = 'wheat_seed',
  PumpkinSeed = 'pumpkin_seed',
  // Harvested crops
  Radish = 'radish',
  Wheat = 'wheat',
  Pumpkin = 'pumpkin',
  // Resources
  Wood = 'wood',
  Stone = 'stone',
  // Buildables
  Fence = 'fence',
  Chest = 'chest',
  Sprinkler = 'sprinkler',
}

export interface ItemStack {
  itemId: ItemId;
  quantity: number;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  maxStack: number;
  isTool: boolean;
  category: 'tool' | 'seed' | 'crop' | 'resource' | 'buildable';
}

// ---- Inventory ----

export type InventorySlot = ItemStack | null;

// ---- World Objects ----

export enum WorldObjectType {
  Tree = 'tree',
  Stone = 'stone',
  Fence = 'fence',
  Chest = 'chest',
  Sprinkler = 'sprinkler',
}

export interface WorldObject {
  type: WorldObjectType;
  col: number;
  row: number;
  health: number;       // hits remaining to destroy
  maxHealth: number;
}

// ---- Player State Pattern ----

export enum PlayerState {
  Idle = 'idle',
  Moving = 'moving',
  UsingTool = 'using_tool',
}

export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

export interface Player {
  x: number;             // world pixel position
  y: number;
  state: PlayerState;
  direction: Direction;
  selectedSlot: number;  // hotbar index
  toolUseTimer: number;  // countdown for tool animation
}

// ---- Time ----

export interface GameTime {
  day: number;
  hour: number;   // 6.0 to 24.0 (fractional for minutes)
}

// ---- Full Game State ----

export interface GameState {
  player: Player;
  tiles: TileType[][];           // [row][col]
  crops: (CropData | null)[][];  // [row][col]
  objects: WorldObject[];
  inventory: InventorySlot[];
  hotbarSize: number;
  time: GameTime;
  mapWidth: number;
  mapHeight: number;
}

// ---- Input ----

export interface InputState {
  keys: Set<string>;
  mouseX: number;        // screen coords
  mouseY: number;
  mouseWorldX: number;   // world coords
  mouseWorldY: number;
  mouseDown: boolean;
  mouseClicked: boolean; // true for one frame on click
  rightClicked: boolean;
}

// ---- Camera ----

export interface Camera {
  x: number;  // world position of camera center
  y: number;
  zoom: number;
}
