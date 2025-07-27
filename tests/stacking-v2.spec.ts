import { test, expect } from '@playwright/test';
import { waitForGame } from './helpers';
import { placeSoilDirectly, placeSoilAtCenter, getHexAtCenter } from './helpers-v2';

test.describe('Soil Stacking V2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    await page.waitForTimeout(1000); // Wait for camera to settle
  });

  test('should stack soil using direct placement', async ({ page }) => {
    // Test direct stacking without mouse
    const result1 = await placeSoilDirectly(page, 0, 0, 0);
    expect(result1).toBe(true);
    
    const count1 = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.soilManager.getSoilCount();
    });
    expect(count1).toBe(1);
    
    // Stack on top
    const result2 = await placeSoilDirectly(page, 0, 0, 1);
    expect(result2).toBe(true);
    
    const count2 = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.soilManager.getSoilCount();
    });
    expect(count2).toBe(2);
    
    const maxDepth = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.soilManager.getMaxSoilDepth();
    });
    expect(maxDepth).toBe(2);
  });

  test('should stack soil using mouse at center', async ({ page }) => {
    // Get hex at center of screen
    const centerHex = await getHexAtCenter(page);
    console.log('Center hex:', centerHex);
    expect(centerHex).not.toBeNull();
    
    // Place first soil
    await placeSoilAtCenter(page);
    
    const count1 = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.soilManager.getSoilCount();
    });
    expect(count1).toBeGreaterThanOrEqual(1);
    
    // Place second soil at same position
    await placeSoilAtCenter(page);
    
    const count2 = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.soilManager.getSoilCount();
    });
    expect(count2).toBeGreaterThanOrEqual(2);
  });

  test('should update preview height when hovering over stacked soil', async ({ page }) => {
    // Place base soil directly
    await placeSoilDirectly(page, 0, 0, 0);
    
    // Move mouse to where we know there's soil
    const worldPos = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.HexUtils.hexToWorld({ q: 0, r: 0 });
    });
    
    // Convert world position to screen coordinates
    const screenPos = await page.evaluate((worldPos) => {
      const gameWindow = window as any;
      const camera = gameWindow.game.camera;
      const vector = new gameWindow.THREE.Vector3(worldPos.x, worldPos.y + 0.5, worldPos.z);
      vector.project(camera);
      
      return {
        x: (vector.x + 1) * window.innerWidth / 2,
        y: (-vector.y + 1) * window.innerHeight / 2
      };
    }, worldPos);
    
    await page.mouse.move(screenPos.x, screenPos.y);
    await page.waitForTimeout(200);
    
    const placementHeight = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.soilManager.getPlacementHeight();
    });
    
    expect(placementHeight).toBe(1); // Should show Y=1 for stacking
  });
});