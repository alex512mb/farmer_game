// ============================================================
// uiRenderer.ts — HUD rendering (hotbar, clock, tooltips)
// All drawn on the canvas overlay layer.
// ============================================================

import { GameState, ItemId, TileType, WorldObjectType } from './types';
import { ITEM_DEFS, HOTBAR_SLOTS, MAP_COLS, MAP_ROWS, TILE_SIZE } from './constants';

const SLOT_SIZE = 48;
const SLOT_GAP = 4;
const SLOT_RADIUS = 6;

/** Draw all HUD elements */
export function renderUI(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasW: number,
  canvasH: number,
  message: string | null,
  messageTimer: number
) {
  drawHotbar(ctx, state, canvasW, canvasH);
  drawClock(ctx, state, canvasW);
  drawMinimap(ctx, state);
  drawItemTooltip(ctx, state, canvasW, canvasH);
  if (message && messageTimer > 0) {
    drawMessage(ctx, message, canvasW, canvasH, messageTimer);
  }
  drawControlsHint(ctx, canvasH);
}

// ---- Hotbar ----

function drawHotbar(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  const totalWidth = HOTBAR_SLOTS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
  const startX = (canvasW - totalWidth) / 2;
  const startY = canvasH - SLOT_SIZE - 16;

  // Background panel
  ctx.fillStyle = 'rgba(20, 20, 30, 0.75)';
  ctx.beginPath();
  ctx.roundRect(startX - 8, startY - 8, totalWidth + 16, SLOT_SIZE + 16, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    const x = startX + i * (SLOT_SIZE + SLOT_GAP);
    const y = startY;
    const isSelected = i === state.player.selectedSlot;

    // Slot background
    ctx.fillStyle = isSelected ? 'rgba(255,220,100,0.3)' : 'rgba(60,60,80,0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, SLOT_SIZE, SLOT_SIZE, SLOT_RADIUS);
    ctx.fill();

    // Selected border
    if (isSelected) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, SLOT_SIZE, SLOT_SIZE, SLOT_RADIUS);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, SLOT_SIZE, SLOT_SIZE, SLOT_RADIUS);
      ctx.stroke();
    }

    // Slot number
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px monospace';
    ctx.fillText(`${i + 1}`, x + 3, y + 12);

    // Draw item icon
    const slot = state.inventory[i];
    if (slot) {
      drawItemIcon(ctx, slot.itemId, x + SLOT_SIZE / 2, y + SLOT_SIZE / 2, 18);

      // Quantity
      if (slot.quantity > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${slot.quantity}`, x + SLOT_SIZE - 4, y + SLOT_SIZE - 4);
        ctx.textAlign = 'left';
      }
    }
  }
}

// ---- Item Icons (procedural vector) ----

export function drawItemIcon(ctx: CanvasRenderingContext2D, itemId: ItemId, cx: number, cy: number, size: number) {
  const s = size / 18; // normalize to base size 18

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  switch (itemId) {
    case ItemId.Hoe:
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(-1, -8, 2, 14);
      ctx.fillStyle = '#888';
      ctx.fillRect(-4, 5, 8, 3);
      break;

    case ItemId.WateringCan:
      ctx.fillStyle = '#4488bb';
      ctx.beginPath();
      ctx.roundRect(-6, -2, 10, 8, 2);
      ctx.fill();
      ctx.fillRect(4, -3, 5, 2);
      ctx.fillStyle = '#3377aa';
      ctx.fillRect(-4, -5, 6, 4);
      break;

    case ItemId.Axe:
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(-1, -8, 2, 14);
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.moveTo(1, -8);
      ctx.lineTo(7, -10);
      ctx.lineTo(7, -4);
      ctx.lineTo(1, -4);
      ctx.closePath();
      ctx.fill();
      break;

    case ItemId.Pickaxe:
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(-1, -6, 2, 14);
      ctx.fillStyle = '#aaa';
      ctx.fillRect(-7, -7, 14, 2);
      ctx.beginPath();
      ctx.moveTo(-7, -7);
      ctx.lineTo(-5, -3);
      ctx.lineTo(-5, -5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(7, -7);
      ctx.lineTo(5, -3);
      ctx.lineTo(5, -5);
      ctx.closePath();
      ctx.fill();
      break;

    case ItemId.RadishSeed:
      ctx.fillStyle = '#c0935a';
      ctx.beginPath();
      ctx.arc(-3, 2, 2.5, 0, Math.PI * 2);
      ctx.arc(2, -1, 2, 0, Math.PI * 2);
      ctx.arc(0, 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(0, -5, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case ItemId.WheatSeed:
      ctx.fillStyle = '#c0935a';
      ctx.beginPath();
      ctx.arc(-3, 2, 2.5, 0, Math.PI * 2);
      ctx.arc(2, -1, 2, 0, Math.PI * 2);
      ctx.arc(0, 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#daa520';
      ctx.fillRect(-1, -8, 2, 5);
      break;

    case ItemId.PumpkinSeed:
      ctx.fillStyle = '#c0935a';
      ctx.beginPath();
      ctx.arc(-3, 2, 2.5, 0, Math.PI * 2);
      ctx.arc(2, -1, 2, 0, Math.PI * 2);
      ctx.arc(0, 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8f00';
      ctx.beginPath();
      ctx.ellipse(0, -4, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;

    case ItemId.Radish:
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(-1, -8, 2, 5);
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(0, 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef5350';
      ctx.beginPath();
      ctx.arc(-2, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case ItemId.Wheat:
      ctx.fillStyle = '#c49a20';
      ctx.fillRect(-1, -2, 2, 10);
      ctx.fillStyle = '#daa520';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse((i % 2 === 0 ? -2 : 2), -4 + i * 3, 3, 1.5, i % 2 === 0 ? -0.3 : 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case ItemId.Pumpkin:
      ctx.fillStyle = '#ff8f00';
      ctx.beginPath();
      ctx.ellipse(0, 2, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.fillStyle = '#4e7d32';
      ctx.fillRect(-1, -6, 2, 4);
      break;

    case ItemId.Wood:
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = '#a07828';
      ctx.beginPath();
      ctx.arc(-4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6b4400';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-6, -3, 12, 6);
      break;

    case ItemId.Stone:
      ctx.fillStyle = '#a0a0a8';
      ctx.beginPath();
      ctx.moveTo(-5, 3);
      ctx.lineTo(-7, -2);
      ctx.lineTo(-3, -5);
      ctx.lineTo(3, -5);
      ctx.lineTo(7, -1);
      ctx.lineTo(5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#707078';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;

    case ItemId.Fence:
      ctx.fillStyle = '#c4a050';
      ctx.fillRect(-4, -6, 2, 12);
      ctx.fillRect(2, -6, 2, 12);
      ctx.fillRect(-5, -3, 10, 2);
      ctx.fillRect(-5, 3, 10, 2);
      break;

    case ItemId.Chest:
      ctx.fillStyle = '#b8860b';
      ctx.fillRect(-7, -2, 14, 9);
      ctx.fillStyle = '#d4a017';
      ctx.fillRect(-7, -5, 14, 4);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(-2, -4, 4, 3);
      break;

    case ItemId.Sprinkler:
      ctx.fillStyle = '#7090b0';
      ctx.fillRect(-3, 2, 6, 6);
      ctx.fillStyle = '#90b0d0';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#506878';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;
  }

  ctx.restore();
}

// ---- Clock ----

function drawClock(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number) {
  const hour = Math.floor(state.time.hour);
  const min = Math.floor((state.time.hour - hour) * 60);
  const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  const dayStr = `Day ${state.time.day}`;

  const panelX = canvasW - 140;
  const panelY = 12;
  const panelW = 128;
  const panelH = 52;

  // Panel background
  ctx.fillStyle = 'rgba(20, 20, 30, 0.75)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Day label
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(dayStr, panelX + panelW / 2, panelY + 22);

  // Time
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '16px monospace';
  ctx.fillText(timeStr, panelX + panelW / 2, panelY + 42);
  ctx.textAlign = 'left';
}

// ---- Item Tooltip ----

function drawItemTooltip(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number) {
  const slot = state.inventory[state.player.selectedSlot];
  if (!slot) return;

  const def = ITEM_DEFS[slot.itemId];
  if (!def) return;

  const tooltipY = canvasH - SLOT_SIZE - 40;

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(def.name, canvasW / 2, tooltipY);
  ctx.textAlign = 'left';
}

// ---- Message Toast ----

function drawMessage(
  ctx: CanvasRenderingContext2D,
  message: string,
  canvasW: number,
  canvasH: number,
  timer: number
) {
  const alpha = Math.min(1, timer * 2);
  ctx.fillStyle = `rgba(20, 20, 30, ${0.7 * alpha})`;
  const msgWidth = ctx.measureText(message).width + 24;
  const msgX = (canvasW - msgWidth) / 2;
  const msgY = canvasH / 2 - 60;
  ctx.beginPath();
  ctx.roundRect(msgX, msgY, msgWidth, 30, 6);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 255, 220, ${alpha})`;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message, canvasW / 2, msgY + 20);
  ctx.textAlign = 'left';
}

// ---- Minimap ----

function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState) {
  const mmSize = 100;
  const mmX = 12;
  const mmY = 12;
  const cellSize = mmSize / MAP_COLS;

  // Background
  ctx.fillStyle = 'rgba(20, 20, 30, 0.75)';
  ctx.beginPath();
  ctx.roundRect(mmX - 4, mmY - 4, mmSize + 8, mmSize + 8, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw tiles (simplified — only every 2nd tile for performance)
  for (let row = 0; row < MAP_ROWS; row += 2) {
    for (let col = 0; col < MAP_COLS; col += 2) {
      const tile = state.tiles[row][col];
      let color: string;
      switch (tile) {
        case TileType.Grass: color = '#4e9638'; break;
        case TileType.Dirt: color = '#b08860'; break;
        case TileType.Tilled: color = '#8b6b42'; break;
        case TileType.Watered: color = '#6b5030'; break;
        case TileType.Water: color = '#4a90d9'; break;
        default: color = '#4e9638';
      }
      ctx.fillStyle = color;
      ctx.fillRect(mmX + col * cellSize, mmY + row * cellSize, cellSize * 2, cellSize * 2);
    }
  }

  // Draw objects as dots
  for (const obj of state.objects) {
    const ox = mmX + obj.col * cellSize;
    const oy = mmY + obj.row * cellSize;
    switch (obj.type) {
      case WorldObjectType.Tree:
        ctx.fillStyle = '#2d8a2d';
        break;
      case WorldObjectType.Stone:
        ctx.fillStyle = '#a0a0a8';
        break;
      default:
        ctx.fillStyle = '#c4a050';
        break;
    }
    ctx.fillRect(ox, oy, cellSize + 0.5, cellSize + 0.5);
  }

  // Draw player position
  const px = mmX + (state.player.x / TILE_SIZE) * cellSize;
  const py = mmY + (state.player.y / TILE_SIZE) * cellSize;
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(px, py, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 1, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Controls Hint ----

function drawControlsHint(ctx: CanvasRenderingContext2D, canvasH: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '11px sans-serif';
  ctx.fillText('WASD: Move | 1-0: Select tool | Click: Use tool | E: Craft menu | Scroll: Zoom', 12, canvasH - 6);
}
