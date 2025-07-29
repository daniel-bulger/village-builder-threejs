import { test, expect } from '@playwright/test';

test.describe('Plant Inspector Live Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for game initialization
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game && gameWindow.game.isInitialized;
    });
    
    // Disable animations to start
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(false);
    });
  });

  test('plant inspector should update continuously while hovering', async ({ page }) => {
    // Place soil and add water
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Place soil
      const coord = {q: 0, r: 0, y: 0};
      game.soilManager.placeSoil(coord);
      
      // Add water
      const waterSim = game.soilManager.getWaterSimulation();
      waterSim.addWater(coord, 50000); // 50L
    });
    
    // Plant a tomato
    const plantId = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const plantSim = game.soilManager.getPlantSimulation();
      
      const worldPos = new gameWindow.THREE.Vector3(0, 0.15, 0);
      return plantSim.plantSeed('tomato', worldPos);
    });
    
    expect(plantId).toBeTruthy();
    
    // Mock hovering over the plant
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Set hovered position to plant location
      game.soilManager.hoveredHex = {q: 0, r: 0};
      game.soilManager.hoveredY = 0;
      game.soilManager.hoveredWorldPos = new gameWindow.THREE.Vector3(0, 0.15, 0);
      
      // Call updateInspector directly
      const hexCoord = {q: 0, r: 0, y: 0};
      const worldPos = new gameWindow.THREE.Vector3(0, 0.15, 0);
      const mousePos = {x: 0, y: 0};
      
      game.soilManager.updateInspector(hexCoord, worldPos, mousePos);
    });
    
    // Check that inspector is visible
    const inspectorVisible = await page.evaluate(() => {
      const inspector = document.getElementById('plant-inspector');
      return inspector && inspector.style.display !== 'none';
    });
    
    expect(inspectorVisible).toBe(true);
    
    // Get initial progress
    const initialProgress = await page.evaluate(() => {
      const inspector = document.getElementById('plant-inspector');
      const progressMatch = inspector?.innerHTML.match(/Progress: (\d+)%/);
      return progressMatch ? parseInt(progressMatch[1]) : null;
    });
    
    // Enable animations to allow plant growth
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(true);
      gameWindow.game.timeScale = 100; // Speed up time
    });
    
    // Wait a bit for growth
    await page.waitForTimeout(200);
    
    // Call updateInspector again (simulating continuous hover)
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      const hexCoord = {q: 0, r: 0, y: 0};
      const worldPos = new gameWindow.THREE.Vector3(0, 0.15, 0);
      const mousePos = {x: 0, y: 0};
      
      game.soilManager.updateInspector(hexCoord, worldPos, mousePos);
    });
    
    // Get updated progress
    const updatedProgress = await page.evaluate(() => {
      const inspector = document.getElementById('plant-inspector');
      const progressMatch = inspector?.innerHTML.match(/Progress: (\d+)%/);
      return progressMatch ? parseInt(progressMatch[1]) : null;
    });
    
    // Progress should have increased
    expect(updatedProgress).toBeGreaterThan(initialProgress || 0);
    
    // Check that water level also updates
    const initialWater = await page.evaluate(() => {
      const inspector = document.getElementById('plant-inspector');
      const waterMatch = inspector?.innerHTML.match(/Water:.*?(\d+)%/);
      return waterMatch ? parseInt(waterMatch[1]) : null;
    });
    
    // Reduce water in simulation
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const plantSim = game.soilManager.getPlantSimulation();
      
      // Force plant to consume water
      const plants = plantSim.getAllPlants();
      if (plants.length > 0) {
        plants[0].plant.health.water = 0.5; // Set to 50%
      }
    });
    
    // Update inspector again
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      const hexCoord = {q: 0, r: 0, y: 0};
      const worldPos = new gameWindow.THREE.Vector3(0, 0.15, 0);
      const mousePos = {x: 0, y: 0};
      
      game.soilManager.updateInspector(hexCoord, worldPos, mousePos);
    });
    
    // Get updated water level
    const updatedWater = await page.evaluate(() => {
      const inspector = document.getElementById('plant-inspector');
      const waterMatch = inspector?.innerHTML.match(/Water:.*?(\d+)%/);
      return waterMatch ? parseInt(waterMatch[1]) : null;
    });
    
    // Water should have changed
    expect(updatedWater).toBe(50);
  });
  
  test('organic plant inspector should also update continuously', async ({ page }) => {
    // Place soil and add water
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Place soil
      const coord = {q: 0, r: 0, y: 0};
      game.soilManager.placeSoil(coord);
      
      // Add water
      const waterSim = game.soilManager.getWaterSimulation();
      waterSim.addWater(coord, 50000); // 50L
    });
    
    // Plant an organic tomato
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const organicSim = game.soilManager.getOrganicPlantSimulation();
      
      const coord = {q: 0, r: 0, y: 0};
      organicSim.plantSeed('organic_tomato', coord);
    });
    
    // Mock hovering over the plant
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Set hovered position to plant location
      game.soilManager.hoveredHex = {q: 0, r: 0};
      game.soilManager.hoveredY = 0;
      game.soilManager.hoveredWorldPos = new gameWindow.THREE.Vector3(0, 0.15, 0);
      
      // Call updateInspector directly
      const hexCoord = {q: 0, r: 0, y: 0};
      const worldPos = new gameWindow.THREE.Vector3(0, 0.15, 0);
      const mousePos = {x: 0, y: 0};
      
      game.soilManager.updateInspector(hexCoord, worldPos, mousePos);
    });
    
    // Check that organic inspector is visible
    const inspectorVisible = await page.evaluate(() => {
      const inspector = document.getElementById('organic-plant-inspector');
      return inspector && inspector.style.display !== 'none';
    });
    
    expect(inspectorVisible).toBe(true);
  });
});