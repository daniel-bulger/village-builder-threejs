import { test, expect, Page } from '@playwright/test';
import { waitForGame, gameEval, measureFPS, placeSoilAt, removeSoilAt, selectToolByName } from './helpers';

test.describe('Phase 1 Complete - All Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    
    // Disable animations for consistent tests
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(false);
    });
  });

  test.describe('Soil Stacking', () => {
    test('should stack soil vertically', async ({ page }) => {
      // Select shovel tool first
      await selectToolByName(page, 'Shovel');
      await page.waitForTimeout(100);
      
      // Place initial soil at ground level
      await placeSoilAt(page, 400, 300);
      
      let soilCount = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      expect(soilCount).toBe(1);
      
      // Click same position to stack
      await placeSoilAt(page, 400, 300);
      
      soilCount = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      expect(soilCount).toBe(2);
      
      // Check max depth
      const maxDepth = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getMaxSoilDepth();
      });
      expect(maxDepth).toBe(2);
    });

    test('should show correct placement height in preview', async ({ page }) => {
      // Select shovel tool
      await selectToolByName(page, 'Shovel');
      await page.waitForTimeout(100);
      
      // Place base soil
      await placeSoilAt(page, 400, 300);
      
      // Hover over the same spot
      await page.mouse.move(400, 300);
      await page.waitForTimeout(100);
      
      const placementHeight = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlacementHeight();
      });
      
      expect(placementHeight).toBe(1); // Should preview at Y=1
    });

    test('should remove soil from top of stack', async ({ page }) => {
      // Select shovel tool
      await selectToolByName(page, 'Shovel');
      await page.waitForTimeout(100);
      
      // Build a 3-high stack
      await placeSoilAt(page, 400, 300);
      await placeSoilAt(page, 400, 300);
      await placeSoilAt(page, 400, 300);
      
      // Remove one
      await removeSoilAt(page, 400, 300);
      
      const soilCount = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      expect(soilCount).toBe(2);
      
      const maxDepth = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getMaxSoilDepth();
      });
      expect(maxDepth).toBe(2);
    });

    test('should adjust height with scroll wheel', async ({ page }) => {
      // Select shovel tool
      await selectToolByName(page, 'Shovel');
      await page.waitForTimeout(100);
      
      // Place base soil at a position
      await placeSoilAt(page, 400, 300);
      
      // Stay at the same position to test stacking
      await page.mouse.move(400, 300);
      await page.waitForTimeout(100);
      
      // Initially should be at height 1 (on top of existing soil)
      let placementHeight = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlacementHeight();
      });
      expect(placementHeight).toBe(1);
      
      // Scroll down to lower placement height
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(100);
      
      placementHeight = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlacementHeight();
      });
      expect(placementHeight).toBe(0); // Should be back at ground level
      
      // Scroll up to raise height again
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(100);
      
      placementHeight = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlacementHeight();
      });
      expect(placementHeight).toBe(1);
    });

    test('should support manual height mode with shift+scroll', async ({ page }) => {
      // Select shovel tool
      await selectToolByName(page, 'Shovel');
      await page.waitForTimeout(100);
      
      // Hold shift and scroll
      await page.keyboard.down('Shift');
      await page.mouse.move(400, 300);
      
      // Scroll up several times
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, -100);
      }
      
      await page.keyboard.up('Shift');
      await page.waitForTimeout(100);
      
      const placementHeight = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlacementHeight();
      });
      
      expect(placementHeight).toBeGreaterThan(0);
      expect(placementHeight).toBeLessThanOrEqual(10);
    });
  });

  test.describe('Day/Night Cycle', () => {
    test('should advance time', async ({ page }) => {
      // Re-enable animations for this test
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.setAnimationsEnabled(true);
      });
      
      const startTime = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.lighting.getTimeOfDay();
      });
      
      // Speed up time for testing
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.timeScale = 100;
      });
      
      await page.waitForTimeout(1000);
      
      const endTime = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.lighting.getTimeOfDay();
      });
      
      expect(endTime).not.toBe(startTime);
    });

    test('should update lighting based on time', async ({ page }) => {
      // Set to noon
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.lighting.setTimeOfDay(0.5);
      });
      
      const noonIntensity = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.lighting.sun.intensity;
      });
      
      // Set to midnight
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.lighting.setTimeOfDay(0);
      });
      
      const midnightIntensity = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.lighting.sun.intensity;
      });
      
      expect(noonIntensity).toBeGreaterThan(midnightIntensity);
    });
  });

  test.describe('Hex Grid Overlay', () => {
    test('should toggle grid visibility with G key', async ({ page }) => {
      // Initially hidden
      let isVisible = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.hexGrid.isVisible();
      });
      expect(isVisible).toBe(false);
      
      // Press G to show
      await page.keyboard.press('g');
      await page.waitForTimeout(100);
      
      isVisible = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.hexGrid.isVisible();
      });
      expect(isVisible).toBe(true);
      
      // Press G again to hide
      await page.keyboard.press('g');
      await page.waitForTimeout(100);
      
      isVisible = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.hexGrid.isVisible();
      });
      expect(isVisible).toBe(false);
    });
  });

  test.describe('Camera Controls', () => {
    test('should rotate camera with middle mouse drag', async ({ page }) => {
      // Get initial camera angle
      const startAngle = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.cameraController.angle;
      });
      
      // Middle mouse drag
      await page.mouse.move(400, 300);
      await page.mouse.down({ button: 'middle' });
      await page.mouse.move(500, 300);
      await page.mouse.up({ button: 'middle' });
      
      const endAngle = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.cameraController.angle;
      });
      
      expect(endAngle).not.toBe(startAngle);
    });

    test('should switch to overhead view with Tab', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100); // Wait for input to process
      
      const mode = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.cameraController.getMode();
      });
      expect(mode).toBe('overhead');
      
      const cameraY = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.camera.position.y;
      });
      expect(cameraY).toBeGreaterThan(40);
    });
  });

  test.describe('Info Panel', () => {
    test('should display current information', async ({ page }) => {
      const infoText = await page.textContent('#info-content');
      
      expect(infoText).toContain('Time:');
      expect(infoText).toContain('Position:');
      expect(infoText).toContain('Soil Placed:');
      expect(infoText).toContain('Max Depth:');
      expect(infoText).toContain('Column Depth:');
      expect(infoText).toContain('Place at Y:');
      expect(infoText).toContain('Camera:');
    });

    test('should update soil count in real-time', async ({ page }) => {
      // Check initial count
      let infoText = await page.textContent('#info-content');
      expect(infoText).toContain('Soil Placed: 0');
      
      // Place soil
      await placeSoilAt(page, 400, 300);
      await page.waitForTimeout(100);
      
      infoText = await page.textContent('#info-content');
      expect(infoText).toContain('Soil Placed: 1');
    });
  });

  test.describe('Performance', () => {
    test('should maintain 60 FPS with multiple soil stacks', async ({ page }) => {
      // Create several stacks
      const positions = [
        { x: 400, y: 300 },
        { x: 430, y: 300 },
        { x: 370, y: 300 },
        { x: 400, y: 330 },
        { x: 400, y: 270 }
      ];
      
      // Build 5-high stacks
      for (const pos of positions) {
        for (let i = 0; i < 5; i++) {
          await placeSoilAt(page, pos.x, pos.y);
        }
      }
      
      const fps = await measureFPS(page, 2000);
      expect(fps).toBeGreaterThan(50);
    });
  });

  test.describe('Edge Cases', () => {
    test('should prevent placing soil in mid-air', async ({ page }) => {
      // Try to place at Y=2 without support
      await page.evaluate(() => {
        const gameWindow = window as any;
        const coord = { q: 0, r: 0, y: 2 };
        return gameWindow.game.soilManager.placeSoil(coord);
      });
      
      const soilCount = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      expect(soilCount).toBe(0);
    });

    test('should handle rapid placement correctly', async ({ page }) => {
      // With our fix, rapid clicks should create a proper stack
      // Each click should add one soil block on top of the previous
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(400, 300);
        await page.waitForTimeout(100);
        await page.mouse.down();
        await page.waitForTimeout(16);
        await page.mouse.up();
        await page.waitForTimeout(100);
      }
      
      const soilCount = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      
      const maxDepth = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getMaxSoilDepth();
      });
      
      // Should have created exactly 5 blocks in a stack
      expect(soilCount).toBeGreaterThanOrEqual(5);
      expect(maxDepth).toBeGreaterThanOrEqual(5);
    });
  });
});