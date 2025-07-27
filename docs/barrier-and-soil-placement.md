# Barrier and Soil Placement Documentation

## Overview

The Village Builder game features a sophisticated soil and barrier placement system that allows players to create 3D structures with water simulation and farming capabilities. This document explains how both systems work internally.

## Soil Placement System

### Core Concepts

1. **Hexagonal Grid**: The game uses a hexagonal grid system where each hex has coordinates (q, r) for position and y for height/elevation.

2. **Stacking Rules**: Soil can only be placed:
   - At ground level (y = 0)
   - Directly on top of existing soil (y = currentHeight + 1)
   - No gaps allowed - can't place soil "in mid-air"

3. **Column Tracking**: The system maintains a `soilColumns` map that tracks the maximum height at each (q,r) position.

### Implementation Details

#### The `placeSoil` Method

```typescript
placeSoil(hexCoord: HexCoord3D): boolean
```

1. **Duplicate Check**: Verifies the position doesn't already have soil using a 3D key "q,r,y"
2. **Height Validation**: Ensures placement follows stacking rules
3. **Creation**: Creates a `SoilHex` instance with:
   - 3D mesh with brown color and rough material
   - Shadow casting/receiving enabled
   - Position calculated from hex coordinates
4. **Registration**: 
   - Adds to `soilHexes` map
   - Updates `soilColumns` height tracking
   - Registers with water simulation as loam soil type

### Height Detection and Preview

The system uses raycasting to determine where the player is pointing:

1. **Ground Detection**: Rays cast against ground plane and existing soil meshes
2. **Auto Height**: 
   - When pointing at ground: suggests y = 0
   - When pointing at soil with place tool: suggests y = currentHeight + 1
   - When pointing at soil with other tools: suggests y = currentHeight
3. **Manual Override**: Scroll wheel allows manual height adjustment
4. **Preview System**: Shows transparent hex at the suggested placement position

## Barrier Placement System

### Edge Barriers vs Barrier Soil

The game implements **edge barriers** - walls placed between hexes to block water flow. This is distinct from "barrier soil hexes" which would be impermeable soil blocks.

### Edge Detection

The `detectSharedEdge` method determines which edge the cursor is near:

1. **Horizontal Edges** (between adjacent hexes):
   - Checks all 6 neighboring hexes
   - Calculates distance to edge midpoints
   - Uses 40% of hex size as threshold for edge detection

2. **Vertical Edges** (between stacked hexes):
   - Activated when cursor is within 50% of hex center
   - Bottom edge: between current hex and hex below (y-1)
   - Top edge: between current hex and hex above (y+1)
   - Selection based on cursor Y position relative to hex center

### Barrier Creation

The `createBarrierBetweenHexes` method creates the visual barrier:

1. **Vertical Barriers** (same q,r, different y):
   - Creates horizontal hexagonal plate
   - Positioned at the boundary between two Y levels
   - Scaled to 110% for slight overlap

2. **Horizontal Barriers** (adjacent hexes, same y):
   - Creates vertical wall mesh
   - Positioned at midpoint between hex centers
   - Rotated to align with the specific edge (6 possible orientations)

### Toggle System

The `toggleEdgeBarrier` method implements on/off toggling:

1. **Removal**: If barrier exists at edge, removes mesh and water simulation barrier
2. **Addition**: If no barrier exists, creates mesh and registers with water simulation
3. **Key System**: Uses `sharedEdgeKey` to ensure barriers are bidirectional

## Water Simulation Integration

Both systems integrate with water simulation:

1. **Soil**: Each placed hex is registered with `WaterSimulation` as a container
2. **Barriers**: Edge barriers are registered to block water flow between hexes
3. **Barrier Placement**: Can be placed even on empty sand to prevent water spread

## User Interface

### Tools

- **Shovel (place)**: Places soil hexes
- **Barrier**: Places edge barriers between hexes
- **Remove**: Removes soil (with gravity - hexes above fall down)

### Controls

- **Left Click**: Apply current tool
- **Right Click**: Quick remove (works with any tool selected)
- **Scroll Wheel**: Adjust placement height
- **Shift + Scroll**: Enable manual height mode (place anywhere)

### Visual Feedback

1. **Preview Colors**:
   - Gray: Valid placement position
   - Red: Invalid position or removal preview
   - Transparent: All previews use 50% opacity

2. **Edge Preview**: Shows barrier position and orientation before placement

## Technical Architecture

### Key Classes

1. **SoilHex**: Individual soil hex with mesh and coordinate
2. **SoilManager**: Main controller handling:
   - User input processing
   - Preview updates
   - Placement/removal logic
   - Barrier management
   - Plant system integration

### Data Structures

1. **soilHexes**: Map<string, SoilHex> - All soil hexes by "q,r,y" key
2. **soilColumns**: Map<string, number> - Max height by "q,r" key  
3. **edgeBarrierMeshes**: Map<string, Mesh> - Barrier meshes by edge key

### Performance Considerations

1. **Shared Geometry**: Hexes share geometry for memory efficiency
2. **Raycasting**: Only checks ground plane and soil meshes
3. **Preview Updates**: Only recalculates when mouse moves to new position

## Future Enhancements

1. **Different Soil Types**: Clay, sand, etc. with different water properties
2. **Barrier Materials**: Different barrier types (wood, stone, etc.)
3. **Multi-select**: Place/remove multiple hexes at once
4. **Templates**: Save and load soil configurations