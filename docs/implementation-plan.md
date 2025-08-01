# Implementation Plan: Modular Construction & Spatial Management

## Overview

This document outlines the step-by-step implementation plan for adding the modular construction system, portal energy system, and territory management to the village builder game.

## Phase 1: Foundation Systems (Week 1)

### 1.1 Building Component System
**Priority: Critical**

1. Create `src/construction/BuildingTypes.ts`
   - Define component interfaces
   - Material types and properties
   - Support/weight calculations

2. Create `src/construction/BuildingComponent.ts`
   - Base component class
   - Common properties and methods
   - Rendering setup

3. Create `src/construction/BuildingComponents/`
   - `Foundation.ts`
   - `Wall.ts`
   - `Floor.ts`
   - `Roof.ts`

### 1.2 Basic Placement System
**Priority: Critical**

1. Create `src/construction/BuildingPlacer.ts`
   - Grid snapping logic
   - Preview rendering
   - Basic validation

2. Create `src/construction/BuildingManager.ts`
   - Track all placed components
   - Handle component interactions
   - Save/load preparation

3. Add construction tool to inventory
   - New tool type
   - UI integration

### 1.3 Initial UI
**Priority: High**

1. Create `src/ui/ConstructionUI.ts`
   - Component palette
   - Material selector
   - Basic controls

## Phase 2: Structural Integrity (Week 1-2)

### 2.1 Physics System
**Priority: High**

1. Create `src/construction/StructuralIntegrity.ts`
   - Weight calculations
   - Support distribution
   - Stability checking

2. Add collapse mechanics
   - Detect unsupported structures
   - Collapse animation
   - Damage/cleanup

### 2.2 Visual Feedback
**Priority: Medium**

1. Stress visualization
   - Color coding for load
   - Warning indicators
   - Debug view mode

## Phase 3: Portal Energy System (Week 2)

### 3.1 Energy Core
**Priority: Critical**

1. Create `src/energy/EnergySystem.ts`
   - Energy tracking per villager
   - Drain calculations
   - Recharge mechanics

2. Update `VillagerState` interface
   - Add energy properties
   - Work radius tracking

3. Create `src/energy/PortalEnergy.ts`
   - Portal energy fields
   - Recharge zones
   - Queue management

### 3.2 Energy Integration
**Priority: High**

1. Update `Villager.ts`
   - Energy-based work limitations
   - Recharge behavior
   - Energy UI display

2. Update `VillagerAI.ts`
   - Consider energy in decisions
   - Path to portal when low
   - Task interruption

### 3.3 Energy Visualization
**Priority: Medium**

1. Create `src/ui/EnergyUI.ts`
   - Energy bars
   - Work radius display
   - Portal range overlay

## Phase 4: Territory System (Week 2-3)

### 4.1 Territory Core
**Priority: High**

1. Create `src/territories/Territory.ts`
   - Territory data structure
   - Hex ownership tracking

2. Create `src/territories/TerritoryManager.ts`
   - Territory CRUD operations
   - Assignment logic
   - Conflict detection

### 4.2 Territory Tools
**Priority: High**

1. Create `src/territories/TerritoryDrawer.ts`
   - Drawing tools
   - Selection methods
   - Edit operations

2. Create `src/ui/TerritoryUI.ts`
   - Drawing interface
   - Assignment UI
   - Territory list

### 4.3 Efficiency System
**Priority: Medium**

1. Create `src/territories/TerritoryEfficiency.ts`
   - Efficiency calculations
   - Shape analysis
   - Bonus/penalty system

## Phase 5: Integration & Polish (Week 3-4)

### 5.1 System Integration
**Priority: Critical**

1. Connect construction to villager housing
   - Housing quality calculations
   - Room assignment
   - Happiness impacts

2. Connect energy to construction
   - Buildings need energy access
   - Energy conduits (future)

3. Connect territories to work
   - Task spawning in territories
   - Efficiency bonuses
   - Villager preferences

### 5.2 Advanced Features
**Priority: Medium**

1. Multi-level building support
   - Vertical territories
   - Stair/ladder functionality
   - 3D pathfinding

2. Building persistence
   - Save/load buildings
   - Construction state
   - Territory data

### 5.3 Polish & UX
**Priority: Medium**

1. Tutorial/onboarding
   - Building basics
   - Energy management
   - Territory assignment

2. Visual polish
   - Construction particles
   - Energy effects
   - Territory highlights

## Phase 6: Balancing & Testing (Week 4)

### 6.1 Gameplay Balance
- Energy drain rates
- Construction costs
- Territory size limits
- Efficiency curves

### 6.2 Performance Testing
- Building count stress test
- Territory overlay performance
- Energy calculation optimization

### 6.3 Bug Fixes & Polish
- Edge case handling
- UI improvements
- Player feedback integration

## Technical Milestones

### Milestone 1: Basic Building (End of Week 1)
- [ ] Place foundation blocks
- [ ] Add walls to foundation
- [ ] Basic structural validation
- [ ] Simple construction UI

### Milestone 2: Complete Building System (End of Week 2)
- [ ] All component types working
- [ ] Structural integrity complete
- [ ] Multi-level buildings
- [ ] Full construction UI

### Milestone 3: Energy System (Mid Week 3)
- [ ] Villagers require energy
- [ ] Portal recharging works
- [ ] Energy visualization
- [ ] Work radius limitations

### Milestone 4: Territory System (End of Week 3)
- [ ] Draw and assign territories
- [ ] Territory efficiency working
- [ ] Villager territory behavior
- [ ] Territory UI complete

### Milestone 5: Full Integration (End of Week 4)
- [ ] All systems connected
- [ ] Balanced gameplay
- [ ] Performance optimized
- [ ] Ready for release

## Risk Mitigation

### Technical Risks
1. **Performance with many buildings**
   - Mitigation: Instanced rendering, LOD system
   
2. **Complex structural calculations**
   - Mitigation: Simplified physics, caching

3. **Pathfinding in 3D buildings**
   - Mitigation: Start with 2D, add 3D later

### Design Risks
1. **Too complex for players**
   - Mitigation: Good tutorials, progressive complexity
   
2. **Optimal strategy too rigid**
   - Mitigation: Multiple viable approaches, soft efficiency curves

3. **Micromanagement burden**
   - Mitigation: Automation options, sensible defaults

## Success Criteria

1. Players can build multi-level structures
2. Villagers successfully use energy system
3. Territory assignment improves efficiency
4. Performance remains good with 10+ buildings
5. Systems create interesting decisions
6. New players can learn within 10 minutes

## Dependencies

- Existing villager system
- Hex grid system
- Portal system (for energy)
- Inventory system (for materials)
- UI framework

## Next Steps

1. Review and approve implementation plan
2. Set up project branches
3. Begin Phase 1 implementation
4. Daily progress updates
5. Weekly milestone reviews