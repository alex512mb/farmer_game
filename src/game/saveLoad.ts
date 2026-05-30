// ============================================================
// saveLoad.ts — Save/Load game state to localStorage
// ============================================================

import { GameState } from './types';

const SAVE_KEY = 'meadow_valley_save_v2';

/** Serialize and save game state to localStorage */
export function saveGame(state: GameState): boolean {
  try {
    const json = JSON.stringify(state);
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch {
    console.error('Failed to save game');
    return false;
  }
}

/** Load game state from localStorage. Returns null if no save exists. */
export function loadGame(): GameState | null {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    const state = JSON.parse(json) as GameState;
    // Basic validation
    if (!state.player || !state.tiles || !state.inventory) return null;
    // Validate map dimensions exist
    if (!state.mapWidth || !state.mapHeight) return null;
    return state;
  } catch {
    console.error('Failed to load game');
    return null;
  }
}

/** Check if a save exists */
export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/** Delete saved game */
export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
