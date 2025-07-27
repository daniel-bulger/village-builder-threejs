/**
 * Simple test to verify plant growth mechanics work
 */

import { test, expect } from '@playwright/test';

test.describe('Plant Growth Simple', () => {
  test('plant should advance stages when all requirements met', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game?.isInitialized === true;
    });

    const result = await page.evaluate(async () => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Create simple test setup
      const coord = { q: 0, r: 0, y: 0 };
      game.soilManager.placeSoil(coord);
      
      // Max out nutrients
      const nutrientSystem = game.soilManager.getNutrientSystem();
      nutrientSystem.addNutrients(coord, {
        nitrogen: 0.5,
        phosphorus: 0.5,
        potassium: 0.5
      });
      
      // Disable animations to prevent water drainage
      game.setAnimationsEnabled(false);
      
      // Add water
      const waterSim = game.soilManager.getWaterSimulation();
      waterSim.addWater(coord, 150000);
      
      // Plant tomato
      const plantSim = game.soilManager.getPlantSimulation();
      const worldPos = gameWindow.HexUtils.hexToWorld(coord);
      worldPos.y = 0.15;
      
      const plantId = plantSim.plantSeed('tomato', worldPos);
      if (!plantId) {
        return { error: 'Failed to plant', worldPos };
      }
      
      // Get all plants to debug
      const allPlants = plantSim.getAllPlants();
      
      // Get plant reference - the structure is { plant, type } not { plant, plantType }
      let plantData = allPlants.find(p => p.plant.id === plantId);
      if (!plantData) {
        return { 
          error: 'Plant not found', 
          plantId,
          allPlants: allPlants.map(p => ({ id: p.plant.id, stage: p.plant.currentStage }))
        };
      }
      
      let plant = plantData.plant;
      const plantType = plantData.type; // Changed from plantData.plantType
      if (!plantType || !plantType.growthStages) {
        return { 
          error: 'Plant type or growth stages not found',
          plantData: {
            hasPlant: !!plant,
            hasPlantType: !!plantType,
            plantTypeKeys: plantType ? Object.keys(plantType) : [],
            growthStages: plantType?.growthStages
          }
        };
      }
      
      // Manually advance the plant growth by setting timer
      // This bypasses water consumption issues
      const results = [];
      
      // Stage 0 (Seedling) - duration 10s
      plant.growthTimer = 0;
      results.push({
        stage: 0,
        name: plantType.growthStages[0].name,
        timer: plant.growthTimer,
        duration: plantType.growthStages[0].duration
      });
      
      // Tick to update health
      plantSim.tick(0.1, 0.5);
      plantData = plantSim.getAllPlants().find(p => p.plant.id === plantId);
      plant = plantData.plant;
      
      // Now manually set growth timer to just before stage transition
      plant.growthTimer = 9.9;
      
      // Tick to trigger stage advancement
      plantSim.tick(0.2, 0.5); // Should push it over 10s
      
      plantData = plantSim.getAllPlants().find(p => p.plant.id === plantId);
      plant = plantData.plant;
      results.push({
        stage: plant.currentStage,
        timer: plant.growthTimer,
        health: { ...plant.health }
      });
      
      // Try forcing stage advancement
      if (plant.currentStage === 0) {
        // Manually try to advance
        plant.growthTimer = 11; // Well past duration
        plantSim.tick(1, 0.5);
        
        plantData = plantSim.getAllPlants().find(p => p.plant.id === plantId);
        plant = plantData.plant;
        results.push({
          stage: plant.currentStage,
          timer: plant.growthTimer,
          health: { ...plant.health },
          note: 'After forcing timer past duration'
        });
      }
      
      return {
        plantId,
        results,
        stageInfo: plantType ? plantType.growthStages.map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration
        })) : []
      };
    });
    
    console.log('Growth Simple Results:', JSON.stringify(result, null, 2));
    
    // Check if stage advanced
    const finalResult = result.results[result.results.length - 1];
    if (finalResult.stage === 0) {
      console.log('Plant stuck at stage 0 despite timer being at', finalResult.timer);
      console.log('Health requirements:', finalResult.health);
    }
    
    // Plant should advance from stage 0
    expect(finalResult.stage).toBeGreaterThan(0);
  });
});