# Portal World Mechanics

## Overview
Portal worlds are temporary dimensional spaces that players can explore to gather unique soil types with specific nutrient profiles. Each portal leads to a different biome with its own visual theme and soil composition.

## Portal Spawning
- **Spawn Time**: Portals spawn at 6 AM (in-game time)
- **Duration**: Each portal remains open for 5 minutes (real-time)
- **Frequency**: One portal spawns per day (minimum 1 day between portals)
- **Location**: Portals spawn 20-50 units away from the player's position
- **Debug**: Press 'P' to force spawn a test portal

## Biome Types
There are 4 portal biome types that can spawn:

### 1. Fertile Valley
- **Nutrients**: N-P-K: 65-65-65 (Balanced)
- **Appearance**: Bright, grassy terrain with colorful flowers
- **Lighting**: Sunny daylight with sky blue fog
- **Best For**: General purpose farming, good for most crops

### 2. Ancient Forest  
- **Nutrients**: N-P-K: 80-40-40 (High Nitrogen)
- **Appearance**: Dark green terrain with tall trees
- **Lighting**: Shaded with green atmospheric fog
- **Best For**: Leafy vegetables, plants that need lots of nitrogen

### 3. Volcanic Ash
- **Nutrients**: N-P-K: 40-80-50 (High Phosphorus)
- **Appearance**: Gray/dark terrain with volcanic rocks
- **Lighting**: Reddish light with gray fog
- **Best For**: Fruiting plants like tomatoes that need phosphorus

### 4. Crystal Caves
- **Nutrients**: N-P-K: 30-40-90 (High Potassium)
- **Appearance**: Purple/indigo terrain with glowing crystals
- **Lighting**: Mystical purple light with deep blue fog
- **Best For**: Root vegetables and plants needing potassium

## Entering Portal Worlds
1. Approach an active portal in the main world
2. When close enough, UI shows "[E] Enter"
3. Press 'E' to enter the portal world
4. Player spawns at coordinates (0, 2, 5) in the portal world

## Portal World Features

### Terrain
- Hexagonal tile-based terrain matching the main world system
- World radius of 20 hexes from center
- Height variation creates rolling hills
- Biome-specific decorations (flowers, trees, rocks, crystals)

### Soil Deposits
- **Count**: 5-10 deposits randomly placed per world
- **Amount**: Each deposit contains 0.5-2.0 hexes worth of soil
- **Appearance**: Glowing spheres matching biome color
- **Collection**: Left-click when near a deposit to collect
- **Animation**: Deposits rotate and bob up/down

### Exit Portal
- **Location**: Center of the world (0, 2, 0)
- **Appearance**: Blue glowing portal with:
  - Rotating frame
  - Particle effects
  - Tall beacon of light for visibility
  - Pulsing opacity animation
- **Interaction**: Press 'E' when near to return to main world

## Soil Collection Mechanics
1. **Finding Deposits**: Look for glowing spheres scattered across the terrain
2. **Collection Range**: Must be within 2 units of a deposit
3. **Inventory**: Collected soil goes directly to inventory
4. **Stack Limits**: Maximum 10 hexes worth per stack
5. **Full Inventory**: Cannot collect if no space available

## Inventory Integration
- Collected soil appears in inventory with:
  - Biome-specific nutrient values
  - Source biome name
  - Quantity in hexes
- Can be split, combined, and placed like any other soil
- Mixing soils creates weighted average nutrients

## Time Management
- Portal timer continues while in portal world
- If portal expires while inside, player can still exit normally
- Portal in main world disappears when timer expires
- No time limit once inside portal world

## UI Indicators
- **Main World**: Shows active portal type and time remaining
- **Portal World**: Shows current biome and exit hint
- **Near Exit**: "[E] Exit" prompt appears
- **Away from Exit**: "(Find blue portal)" hint

## Strategy Tips
1. **Plan Ahead**: Check what nutrients your crops need
2. **Collect Efficiently**: Gather all deposits before exiting
3. **Mix Soils**: Combine different biomes for custom nutrients
4. **Time Management**: Watch the portal timer before entering
5. **Inventory Space**: Ensure you have room before entering

## Technical Notes
- Portal worlds use separate THREE.js scenes
- All portal world assets are cleaned up on exit
- Player and camera are moved between scenes
- Main world state is preserved while in portal
- Performance optimized with proper disposal