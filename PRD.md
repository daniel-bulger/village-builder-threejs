# Village Builder: AI-Powered Society Simulation Game
## Product Requirements Document v1.0

### 1. Executive Summary
Village Builder is a 3D multiplayer survival/society-building game where players and AI-controlled NPCs work together to transform a barren desert world into a thriving agricultural civilization. The game features LLM-powered NPCs that learn from players and make autonomous decisions, creating emergent gameplay through genuine AI behavior. At its core, the game focuses on sustainable farming in a challenging environment where soil and water must be imported from other dimensions.

### 2. Core Gameplay Loop
1. **Daily Portals**: Each in-game day, a portal opens to a resource-rich dimension (optional exploration)
2. **Resource Gathering**: Collect raw materials, soil, water, and forageable items from portal worlds
3. **Farming & Refinement**: Transform the desert through agriculture, process raw materials
4. **Teaching**: Train NPCs through apprenticeship system for autonomous farming
5. **Sustainability**: Manage water evaporation, soil nutrients, and crop cycles
6. **Defense**: Protect settlements and farms from threats using turn-based combat

### 3. Key Features

#### 3.1 World & Camera System
- **3D Environment**: 
  - Base world: Flat desert terrain unsuitable for natural farming
  - Open terraforming: Transform any part of the desert into farmland
  - Portal worlds: Diverse biomes with unique soil types and water sources
- **Camera Modes**: 
  - 3rd person (default) for exploration and building
  - 1st person for precision tasks and immersion
  - Strategic overhead view for farm planning and irrigation design

#### 3.2 Multiplayer Architecture
- **Server Types**:
  - Private servers (2-8 players)
  - Public servers (up to 32 players)
- **Plot Assignment**: Each player gets a personal plot, NPCs have smaller plots
- **Shared World Events**: Portal openings, weather, invasions

#### 3.3 AI-Powered NPCs
- **LLM Integration**: 
  - Decision-making every 10-30 seconds (configurable based on server load)
  - Context includes: current task, inventory, nearby objects, recent events
  - Rate limiting through action queuing system
- **MCP Tools Available to NPCs**:
  - `move_to_location`
  - `interact_with_object`
  - `use_item`
  - `speak_to_entity`
  - `check_inventory`
  - `observe_surroundings`
- **Personality System**: Each NPC has traits affecting decision-making

#### 3.4 Villager Recruitment System
- **Starting State**: Player begins alone in the desert
- **Finding Villagers**: NPCs found at different portal depths
- **Variety-Driven Progression**:

  **Tier 1 - Desperate Wanderers** (Portal Surface):
  - **Found**: Surface areas, easy to reach
  - **Impressed by**: Any food (1-2 basic crops)
  - **Skills**: Basic farming, water carrying
  - **Enable**: Starting your village

  **Tier 2 - Common Folk** (Shallow Portals):
  - **Found**: Villages in safe portal zones
  - **Require**: 3+ crop variety including tomatoes/corn
  - **Skills**: Efficient farming, cooking, crafting
  - **Enable**: Basic automation and recipes

  **Tier 3 - Skilled Artisans** (Deep Portals):
  - **Found**: Guild halls, requires combat/stealth
  - **Require**: 5+ crops including specialty (peppers, melons)
  - **Need**: Rare nutrients visible in your farm
  - **Skills**: Advanced recipes, preservation, trade
  - **Enable**: Complex food chains, nutrient extraction

  **Tier 4 - Master Craftspeople** (Abyss Portals):
  - **Found**: Hidden enclaves, boss-guarded
  - **Require**: 8+ crops with exotic varieties
  - **Need**: Multiple rare nutrient types in soil
  - **Skills**: Legendary recipes, reality-bending farming
  - **Enable**: Impossible crops, nutrient synthesis

  **Tier 5 - Mythical Beings** (Portal Cores):
  - **Found**: After epic questlines
  - **Require**: 12+ crops, legendary varieties
  - **Need**: Perfect gardens with all nutrient types
  - **Skills**: Divine farming, dimension manipulation
  - **Enable**: Endgame content, world transformation
    
- **The Variety Loop**: Each tier requires deeper portal exploration for new nutrients → enables new crops → attracts better villagers → who help you go deeper

#### 3.5 Apprenticeship System
- **Teaching Mechanics**:
  - Players demonstrate tasks while NPC observes
  - NPC records action sequences and context
  - Gradual autonomy: Supervised → Assisted → Independent
- **Knowledge Persistence**: NPCs remember learned behaviors across sessions

#### 3.6 Portal Worlds
- **Daily Rotation**: Different biomes with unique resources
- **Essential Resources**:
  - **Soil Types**: Loam, clay, sand with different water retention
  - **Water Sources**: Springs, rivers, rain collection
  - **Forageables**: Wild seeds, edible plants, rare crops
- **Portal Spoilage Mechanic**:
  - **One-Way Food Transport**: Food can enter portals but spoils when returning
  - **Strategic Planning**: Bring enough food to survive and recruit, but not excess
  - **Risk/Reward**: More food allows longer exploration but means more waste
  - **Immediate Use**: Foraged food must be consumed or it spoils on return
  - **Compost Creation**: All spoiled food becomes valuable fertilizer
  - **Seeds Survive**: Only seeds and non-perishables pass through intact
- **Difficulty Scaling**: Based on colony development level
- **Time Limit**: Portals close after set duration, creating urgency
- **Environmental Hazards**: Weather, terrain challenges, hostile creatures

#### 3.7 Turn-Based Combat
- **Initiative System**: Speed stat determines turn order
- **Action Points**: Limited actions per turn
- **AI Combat Behavior**: 
  - NPCs use learned tactics from player demonstrations
  - Enemies have varied AI patterns
- **Positioning Matters**: Cover, elevation, flanking bonuses

#### 3.8 Modular Skill System

**Initial Skills**:
1. **Farming**: Soil preparation, planting, watering timing minigame
2. **Mining**: Rhythm-based minigame for players
3. **Woodcutting**: Precision timing game
4. **Fishing**: Reaction-based catching
5. **Cooking**: Recipe combination puzzles using grown ingredients
6. **Crafting**: Pattern matching challenges
7. **Irrigation**: Flow-based puzzle for water distribution

**Skill Progression**:
- **Players**: Unlock new minigame mechanics, efficiency bonuses
- **NPCs**: 
  - Skill levels 1-100
  - Success rate and speed improve with practice
  - Can specialize based on assigned tasks

### 4. Technical Architecture

#### 4.1 Core Technologies
- **Engine**: Three.js with custom ECS framework
- **Networking**: WebRTC for peer-to-peer, WebSockets for server authority
- **AI Integration**: 
  - Local LLM server for NPC decisions
  - Fallback to rule-based AI during high load
  - Decision caching for common scenarios

#### 4.2 Performance Considerations
- **LOD System**: Reduce detail for distant objects
- **NPC Decision Batching**: Stagger AI updates to prevent spikes
- **Instanced Rendering**: For vegetation, buildings, items
- **Fluid Simulation**: GPU-based water simulation using heightmaps
- **Soil System**: Cellular automata for moisture percolation

### 5. Monetization Strategy
- **Base Game**: One-time purchase
- **Cosmetic DLC**: Building styles, character customization
- **Server Hosting**: Optional paid dedicated servers
- **No Pay-to-Win**: All gameplay content earnable in-game

#### 3.9 Farming & Agriculture System

**Soil Mechanics**:
- **Moisture Simulation**: 
  - Realistic water saturation using cellular automata
  - Water evaporation based on temperature and time
  - Percolation through soil layers
- **Progressive Nutrient System**:
  - **Basic**: N-P-K (found everywhere, needed for all crops)
  - **Trace**: Iron, Calcium, Magnesium (shallow portals, Tier 2+ crops)
  - **Rare**: Heat, Sweetness, Essence, Density (deep portals, Tier 3+ crops)
  - **Exotic**: Fire Salt, Luminite, Shadow Loam (abyss portals, Tier 4+ crops)
  - **Legendary**: Temporal Minerals, Star Metal (portal cores, Tier 5 crops)
- **Nutrient Sources**:
  - Import specialized soils from different portal depths
  - Compost from spoiled food (basic N-P-K only)
  - Extract from special portal materials
  - Synthesize using advanced villager skills

**Water Management**:
- **Sources**: Import from portals, store in reservoirs
- **Irrigation**: 
  - Manual watering with buckets/watering cans
  - Advanced: Irrigation channels, sprinkler systems
  - Flow-based water distribution
- **Conservation**: Cover crops, mulching to reduce evaporation

**Crop System**:
- **Tiered Progression**:
  - **Tier 1**: Lettuce, Radishes, Beans (basic N-P-K)
  - **Tier 2**: Tomatoes, Corn, Squash (quality N-P-K + trace)
  - **Tier 3**: Peppers, Melons, Herbs (require rare nutrients)
  - **Tier 4**: Dragon Fruit, Crystal Berries (exotic compounds)
  - **Tier 5**: Star Fruit, Time Blossom (legendary materials)
- **Growth Mechanics**:
  - Each tier has increasing complexity and rewards
  - Higher tiers need specific nutrient combinations
  - Visual effects scale with crop tier (particles, glow)
- **Variety Benefits**:
  - Crop rotation prevents soil fatigue
  - Companion planting bonuses
  - Attracts higher-tier villagers

#### 3.10 Technical Implementation - Fluid Simulation

**Recommended Approach**:
- **Surface Water**: Three.js GPGPU water simulation for visible water
- **Soil Moisture**: 
  - 3D texture storing moisture per voxel
  - Cellular automata for water movement
  - WebGL shaders for evaporation
- **Visual Feedback**: PBR materials showing wet/dry soil states
- **Performance**: LOD system for distant fields, GPU computation

### 6. Additional Feature Suggestions

#### 6.1 Social Systems
- **Relationships**: NPCs form friendships, rivalries
- **Village Council**: Vote on community decisions
- **Festivals**: Seasonal events that boost morale

#### 6.2 Economy
- **Trade Routes**: NPCs can establish automated trade
- **Market Stalls**: Player-run shops
- **Resource Scarcity**: Some materials only available certain seasons

#### 6.3 Progression Systems
- **Technology Tree**: Unlock new buildings, tools, abilities
- **Village Reputation**: Attracts wandering NPCs, unlocks content
- **Achievement System**: Rewards for creative solutions

#### 6.4 Quality of Life
- **Blueprint System**: Save and share building designs
- **Automation**: Late-game conveyor belts, pipes
- **Fast Travel**: Unlockable waypoint network

### 7. MVP Scope
For initial release, focus on:
1. Single-player starting alone
2. Tier 1-2 crops (5-6 varieties) with basic nutrients
3. Tier 1-2 villager recruitment (up to 5 NPCs)
4. 3 portal world types with shallow depth exploration
5. Core farming with N-P-K nutrients and rotation
6. Basic combat for portal exploration
7. Simple building mechanics
8. Visual nutrient/water indicators

### 8. Post-Launch Roadmap
- **Month 1-3**: 
  - Tier 3 crops and nutrients (trace minerals)
  - Deep portal exploration zones
  - Advanced villager skills and teaching
- **Month 4-6**: 
  - Tier 4 exotic crops and compounds
  - Abyss portal layers with bosses
  - Multiplayer implementation
- **Month 7-9**: 
  - Tier 5 legendary content
  - Portal core exploration
  - Advanced NPC relationships
- **Month 10-12**: 
  - Endless variety system
  - Mod support for custom crops/nutrients
  - Creative mode with all nutrients unlocked

### 9. Success Metrics
- **Player Retention**: 30-day retention > 40%
- **NPC Autonomy**: 70% of trained tasks performed correctly
- **Community**: Active modding/building community
- **Performance**: Stable 60 FPS with 20+ NPCs