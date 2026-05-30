// ============================================================
// Game.tsx — Main game component with canvas and game loop
// ============================================================

import { useRef, useEffect, useCallback, useState } from 'react';
import { createInputManager, InputManager } from './input';
import { createCamera, updateCamera, screenToWorld } from './camera';
import { updatePlayer } from './player';
import { createGameState } from './world';
import { render } from './renderer';
import { renderUI } from './uiRenderer';
import { useItemOnTile, harvestCrop, processEndOfDay, craftRecipe } from './actions';
import {
  GameState,
  Camera,
  GrowthStage,
} from './types';
import { TILE_SIZE, REAL_SECONDS_PER_GAME_MINUTE, HOTBAR_SLOTS } from './constants';
import CraftingMenu from './CraftingMenu';
import { saveGame, loadGame } from './saveLoad';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const messageRef = useRef<{ text: string; timer: number }>({ text: '', timer: 0 });
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);

  // Use a ref for crafting visibility so the game loop never re-creates
  const showCraftingRef = useRef(false);
  const [showCrafting, _setShowCrafting] = useState(false);
  const [, forceUpdate] = useState(0);

  // Keep ref in sync with state
  const setShowCrafting = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    _setShowCrafting(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      showCraftingRef.current = next;
      return next;
    });
  }, []);

  // Show a message toast
  const showMessage = useCallback((text: string) => {
    messageRef.current = { text, timer: 2.5 };
  }, []);

  // Main game loop — NO React state in deps, uses only refs
  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const state = gameStateRef.current;
    const camera = cameraRef.current;
    const input = inputRef.current;

    if (!canvas || !state || !camera || !input) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Calculate delta time
    const dt = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
    lastTimeRef.current = timestamp;
    gameTimeRef.current += dt;

    // Handle canvas resize
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const cW = canvas.width;
    const cH = canvas.height;

    // Read crafting state from ref (never stale)
    const craftingOpen = showCraftingRef.current;

    // Update mouse world position
    const worldPos = screenToWorld(camera, input.state.mouseX, input.state.mouseY, cW, cH);
    input.state.mouseWorldX = worldPos.wx;
    input.state.mouseWorldY = worldPos.wy;

    // Cursor tile
    const cursorCol = Math.floor(worldPos.wx / TILE_SIZE);
    const cursorRow = Math.floor(worldPos.wy / TILE_SIZE);
    const cursorTile =
      cursorCol >= 0 && cursorCol < state.mapWidth &&
      cursorRow >= 0 && cursorRow < state.mapHeight
        ? { col: cursorCol, row: cursorRow }
        : null;

    // Hotbar selection (number keys 1-9, 0)
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const key = i === 9 ? '0' : `${i + 1}`;
      if (input.state.keys.has(key)) {
        state.player.selectedSlot = i;
      }
    }

    // Toggle crafting menu
    if (input.state.keys.has('e')) {
      input.state.keys.delete('e');
      setShowCrafting(prev => !prev);
    }

    // Tool use on click (only when crafting is closed)
    if (input.state.mouseClicked && cursorTile && !craftingOpen) {
      const crop = state.crops[cursorTile.row]?.[cursorTile.col];
      if (crop && crop.stage === GrowthStage.Harvestable) {
        const msg = harvestCrop(state, cursorTile.col, cursorTile.row);
        if (msg) showMessage(msg);
      } else {
        const msg = useItemOnTile(state, cursorTile.col, cursorTile.row);
        if (msg) showMessage(msg);
      }
    }

    // Update player (freeze when crafting)
    if (!craftingOpen) {
      updatePlayer(state.player, input.state, state, dt);
    }

    // Update camera
    updateCamera(camera, state.player, cW, cH, dt);

    // Advance game time (freeze when crafting)
    if (!craftingOpen) {
      state.time.hour += (dt / REAL_SECONDS_PER_GAME_MINUTE) / 60;

      if (state.time.hour >= 24) {
        processEndOfDay(state);
        saveGame(state);
        showMessage(`Day ${state.time.day} begins! (Game saved)`);
      }
    }

    // Update message timer
    if (messageRef.current.timer > 0) {
      messageRef.current.timer -= dt;
    }

    // Render world + UI
    render(ctx, state, camera, cW, cH, cursorTile, gameTimeRef.current);
    renderUI(ctx, state, cW, cH, messageRef.current.text, messageRef.current.timer);

    // End frame
    input.endFrame();

    animFrameRef.current = requestAnimationFrame(gameLoop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- Intentionally empty: loop uses only refs

  // Scroll wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const camera = cameraRef.current;
      if (!camera) return;
      const zoomDelta = e.deltaY > 0 ? -0.15 : 0.15;
      camera.zoom = Math.max(1, Math.min(4, camera.zoom + zoomDelta));
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // Initialize + start loop (runs once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load or create game state
    const saved = loadGame();
    const state = saved || createGameState();
    gameStateRef.current = state;

    // Camera
    cameraRef.current = createCamera(state.player);

    // Input
    const input = createInputManager(canvas);
    input.attach();
    inputRef.current = input;

    // Welcome message
    if (saved) {
      messageRef.current = {
        text: `Welcome back! Day ${state.time.day} — WASD move, click use tool.`,
        timer: 3,
      };
    } else {
      messageRef.current = {
        text: 'Welcome to Meadow Valley Farm! WASD move, 1-7 select tools, click to use.',
        timer: 5,
      };
    }

    // Start loop
    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      input.detach();
    };
  }, [gameLoop]);

  // Crafting handler
  const handleCraft = useCallback((recipeIndex: number) => {
    const state = gameStateRef.current;
    if (!state) return;
    const msg = craftRecipe(state, recipeIndex);
    if (msg) showMessage(msg);
    forceUpdate(n => n + 1);
  }, [showMessage]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'auto' }}
      />

      {/* Crafting Menu Overlay */}
      {showCrafting && gameStateRef.current && (
        <CraftingMenu
          inventory={gameStateRef.current.inventory}
          onCraft={handleCraft}
          onClose={() => setShowCrafting(false)}
        />
      )}
    </div>
  );
}
