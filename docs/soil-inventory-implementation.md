# Soil Inventory Implementation

## Overview

The soil inventory system allows players to collect, store, and manage different types of soil with varying nutrient profiles. This is part of the portal exploration system where players gather resources from other worlds.

## Components

### SoilItem (`src/items/SoilItem.ts`)

Represents a stack of soil with specific properties:
- **Nutrients**: N-P-K percentages (0-100% each)
- **Quantity**: Measured in "hexes worth" (e.g., 2.5 = enough for 2.5 hexes)
- **Moisture**: Always 0% when brought through portal (portal dries soil)
- **Source**: Where the soil was found (e.g., "Ancient Forest")

Key methods:
- `canStackWith()`: Only exact nutrient matches can stack
- `mix()`: Combines two soils using weighted average
- `split()`: Divides stack while preserving nutrient ratios

### SoilInventory (`src/inventory/SoilInventory.ts`)

Manages the player's soil collection:
- **8 slots** for different soil stacks
- **Auto-stacking**: Identical nutrients automatically combine
- **Max stack size**: 10.0 hexes worth per stack
- **Mixing**: Drag stacks together to create weighted average

### SoilInventoryUI (`src/ui/SoilInventoryUI.ts`)

Visual interface for the inventory:
- **Toggle**: Press 'I' to open/close
- **Visual nutrients**: RGB bars represent N-P-K levels
- **Drag & drop**: Combine stacks by dragging
- **Right-click**: Split stacks into smaller portions
- **Tooltips**: Hover to see exact nutrient percentages

## Predefined Soil Types

```typescript
FERTILE_VALLEY: { nitrogen: 65, phosphorus: 65, potassium: 65 }
ANCIENT_FOREST: { nitrogen: 80, phosphorus: 40, potassium: 40 }
VOLCANIC_ASH: { nitrogen: 40, phosphorus: 80, potassium: 50 }
CRYSTAL_CAVES: { nitrogen: 30, phosphorus: 40, potassium: 90 }
DEPLETED_WASTES: { nitrogen: 10, phosphorus: 20, potassium: 15 }
```

## Usage

### Testing
Press 'T' to add test soil to inventory (debug feature)

### Basic Operations
1. **View inventory**: Press 'I'
2. **Combine soils**: Drag one stack onto another
3. **Split stacks**: Right-click and enter amount
4. **Check nutrients**: Hover over any stack

### Stacking Rules
- Only soils with EXACT same N-P-K values stack automatically
- Different soils can be mixed via drag & drop
- Mixing creates weighted average based on quantities

## Integration

The soil inventory is integrated into the main game:
```typescript
// In Game.ts
public readonly soilInventory: SoilInventory;
private soilInventoryUI: SoilInventoryUI;
```

## Next Steps

1. **Soil Sampler Tool**: Preview nutrients before collecting
2. **Placing Soil**: Use inventory soil to modify hex nutrients
3. **Magic Watering Can**: Transport water through portal
4. **Portal Integration**: Actually collect soil from portal world

## Technical Notes

- Quantities use floating point for fractional hexes
- Nutrient percentages rounded to 0.1 for display
- All portal soil arrives with 0% moisture
- Stack splitting preserves exact nutrient ratios