import { test, expect } from '@playwright/test';
import { waitForGame, applyToolAt, selectToolByName } from './helpers';

test.describe('Edge Barrier System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    await page.waitForTimeout(500);
  });

  test('should place edge barriers on hex edges', async ({ page }) => {
    // First place a hex of soil at center of screen
    await selectToolByName(page, 'Shovel');
    await page.waitForTimeout(100);
    
    // Click at center to place soil
    const centerX = 640;
    const centerY = 360;
    await applyToolAt(page, centerX, centerY);
    
    // Get the hex coordinate where we placed soil
    const hexInfo = await page.evaluate(() => {
      const gameWindow = window as any;
      const soilManager = gameWindow.game.soilManager;
      const hexes = Array.from((soilManager as any).soilHexes.keys());
      if (hexes.length > 0) {
        const hexKey = hexes[0];
        const parts = hexKey.split(',');
        return {
          q: parseInt(parts[0]),
          r: parseInt(parts[1]),
          y: parseInt(parts[2])
        };
      }
      return null;
    });
    console.log('Placed soil at hex:', hexInfo);
    
    // Switch to barrier tool (slot 5)
    await selectToolByName(page, 'Barrier Placer');
    await page.waitForTimeout(100);
    
    // Calculate position for east edge (move 10 pixels east from center)
    const edgeX = centerX + 10;
    await page.mouse.move(edgeX, centerY);
    await page.waitForTimeout(50);
    
    // Force game update to detect edge
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.update();
    });
    
    // Debug before click
    const beforeClick = await page.evaluate(() => {
      const gameWindow = window as any;
      const soilManager = gameWindow.game.soilManager as any;
      return {
        hoveredEdge: soilManager.hoveredEdge,
        edgeBarrierCount: soilManager.edgeBarrierMeshes.size,
        hoveredHex: soilManager.hoveredHex
      };
    });
    console.log('Before click:', beforeClick);
    
    await applyToolAt(page, edgeX, centerY);
    
    // Debug after click
    const afterClick = await page.evaluate(() => {
      const gameWindow = window as any;
      const soilManager = gameWindow.game.soilManager as any;
      const sim = gameWindow.game.soilManager.getWaterSimulation();
      return {
        hoveredEdge: soilManager.hoveredEdge,
        edgeBarrierMeshes: soilManager.edgeBarrierMeshes.size,
        waterSimBarriers: sim.getAllEdgeBarriers().length
      };
    });
    console.log('After click:', afterClick);
    
    const barrierCount = afterClick.waterSimBarriers;
    
    expect(barrierCount).toBe(1);
  });

  test('should block water flow through edge barriers', async ({ page }) => {
    // Place two adjacent hexes
    await selectToolByName(page, 'Shovel');
    await page.waitForTimeout(100);
    await applyToolAt(page, 400, 300); // Center hex
    await applyToolAt(page, 430, 300); // East hex
    
    // Place edge barrier between them
    await selectToolByName(page, 'Barrier Placer');
    await page.waitForTimeout(100);
    await page.mouse.move(415, 300); // Between the hexes
    await page.waitForTimeout(50);
    await applyToolAt(page, 415, 300);
    
    // Add water to center hex
    const waterAdded = await page.evaluate(() => {
      const gameWindow = window as any;
      const soilManager = gameWindow.game.soilManager;
      const hexes = Array.from((soilManager as any).soilHexes.values());
      if (hexes.length > 0) {
        const centerHex = hexes[0];
        return soilManager.waterSoil(centerHex.coord);
      }
      return false;
    });
    
    expect(waterAdded).toBe(true);
    
    // Enable fast simulation
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(true);
      gameWindow.game.timeScale = 50;
    });
    
    // Wait for water to try to spread
    await page.waitForTimeout(500);
    
    // Check water levels
    const waterLevels = await page.evaluate(() => {
      const gameWindow = window as any;
      const sim = gameWindow.game.soilManager.getWaterSimulation();
      const hexes = Array.from(gameWindow.game.soilManager['soilHexes'].values());
      
      return {
        center: sim.getSaturation(hexes[0].coord),
        east: sim.getSaturation(hexes[1].coord)
      };
    });
    
    console.log('Water levels with barrier:', waterLevels);
    
    // Center should have water, east should have minimal or no water (blocked by barrier)
    expect(waterLevels.center).toBeGreaterThan(0);
    expect(waterLevels.east).toBeLessThan(0.00001); // Allow tiny floating point errors
  });

  test('should toggle edge barriers on/off', async ({ page }) => {
    // Place a hex
    await selectToolByName(page, 'Shovel');
    await page.waitForTimeout(100);
    await applyToolAt(page, 400, 300);
    
    // Switch to barrier tool (slot 5)
    await selectToolByName(page, 'Barrier Placer');
    await page.waitForTimeout(100);
    
    // Place edge barrier (need to be within 40% of hex size)
    await page.mouse.move(412, 300);
    await page.waitForTimeout(50);
    await applyToolAt(page, 412, 300);
    
    // Click again to remove it
    await page.waitForTimeout(100);
    await applyToolAt(page, 412, 300);
    
    // Check that barrier was removed
    const barrierCount = await page.evaluate(() => {
      const gameWindow = window as any;
      const sim = gameWindow.game.soilManager.getWaterSimulation();
      return sim.getAllEdgeBarriers().length;
    });
    
    expect(barrierCount).toBe(0);
  });
});