# Plant Growth & Interaction Mechanics Design Document
## Village Builder - Advanced Agriculture System

### 1. Overview
This document outlines a sophisticated plant growth system where individual plants compete for space, sunlight, water, and nutrients. Plants grow through predetermined stages, with each stage attempting to claim specific hexagonal spaces. The system creates emergent gameplay where proper spacing and crop planning are essential for optimal yields.

### 2. Core Concepts

#### 2.1 Sub-Grid System
- **Parent Hex**: Each soil hex is subdivided into smaller plant placement positions
- **Sub-Grid Resolution**: 7 positions per hex (1 center + 6 edges)
- **Plant Origin**: Each plant has a root position within the sub-grid
- **Growth Expansion**: Plants claim additional sub-hexes as they grow

#### 2.2 Plant Components
Each plant consists of three component types:
1. **Roots**: Underground, absorb water/nutrients from soil
2. **Stems**: Structural, connect roots to leaves
3. **Leaves**: Above ground, collect sunlight for photosynthesis

#### 2.3 Three-Dimensional Growth
- **Height Layers**: 
  - Underground: -2, -1 (roots)
  - Ground: 0 (base stems)
  - Above: 1, 2, 3+ (stems and leaves)
- **Collision Detection**: No two plants can occupy the same hex at the same height
- **Sunlight Blocking**: Taller plants shade shorter ones

### 3. Growth Stage System

#### 3.1 Stage Definition Structure
```javascript
interface GrowthStage {
  id: number;
  name: string;
  duration: number; // seconds to next stage
  hexPattern: HexOccupation[];
  requirements: {
    water: number;
    nutrients: {N: number, P: number, K: number};
    sunlight: number;
  };
  harvestYield: number; // 0 for non-final stages
}

interface HexOccupation {
  offset: HexCoord;    // Relative to plant origin
  height: number;      // Vertical layer
  type: 'root' | 'stem' | 'leaf';
}
```

#### 3.2 Example: Tomato Plant
```javascript
const tomatoStages = [
  {
    id: 0,
    name: "Seedling",
    duration: 300, // 5 minutes
    hexPattern: [
      {offset: {q:0, r:0}, height: -1, type: 'root'},
      {offset: {q:0, r:0}, height: 0, type: 'stem'},
      {offset: {q:0, r:0}, height: 1, type: 'leaf'}
    ],
    requirements: {water: 0.1, nutrients: {N:1, P:1, K:1}, sunlight: 2}
  },
  {
    id: 1,
    name: "Young Plant",
    duration: 600,
    hexPattern: [
      // Previous stage hexes plus:
      {offset: {q:0, r:0}, height: -2, type: 'root'},
      {offset: {q:1, r:0}, height: -1, type: 'root'},
      {offset: {q:0, r:0}, height: 2, type: 'stem'},
      {offset: {q:1, r:0}, height: 1, type: 'leaf'},
      {offset: {q:-1, r:0}, height: 1, type: 'leaf'}
    ],
    requirements: {water: 0.2, nutrients: {N:2, P:1, K:2}, sunlight: 4}
  },
  {
    id: 2,
    name: "Mature",
    duration: -1, // Final stage
    hexPattern: [
      // Extensive root and leaf system
    ],
    requirements: {water: 0.3, nutrients: {N:3, P:2, K:3}, sunlight: 6},
    harvestYield: 10 // Produces 10 tomatoes
  }
];
```

### 4. Growth Mechanics

#### 4.1 Growth Advancement Process
1. **Requirement Check**: Every tick, check if water/nutrient/sunlight needs are met
2. **Timer Progress**: If requirements met, advance growth timer
3. **Space Check**: When timer completes, check if next stage hexes are available
4. **Growth Decision**:
   - If space available: Advance to next stage, claim new hexes
   - If blocked: Enter "stunted" state, pause growth timer

#### 4.2 Stunted Growth State
```javascript
interface PlantState {
  currentStage: number;
  growthTimer: number;
  isStunted: boolean;
  stuntedBy: PlantId[]; // Which plants are blocking
  resourceConsumption: {
    water: number;      // Reduced to 10% when stunted
    nutrients: number;  // Reduced to 10% when stunted
  };
}
```

#### 4.3 Competition Resolution
- **First Come First Served**: Earlier planted/faster growing plants claim space
- **No Displacement**: Once claimed, a hex cannot be taken by another plant
- **Death Releases Space**: When plants die, their hexes become available

### 5. Resource Consumption

#### 5.1 Water Absorption
```javascript
function calculateWaterAbsorption(plant: Plant): number {
  const rootHexes = plant.hexPattern.filter(h => h.type === 'root');
  let totalAbsorption = 0;
  
  for (const hex of rootHexes) {
    const soilSaturation = getSoilSaturation(hex.worldPosition);
    const depthMultiplier = 1 + (Math.abs(hex.height) * 0.2); // Deeper = better
    totalAbsorption += soilSaturation * depthMultiplier;
  }
  
  return Math.min(totalAbsorption, plant.stage.requirements.water);
}
```

#### 5.2 Nutrient Uptake
- Each root hex can absorb nutrients from its soil hex
- Depletion is distributed across all root hexes
- Deeper roots access different nutrient layers

#### 5.3 Sunlight Collection
```javascript
function calculateSunlight(plant: Plant): number {
  const leafHexes = plant.hexPattern.filter(h => h.type === 'leaf');
  let totalSunlight = 0;
  
  for (const hex of leafHexes) {
    const shading = calculateShading(hex.worldPosition, hex.height);
    const sunlightHours = getDailySunlightHours();
    totalSunlight += (1 - shading) * sunlightHours;
  }
  
  return totalSunlight;
}

function calculateShading(pos: Vector3, height: number): number {
  // Check all hexes above this position
  let shading = 0;
  for (let h = height + 1; h <= MAX_HEIGHT; h++) {
    if (isHexOccupied(pos, h)) {
      shading += 0.5; // Each layer blocks 50% of light
    }
  }
  return Math.min(shading, 0.95); // Always some ambient light
}
```

### 6. Plant Placement Rules

#### 6.1 Initial Placement
- **Valid Positions**: Any unoccupied sub-hex position on soil
- **Preview System**: Show ghost of stage 0 pattern
- **Conflict Display**: Red highlight on blocked hexes
- **Future Growth Preview**: Optional display of mature plant footprint

#### 6.2 Companion Planting
```javascript
interface PlantType {
  id: string;
  companions: string[];      // Plants that grow well together
  antagonists: string[];     // Plants that inhibit each other
  
  // Companion effects
  companionBonus: {
    growthRate: number;      // Multiplier
    pestResistance: number;
    yieldBonus: number;
  };
}
```

### 7. Visual Representation

#### 7.1 Plant Rendering
- **Component-Based**: Separate meshes for roots, stems, leaves
- **Growth Animation**: Smooth transitions between stages
- **Health Indicators**: 
  - Wilting when water-stressed
  - Yellowing when nutrient-deficient
  - Pale when sun-starved
  - Red outline when stunted

#### 7.2 Underground View Mode
- Toggle to see root systems
- Soil saturation overlay
- Nutrient density visualization
- Root competition/crowding indicators

### 8. Harvest System

#### 8.1 Harvest Conditions
- **Maturity**: Only final growth stage produces harvest
- **Health**: Yield reduced by resource deficiency percentage
- **Formula**: `yield = baseYield * min(waterSatisfaction, nutrientSatisfaction, sunlightSatisfaction)`

#### 8.2 Continuous vs Single Harvest
```javascript
interface HarvestBehavior {
  type: 'single' | 'continuous';
  interval?: number;           // For continuous producers
  depletesPlant: boolean;      // Does harvest kill the plant?
  seasonalYield?: number[];    // Yield varies by season
}
```

### 9. Example Plant Types

#### 9.1 Wheat (Simple, Dense)
- **Growth Pattern**: Vertical, narrow
- **Competition**: Can be planted densely
- **Special**: Blocks little sunlight

#### 9.2 Corn (Tall, Wide)
- **Growth Pattern**: Tall with spreading leaves
- **Competition**: Needs spacing, shades neighbors
- **Special**: Deep roots access lower water

#### 9.3 Beans (Climbing)
- **Growth Pattern**: Would grow on corn stalks (future feature)
- **Competition**: Minimal ground footprint
- **Special**: Nitrogen fixing for soil

#### 9.4 Squash (Ground Cover)
- **Growth Pattern**: Horizontal spread
- **Competition**: Claims many ground-level hexes
- **Special**: Leaves shade soil, reduce evaporation

### 10. Performance Optimizations

#### 10.1 Spatial Indexing
```javascript
class PlantSpatialIndex {
  private hexOccupancy: Map<string, PlantId>;
  
  claimHex(coord: HexCoord3D, plantId: PlantId): boolean {
    const key = `${coord.q},${coord.r},${coord.height}`;
    if (this.hexOccupancy.has(key)) {
      return false; // Already occupied
    }
    this.hexOccupancy.set(key, plantId);
    return true;
  }
}
```

#### 10.2 Update Batching
- Group plants by growth stage timer
- Update requirement satisfaction in parallel
- Cache sunlight calculations per height layer

### 11. Future Enhancements

#### 11.1 Procedural Growth
- L-system based growth for trees
- Dynamic branching based on available space
- Competitive phototropism (growing toward light)

#### 11.2 Advanced Interactions
- Allelopathy (chemical inhibition)
- Mycorrhizal networks (fungal nutrient sharing)
- Pest/disease spread mechanics
- Pollination requirements

#### 11.3 Seasonal Variations
- Dormancy periods
- Temperature requirements
- Day length sensitivity
- Perennial vs annual lifecycles