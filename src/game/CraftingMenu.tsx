// ============================================================
// CraftingMenu.tsx — Crafting UI overlay (React component)
// ============================================================

import { InventorySlot } from './types';
import { RECIPES, ITEM_DEFS } from './constants';
import { countItem } from './inventory';

interface CraftingMenuProps {
  inventory: InventorySlot[];
  onCraft: (recipeIndex: number) => void;
  onClose: () => void;
}

export default function CraftingMenu({ inventory, onCraft, onClose }: CraftingMenuProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="relative bg-gray-900/95 border border-white/20 rounded-xl p-6 min-w-[400px] max-w-[500px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-yellow-400">⚒️ Crafting</h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl leading-none px-2"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {RECIPES.map((recipe, idx) => {
            const def = ITEM_DEFS[recipe.output];
            const canCraft = recipe.ingredients.every(
              ing => countItem(inventory, ing.itemId) >= ing.qty
            );

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  canCraft
                    ? 'border-green-600/50 bg-green-900/20 hover:bg-green-900/40'
                    : 'border-white/10 bg-white/5 opacity-50'
                }`}
              >
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">
                    {def.name} ×{recipe.outputQty}
                  </div>
                  <div className="text-white/50 text-xs mt-1">
                    {recipe.ingredients.map((ing, i) => {
                      const ingDef = ITEM_DEFS[ing.itemId];
                      const have = countItem(inventory, ing.itemId);
                      const enough = have >= ing.qty;
                      return (
                        <span key={i} className={enough ? 'text-green-400' : 'text-red-400'}>
                          {ingDef.name}: {have}/{ing.qty}
                          {i < recipe.ingredients.length - 1 ? ' · ' : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => canCraft && onCraft(idx)}
                  disabled={!canCraft}
                  className={`ml-4 px-4 py-1.5 rounded-md text-sm font-medium ${
                    canCraft
                      ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Craft
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center text-white/30 text-xs">
          Press E to close
        </div>
      </div>
    </div>
  );
}
