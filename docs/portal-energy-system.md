# Portal Energy System

## Overview

The Portal Energy System creates a unique spatial constraint where villagers must periodically return to magical portals to recharge their energy. This mechanic encourages thoughtful village layout and creates interesting logistics challenges as the village grows.

## Core Mechanics

### Energy Basics

Every villager has an energy pool that:
- Starts at 100% each day
- Drains while performing tasks
- Must be recharged at portals
- Limits working distance from last recharge point

### Energy Values

```
Starting Energy: 100 units
Critical Level: 20 units (must recharge)
Exhausted: 0 units (villager stops working)

Drain Rates (per minute):
- Idle: 1 unit
- Walking: 2 units  
- Light Work: 5 units
- Medium Work: 10 units
- Heavy Work: 15 units

Recharge Rate: 200 units/minute (at portal)
```

### Work Radius

Villagers can only work within a certain distance from their last recharge point:

```
Base Work Radius: 50 hexes
Modified by:
- Energy Level: radius = baseRadius * (currentEnergy / 100)
- Villager Traits: +10 hexes for "Energetic" trait
- Portal Upgrades: +20 hexes per upgrade level
```

## Portal Mechanics

### Portal Types

1. **Main Portal**
   - The original portal (permanent)
   - Standard recharge rate
   - 50 hex base radius

2. **Auxiliary Portals**
   - Can be constructed later
   - 75% recharge rate
   - 40 hex base radius
   - Require rare materials

3. **Mini Portals**
   - Temporary/consumable
   - 50% recharge rate
   - 25 hex radius
   - Last for 1 game week

### Portal Upgrades

```
Level 1 (Base)
- Recharge: 200/min
- Radius: 50 hexes
- Queue: 3 villagers

Level 2
- Cost: 100 Crystal Shards
- Recharge: 300/min
- Radius: 70 hexes
- Queue: 5 villagers

Level 3
- Cost: 500 Crystal Shards + Portal Core
- Recharge: 400/min
- Radius: 90 hexes
- Queue: 8 villagers
```

### Recharge Queue

- Multiple villagers can recharge simultaneously (based on portal level)
- Villagers form orderly queues when portal is busy
- Priority system for critical energy levels
- Social villagers chat while waiting (happiness bonus)

## Strategic Implications

### Village Layout

The energy system encourages:
- Centralized design around portals
- Vertical building near portals
- Satellite workstations with mini portals
- Efficient path networks

### Work Scheduling

Players must consider:
- Staggered recharge times
- Task proximity to portals
- Energy-intensive vs light tasks
- Emergency recharge planning

### Building Placement

High-value real estate:
- Adjacent to portals (no travel time)
- Along main paths to portals
- Elevated positions (shorter paths)
- Multiple portal coverage zones

## Visual Indicators

### Energy Display

For each villager:
- Energy bar above head
- Color coding (Green > Yellow > Red)
- Work radius circle (fades as energy drops)
- Recharge needed icon at 20%

### Portal Effects

- Glowing aura showing energy field
- Particle effects during recharge
- Visual queue of waiting villagers
- Range indicator overlay (toggle)

## Gameplay Progression

### Early Game (1-3 villagers)
- Single portal is sufficient
- Simple recharge scheduling
- Small work areas

### Mid Game (4-8 villagers)
- Portal congestion appears
- Need efficient layouts
- Consider first auxiliary portal

### Late Game (9+ villagers)
- Multiple portals required
- Complex recharge logistics
- Energy management tools needed

## Balancing Considerations

### Energy Drain Rates

Calibrated so that:
- Light tasks: 3-4 hours of work per charge
- Medium tasks: 2 hours of work per charge
- Heavy tasks: 1 hour of work per charge

### Recharge Times

- Full recharge: 30 seconds
- Emergency recharge (to 50%): 15 seconds
- Queue wait time: Major friction point

### Portal Costs

- Auxiliary Portal: 500 Stone + 100 Crystal + Portal Fragment
- Mini Portal: 10 Crystal (consumable)
- Upgrades: Exponentially expensive

## Energy Management Tools

### Scheduling System
- Set recharge schedules per villager
- Automatic vs manual modes
- Shift planning for coverage

### Energy Conduits (Late Game)
- Extend energy from portals
- Limited range extension (10 hexes)
- Expensive to build and maintain

### Energy Storage (Future)
- Crystals that store portal energy
- Villagers can carry for extended range
- Limited capacity and duration

## Integration with Other Systems

### Territory System
- Territories should fit within work radius
- Overlapping portal coverage is beneficial
- Energy-efficient territory shapes

### Construction System
- Portal rooms in buildings
- Energy-efficient building layouts
- Vertical expansion near portals

### Task Assignment
- AI considers energy when choosing tasks
- Prioritizes nearby tasks when low
- Plans routes through portal zones

## Technical Implementation

### Energy Tracking
```typescript
interface VillagerEnergy {
  current: number;
  maximum: number;
  drainRate: number;
  lastRechargePosition: Vector3;
  workRadius: number;
  timeSinceRecharge: number;
}
```

### Portal Management
```typescript
interface Portal {
  id: string;
  position: HexCoord;
  type: PortalType;
  level: number;
  rechargeRate: number;
  maxRadius: number;
  rechargeQueue: Villager[];
}
```

### Performance
- Energy updates every 5 seconds
- Radius calculations cached
- Portal fields use shader effects
- Efficient queue management