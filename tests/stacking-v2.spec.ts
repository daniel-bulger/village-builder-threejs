import { test, expect } from '@playwright/test';
import { waitForGame } from './helpers';
import { placeSoilDirectly, placeSoilAtCenter, getHexAtCenter } from './helpers-v2';

test.describe('Soil Stacking V2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    await page.waitForTimeout(1000); // Wait for camera to settle
    
    // Add test soil to inventory
    await page.keyboard.press('t'); // Adds test materials including soil
    await page.waitForTimeout(100);
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
    // Directly select the slot with actual soil (not soil_placer)
    const activeItem = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Find the slot with soil resource (not the tool)
      const slots = game.inventorySystem.getHotbarSlots();
      for (let i = 0; i < slots.length; i++) {
        const item = slots[i]?.item;
        // Look for soil items that have nutrient values in their ID (e.g. soil_65-65-65)
        if (item && item.id && item.id.startsWith('soil_') && item.id.includes('-')) {
          // Directly set active slot
          game.inventorySystem.setActiveHotbarSlot(i);
          return { id: item.id, name: item.name, slot: i };
        }
      }
      return null;
    });
    console.log('Active item:', activeItem);
    
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
    // Directly select the slot with actual soil (not soil_placer)
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Find the slot with soil resource (not the tool)
      const slots = game.inventorySystem.getHotbarSlots();
      for (let i = 0; i < slots.length; i++) {
        const item = slots[i]?.item;
        // Look for soil items that have nutrient values in their ID (e.g. soil_65-65-65)
        if (item && item.id && item.id.startsWith('soil_') && item.id.includes('-')) {
          // Directly set active slot
          game.inventorySystem.setActiveHotbarSlot(i);
          break;
        }
      }
    });
    
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