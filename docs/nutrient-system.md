# Nutrient System Documentation

## Overview

The nutrient system simulates soil fertility using the three primary macronutrients: Nitrogen (N), Phosphorus (P), and Potassium (K). Each soil hex maintains nutrient levels that affect plant growth and health.

## Core Mechanics

### Nutrient Levels
- Each nutrient is tracked as a percentage (0-100%)
- New soil starts at 50% for all nutrients
- Visual feedback through soil color: RGB channels map to N-P-K levels

### Continuous Consumption
Nutrients are consumed continuously during plant growth, synchronized with water consumption:
- **Consumption only occurs during daytime** (6 AM to 6 PM game time)
- **Scales with water consumption rate** - when water use slows, nutrient use slows
- **Stops when stomata close** (water < 30%) - no nutrient uptake without water
- **Proportional to growth rate** - faster growth means more nutrient consumption

### Plant Requirements

Different crops have different nutrient needs:

#### Tier 1 - Light Feeders
- **Lettuce**: N:20%, P:10%, K:10%
- **Radish**: N:15%, P:10%, K:15%

#### Tier 2 - Heavy Feeders  
- **Tomato**: N:40%, P:50%, K:30%
- **Corn**: N:60%, P:30%, K:30%
- **Squash**: N:40%, P:40%, K:50%

#### Nitrogen Fixers
- **Beans**: N:-30% (adds nitrogen!), P:15%, K:20%
- **Peas**: N:-20% (adds nitrogen!), P:10%, K:15%

### Growth Impact

Nutrient availability affects plants in several ways:

1. **Health Calculation**: Plant nutrient health = average of N-P-K satisfaction
   - Nitrogen fixers ignore N requirement for health
   - Low nutrients reduce growth rate
   - Below 50% satisfaction prevents stage advancement

2. **Planting Requirements**: Need at least 10% of required nutrients to plant

3. **Visual Feedback**: 
   - Soil color changes based on nutrient levels (RGB = NPK)
   - Plant inspector shows nutrient requirements
   - Soil inspector displays current levels

### Consumption Timing

The system carefully manages when nutrients are consumed:

- **Water consumption**: Happens day and night (10% rate at night)
- **Nutrient consumption**: Only during active photosynthesis (daytime)
- **Growth**: Only occurs during the day with sufficient resources

This prevents unrealistic nutrient depletion when plants aren't actively growing.

### Stage-Based Depletion

In addition to continuous consumption, nutrients are also depleted when plants advance growth stages:
- Each stage transition consumes 33% of the plant's total nutrient needs
- Ensures significant milestones have nutrient cost
- Nitrogen fixers add nitrogen during stage transitions

## Crop Rotation Benefits

The system tracks crop history to encourage rotation:
- Last 3 crops are remembered per hex
- Repeat penalty: -10% growth for each time same crop was grown
- Diversity bonus: +5% growth for each unique crop in history

## Future Expansion

The nutrient system is designed to support:
- Fertilizers and compost to restore nutrients
- Advanced nutrients from portal exploration
- Nutrient-specific deficiency symptoms
- Cover crops and green manures
- Soil amendments (lime, sulfur, etc.)

## Technical Implementation

### Key Classes
- `NutrientSystem`: Core nutrient tracking and depletion
- `PlantSimulation`: Integrates nutrient consumption with growth
- `SoilManager`: Handles visual feedback and UI updates

### Data Flow
1. Plant grows and consumes water during `consumeResources()`
2. If daytime and water consumed, nutrients are depleted proportionally
3. Nutrient changes trigger visual updates to soil hexes
4. Inspector UIs show real-time nutrient levels

### Performance Considerations
- Nutrient updates only trigger visual changes when levels actually change
- Continuous consumption is frame-rate independent (uses deltaTime)
- Visual updates are batched to prevent excessive redraws