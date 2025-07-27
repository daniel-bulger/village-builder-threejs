# Hexagonal Voxel Fluid Mechanics Design Document
## Village Builder - Simplified Water Simulation System

### 1. Overview
This document outlines a simplified fluid mechanics system using hexagonal voxels specifically for farming areas only. The hex grid is NOT used for the entire world - only where players place farm soil. Buildings, paths, and other game elements use free placement without grid constraints.

### 2. Core Concepts

#### 2.1 Hybrid Placement System
**Hex Grid (Farming Only)**:
- Soil placement snaps to hexagonal grid
- Water simulation runs on hex grid
- Crop placement aligned to hex centers
- Irrigation channels follow hex edges

**Free Placement (Everything Else)**:
- Buildings placed anywhere
- Paths and roads have no grid constraints  
- Decorations, trees, rocks placed freely
- NPCs and players move continuously

#### 2.2 Hexagonal Grid System
- **Dynamic Grid**: Hex grid only exists where farm soil is placed
- **Grid Structure**: Flat-topped hexagons arranged in offset rows
- **Voxel Size**: 1-2 meter hexagons (adjustable for performance)
- **Vertical Layers**: 3-5 layers deep for soil depth simulation
- **Coordinate System**: Axial coordinates (q, r) for efficient neighbor calculations

#### 2.3 Why Hexagons?
- **Natural Flow**: 6 neighbors provide smoother water distribution than 4 (square) or 8 (square with diagonals)
- **No Diagonal Issues**: Equal distance to all neighbors
- **Visual Appeal**: More organic appearance for farmland
- **Irrigation Patterns**: Creates interesting canal/channel designs

### 3. Water Saturation Model

#### 3.1 Core Simplification
- **Desert Sand**: Infinite permeability, zero water retention - water instantly disappears
- **Farm Hexes Only**: Only imported soil (loam, clay) retains water
- **Isolated Systems**: Each connected group of farm hexes is simulated independently
- **Edge Drainage**: Water flowing to desert hexes is removed from simulation

#### 3.2 Hex Properties
Farm hexes only (desert hexes not simulated):
```javascript
{
  saturation: 0.0-1.0,      // Current water content
  capacity: 0.0-1.0,        // Max water holding (varies by soil type)
  permeability: 0.0-1.0,    // How fast water moves through
  elevation: integer,       // Height for gravity flow
  soilType: enum,           // Loam, clay, tilled (no sand)
  hasPlant: boolean,        // Plant water consumption
  temperature: 0.0-1.0      // Affects evaporation rate
}
```

#### 3.3 Tick System
- **Update Rate**: 1 tick per second (configurable)
- **Processing**: Each farm cluster updated independently (perfect for parallelization)
- **Farm Detection**: Connected component analysis to identify farm clusters

### 4. Water Movement Formula

#### 4.1 Basic Flow Equation
For each hex, water flows to neighbors based on:

```
flowRate = (saturationDiff * permeability * gravityMultiplier) * deltaTime

Where:
- saturationDiff = source.saturation - target.saturation
- permeability = average(source.permeability, target.permeability)
- gravityMultiplier = 1.0 + (elevationDiff * GRAVITY_FACTOR)
```

#### 4.2 Distribution Algorithm
Each tick, for each hex:
1. Calculate potential flow to each neighbor
2. If total outflow > available water, scale proportionally
3. Apply flows simultaneously to prevent order dependencies
4. Update saturation levels

#### 4.3 Special Cases
- **Oversaturation**: Excess water flows to lowest neighbor or pools on surface
- **Desert Drainage**: Water flowing to non-farm hexes is instantly removed
- **Blocked Hexes**: Buildings/rocks have 0 permeability
- **Water Sources**: Wells/channels can have fixed saturation
- **Farm Boundaries**: Automatic drainage when water reaches farm edge

### 5. Soil Types & Properties

| Soil Type | Capacity | Permeability | Evaporation | Notes |
|-----------|----------|--------------|-------------|--------|
| Desert    | 0.0      | ∞           | N/A         | Not simulated - instant drainage |
| Loam      | 0.6      | 0.5         | Medium      | Ideal for most crops |
| Clay      | 0.8      | 0.2         | Low         | Holds water, slow drainage |
| Rock      | 0.0      | 0.0         | N/A         | Blocks water flow |
| Tilled    | +0.1     | +0.2        | +10%        | Modifier to imported soil |

### 6. Environmental Effects

#### 6.1 Evaporation
```
evaporation = baseRate * temperature * (1 - humidity) * exposureFactor
```
- Surface hexes evaporate faster
- Plants reduce evaporation (shade/cover)
- Time of day affects temperature

#### 6.2 Plant Water Consumption
```
consumption = plantType.baseConsumption * growthStage * (1 - saturation)
```
- Plants extract water from their hex and adjacent hexes
- Consumption varies by growth stage
- Wilting occurs below minimum saturation

#### 6.3 Rain/Irrigation
- **Rain**: Adds water to all exposed surface hexes
- **Sprinklers**: Add water in radius pattern
- **Channels**: Act as high-saturation hexes that distribute water

### 7. Optimization Strategies

#### 7.1 Farm Cluster Management
- Identify connected components of farm hexes
- Each cluster simulated independently
- Desert boundaries handle automatic drainage
- Clusters can be processed in parallel

#### 7.2 Level of Detail
- Distant farms use simplified simulation
- Merge hex groups into larger cells
- Update distant areas less frequently

#### 7.3 GPU Acceleration
- Water flow calculations ideal for compute shaders
- Store hex data in textures
- Parallel processing of independent hex updates

### 8. Visual Representation

#### 8.1 Saturation Visualization
- **Dry (0-0.2)**: Cracked, light brown texture
- **Moist (0.2-0.6)**: Dark brown, healthy soil
- **Wet (0.6-0.9)**: Darker, slight shine
- **Waterlogged (0.9-1.0)**: Puddles, reflective surface

#### 8.2 Flow Indicators
- Subtle particle effects for active water movement
- Directional darkening showing flow paths
- Optional "debug view" showing saturation numbers

### 9. Gameplay Integration

#### 9.1 Player Interactions

**Placing Soil (Hex-Snapped)**:
- Ghost hex appears showing where soil will be placed
- Snaps to nearest hex position
- Shows connections to existing farm hexes
- Highlights if placement would create new cluster

**Using Farm Tools (Hex-Aligned)**:
- **Watering Can**: Targets specific hex, shows radius
- **Bucket**: Larger water addition to hex
- **Shovel**: Create channels along hex edges
- **Hoe**: Till soil hex (increase capacity/permeability)

**Everything Else (Free Placement)**:
- Buildings placed with pixel precision
- Paths curve naturally without grid constraints
- Decorations rotated to any angle
- Storage containers placed anywhere

#### 9.2 Irrigation Tools
- **Channels**: Connect water sources to fields
- **Gates**: Control flow between areas
- **Pumps**: Move water uphill (energy cost)
- **Reservoirs**: High-capacity storage hexes

#### 9.3 Feedback Systems
- Color-coded moisture indicators
- Plant health visuals
- Water flow animations
- Efficiency metrics (water usage, coverage)

### 10. Implementation Example

```javascript
class FarmSimulation {
  farmClusters: Map<ClusterId, FarmCluster>;
  
  tick() {
    // Process each farm independently (parallelizable)
    for (const [id, cluster] of this.farmClusters) {
      this.updateCluster(cluster);
    }
  }
  
  updateCluster(cluster: FarmCluster) {
    const flows = new Map();
    
    // Calculate flows within cluster
    for (const [coord, hex] of cluster.hexes) {
      const neighbors = getNeighbors(coord);
      for (const neighborCoord of neighbors) {
        if (!cluster.hexes.has(neighborCoord)) {
          // Water flows out to desert - remove it
          const drainFlow = hex.saturation * DRAIN_RATE;
          flows.set([coord, 'drain'], drainFlow);
        } else {
          // Normal flow between farm hexes
          const neighbor = cluster.hexes.get(neighborCoord);
          const flow = calculateFlow(hex, neighbor);
          flows.set([coord, neighborCoord], flow);
        }
      }
    }
    
    // Apply all flows
    for (const [[from, to], amount] of flows) {
      if (to === 'drain') {
        cluster.hexes.get(from).saturation -= amount;
        cluster.waterLostToDesert += amount; // Track for UI
      } else {
        cluster.hexes.get(from).saturation -= amount;
        cluster.hexes.get(to).saturation += amount;
      }
    }
  }
  
  // Detect farm clusters when soil is placed/removed
  rebuildClusters() {
    this.farmClusters = findConnectedComponents(
      hex => hex.soilType !== 'desert'
    );
  }
}
```

### 10.1 Benefits of Simplified Model

#### Performance
- **Minimal Memory**: No grid data for non-farm areas
- **Dynamic Creation**: Hex grid created only when soil placed
- **Reduced Computation**: Only simulate actual farm hexes
- **Perfect Parallelization**: Each farm cluster independent
- **No Global State**: No world grid, only farm clusters
- **Predictable Cost**: Performance scales with farm size only

#### Gameplay
- **Natural Boundaries**: Desert creates clear farm borders
- **Water Conservation**: Every drop counts when desert drains it
- **Strategic Placement**: Players must plan efficient layouts
- **Clear Feedback**: Easy to see where water is being lost

### 11. Balancing Considerations

#### 11.1 Realism vs Gameplay
- Desert drainage creates natural challenge
- Players must carefully plan farm boundaries
- Water conservation becomes critical
- Encourages compact, efficient farm designs

#### 11.2 Difficulty Scaling
- Early game: Generous water retention
- Mid game: Introduction of evaporation
- Late game: Complex multi-layer irrigation

#### 11.3 Performance Targets
- 10,000 active hexes at 60 FPS
- 100,000 total hexes with LOD
- Sub-16ms update time per tick

### 12. Implementation Details

#### 12.1 Dynamic Hex Creation
```javascript
class FarmManager {
  // When player places soil
  placeSoil(worldPos: Vector3) {
    const hexCoord = worldToHex(worldPos);
    const clusterId = findNearbyCluster(hexCoord);
    
    if (clusterId) {
      // Add to existing cluster
      clusters.get(clusterId).addHex(hexCoord);
    } else {
      // Create new cluster
      const newCluster = new FarmCluster();
      newCluster.addHex(hexCoord);
      clusters.set(newId(), newCluster);
    }
  }
}
```

#### 12.2 Hex-World Coordinate Conversion
- World space: Continuous 3D coordinates
- Hex space: Discrete hexagonal coordinates
- Conversion happens only for farming interactions
- Visual hex overlay appears when placing soil

### 13. Future Expansions
- **Nutrients**: N-P-K values per hex
- **Contamination**: Pollution/salt spreading
- **Seasonal Effects**: Frozen soil, snow melt
- **Underground Water**: Aquifer simulation
- **Erosion**: Soil movement with water flow