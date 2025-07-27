# Portal Soil Exploration System Design

## Overview

Players can explore the portal world to discover soil with varying nutrient profiles and water sources. This creates a resource gathering loop where players search for high-quality soil to improve their farms.

## Core Mechanics

### Soil as an Item

Each soil item has:
- **Nutrient Profile**: N-P-K percentages (0-100% each)
- **Quantity**: Float value representing "hexes worth" (e.g., 2.5 = enough for 2.5 hexes)
- **Moisture**: Always 0% when brought through portal (portal dries it out)
- **Source**: Where it was found (for tracking/lore)

### Inventory System

- **Dedicated soil slots**: 6-10 slots specifically for soil stacks
- **Stacking rules**: Only exact N-P-K matches stack together
  - Example: 50-50-50 soil won't stack with 50-50-51 soil
- **Stack size limit**: 10.0 hexes worth per stack
- **Precision**: Quantities can be fractional (0.1 hex increments)

### Soil Mixing Mechanic

Players can combine different soil stacks anywhere:
- **Weighted average**: Result uses quantity-weighted averages
  - Example: 1.0 hex of 80-20-40 + 3.0 hexes of 40-60-20 = 4.0 hexes of 50-50-25
- **Basic operations**: 
  - Combine two stacks (weighted average)
  - Split stack (preserves nutrient ratios in both halves)
- **No nutrient separation**: Cannot split into different nutrient profiles
- **Precision display**: Show exact percentages when mixing

### Portal World Generation

Different biomes have characteristic soil profiles:
- **Fertile Valley**: High balanced nutrients (60-70% all)
- **Ancient Forest**: High nitrogen (80-40-40)
- **Volcanic Ash**: High phosphorus (40-80-50)
- **Crystal Caves**: High potassium (30-40-90)
- **Depleted Wastes**: Low nutrients (10-20-15)

### Water Collection

- **Magic Watering Can**: Only way to transport water through portal
- **Capacity tiers**: 
  - Small can: 1000mL (early game)
  - Medium can: 5000mL 
  - Large can: 20000mL (late game)
- **Portal effect**: Regular containers lose water when crossing
- **Water sources**: Streams, pools, springs in portal world

### Soil Sampler Tool

- **Basic function**: Preview exact N-P-K values before collecting
- **Usage**: Equip and click on soil to analyze
- **Range**: Must be adjacent to soil
- **Instant results**: No delay or resource cost
- **Future upgrade**: Long-range scanner tunable to specific nutrients

## Gameplay Loop

1. **Prepare for expedition**: Empty inventory, bring magic watering can
2. **Explore portal biomes**: Look for interesting soil deposits
3. **Sample soil**: Use soil sampler to check nutrients before collecting
4. **Strategic collection**: Decide what to take based on farm needs
5. **Return and mix**: Combine soils for optimal blends
6. **Apply to farm**: Place custom soil on hexes and add water

## UI/UX Considerations

### Soil Inspector Tool
- **Hover to preview**: See nutrients before picking up
- **Comparison mode**: Compare with current inventory
- **Collection preview**: Show what happens if you mix

### Inventory Management
- **Sort by nutrient**: Group similar profiles
- **Quick-stack**: Auto-combine matching soils
- **Split stacks**: Divide for precise mixing

## Suggested Enhancements

### 1. Visual Indicators (Later)
- **Subtle hue shifts**: Faint color based on dominant nutrient
- **Long-range scanner**: Tunable to highlight specific nutrients
- **Deposit markers**: Visual cues for high-quality soil

### 2. Advanced Tools
- **Nutrient extractor**: Late-game station to adjust nutrient ratios
- **Bulk transport**: Carts or portals for moving large quantities
- **Precision tools**: Split stacks to exact decimal amounts

### 3. Water System Expansion
- **Watering can upgrades**: Increase capacity and efficiency
- **Water quality**: Different sources provide bonus effects
- **Irrigation**: Late-game automated watering

### 4. Biome Variety
- **More biomes**: Each with signature nutrient profiles
- **Rare deposits**: Occasional high-concentration spots
- **Environmental hazards**: Challenges during collection

## Implementation Phases

### Phase 1: Basic System
- Soil items with N-P-K values
- Simple inventory (6 slots)
- Basic mixing (drag to combine)
- One portal biome type

### Phase 2: Exploration
- Multiple biomes with themed soil
- Water collection
- Soil preview tool
- Visual quality indicators

### Phase 3: Advanced Features
- Additional soil properties
- Rare soil types
- Transportation upgrades
- Mixing interface improvements

## Technical Considerations

### Data Structure
```typescript
interface SoilItem {
  id: string;
  nutrients: { N: number; P: number; K: number }; // 0-100 percentages
  quantity: number; // Float: hexes worth of soil
  moisture: number; // Always 0 when from portal
  source: string; // Biome or location name
}
```

### Inventory System
- Extend existing inventory or create dedicated soil inventory
- Need comparison logic for stacking
- Floating point precision for nutrient percentages

### Performance
- Limit number of unique soil types in world
- Cache mixed soil calculations
- Efficient inventory sorting algorithms

## Design Decisions

1. **Mixing is available anywhere** - Basic combine/split operations don't require a station
2. **Nutrients are the primary quality metric** - N-P-K percentages determine soil value
3. **One unit = one hex worth** - Fractional amounts allowed (e.g., 2.5 hexes)
4. **No negative soil effects** - Focus on finding optimal nutrient profiles
5. **Soil Sampler tool** - Players can preview nutrients before collecting
6. **Portal dries soil** - Water must be transported separately in magic cans
7. **No nutrient waste** - Nutrients only consumed by plant growth
8. **Stack splitting preserves ratios** - Cannot separate nutrients when splitting