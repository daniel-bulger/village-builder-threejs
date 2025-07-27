# Village Builder - Claude Development Notes

## Testing Tips

### Running Tests
- Use `npx playwright test` to run all tests
- Use `npx playwright test path/to/test.spec.ts` to run a specific test file
- Use `npx playwright test -g "test name pattern"` to run tests matching a pattern
- Add `--reporter=list` to see test output directly instead of opening a UI
- Tests run in headless mode by default

### Common Testing Patterns

#### 1. Game Object Access
```javascript
const gameWindow = window as any;
const game = gameWindow.game;
const waterSim = game.soilManager.getWaterSimulation();
const plantSim = game.soilManager.getPlantSimulation();
```

#### 2. Clearing State Between Tests
```javascript
// Clear water simulation
waterSim.hexes.clear();

// Clear plants
const existingPlants = plantSim.getAllPlants();
existingPlants.forEach(p => plantSim.removePlant(p.plant.id));

// Clear soil hexes
game.soilManager.soilHexes.clear();
```

#### 3. Coordinate Conversions
```javascript
// Hex to world position (correct formula)
const HEX_SIZE = 1;
const HEX_HEIGHT = 0.15;
const worldPos = new gameWindow.THREE.Vector3(
  coord.q * HEX_SIZE * 1.5,
  coord.y * HEX_HEIGHT,
  (coord.r + coord.q * 0.5) * HEX_SIZE * Math.sqrt(3)
);
```

#### 4. Plant System
- Plants require water to be created (can't plant in completely dry soil)
- Access plants through `plantSim.getAllPlants()`, not `plantSim.plants` directly
- Plant health is an object: `{ water: number, nutrients: number, sunlight: number }`
- Tomato plant has 3 growth stages (0, 1, 2): Seedling, Young Plant, Mature
- Growth timer is in seconds (e.g., seedling stage lasts 10 seconds)

#### 5. Water System
- Water amounts are in milliliters (mL)
- Hex capacity for loam: ~150,800mL (150.8L)
- Add water: `waterSim.addWater(coord, 100000)` // 100L
- Get saturation (0-1): `waterSim.getSaturation(coord)`
- Get water in mL: `waterSim.getWaterML(coord)`

#### 6. Animation Control
```javascript
// Disable animations during setup to prevent water drainage
game.setAnimationsEnabled(false);

// Enable for simulation
game.setAnimationsEnabled(true);

// Speed up time for testing
game.timeScale = 10;
```

#### 7. Tool/Inventory System
- Tools are now inventory items (slots 0-9)
- Use `game.inventorySystem.setActiveSlot(slotNumber)`
- Some actions are in the farming wheel (remove soil, harvest, etc.)
- Access current tool: `game.getCurrentToolFromInventory()`

### Common Issues and Solutions

1. **Plants not being created**
   - Ensure soil exists at the coordinate
   - Add at least some water (1000mL+) before planting
   - Check world position calculation is correct
   - Plants can't overlap - space them apart
   - **Plant creation can randomly fail!** The plant system randomizes sub-hex positions for roots/leaves, and if these random positions fall outside of soil, the plant creation fails. This is why tests sometimes pass/fail intermittently.
   - **Solutions**: 
     - Create larger soil areas (3x3 or more) so randomized positions stay in soil
     - Retry plant creation multiple times if it fails
     - Example:
     ```javascript
     // Create 3x3 soil area
     const coords = [
       {q:0,r:0,y:0}, {q:1,r:0,y:0}, {q:-1,r:0,y:0},
       {q:0,r:1,y:0}, {q:0,r:-1,y:0}, {q:1,r:-1,y:0}, {q:-1,r:1,y:0}
     ];
     coords.forEach(c => {
       game.soilManager.placeSoil(c);
       waterSim.addWater(c, 50000);
     });
     
     // Retry planting
     let plantId = null;
     for (let i = 0; i < 5 && !plantId; i++) {
       plantId = plantSim.plantSeed('tomato', worldPos);
     }
     ```

2. **Water draining too fast**
   - Disable animations during test setup
   - Water drains to "desert" (non-soil hexes) quickly
   - Use barriers to prevent drainage

3. **Test timeouts**
   - Keep simulation loops reasonable (< 100 iterations)
   - Use `page.waitForTimeout()` sparingly
   - Consider using higher timeScale for faster simulation

4. **Coordinate systems**
   - Hex coordinates: `{ q, r, y }`
   - World coordinates: THREE.Vector3
   - Sub-hex coordinates: For plant positioning within hexes

### Debugging Tips

1. Return debug info from `page.evaluate()`:
```javascript
return {
  actualValue: someValue,
  debug: {
    hexCount: waterSim.getAllHexes().length,
    plantCount: plantSim.getAllPlants().length,
    // etc.
  }
};
```

2. Use `console.log()` outside `page.evaluate()` to see output
3. Check error-context.md files in test-results for failure screenshots
4. Run individual tests for faster iteration

### Performance Testing
- Growth multiplier: `game.growthMultiplier = 10` (speeds up plant growth)
- Time scale: `game.timeScale = 10` (speeds up all simulations)
- Run shorter simulations when possible (0.1s ticks, fewer iterations)

### Test Reliability
- Plant creation can fail randomly due to sub-hex randomization
- With improved helpers and larger soil areas, test suite now has ~67% reliability (8/12 tests pass consistently)
- Improvements made:
  - Large hexagonal soil areas (radius 4-5) to accommodate randomization
  - Retry logic with position adjustments
  - Helper functions injected into page context
- Remaining issues:
  - Water flow between hexes may drain too quickly
  - Plant growth stages may not advance in test timeframes
  - Some game systems (barriers, soil types) may not affect growth as expected in tests
- To achieve 100% reliability, the plant system would need an option to disable randomization or ensure sub-hexes stay within soil boundaries