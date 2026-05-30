// ============================================================
// input.ts — Keyboard & Mouse input management
// ============================================================

import { InputState } from './types';

/**
 * Creates and manages input state, binding to DOM events.
 * Call attach() to start listening and detach() to clean up.
 */
export function createInputManager(canvas: HTMLCanvasElement) {
  const state: InputState = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseWorldX: 0,
    mouseWorldY: 0,
    mouseDown: false,
    mouseClicked: false,
    rightClicked: false,
  };

  // --- Handlers ---

  const onKeyDown = (e: KeyboardEvent) => {
    // Prevent scrolling with WASD/arrows
    if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
    state.keys.add(e.key.toLowerCase());
  };

  const onKeyUp = (e: KeyboardEvent) => {
    state.keys.delete(e.key.toLowerCase());
  };

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      state.mouseDown = true;
      state.mouseClicked = true;
    }
    if (e.button === 2) {
      state.rightClicked = true;
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      state.mouseDown = false;
    }
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  // --- Public API ---

  function attach() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
  }

  function detach() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('contextmenu', onContextMenu);
  }

  /** Call at end of each frame to clear one-frame flags */
  function endFrame() {
    state.mouseClicked = false;
    state.rightClicked = false;
  }

  return { state, attach, detach, endFrame };
}

export type InputManager = ReturnType<typeof createInputManager>;
