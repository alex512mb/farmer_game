// ============================================================
// inventory.ts — Inventory management utilities
// ============================================================

import { InventorySlot, ItemId } from './types';
import { ITEM_DEFS } from './constants';

/** Add items to inventory, stacking where possible. Returns leftover quantity. */
export function addItemToInventory(
  inventory: InventorySlot[],
  itemId: ItemId,
  quantity: number
): number {
  const def = ITEM_DEFS[itemId];
  if (!def) return quantity;

  let remaining = quantity;

  // First pass: try to stack with existing items
  for (let i = 0; i < inventory.length && remaining > 0; i++) {
    const slot = inventory[i];
    if (slot && slot.itemId === itemId && slot.quantity < def.maxStack) {
      const canAdd = Math.min(remaining, def.maxStack - slot.quantity);
      slot.quantity += canAdd;
      remaining -= canAdd;
    }
  }

  // Second pass: fill empty slots
  for (let i = 0; i < inventory.length && remaining > 0; i++) {
    if (!inventory[i]) {
      const canAdd = Math.min(remaining, def.maxStack);
      inventory[i] = { itemId, quantity: canAdd };
      remaining -= canAdd;
    }
  }

  return remaining; // leftover that didn't fit
}

/** Remove items from inventory. Returns true if successfully removed. */
export function removeItemFromInventory(
  inventory: InventorySlot[],
  itemId: ItemId,
  quantity: number
): boolean {
  // Check total available
  const total = countItem(inventory, itemId);
  if (total < quantity) return false;

  let toRemove = quantity;

  // Remove from last slots first (preserves hotbar items)
  for (let i = inventory.length - 1; i >= 0 && toRemove > 0; i--) {
    const slot = inventory[i];
    if (slot && slot.itemId === itemId) {
      const canRemove = Math.min(toRemove, slot.quantity);
      slot.quantity -= canRemove;
      toRemove -= canRemove;
      if (slot.quantity <= 0) {
        inventory[i] = null;
      }
    }
  }

  return true;
}

/** Count total quantity of an item across all slots */
export function countItem(inventory: InventorySlot[], itemId: ItemId): number {
  let total = 0;
  for (const slot of inventory) {
    if (slot && slot.itemId === itemId) {
      total += slot.quantity;
    }
  }
  return total;
}

/** Swap two inventory slots */
export function swapSlots(inventory: InventorySlot[], indexA: number, indexB: number) {
  const temp = inventory[indexA];
  inventory[indexA] = inventory[indexB];
  inventory[indexB] = temp;
}
