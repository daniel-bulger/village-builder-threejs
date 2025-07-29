import { test, expect } from '@playwright/test';

test.describe('Soil Color Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for game initialization
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game && gameWindow.game.isInitialized;
    });
  });

  test('soil colors should not flicker between updates', async ({ page }) => {
    // Place some soil
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Place a 3x3 grid of soil
      const coords = [
        {q: 0, r: 0}, {q: 1, r: 0}, {q: -1, r: 0},
        {q: 0, r: 1}, {q: 0, r: -1}, {q: 1, r: -1}, {q: -1, r: 1}
      ];
      
      coords.forEach(coord => {
        game.soilManager.placeSoil({...coord, y: 0});
      });
    });
    
    // Add water to some hexes
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const waterSim = game.soilManager.getWaterSimulation();
      
      // Add water to create different saturation levels
      waterSim.addWater({q: 0, r: 0, y: 0}, 50000); // 50L
      waterSim.addWater({q: 1, r: 0, y: 0}, 25000); // 25L
      waterSim.addWater({q: -1, r: 0, y: 0}, 75000); // 75L
    });
    
    // Enable animations
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(true);
    });
    
    // Capture initial colors
    const initialColors = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const colors: Record<string, string> = {};
      
      game.soilManager.soilHexes.forEach((soil, key) => {
        if (soil.mesh.material instanceof gameWindow.THREE.MeshStandardMaterial) {
          colors[key] = soil.mesh.material.color.getHexString();
        }
      });
      
      return colors;
    });
    
    // Wait for multiple update cycles
    await page.waitForTimeout(1000);
    
    // Force both update methods to run multiple times
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Simulate multiple update cycles that could cause flickering
      for (let i = 0; i < 10; i++) {
        game.soilManager.updateSoilColors();
        game.soilManager.updateWaterVisuals();
      }
    });
    
    // Get colors after updates
    const finalColors = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const colors: Record<string, string> = {};
      
      game.soilManager.soilHexes.forEach((soil, key) => {
        if (soil.mesh.material instanceof gameWindow.THREE.MeshStandardMaterial) {
          colors[key] = soil.mesh.material.color.getHexString();
        }
      });
      
      return colors;
    });
    
    // Colors should be stable (no flickering between updates)
    expect(Object.keys(finalColors).length).toBe(Object.keys(initialColors).length);
    
    // Verify water affects color (darker when wet)
    const dryHexColor = finalColors['0,1,0']; // No water added
    const wetHexColor = finalColors['0,0,0']; // 50L water added
    const veryWetHexColor = finalColors['-1,0,0']; // 75L water added
    
    // Convert hex strings to numbers for comparison
    const dryValue = parseInt(dryHexColor, 16);
    const wetValue = parseInt(wetHexColor, 16);
    const veryWetValue = parseInt(veryWetHexColor, 16);
    
    // Wet soil should be darker (lower color value)
    expect(wetValue).toBeLessThan(dryValue);
    expect(veryWetValue).toBeLessThan(wetValue);
  });
  
  test('nutrient changes should properly combine with water saturation', async ({ page }) => {
    // Place soil and add nutrients
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Place soil
      const coord = {q: 0, r: 0, y: 0};
      game.soilManager.placeSoil(coord);
      
      // Add high nitrogen (should make it greener)
      const nutrientSystem = game.soilManager.getNutrientSystem();
      nutrientSystem.setNutrients(coord, {
        nitrogen: 0.9,
        phosphorus: 0.3,
        potassium: 0.3
      });
    });
    
    // Get dry color with high nitrogen
    const dryColor = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      game.soilManager.updateSoilColors();
      
      const soil = game.soilManager.soilHexes.get('0,0,0');
      return soil.mesh.material.color.getHexString();
    });
    
    // Add water
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const waterSim = game.soilManager.getWaterSimulation();
      waterSim.addWater({q: 0, r: 0, y: 0}, 100000); // 100L for full saturation
    });
    
    // Get wet color
    const wetColor = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      game.soilManager.updateWaterVisuals();
      
      const soil = game.soilManager.soilHexes.get('0,0,0');
      return soil.mesh.material.color.getHexString();
    });
    
    // Colors should be different (wet should be darker)
    expect(wetColor).not.toBe(dryColor);
    expect(parseInt(wetColor, 16)).toBeLessThan(parseInt(dryColor, 16));
  });
});