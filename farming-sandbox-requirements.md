# Farming Sandbox - Proof of Concept Requirements
## Simplified Game for Testing Core Farming Mechanics

### 1. Overview
A minimal sandbox game focused exclusively on testing and refining the farming mechanics. Players experiment with soil placement, water management, and plant growth in an infinite desert environment with unlimited resources.

### 2. Core Features

#### 2.1 World
- **Environment**: Infinite flat desert plane
- **No Portals**: All resources available from inventory
- **No NPCs**: Single-player only
- **No Combat**: Pure farming focus
- **Day/Night Cycle**: Simple lighting changes affecting plant growth

#### 2.2 Player Capabilities
- **Movement**: Walk/run across desert (3rd person view)
- **Camera**: Toggle between 3rd person and overhead farm planning view
- **Inventory**: Infinite resources, no weight/storage limits
- **Tools**: Basic set for farming only

### 3. Resources (All Infinite)

#### 3.1 Soil Types
1. **Loam**: Balanced water retention and drainage
2. **Clay**: High water retention, slow drainage
3. **Sandy Loam**: Lower retention, faster drainage

#### 3.2 Water
- **Watering Can**: Small area (1 hex)
- **Bucket**: Medium area (1 hex + neighbors)
- **Sprinkler**: Large area (7 hex radius) - placeable item

#### 3.3 Nutrients
- **Nitrogen (N)**: Separate item
- **Phosphorus (P)**: Separate item
- **Potassium (K)**: Separate item
- **Compost**: Provides all three nutrients

### 4. Available Plants (Initial Set)

#### 4.1 Test Variety
1. **Lettuce**: Fast growing, shallow roots, low height
2. **Tomatoes**: Medium growth, moderate space needs
3. **Corn**: Tall, creates shade, deep roots
4. **Beans**: Nitrogen fixing, medium height
5. **Squash**: Ground spreading, shade provider

#### 4.2 Growth Characteristics
- Visible growth stages (3-4 per plant)
- Clear visual feedback for stunted growth
- Different water/nutrient requirements
- Varied sunlight needs

### 5. Tools & Interactions

#### 5.1 Placement Tools
- **Soil Placer**: Click to place soil hex
- **Soil Remover**: Remove soil (and any plants on it)
- **Plant Seed**: Select seed type, click sub-hex to plant
- **Harvest Tool**: Collect mature plants

#### 5.2 Maintenance Tools  
- **Watering Can**: Add water to hex
- **Nutrient Applicator**: Add selected nutrient to hex
- **Info Tool**: Click hex to see moisture, nutrients, plant health

#### 5.3 Visual Modes
- **Normal View**: Standard gameplay
- **Water View**: Soil moisture visualization
- **Nutrient View**: N-P-K levels per hex
- **Sunlight View**: Shading visualization
- **Root View**: Underground root systems

### 6. UI Elements

#### 6.1 HUD
- **Selected Tool**: Current tool/seed
- **Time**: Day counter, time of day
- **Mode**: Current visual mode
- **FPS Counter**: Performance metrics

#### 6.2 Hex Information Panel
When hovering/selecting a hex:
- Moisture level (0-100%)
- Nutrient levels (N/P/K)
- Current plant (if any)
- Plant health status
- Growth stage progress

#### 6.3 Plant Information Panel
When selecting a plant:
- Species and growth stage
- Water satisfaction %
- Nutrient satisfaction %
- Sunlight satisfaction %
- Growth blocked by: [list of plants]
- Time to next stage

### 7. Controls

#### 7.1 Movement
- **WASD**: Move player
- **Shift**: Run
- **Space**: Jump (if needed)
- **Mouse**: Look around

#### 7.2 Farming
- **Left Click**: Use current tool
- **Right Click**: Remove/cancel
- **Scroll Wheel**: Zoom in/out
- **Tab**: Toggle overhead view
- **1-5**: Visual mode selection
- **Q/E**: Cycle through tools
- **R**: Rotate before placement

### 8. Technical Simplifications

#### 8.1 No Save System
- Session-based gameplay
- Optional: Quick save/load to test persistence

#### 8.2 Simplified Graphics
- Basic geometric shapes for plants
- Simple textures
- Minimal particle effects
- Focus on clear visual communication

#### 8.3 No Procedural Generation
- Flat plane with simple desert texture
- No terrain features
- No weather beyond day/night

### 9. Debug Features

#### 9.1 Time Controls
- **Speed Up Time**: 2x, 5x, 10x
- **Pause**: Freeze all growth/water
- **Skip to Day/Night**: Instant time change

#### 9.2 Instant Actions
- **Grow Plant**: Force next growth stage
- **Max Water**: Saturate selected hex
- **Max Nutrients**: Fill hex nutrients
- **Kill Plant**: Test death/removal

#### 9.3 Metrics Display
- Total hexes placed
- Water flow calculations/second
- Active plant count
- Performance statistics

### 10. Success Criteria

#### 10.1 Core Mechanics Working
- [ ] Hex-based soil placement
- [ ] Water flows between connected hexes
- [ ] Water evaporates over time
- [ ] Plants grow through stages
- [ ] Plants block each other's growth
- [ ] Stunted plants stop consuming resources
- [ ] Nutrients deplete from soil
- [ ] Sunlight calculations with shading

#### 10.2 Performance Targets
- [ ] 60 FPS with 1000 soil hexes
- [ ] 60 FPS with 200 plants
- [ ] <16ms water update cycle
- [ ] Smooth placement/removal

#### 10.3 Player Experience
- [ ] Clear visual feedback
- [ ] Intuitive controls
- [ ] Observable cause/effect
- [ ] Fun to experiment

### 11. Development Phases

#### Phase 1: Foundation (Week 1)
- Basic Three.js setup
- Desert plane and player movement
- Hex grid visualization
- Soil placement/removal

#### Phase 2: Water System (Week 2)
- Water simulation
- Moisture visualization
- Watering tools
- Evaporation

#### Phase 3: Plant Basics (Week 3)
- Plant placement
- Growth stages
- Simple rendering
- Collision detection

#### Phase 4: Resources (Week 4)
- Nutrient system
- Sunlight/shading
- Plant health
- Stunted growth

#### Phase 5: Polish (Week 5)
- Visual modes
- UI panels
- Debug tools
- Performance optimization

### 12. Not Included (Future Versions)
- Multiplayer
- Save/load
- Villager NPCs
- Portal worlds
- Combat
- Building system
- Complex graphics
- Sound/music
- Achievements
- Procedural plants