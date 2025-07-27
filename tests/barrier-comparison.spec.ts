import { test, expect } from '@playwright/test';
import { waitForGame, applyToolAt } from './helpers';

test.describe('Barrier Water Retention Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    await page.waitForTimeout(500);
  });

  test('should show dramatic difference in water retention', async ({ page }) => {
    // Test 1: Soil without barrier (control)
    await page.keyboard.press('1'); // Place tool
    await page.waitForTimeout(100);
    await applyToolAt(page, 300, 300); // Place soil at location 1
    
    // Test 2: Soil with barrier underneath
    await page.keyboard.press('4'); // Barrier tool
    await page.waitForTimeout(100);
    await applyToolAt(page, 500, 300); // Place barrier at location 2
    
    await page.keyboard.press('1'); // Back to place tool
    await page.waitForTimeout(100);
    await applyToolAt(page, 500, 300); // Place soil on top of barrier
    
    // Get the actual hex positions and add water
    const { coords, waterAdded } = await page.evaluate(() => {
      const gameWindow = window as any;
      const soilManager = gameWindow.game.soilManager;
      const hexes = Array.from(soilManager['soilHexes'].values());
      
      // Hexes should be in order: [unprotected soil, barrier, protected soil]
      const coords = {
        unprotected: hexes[0]?.coord as any, // First hex is unprotected soil
        protected: hexes[2]?.coord as any    // Third hex is protected soil on barrier
      };
      
      // Water both hexes
      const waterAdded = {
        unprotected: coords.unprotected ? soilManager.waterSoil(coords.unprotected) : false,
        protected: coords.protected ? soilManager.waterSoil(coords.protected) : false
      };
      
      return { coords, waterAdded };
    });
    
    console.log('Hex coordinates:', coords);
    console.log('Water added:', waterAdded);
    
    // Check initial water levels
    const initialLevels = await page.evaluate((coords) => {
      const gameWindow = window as any;
      const sim = gameWindow.game.soilManager.getWaterSimulation();
      return {
        unprotected: coords.unprotected ? sim.getSaturation(coords.unprotected) : 0,
        protected: coords.protected ? sim.getSaturation(coords.protected) : 0
      };
    }, coords);
    
    console.log('Initial water levels:', initialLevels);
    expect(initialLevels.unprotected).toBe(0.3);
    expect(initialLevels.protected).toBe(0.3);
    
    // Enable simulation with slower speed
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(true);
      gameWindow.game.timeScale = 5;
    });
    
    // Wait for water to drain/evaporate
    await page.waitForTimeout(1000);
    
    // Check final water levels
    const finalLevels = await page.evaluate((coords) => {
      const gameWindow = window as any;
      const sim = gameWindow.game.soilManager.getWaterSimulation();
      return {
        unprotected: coords.unprotected ? sim.getSaturation(coords.unprotected) : 0,
        protected: coords.protected ? sim.getSaturation(coords.protected) : 0
      };
    }, coords);
    
    console.log('Final water levels:', finalLevels);
    
    // Both will lose water, but unprotected should lose much more
    const unprotectedLoss = 0.3 - finalLevels.unprotected;
    const protectedLoss = 0.3 - finalLevels.protected;
    
    console.log('Water loss:', {
      unprotected: unprotectedLoss.toFixed(3),
      protected: protectedLoss.toFixed(3)
    });
    
    // The key difference: unprotected should lose ALL water to desert drainage
    expect(finalLevels.unprotected).toBe(0); // Complete drainage to desert
    expect(finalLevels.protected).toBeGreaterThan(0); // Some water retained
    
    // Calculate retention rates
    const retentionRates = {
      unprotected: (finalLevels.unprotected / 0.3) * 100,
      protected: (finalLevels.protected / 0.3) * 100
    };
    
    console.log('Water retention rates:', {
      unprotected: `${retentionRates.unprotected.toFixed(2)}%`,
      protected: `${retentionRates.protected.toFixed(2)}%`
    });
    
    // Even a small amount of retained water shows the barrier is working
    console.log('Barrier effectiveness: Protected soil retained water while unprotected lost it all');
  });
});