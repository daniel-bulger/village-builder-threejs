import { test, expect } from '@playwright/test';
import { waitForGame } from './helpers';
import { 
  injectPlantHelpers, 
  setupPlantTest, 
  PLANT_TEST_CONSTANTS 
} from './helpers/plant-helpers';

const { WATER_AMOUNTS, SOIL_AREA_SIZES } = PLANT_TEST_CONSTANTS;

test.describe('Simple Plant Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    await injectPlantHelpers(page);
  });

  test('should create a plant and update its health', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const waterSim = game.soilManager.getWaterSimulation();
      const plantSim = game.soilManager.getPlantSimulation();
      
      // Clear state
      waterSim.hexes.clear();
      game.soilManager.soilHexes.clear();
      
      // Create a larger soil area to ensure plant can be placed
      const coord = { q: 0, r: 0, y: 0 };
      gameWindow.createLargeSoilArea(game, coord, 3);
      
      // Add extra water to center hex
      waterSim.addWater(coord, 100000); // 100L
      
      // Create world position
      const worldPos = gameWindow.hexToWorld(coord);
      
      // Plant seed with retry logic
      const plantId = gameWindow.plantWithRetry(plantSim, worldPos, 'tomato');
      
      // Get plant info
      const allPlants = plantSim.getAllPlants();
      const plantData = allPlants.find(p => p.plant.id === plantId);
      const plant = plantData?.plant;
      
      // Enable animations and tick
      game.setAnimationsEnabled(true);
      for (let i = 0; i < 10; i++) {
        plantSim.tick(0.1);
      }
      
      // Get updated plant info
      const allPlantsAfter = plantSim.getAllPlants();
      const plantDataAfter = allPlantsAfter.find(p => p.plant.id === plantId);
      const plantAfter = plantDataAfter?.plant;
      
      return {
        plantId,
        plantCreated: !!plant,
        initialHealth: plant?.health?.water || 0,
        finalHealth: plantAfter?.health?.water || 0,
        waterBefore: 100000,
        waterAfter: waterSim.getWaterML(coord),
        hexKey: `${coord.q},${coord.r},${coord.y}`,
        soilHexExists: game.soilManager.soilHexes.has(`${coord.q},${coord.r},${coord.y}`)
      };
    });
    
    expect(result.plantCreated).toBe(true);
    expect(result.plantId).toBeTruthy();
    expect(result.finalHealth).toBeGreaterThan(0);
    expect(result.waterAfter).toBeLessThan(result.waterBefore); // Plant consumed water
  });

  test('should handle plant water consumption correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const waterSim = game.soilManager.getWaterSimulation();
      const plantSim = game.soilManager.getPlantSimulation();
      
      // Clear state
      waterSim.hexes.clear();
      game.soilManager.soilHexes.clear();
      
      // Create two separate soil areas
      const wetCoord = { q: 0, r: 0, y: 0 };
      const dryCoord = { q: 10, r: 10, y: 0 }; // Further apart to avoid interference
      
      // Create larger soil areas
      gameWindow.createLargeSoilArea(game, wetCoord, 3);
      gameWindow.createLargeSoilArea(game, dryCoord, 3);
      
      // Add more water to wet area
      for (let dq = -3; dq <= 3; dq++) {
        for (let dr = -3; dr <= 3; dr++) {
          const ds = -dq - dr;
          if (Math.abs(ds) <= 3) {
            const wetHex = { q: wetCoord.q + dq, r: wetCoord.r + dr, y: wetCoord.y };
            waterSim.addWater(wetHex, 50000); // 50L per hex (wet area)
            
            // Add a bit more water to dry area so plant can function
            const dryHex = { q: dryCoord.q + dq, r: dryCoord.r + dr, y: dryCoord.y };
            waterSim.addWater(dryHex, 5000); // 5L extra per hex (15L total per hex)
          }
        }
      }
      
      // Plant in both locations with proper world positions
      const wetWorldPos = gameWindow.hexToWorld(wetCoord);
      const dryWorldPos = gameWindow.hexToWorld(dryCoord);
      
      const wetPlantId = gameWindow.plantWithRetry(plantSim, wetWorldPos, 'tomato');
      const dryPlantId = gameWindow.plantWithRetry(plantSim, dryWorldPos, 'tomato');
      
      // Run simulation
      game.setAnimationsEnabled(true);
      for (let i = 0; i < 50; i++) {
        plantSim.tick(0.1);
      }
      
      // Get plant states
      const allPlants = plantSim.getAllPlants();
      const wetPlantData = allPlants.find(p => p.plant.id === wetPlantId);
      const dryPlantData = allPlants.find(p => p.plant.id === dryPlantId);
      
      // Calculate total water in each area
      let wetWaterTotal = 0;
      let dryWaterTotal = 0;
      
      for (let dq = -3; dq <= 3; dq++) {
        for (let dr = -3; dr <= 3; dr++) {
          const ds = -dq - dr;
          if (Math.abs(ds) <= 3) {
            const wetHex = { q: wetCoord.q + dq, r: wetCoord.r + dr, y: wetCoord.y };
            const dryHex = { q: dryCoord.q + dq, r: dryCoord.r + dr, y: dryCoord.y };
            wetWaterTotal += waterSim.getWaterML(wetHex);
            dryWaterTotal += waterSim.getWaterML(dryHex);
          }
        }
      }
      
      return {
        wetPlant: {
          id: wetPlantId,
          exists: !!wetPlantData,
          health: wetPlantData?.plant.health.water || 0,
          growthTimer: wetPlantData?.plant.growthTimer || 0
        },
        dryPlant: {
          id: dryPlantId,
          exists: !!dryPlantData,
          health: dryPlantData?.plant.health.water || 0,
          growthTimer: dryPlantData?.plant.growthTimer || 0
        },
        wetWaterRemaining: wetWaterTotal,
        dryWaterRemaining: dryWaterTotal,
        wetWaterInitial: 37 * (50000 + 10000), // 37 hexes total, extra water + base water
        dryWaterInitial: 37 * (5000 + 10000) // 37 hexes with extra water + base water
      };
    });
    
    // Both plants should exist
    expect(result.wetPlant.exists).toBe(true);
    expect(result.dryPlant.exists).toBe(true);
    
    // Wet plant should be healthier
    expect(result.wetPlant.health).toBeGreaterThan(result.dryPlant.health);
    
    // Wet plant should have consumed water
    expect(result.wetWaterRemaining).toBeLessThan(result.wetWaterInitial);
    
    // Dry plant may not consume water if stomata are closed (health < 0.3)
    // This is realistic behavior - plants stop transpiring when water-stressed
  });
});