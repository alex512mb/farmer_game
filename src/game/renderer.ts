// ============================================================
// renderer.ts — Canvas-based vector renderer
// All graphics are procedurally drawn using Canvas2D paths.
// No raster images — pure vector art with clean shapes.
// ============================================================

import {
  Camera,
  GameState,
  TileType,
  Direction,
  PlayerState,
  WorldObjectType,
  WorldObject,
  CropData,
  GrowthStage,
  CropKind,
} from './types';
import { TILE_SIZE } from './constants';
import { getVisibleTiles } from './camera';

// ---- Color Palette ----
const COLORS = {
  grass1: '#5fa845',
  grass2: '#4e9638',
  dirt: '#b08860',
  tilled: '#8b6b42',
  watered: '#6b5030',
  water: '#4a90d9',
  waterHighlight: '#6ab0f0',
  playerBody: '#e8a050',
  playerShirt: '#4488cc',
  playerHair: '#5c3a1e',
  playerPants: '#3366aa',
  treeLeaves: '#2d8a2d',
  treeTrunk: '#8b6914',
  stoneFill: '#a0a0a8',
  stoneOutline: '#707078',
  fencePost: '#c4a050',
  chestBody: '#b8860b',
  sprinklerBody: '#7090b0',
  shadow: 'rgba(0,0,0,0.15)',
};

/** Main render function — called every frame */
export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  canvasW: number,
  canvasH: number,
  cursorTile: { col: number; row: number } | null,
  time: number
) {
  // Clear
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Sky/background color based on time of day
  const skyColor = getSkyColor(state.time.hour);
  ctx.fillStyle = skyColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Save and apply camera transform
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // Get visible tile range for culling
  const visible = getVisibleTiles(camera, canvasW, canvasH);

  // Draw layers in order:
  drawTiles(ctx, state, visible, time);
  drawCrops(ctx, state, visible, time);
  drawWorldObjects(ctx, state, visible, time);
  drawCursorHighlight(ctx, cursorTile, state);
  drawPlayer(ctx, state, time);

  ctx.restore();

  // Draw day/night overlay
  drawDayNightOverlay(ctx, state.time.hour, canvasW, canvasH);
}

// ---- Sky Color ----

function getSkyColor(hour: number): string {
  // Smooth sky color transitions
  if (hour < 7) return '#1a1a2e';      // early morning
  if (hour < 8) return '#2d4a7a';       // sunrise
  if (hour < 18) return '#87CEEB';      // daytime
  if (hour < 20) return '#c47030';      // sunset
  if (hour < 21) return '#2d3050';      // dusk
  return '#0f0f23';                     // night
}

// ---- Tiles ----

function drawTiles(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  visible: { minCol: number; maxCol: number; minRow: number; maxRow: number },
  time: number
) {
  for (let row = visible.minRow; row <= visible.maxRow; row++) {
    for (let col = visible.minCol; col <= visible.maxCol; col++) {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      const tile = state.tiles[row][col];

      switch (tile) {
        case TileType.Grass:
          drawGrassTile(ctx, x, y, col, row, time);
          break;
        case TileType.Dirt:
          drawDirtTile(ctx, x, y);
          break;
        case TileType.Tilled:
          drawTilledTile(ctx, x, y);
          break;
        case TileType.Watered:
          drawWateredTile(ctx, x, y);
          break;
        case TileType.Water:
          drawWaterTile(ctx, x, y, time);
          break;
      }
    }
  }
}

function drawGrassTile(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number, _time: number) {
  // Checkerboard grass pattern
  const isLight = (col + row) % 2 === 0;
  ctx.fillStyle = isLight ? COLORS.grass1 : COLORS.grass2;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  // Small grass details
  ctx.strokeStyle = isLight ? COLORS.grass2 : COLORS.grass1;
  ctx.lineWidth = 0.5;
  const seed = (col * 7 + row * 13) % 5;
  for (let i = 0; i < 2; i++) {
    const gx = x + 6 + ((seed + i * 17) % 20);
    const gy = y + 10 + ((seed + i * 11) % 15);
    ctx.beginPath();
    ctx.moveTo(gx, gy + 4);
    ctx.lineTo(gx + 1, gy);
    ctx.stroke();
  }
}

function drawDirtTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = COLORS.dirt;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Subtle texture dots
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(x + 5, y + 5, 2, 2);
  ctx.fillRect(x + 20, y + 15, 2, 2);
  ctx.fillRect(x + 12, y + 25, 2, 2);
}

function drawTilledTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = COLORS.tilled;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Draw furrows
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const ly = y + 4 + i * 7;
    ctx.beginPath();
    ctx.moveTo(x + 2, ly);
    ctx.lineTo(x + TILE_SIZE - 2, ly);
    ctx.stroke();
  }
}

function drawWateredTile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = COLORS.watered;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Draw wet furrows
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const ly = y + 4 + i * 7;
    ctx.beginPath();
    ctx.moveTo(x + 2, ly);
    ctx.lineTo(x + TILE_SIZE - 2, ly);
    ctx.stroke();
  }
  // Wet sheen
  ctx.fillStyle = 'rgba(100,140,200,0.15)';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

function drawWaterTile(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.fillStyle = COLORS.water;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Animated ripple
  ctx.fillStyle = COLORS.waterHighlight;
  const rippleX = x + 8 + Math.sin(time * 2 + x * 0.1) * 4;
  const rippleY = y + 12 + Math.cos(time * 1.5 + y * 0.1) * 3;
  ctx.beginPath();
  ctx.ellipse(rippleX, rippleY, 6, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Crops ----

function drawCrops(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  visible: { minCol: number; maxCol: number; minRow: number; maxRow: number },
  time: number
) {
  for (let row = visible.minRow; row <= visible.maxRow; row++) {
    for (let col = visible.minCol; col <= visible.maxCol; col++) {
      const crop = state.crops[row][col];
      if (crop) {
        drawCrop(ctx, col * TILE_SIZE, row * TILE_SIZE, crop, time);
      }
    }
  }
}

function drawCrop(ctx: CanvasRenderingContext2D, x: number, y: number, crop: CropData, time: number) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  // Gentle sway
  const sway = Math.sin(time * 2 + x * 0.3) * 0.5;

  switch (crop.stage) {
    case GrowthStage.Seed:
      // Small dots
      ctx.fillStyle = '#8b6c42';
      ctx.beginPath();
      ctx.arc(cx - 2, cy + 6, 2, 0, Math.PI * 2);
      ctx.arc(cx + 2, cy + 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case GrowthStage.Sprout:
      // Tiny green sprout
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 8);
      ctx.lineTo(cx + sway, cy + 2);
      ctx.stroke();
      // Small leaf
      ctx.fillStyle = '#66bb6a';
      ctx.beginPath();
      ctx.ellipse(cx + sway + 2, cy + 3, 3, 1.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case GrowthStage.Medium:
      // Taller plant
      ctx.strokeStyle = '#388e3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 10);
      ctx.lineTo(cx + sway, cy - 2);
      ctx.stroke();
      // Two leaves
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.ellipse(cx + sway - 3, cy + 1, 4, 2, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + sway + 3, cy + 4, 4, 2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case GrowthStage.Mature:
    case GrowthStage.Harvestable:
      drawMatureCrop(ctx, cx, cy, crop.kind, sway, crop.stage === GrowthStage.Harvestable, time);
      break;
  }
}

function drawMatureCrop(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  kind: CropKind,
  sway: number,
  harvestable: boolean,
  time: number
) {
  // Glow effect when harvestable
  if (harvestable) {
    ctx.fillStyle = `rgba(255,255,100,${0.1 + Math.sin(time * 4) * 0.05})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  switch (kind) {
    case CropKind.Radish:
      // Radish: leafy top + red bottom
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx + sway, cy - 6);
      ctx.stroke();
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.ellipse(cx + sway - 2, cy - 5, 4, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + sway + 2, cy - 4, 4, 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Radish bulb
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(cx, cy + 7, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.arc(cx - 1, cy + 6, 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case CropKind.Wheat:
      // Wheat stalk
      ctx.strokeStyle = '#c49a20';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 10);
      ctx.lineTo(cx + sway, cy - 8);
      ctx.stroke();
      // Wheat head
      ctx.fillStyle = '#daa520';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(cx + sway + (i % 2 === 0 ? -2 : 2), cy - 6 + i * 2, 3, 1.2, i % 2 === 0 ? -0.3 : 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case CropKind.Pumpkin:
      // Vine
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 2);
      ctx.quadraticCurveTo(cx, cy - 4, cx + 6, cy);
      ctx.stroke();
      // Pumpkin
      ctx.fillStyle = '#ff8f00';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Segments
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 2);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();
      // Stem
      ctx.fillStyle = '#4e7d32';
      ctx.fillRect(cx - 1, cy - 3, 2, 3);
      break;
  }
}

// ---- World Objects ----

function drawWorldObjects(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  visible: { minCol: number; maxCol: number; minRow: number; maxRow: number },
  time: number
) {
  // Sort by row for proper overlap
  const visibleObjects = state.objects.filter(
    o => o.col >= visible.minCol && o.col <= visible.maxCol &&
         o.row >= visible.minRow && o.row <= visible.maxRow
  ).sort((a, b) => a.row - b.row);

  for (const obj of visibleObjects) {
    const x = obj.col * TILE_SIZE;
    const y = obj.row * TILE_SIZE;

    switch (obj.type) {
      case WorldObjectType.Tree:
        drawTree(ctx, x, y, time, obj);
        break;
      case WorldObjectType.Stone:
        drawStone(ctx, x, y, obj);
        break;
      case WorldObjectType.Fence:
        drawFence(ctx, x, y);
        break;
      case WorldObjectType.Chest:
        drawChest(ctx, x, y);
        break;
      case WorldObjectType.Sprinkler:
        drawSprinkler(ctx, x, y, time);
        break;
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, obj: WorldObject) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  const sway = Math.sin(time * 1.2 + x * 0.05) * 1.5;

  // Shadow
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.fillStyle = COLORS.treeTrunk;
  ctx.fillRect(cx - 3, cy - 2, 6, 16);

  // Leaves (layered circles)
  const healthRatio = obj.health / obj.maxHealth;
  const green = Math.floor(138 * healthRatio);
  ctx.fillStyle = `rgb(45,${green},45)`;

  ctx.beginPath();
  ctx.arc(cx + sway, cy - 10, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgb(60,${green + 20},40)`;
  ctx.beginPath();
  ctx.arc(cx + sway - 5, cy - 6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + sway + 5, cy - 8, 8, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(cx + sway - 3, cy - 13, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, obj: WorldObject) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;

  // Shadow
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 8, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main rock
  const healthRatio = obj.health / obj.maxHealth;
  const brightness = Math.floor(160 * healthRatio + 80);
  ctx.fillStyle = `rgb(${brightness},${brightness},${brightness + 8})`;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 4);
  ctx.lineTo(cx - 10, cy - 2);
  ctx.lineTo(cx - 6, cy - 7);
  ctx.lineTo(cx + 2, cy - 8);
  ctx.lineTo(cx + 9, cy - 4);
  ctx.lineTo(cx + 10, cy + 3);
  ctx.lineTo(cx + 4, cy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.stoneOutline;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawFence(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cx = x + TILE_SIZE / 2;
  ctx.fillStyle = COLORS.fencePost;
  // Two vertical posts
  ctx.fillRect(cx - 6, y + 4, 3, 24);
  ctx.fillRect(cx + 3, y + 4, 3, 24);
  // Horizontal rails
  ctx.fillRect(cx - 8, y + 8, 16, 2);
  ctx.fillRect(cx - 8, y + 18, 16, 2);
  // Outline
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(cx - 6, y + 4, 3, 24);
  ctx.strokeRect(cx + 3, y + 4, 3, 24);
}

function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  // Shadow
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = COLORS.chestBody;
  ctx.fillRect(cx - 10, cy - 4, 20, 14);
  // Lid
  ctx.fillStyle = '#d4a017';
  ctx.fillRect(cx - 10, cy - 8, 20, 6);
  // Clasp
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(cx - 2, cy - 6, 4, 4);
  // Outline
  ctx.strokeStyle = '#6b4400';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 10, cy - 8, 20, 18);
}

function drawSprinkler(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  // Base
  ctx.fillStyle = COLORS.sprinklerBody;
  ctx.fillRect(cx - 4, cy, 8, 8);
  // Head
  ctx.fillStyle = '#90b0d0';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#506878';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Water spray animation
  ctx.strokeStyle = 'rgba(100,180,255,0.4)';
  ctx.lineWidth = 0.5;
  const angle = time * 3;
  for (let i = 0; i < 4; i++) {
    const a = angle + (i * Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
    ctx.stroke();
  }
}

// ---- Cursor Highlight ----

function drawCursorHighlight(
  ctx: CanvasRenderingContext2D,
  cursorTile: { col: number; row: number } | null,
  _state: GameState
) {
  if (!cursorTile) return;
  const x = cursorTile.col * TILE_SIZE;
  const y = cursorTile.row * TILE_SIZE;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  ctx.setLineDash([]);
}

// ---- Player ----

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, time: number) {
  const p = state.player;
  const px = p.x;
  const py = p.y;

  // Walk bob animation
  const isMoving = p.state === PlayerState.Moving;
  const bob = isMoving ? Math.sin(time * 10) * 1.5 : 0;
  const armSwing = isMoving ? Math.sin(time * 10) * 0.3 : 0;

  // Tool swing animation
  const toolAngle = p.state === PlayerState.UsingTool
    ? (1 - p.toolUseTimer / 0.3) * Math.PI * 0.6 - 0.3
    : 0;

  ctx.save();
  ctx.translate(px, py + bob);

  // Shadow
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 10, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body direction offset
  const dirFlip = p.direction === Direction.Left ? -1 : 1;

  // Legs
  ctx.fillStyle = COLORS.playerPants;
  if (isMoving) {
    ctx.fillRect(-3 + Math.sin(time * 10) * 2, 3, 3, 7);
    ctx.fillRect(0 - Math.sin(time * 10) * 2, 3, 3, 7);
  } else {
    ctx.fillRect(-3, 3, 3, 7);
    ctx.fillRect(0, 3, 3, 7);
  }

  // Body/shirt
  ctx.fillStyle = COLORS.playerShirt;
  ctx.beginPath();
  ctx.roundRect(-5, -5, 10, 10, 2);
  ctx.fill();

  // Arms
  ctx.fillStyle = COLORS.playerBody;
  // Left arm
  ctx.save();
  ctx.translate(-6, -2);
  ctx.rotate(-armSwing);
  ctx.fillRect(-1, 0, 2, 7);
  ctx.restore();
  // Right arm (with tool)
  ctx.save();
  ctx.translate(6, -2);
  ctx.rotate(armSwing);
  if (p.state === PlayerState.UsingTool) {
    ctx.rotate(toolAngle * dirFlip);
  }
  ctx.fillRect(-1, 0, 2, 7);

  // Draw tool in hand if using
  if (p.state === PlayerState.UsingTool) {
    const heldItem = state.inventory[p.selectedSlot];
    if (heldItem) {
      drawToolInHand(ctx, heldItem.itemId);
    }
  }
  ctx.restore();

  // Head
  ctx.fillStyle = COLORS.playerBody;
  ctx.beginPath();
  ctx.arc(0, -9, 5, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = COLORS.playerHair;
  ctx.beginPath();
  ctx.arc(0, -11, 5, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#333';
  if (p.direction === Direction.Left || p.direction === Direction.Up) {
    ctx.fillRect(-3, -10, 1.5, 1.5);
    ctx.fillRect(0, -10, 1.5, 1.5);
  } else {
    ctx.fillRect(-1, -10, 1.5, 1.5);
    ctx.fillRect(2, -10, 1.5, 1.5);
  }

  ctx.restore();
}

function drawToolInHand(ctx: CanvasRenderingContext2D, itemId: string) {
  switch (itemId) {
    case 'hoe':
      // Hoe handle
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(-1, 5, 2, 10);
      // Hoe head
      ctx.fillStyle = '#808080';
      ctx.fillRect(-3, 14, 6, 3);
      break;
    case 'watering_can':
      // Can body
      ctx.fillStyle = '#5588bb';
      ctx.fillRect(-2, 5, 5, 6);
      // Spout
      ctx.fillStyle = '#5588bb';
      ctx.fillRect(2, 4, 4, 2);
      break;
    case 'axe':
      // Handle
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(-1, 5, 2, 10);
      // Blade
      ctx.fillStyle = '#a0a0a0';
      ctx.beginPath();
      ctx.moveTo(1, 5);
      ctx.lineTo(5, 3);
      ctx.lineTo(5, 8);
      ctx.lineTo(1, 8);
      ctx.closePath();
      ctx.fill();
      break;
    case 'pickaxe':
      // Handle
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(-1, 5, 2, 10);
      // Pick head
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(-4, 5, 8, 2);
      break;
  }
}

// ---- Day/Night Overlay ----

function drawDayNightOverlay(ctx: CanvasRenderingContext2D, hour: number, w: number, h: number) {
  let alpha = 0;
  if (hour < 7) alpha = 0.4;
  else if (hour < 8) alpha = 0.4 - (hour - 7) * 0.4;
  else if (hour < 18) alpha = 0;
  else if (hour < 20) alpha = (hour - 18) * 0.15;
  else if (hour < 22) alpha = 0.3 + (hour - 20) * 0.05;
  else alpha = 0.4;

  if (alpha > 0) {
    ctx.fillStyle = `rgba(10, 10, 40, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }
}
