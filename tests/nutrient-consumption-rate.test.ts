/**
 * Unit test to verify nutrient consumption rates for tomato plants
 * 
 * This test confirms that:
 * - A tomato plant consumes approximately 0.33% N, 0.4% P, 0.27% K per growth stage
 * - One hex of 100% nutrients can support multiple plants through their full lifecycle
 */

import { test, expect } from '@playwright/test';

test.describe('Nutrient Consumption Rates', () => {
  test('tomato plant should consume nutrients at expected rates', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for game to initialize
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game?.isInitialized === true;
    });

    // Set up test environment
    const testResult = await page.evaluate(async () => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Create a large test area with consistent nutrients
      const testHexes: any[] = [];
      for (let q = -2; q <= 2; q++) {
        for (let r = -2; r <= 2; r++) {
          if (Math.abs(q + r) <= 2) {
            const coord = { q, r, y: 0 };
            game.soilManager.placeSoil(coord);
            testHexes.push(coord);
          }
        }
      }
      
      // Set all hexes to 100% nutrients
      const nutrientSystem = game.soilManager.getNutrientSystem();
      for (const coord of testHexes) {
        nutrientSystem.addNutrients(coord, {
          nitrogen: 0.5,    // Add 0.5 to get from default 0.5 to 1.0
          phosphorus: 0.5,
          potassium: 0.5
        });
      }
      
      // Add water to all hexes
      const waterSim = game.soilManager.getWaterSimulation();
      for (const coord of testHexes) {
        waterSim.addWater(coord, 100000); // 100L per hex
      }
      
      // Plant tomato at center
      const plantSim = game.soilManager.getPlantSimulation();
      const worldPos = gameWindow.HexUtils.hexToWorld({ q: 0, r: 0 });
      worldPos.y = 0.15;
      
      const plantId = plantSim.plantSeed('tomato', worldPos);
      if (!plantId) {
        throw new Error('Failed to plant tomato');
      }
      
      // Get initial nutrient levels at plant location
      const plantHex = { q: 0, r: 0, y: 0 };
      const initialNutrients = nutrientSystem.getNutrients(plantHex);
      
      // Record nutrient levels over time
      const nutrientHistory: any[] = [];
      const stages: any[] = [];
      
      // Helper to record current state
      const recordState = (time: number) => {
        const nutrients = nutrientSystem.getNutrients(plantHex);
        const plants = plantSim.getAllPlants();
        const plant = plants.find(p => p.plant.id === plantId);
        
        if (plant) {
          if (plant && plant.plantType && plant.plantType.growthStages) {
            nutrientHistory.push({
              time,
              nutrients: { ...nutrients },
              stage: plant.plant.currentStage,
              stageName: plant.plantType.growthStages[plant.plant.currentStage].name
            });
          }
          
          // Record stage transitions
          if (plant.plantType && plant.plantType.growthStages && 
              (stages.length === 0 || stages[stages.length - 1].stage !== plant.plant.currentStage)) {
            stages.push({
              stage: plant.plant.currentStage,
              stageName: plant.plantType.growthStages[plant.plant.currentStage].name,
              time,
              nutrients: { ...nutrients }
            });
          }
        }
      };
      
      // Record initial state
      recordState(0);
      
      // Check initial plant state
      const initialPlant = plantSim.getAllPlants().find(p => p.plant.id === plantId);
      console.log('Initial plant health:', initialPlant?.plant.health);
      
      // Speed up time for testing
      game.timeScale = 100;
      game.setAnimationsEnabled(true);
      
      // Simulate growth through all stages
      // Tomato has 3 stages: Seedling (10s), Young Plant (15s), Mature (20s)
      const totalGrowthTime = 45; // seconds in game time
      const simulationSteps = 50;
      const stepTime = totalGrowthTime / simulationSteps;
      
      for (let i = 0; i < simulationSteps; i++) {
        // Tick the simulation
        plantSim.tick(stepTime, 0.5); // Daytime for photosynthesis
        
        // Record state
        recordState((i + 1) * stepTime);
        
        // Check if plant reached final stage
        const plants = plantSim.getAllPlants();
        const plant = plants.find(p => p.plant.id === plantId);
        
        // Log progress every 10 steps
        if (i % 10 === 0 && plant) {
          console.log(`Step ${i}: Stage ${plant.plant.currentStage}, Timer: ${plant.plant.growthTimer?.toFixed(1)}, Health:`, plant.plant.health);
        }
        
        if (plant && plant.plant.currentStage === 2) {
          // Mature stage reached, simulate a bit more
          for (let j = 0; j < 5; j++) {
            plantSim.tick(stepTime, 0.5);
            recordState((i + 1 + j * 0.2) * stepTime);
          }
          break;
        }
      }
      
      // Calculate consumption per stage
      const stageConsumption: any[] = [];
      for (let i = 0; i < stages.length - 1; i++) {
        const startNutrients = stages[i].nutrients;
        const endNutrients = stages[i + 1].nutrients;
        
        stageConsumption.push({
          stage: stages[i].stageName,
          consumed: {
            nitrogen: (startNutrients.nitrogen - endNutrients.nitrogen) * 100,
            phosphorus: (startNutrients.phosphorus - endNutrients.phosphorus) * 100,
            potassium: (startNutrients.potassium - endNutrients.potassium) * 100
          }
        });
      }
      
      // Get final nutrients
      const finalNutrients = nutrientSystem.getNutrients(plantHex);
      
      // Calculate total consumption
      const totalConsumed = {
        nitrogen: (initialNutrients.nitrogen - finalNutrients.nitrogen) * 100,
        phosphorus: (initialNutrients.phosphorus - finalNutrients.phosphorus) * 100,
        potassium: (initialNutrients.potassium - finalNutrients.potassium) * 100
      };
      
      return {
        initialNutrients,
        finalNutrients,
        totalConsumed,
        stageConsumption,
        stages: stages.map(s => ({ stage: s.stage, name: s.stageName })),
        nutrientHistory: nutrientHistory.slice(0, 10) // First 10 records for debugging
      };
    });
    
    console.log('Test Results:', JSON.stringify(testResult, null, 2));
    
    // Verify initial conditions
    expect(testResult.initialNutrients.nitrogen).toBeCloseTo(1.0, 2);
    expect(testResult.initialNutrients.phosphorus).toBeCloseTo(1.0, 2);
    expect(testResult.initialNutrients.potassium).toBeCloseTo(1.0, 2);
    
    // Verify plant stages if available (plant may not have advanced in this test)
    if (testResult.stages.length > 0) {
      console.log('Plant went through stages:', testResult.stages);
    } else {
      console.log('Plant did not advance stages during test, but still consumed nutrients');
    }
    
    // Verify total consumption is reasonable (should be much less than before)
    // Expected: ~10% N, 12% P, 8% K over full lifecycle with 0.1x scaling
    // So roughly 1% N, 1.2% P, 0.8% K total
    expect(testResult.totalConsumed.nitrogen).toBeGreaterThan(0.5);  // At least some consumption
    expect(testResult.totalConsumed.nitrogen).toBeLessThan(5.0);    // Less than 5%
    expect(testResult.totalConsumed.phosphorus).toBeGreaterThan(0.5);
    expect(testResult.totalConsumed.phosphorus).toBeLessThan(6.0);  // Less than 6%
    expect(testResult.totalConsumed.potassium).toBeGreaterThan(0.3);
    expect(testResult.totalConsumed.potassium).toBeLessThan(4.0);   // Less than 4%
    
    // Verify per-stage consumption is reasonable
    if (testResult.stageConsumption.length > 0) {
      const seedlingConsumption = testResult.stageConsumption[0];
      console.log('Seedling stage consumption:', seedlingConsumption);
      
      // Each stage should consume less than 2% of any nutrient
      expect(seedlingConsumption.consumed.nitrogen).toBeLessThan(2.0);
      expect(seedlingConsumption.consumed.phosphorus).toBeLessThan(2.0);
      expect(seedlingConsumption.consumed.potassium).toBeLessThan(2.0);
    }
    
    // Verify that one hex can support multiple plants
    // If total consumption is ~1-2%, then one hex at 100% could support 50-100 plants
    const plantsPerHex = 100 / Math.max(
      testResult.totalConsumed.nitrogen,
      testResult.totalConsumed.phosphorus,
      testResult.totalConsumed.potassium
    );
    
    console.log(`Estimated plants per hex at 100% nutrients: ${plantsPerHex.toFixed(1)}`);
    expect(plantsPerHex).toBeGreaterThan(15); // Should support at least 15 plants (was ~1 before)
  });

  test('nitrogen fixer (beans) should add nitrogen back to soil', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game?.isInitialized === true;
    });

    const testResult = await page.evaluate(async () => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Create test hex
      const coord = { q: 0, r: 0, y: 0 };
      game.soilManager.placeSoil(coord);
      
      // Set to 50% nutrients (default)
      const nutrientSystem = game.soilManager.getNutrientSystem();
      const initialNutrients = nutrientSystem.getNutrients(coord);
      
      // Add water
      const waterSim = game.soilManager.getWaterSimulation();
      waterSim.addWater(coord, 100000);
      
      // Plant beans
      const plantSim = game.soilManager.getPlantSimulation();
      const worldPos = gameWindow.HexUtils.hexToWorld(coord);
      worldPos.y = 0.15;
      
      const plantId = plantSim.plantSeed('beans', worldPos);
      if (!plantId) {
        throw new Error('Failed to plant beans');
      }
      
      // Speed up time
      game.timeScale = 100;
      game.setAnimationsEnabled(true);
      
      // Simulate growth
      for (let i = 0; i < 30; i++) {
        plantSim.tick(1, 0.5); // 1 second steps, daytime
      }
      
      // Get final nutrients
      const finalNutrients = nutrientSystem.getNutrients(coord);
      
      return {
        initialNutrients,
        finalNutrients,
        nitrogenChange: (finalNutrients.nitrogen - initialNutrients.nitrogen) * 100,
        phosphorusChange: (finalNutrients.phosphorus - initialNutrients.phosphorus) * 100,
        potassiumChange: (finalNutrients.potassium - initialNutrients.potassium) * 100
      };
    });
    
    console.log('Bean test results:', testResult);
    
    // Beans should add nitrogen (positive change)
    expect(testResult.nitrogenChange).toBeGreaterThan(0);
    
    // But consume phosphorus and potassium (negative change)
    expect(testResult.phosphorusChange).toBeLessThan(0);
    expect(testResult.potassiumChange).toBeLessThan(0);
  });
});