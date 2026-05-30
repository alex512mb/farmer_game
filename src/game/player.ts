// ============================================================
// player.ts — Player creation and update (State Pattern)
// ============================================================

import { Direction, Player, PlayerState, GameState, TileType, WorldObjectType } from './types';
import { InputState } from './types';
import { PLAYER_SPEED, TILE_SIZE, MAP_COLS, MAP_ROWS, TOOL_USE_DURATION } from './constants';

/** Create initial player at a given tile */
export function createPlayer(col: number, row: number): Player {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
    state: PlayerState.Idle,
    direction: Direction.Down,
    selectedSlot: 0,
    toolUseTimer: 0,
  };
}

/**
 * Update player each frame using a State Pattern approach.
 * Each state has its own behavior for movement and transitions.
 */
export function updatePlayer(
  player: Player,
  input: InputState,
  gameState: GameState,
  dt: number
) {
  switch (player.state) {
    case PlayerState.Idle:
      handleIdleState(player, input);
      break;

    case PlayerState.Moving:
      handleMovingState(player, input, gameState, dt);
      break;

    case PlayerState.UsingTool:
      handleToolUseState(player, dt);
      break;
  }
}

// ---- State Handlers ----

function handleIdleState(player: Player, input: InputState) {
  // Transition to moving if WASD pressed
  if (isMovementPressed(input)) {
    player.state = PlayerState.Moving;
    return;
  }

  // Transition to tool use on click (handled by game systems later)
  if (input.mouseClicked) {
    player.state = PlayerState.UsingTool;
    player.toolUseTimer = TOOL_USE_DURATION;
    return;
  }
}

function handleMovingState(player: Player, input: InputState, gameState: GameState, dt: number) {
  // If no movement keys, transition back to idle
  if (!isMovementPressed(input)) {
    player.state = PlayerState.Idle;
    return;
  }

  // Calculate movement vector
  let dx = 0;
  let dy = 0;

  if (input.keys.has('w') || input.keys.has('arrowup'))    dy -= 1;
  if (input.keys.has('s') || input.keys.has('arrowdown'))  dy += 1;
  if (input.keys.has('a') || input.keys.has('arrowleft'))  dx -= 1;
  if (input.keys.has('d') || input.keys.has('arrowright')) dx += 1;

  // Normalize diagonal movement
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
  }

  // Update direction based on dominant axis
  if (Math.abs(dx) > Math.abs(dy)) {
    player.direction = dx > 0 ? Direction.Right : Direction.Left;
  } else if (dy !== 0) {
    player.direction = dy > 0 ? Direction.Down : Direction.Up;
  }

  // Apply movement
  const speed = PLAYER_SPEED * dt;
  let newX = player.x + dx * speed;
  let newY = player.y + dy * speed;

  // Clamp to map bounds
  const margin = 6;
  newX = Math.max(margin, Math.min(MAP_COLS * TILE_SIZE - margin, newX));
  newY = Math.max(margin, Math.min(MAP_ROWS * TILE_SIZE - margin, newY));

  // Collision: try X and Y independently so player slides along walls
  const pr = 5; // player collision radius
  if (canMoveTo(newX, player.y, pr, gameState)) {
    player.x = newX;
  }
  if (canMoveTo(player.x, newY, pr, gameState)) {
    player.y = newY;
  }

  // Check for click during movement -> tool use
  if (input.mouseClicked) {
    player.state = PlayerState.UsingTool;
    player.toolUseTimer = TOOL_USE_DURATION;
  }
}

function handleToolUseState(player: Player, dt: number) {
  player.toolUseTimer -= dt;
  if (player.toolUseTimer <= 0) {
    player.toolUseTimer = 0;
    player.state = PlayerState.Idle;
  }
}

// ---- Collision ----

/** Check if a circular body at (x, y) with radius r can occupy that position */
function canMoveTo(x: number, y: number, r: number, state: GameState): boolean {
  // Check the 4 corners of the player's bounding box
  const checkPoints = [
    { cx: x - r, cy: y - r },
    { cx: x + r, cy: y - r },
    { cx: x - r, cy: y + r },
    { cx: x + r, cy: y + r },
  ];

  for (const pt of checkPoints) {
    const col = Math.floor(pt.cx / TILE_SIZE);
    const row = Math.floor(pt.cy / TILE_SIZE);

    // Out of bounds
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return false;

    // Water tiles are impassable
    if (state.tiles[row][col] === TileType.Water) return false;

    // Check world objects (trees, stones, fences block movement)
    for (const obj of state.objects) {
      if (obj.col === col && obj.row === row) {
        if (
          obj.type === WorldObjectType.Tree ||
          obj.type === WorldObjectType.Stone ||
          obj.type === WorldObjectType.Fence
        ) {
          return false;
        }
      }
    }
  }

  return true;
}

// ---- Helpers ----

function isMovementPressed(input: InputState): boolean {
  return (
    input.keys.has('w') || input.keys.has('a') ||
    input.keys.has('s') || input.keys.has('d') ||
    input.keys.has('arrowup') || input.keys.has('arrowdown') ||
    input.keys.has('arrowleft') || input.keys.has('arrowright')
  );
}

/** Get the tile the player is facing */
export function getFacingTile(player: Player): { col: number; row: number } {
  const col = Math.floor(player.x / TILE_SIZE);
  const row = Math.floor(player.y / TILE_SIZE);

  switch (player.direction) {
    case Direction.Up:    return { col, row: row - 1 };
    case Direction.Down:  return { col, row: row + 1 };
    case Direction.Left:  return { col: col - 1, row };
    case Direction.Right: return { col: col + 1, row };
  }
}

/** Get the tile the player is currently standing on */
export function getPlayerTile(player: Player): { col: number; row: number } {
  return {
    col: Math.floor(player.x / TILE_SIZE),
    row: Math.floor(player.y / TILE_SIZE),
  };
}
