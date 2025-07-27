/**
 * Debug test to understand why plants aren't growing
 */

import { test, expect } from '@playwright/test';

test.describe('Plant Growth Debug', () => {
  test('check plant growth requirements', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game?.isInitialized === true;
    });

    const result = await page.evaluate(async () => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Create test environment with surrounding soil to prevent water drainage
      const coords = [];
      for (let q = -1; q <= 1; q++) {
        for (let r = -1; r <= 1; r++) {
          if (Math.abs(q + r) <= 1) {
            const c = { q, r, y: 0 };
            game.soilManager.placeSoil(c);
            coords.push(c);
          }
        }
      }
      
      // Set all hexes to 100% nutrients
      const nutrientSystem = game.soilManager.getNutrientSystem();
      for (const c of coords) {
        nutrientSystem.addNutrients(c, {
          nitrogen: 0.5,
          phosphorus: 0.5,
          potassium: 0.5
        });
      }
      
      const coord = { q: 0, r: 0, y: 0 };
      
      // Add lots of water to surrounding hexes too (prevent drainage)
      const waterSim = game.soilManager.getWaterSimulation();
      for (let q = -1; q <= 1; q++) {
        for (let r = -1; r <= 1; r++) {
          if (Math.abs(q + r) <= 1) {
            const neighbor = { q, r, y: 0 };
            waterSim.addWater(neighbor, 150000); // 150L per hex
          }
        }
      }
      waterSim.addWater(coord, 150000); // Extra water at center
      
      // Plant tomato
      const plantSim = game.soilManager.getPlantSimulation();
      const worldPos = gameWindow.HexUtils.hexToWorld(coord);
      worldPos.y = 0.15;
      
      const plantId = plantSim.plantSeed('tomato', worldPos);
      if (!plantId) {
        return { error: 'Failed to plant' };
      }
      
      // Get initial state
      let plant = plantSim.getAllPlants().find(p => p.plant.id === plantId);
      const initialState = {
        stage: plant.plant.currentStage,
        health: { ...plant.plant.health },
        growthTimer: plant.plant.growthTimer
      };
      
      // Tick once to update health
      plantSim.tick(0.1, 0.5);
      
      // Get updated health
      plant = plantSim.getAllPlants().find(p => p.plant.id === plantId);
      const afterTickHealth = { ...plant.plant.health };
      
      // Note: checkRequirements is private, so we can't call it directly
      const requirementsMet = null;
      
      // Check if growth is happening
      game.timeScale = 10; // Reduced from 100
      game.setAnimationsEnabled(true);
      
      // Simulate 20 seconds (should be enough for seedling stage which needs 10s)
      for (let i = 0; i < 200; i++) {
        plantSim.tick(0.1, 0.5); // 0.1 second ticks, daytime
        
        // Top up water every 50 ticks to prevent it dropping below threshold
        if (i % 50 === 0) {
          for (let q = -1; q <= 1; q++) {
            for (let r = -1; r <= 1; r++) {
              if (Math.abs(q + r) <= 1) {
                const neighbor = { q, r, y: 0 };
                waterSim.addWater(neighbor, 50000); // 50L per hex
              }
            }
          }
        }
      }
      
      // Get final state
      plant = plantSim.getAllPlants().find(p => p.plant.id === plantId);
      const finalState = {
        stage: plant.plant.currentStage,
        health: { ...plant.plant.health },
        growthTimer: plant.plant.growthTimer,
        isStunted: plant.plant.isStunted
      };
      
      return {
        initialState,
        afterTickHealth,
        requirementsMet,
        finalState,
        stageInfo: plant && plant.plantType ? plant.plantType.growthStages.map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration
        })) : []
      };
    });
    
    console.log('Growth Debug Results:', JSON.stringify(result, null, 2));
    
    // Plant should have health values after tick
    expect(result.afterTickHealth.water).toBeGreaterThan(0);
    expect(result.afterTickHealth.nutrients).toBeGreaterThan(0);
    expect(result.afterTickHealth.sunlight).toBeGreaterThan(0);
    
    // Plant should advance from stage 0
    if (result.finalState.stage === 0) {
      console.log('Plant did not advance! Growth timer:', result.finalState.growthTimer);
      console.log('Is stunted?', result.finalState.isStunted);
    }
    
    expect(result.finalState.stage).toBeGreaterThan(0);
  });
});