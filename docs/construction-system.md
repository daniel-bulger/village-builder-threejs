# Modular Construction System

## Overview

The modular construction system allows players to build structures piece-by-piece using individual components rather than placing pre-made buildings. This creates emergent gameplay where the quality and design of structures directly impacts villager happiness and village efficiency.

## Core Concepts

### 1. Building Components

Buildings are constructed from individual pieces that snap together on a grid:

- **Foundation Blocks**: The base of any structure, determines max height
- **Walls**: Define rooms and provide vertical support
- **Floors/Ceilings**: Create multiple levels
- **Roofs**: Complete structures and provide weather protection
- **Doors/Windows**: Functional openings
- **Stairs/Ladders**: Vertical movement between floors
- **Support Structures**: Pillars, beams, and arches for open spaces

### 2. Material Tiers

Each component can be built from different materials, affecting:

- **Support Strength**: How much weight it can bear
- **Durability**: How long it lasts
- **Insulation**: Temperature/weather protection
- **Aesthetic Value**: Contribution to housing quality

Material progression:
1. **Wood**: Basic, supports 2 levels
2. **Stone**: Sturdy, supports 4 levels  
3. **Brick**: Refined, supports 5 levels
4. **Crystal**: Advanced, supports 6 levels
5. **Enchanted**: End-game, supports 8 levels

### 3. Structural Integrity

Buildings must be structurally sound:

- Each component has weight and support values
- Upper levels need adequate support from below
- Unsupported structures will collapse
- Visual indicators show stress points
- Engineering skill improves support calculations

### 4. Housing Quality

Villager satisfaction depends on housing quality:

- **Shelter Score**: Basic protection from elements
- **Space Score**: Square footage per occupant
- **Comfort Score**: Furniture and amenities
- **Beauty Score**: Decorations and materials used
- **Location Score**: Views, noise, proximity to amenities

## Component Types

### Foundation Components

```
Wood Foundation
- Support: 100 units
- Max Height: 2 levels
- Cost: 10 Wood

Stone Foundation  
- Support: 200 units
- Max Height: 4 levels
- Cost: 15 Stone

Reinforced Foundation
- Support: 300 units  
- Max Height: 6 levels
- Cost: 20 Stone + 5 Metal
```

### Wall Components

```
Wall Segment (2x3 meters)
- Weight: 10 units
- Support: 50 units (vertical)
- Materials: Wood/Stone/Brick/Crystal

Wall with Window
- Weight: 8 units
- Support: 40 units
- Provides: Natural light bonus

Wall with Door
- Weight: 8 units
- Support: 40 units  
- Provides: Access point
```

### Special Components

```
Support Pillar
- Weight: 5 units
- Support: 100 units
- Can replace walls for open areas

Decorative Arch
- Weight: 15 units
- Support: 30 units
- Beauty bonus: +10

Balcony
- Weight: 20 units
- Requires: Wall support
- Space bonus: +5
```

## Building Process

1. **Planning Phase**
   - Select component from building menu
   - See ghost preview with validation
   - Red = invalid placement, Green = valid
   
2. **Placement**
   - Snap to hex grid
   - Auto-align with existing structures
   - Check structural support
   
3. **Construction**
   - Instant if materials available
   - Or gradual construction with villager help
   - Scaffolding appears during construction

4. **Modification**
   - Can remove/replace components
   - Must maintain structural integrity
   - Decorations can be added anytime

## Integration with Game Systems

### Villager Housing

- Each villager needs assigned living space
- Higher tier villagers need better housing
- Families can share larger homes
- Workshops can be integrated into homes

### Portal Energy System

- Buildings within portal range function normally
- Buildings outside range have penalties
- Special components can extend energy range
- Energy conduits can connect distant buildings

### Territory System  

- Buildings define territory boundaries
- Villagers claim floors/rooms as workspace
- Efficient building layout improves productivity
- Vertical building keeps territories compact

## UI/UX Design

### Building Mode Interface

```
[Component Categories]
├── Foundations
├── Walls
├── Floors
├── Roofs
├── Doors/Windows
├── Stairs
├── Furniture
└── Decorations

[Selected Component]
- Material selector
- Rotation controls  
- Placement hints
- Cost display
```

### Structural View Mode

- Toggle to see support values
- Color coding for stress levels
- Weight distribution visualization
- Collapse warnings

### Building Inspector

- Click building to see details
- Housing quality breakdown
- Assigned residents
- Upgrade suggestions

## Progression System

### Early Game
- Basic wood structures
- Single level buildings
- Simple layouts

### Mid Game
- Stone construction unlocked
- Multi-level buildings
- Specialized rooms

### Late Game
- Advanced materials
- Complex architecture
- Luxury amenities
- Architectural wonders

## Performance Considerations

- Instance rendering for repeated components
- LOD system for distant buildings
- Occlusion culling for interiors
- Simplified physics for stability checks
- Batched rendering by material type

## Future Expansions

- Weather damage and repairs
- Building decay over time
- Architectural styles/themes
- Community buildings
- Underground construction
- Magical/floating structures