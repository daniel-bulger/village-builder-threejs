# Territory System

## Overview

The Territory System allows players to designate specific areas for individual villagers or groups. This creates a sense of ownership, improves work efficiency, and helps manage the spatial puzzle of village layout. Combined with the portal energy system, it creates interesting optimization challenges.

## Core Concepts

### Territory Definition

A territory is:
- A bounded area on the hex grid
- Assigned to one or more villagers
- Used for specific activities (farming, crafting, living)
- Visible through overlay system

### Territory Properties

```typescript
interface Territory {
  id: string;
  name: string;
  hexes: HexCoord[];
  assignedVillagers: string[];
  type: TerritoryType;
  efficiency: number;
  restrictions: string[];
}

enum TerritoryType {
  FARMING = "farming",
  CRAFTING = "crafting",
  RESIDENTIAL = "residential",
  MIXED = "mixed",
  STORAGE = "storage",
  SOCIAL = "social"
}
```

## Creating Territories

### Drawing Tools

1. **Freehand Tool**
   - Click and drag to select hexes
   - Hold Shift to add hexes
   - Hold Ctrl to remove hexes

2. **Shape Tools**
   - Rectangle: Click and drag
   - Circle: Click center and drag radius
   - Polygon: Click vertices, double-click to close

3. **Smart Fill**
   - Click to fill enclosed areas
   - Respects existing boundaries
   - Options for fill rules

### Territory Rules

- Minimum size: 4 hexes
- Maximum size: 100 hexes (upgradeable)
- Can be non-contiguous
- Cannot overlap (by default)
- Must be within portal energy range

## Territory Management

### Assignment Interface

```
[Territory: North Farm]
Assigned to: Mary the Farmer
Type: Farming
Size: 24 hexes
Efficiency: 85%

[Actions]
- Rename
- Reassign
- Change Type
- Delete
- Merge with...
- Split
```

### Multi-Assignment

Some territories can have multiple villagers:
- Shared workshops
- Communal gardens
- Social areas

Rules for shared territories:
- Define primary owner
- Set access schedules
- Handle resource conflicts

## Efficiency Mechanics

### Base Efficiency

Territory efficiency affects work speed:
- Compact shapes: +20% efficiency
- Near portal: +15% efficiency
- Appropriate size: +10% efficiency
- Good access paths: +10% efficiency

### Size Penalties

- Too small: Cramped (-20% efficiency)
- Too large: Too much travel (-15% efficiency)
- Optimal size varies by task type

### Shape Bonuses

```
Rectangle/Square: +10% (easy navigation)
Circle: +5% (equal distances)
Irregular: -5% (confusing layout)
Scattered: -15% (too much travel)
```

## Territory Types

### Farming Territory
- Requires: Soil, water access
- Benefits from: Sunlight, flat ground
- Optimal size: 15-30 hexes
- Special: Crop rotation bonuses

### Crafting Territory
- Requires: Workshop building
- Benefits from: Storage nearby
- Optimal size: 10-20 hexes
- Special: Tool organization bonuses

### Residential Territory
- Requires: Houses/rooms
- Benefits from: Quiet, views
- Optimal size: 5-10 hexes
- Special: Privacy bonuses

### Storage Territory
- Requires: Containers, shelving
- Benefits from: Central location
- Optimal size: 10-25 hexes
- Special: Inventory management

## Advanced Features

### Territory Overlays

Visual modes:
1. **Ownership View**: Color-coded by villager
2. **Efficiency View**: Heat map of efficiency
3. **Type View**: Icons showing territory purposes
4. **Conflict View**: Highlights overlaps/issues

### Territory Hierarchy

Late-game feature:
- Create districts containing multiple territories
- Assign district managers
- Hierarchical efficiency bonuses
- Shared resources within districts

### Dynamic Territories

Territories that change based on:
- Time of day (market by day, social by night)
- Season (outdoor/indoor seasonal switch)
- Villager mood (expand when happy)

## Villager Behavior

### Territory Preference

Villagers have preferences:
- Hermits: Want isolated territories
- Social: Want adjacent territories
- Neat: Want organized shapes
- Creative: Want irregular spaces

### Territory Defense

Villagers may:
- Chase others from their territory
- Get upset about trespassing
- Share with friends
- Trade territories

### Work Patterns

Within territories, villagers:
- Develop efficient paths
- Organize resources
- Maintain their space
- Personalize with decorations

## Integration with Other Systems

### With Portal Energy
- Territories must fit within work radius
- Energy-efficient territory shapes
- Consider recharge path accessibility

### With Construction
- Buildings define natural boundaries
- Rooms can be territories
- Vertical territories in multi-story buildings

### With Task System
- Tasks spawn within appropriate territories
- Villagers prefer tasks in their territory
- Efficiency bonuses for territory-matched tasks

## UI/UX Design

### Territory Tool Interface

```
[Territory Mode]
├── Draw Tool
│   ├── Freehand
│   ├── Rectangle
│   └── Smart Fill
├── Edit Tool
│   ├── Add Hexes
│   ├── Remove Hexes
│   └── Reshape
├── Assign Tool
│   ├── Select Villager
│   ├── Set Type
│   └── Configure
└── View Options
    ├── Show All
    ├── Show Conflicts
    └── Show Efficiency
```

### Quick Actions

- Right-click hex: Show territory info
- Ctrl+T: Toggle territory overlay
- Double-click territory: Edit mode
- Drag border: Resize territory

## Progression System

### Early Game
- Simple rectangular territories
- One territory per villager
- Basic efficiency understanding

### Mid Game
- Complex shapes for efficiency
- Shared territories
- Territory specialization

### Late Game
- 3D territories (multi-floor)
- District management
- Automated territory optimization
- Territory trading between villagers

## Performance Optimization

### Rendering
- Territories rendered as single mesh
- Overlay uses instanced rendering
- LOD for distant territories
- Cached boundary calculations

### Logic
- Spatial indexing for hex lookup
- Efficiency calculated on change only
- Pathfinding cache per territory
- Batch updates for multiple changes

## Balancing Considerations

### Territory Limits
- Start: 3 territories total
- Per villager: 1-2 territories
- Upgrade: Research system
- Max size: Prevents gaming the system

### Efficiency Curves
- Sharp penalties for extremes
- Gentle bonuses for optimization
- Multiple valid strategies
- Avoid mandatory min-maxing

### Conflict Resolution
- Clear rules for overlaps
- Fair sharing mechanisms
- Happiness penalties for conflicts
- Diplomatic solutions

## Future Expansions

### Advanced Features
- Territory automation rules
- Seasonal territory changes
- Territory defense mini-game
- Cross-territory production chains

### Quality of Life
- Territory templates
- Copy/paste territories
- Bulk assignment tools
- AI-suggested territories