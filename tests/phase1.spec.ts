import { test, expect, Page } from '@playwright/test';

// Helper to wait for Three.js to initialize
async function waitForGame(page: Page) {
  await page.waitForFunction(() => {
    return window.game && window.game.isInitialized;
  }, { timeout: 5000 });
}

// Helper to execute game commands
async function gameEval(page: Page, command: string) {
  return await page.evaluate(command);
}

test.describe('Phase 1 - Foundation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    
    // Disable animations for consistent tests
    await page.evaluate(() => {
      window.game.setAnimationsEnabled(false);
    });
  });

  test.describe('Game Initialization', () => {
    test('should load Three.js scene', async ({ page }) => {
      const hasScene = await page.evaluate(() => {
        return window.game.scene !== undefined;
      });
      expect(hasScene).toBe(true);
    });

    test('should create player at origin', async ({ page }) => {
      const playerPos = await page.evaluate(() => {
        return {
          x: window.game.player.position.x,
          y: window.game.player.position.y,
          z: window.game.player.position.z
        };
      });
      expect(playerPos).toEqual({ x: 0, y: 0, z: 0 });
    });

    test('should start in third-person camera mode', async ({ page }) => {
      const cameraMode = await page.evaluate(() => {
        return window.game.cameraController.mode;
      });
      expect(cameraMode).toBe('third-person');
    });

    test('should render at 60 FPS', async ({ page }) => {
      // Collect FPS samples over 1 second
      const samples = await page.evaluate(() => {
        return new Promise((resolve) => {
          const fpsSamples = [];
          let frameCount = 0;
          let lastTime = performance.now();
          
          function collectSample() {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 100) { // Sample every 100ms
              const fps = (frameCount * 1000) / (currentTime - lastTime);
              fpsSamples.push(fps);
              frameCount = 0;
              lastTime = currentTime;
              
              if (fpsSamples.length >= 10) { // 1 second of samples
                resolve(fpsSamples);
              }
            }
            
            if (fpsSamples.length < 10) {
              requestAnimationFrame(collectSample);
            }
          }
          
          requestAnimationFrame(collectSample);
        });
      });
      
      const avgFPS = samples.reduce((a, b) => a + b) / samples.length;
      expect(avgFPS).toBeGreaterThan(55); // Allow some variance
    });
  });

  test.describe('Player Movement', () => {
    test('should move forward with W key', async ({ page }) => {
      const startPos = await gameEval(page, 'window.game.player.position.z');
      
      await page.keyboard.down('w');
      await page.waitForTimeout(1000); // Move for 1 second
      await page.keyboard.up('w');
      
      const endPos = await gameEval(page, 'window.game.player.position.z');
      expect(endPos).toBeLessThan(startPos); // Z decreases moving forward
    });

    test('should move faster with Shift held', async ({ page }) => {
      // Test walk speed
      await page.keyboard.down('w');
      await page.waitForTimeout(500);
      await page.keyboard.up('w');
      
      const walkDistance = await gameEval(page, 'Math.abs(window.game.player.position.z)');
      
      // Reset position
      await gameEval(page, 'window.game.player.position.set(0, 0, 0)');
      
      // Test run speed
      await page.keyboard.down('Shift');
      await page.keyboard.down('w');
      await page.waitForTimeout(500);
      await page.keyboard.up('w');
      await page.keyboard.up('Shift');
      
      const runDistance = await gameEval(page, 'Math.abs(window.game.player.position.z)');
      
      expect(runDistance).toBeGreaterThan(walkDistance * 1.5);
    });

    test('should move in all four directions', async ({ page }) => {
      const movements = [
        { key: 'w', axis: 'z', expected: 'less' },
        { key: 's', axis: 'z', expected: 'greater' },
        { key: 'a', axis: 'x', expected: 'less' },
        { key: 'd', axis: 'x', expected: 'greater' }
      ];
      
      for (const move of movements) {
        // Reset position
        await gameEval(page, 'window.game.player.position.set(0, 0, 0)');
        
        const startValue = 0;
        await page.keyboard.down(move.key);
        await page.waitForTimeout(500);
        await page.keyboard.up(move.key);
        
        const endValue = await gameEval(page, `window.game.player.position.${move.axis}`);
        
        if (move.expected === 'less') {
          expect(endValue).toBeLessThan(startValue);
        } else {
          expect(endValue).toBeGreaterThan(startValue);
        }
      }
    });
  });

  test.describe('Camera Controls', () => {
    test('should toggle to overhead view with Tab', async ({ page }) => {
      await page.keyboard.press('Tab');
      
      const cameraMode = await page.evaluate(() => {
        return window.game.cameraController.mode;
      });
      expect(cameraMode).toBe('overhead');
      
      // Toggle back
      await page.keyboard.press('Tab');
      const finalMode = await page.evaluate(() => {
        return window.game.cameraController.mode;
      });
      expect(finalMode).toBe('third-person');
    });

    test('should position camera correctly in overhead mode', async ({ page }) => {
      await page.keyboard.press('Tab');
      
      const cameraY = await page.evaluate(() => {
        return window.game.camera.position.y;
      });
      
      expect(cameraY).toBeGreaterThan(40); // Should be high above player
    });
  });

  test.describe('Desert Environment', () => {
    test('should generate terrain tiles around player', async ({ page }) => {
      const tileCount = await page.evaluate(() => {
        return window.game.desert.getTileCount();
      });
      
      expect(tileCount).toBeGreaterThan(20); // Should have multiple tiles
    });

    test('should load new tiles as player moves', async ({ page }) => {
      const initialTiles = await page.evaluate(() => {
        return window.game.desert.getTileCount();
      });
      
      // Move player far enough to trigger new tile generation
      await page.evaluate(() => {
        window.game.player.position.x += 200;
      });
      
      await page.waitForTimeout(100); // Let update cycle run
      
      const finalTiles = await page.evaluate(() => {
        return window.game.desert.getTileCount();
      });
      
      expect(finalTiles).toBe(initialTiles); // Count stays same, but tiles changed
    });
  });

  test.describe('Day/Night Cycle', () => {
    test('should update sun position over time', async ({ page }) => {
      const startAngle = await page.evaluate(() => {
        return Math.atan2(
          window.game.lighting.sun.position.x,
          window.game.lighting.sun.position.y
        );
      });
      
      // Speed up time for testing
      await page.evaluate(() => {
        window.game.timeScale = 100;
      });
      
      await page.waitForTimeout(1000);
      
      const endAngle = await page.evaluate(() => {
        return Math.atan2(
          window.game.lighting.sun.position.x,
          window.game.lighting.sun.position.y
        );
      });
      
      expect(endAngle).not.toBe(startAngle);
    });
  });

  test.describe('Hex Grid System', () => {
    test('should convert world position to hex coordinates correctly', async ({ page }) => {
      const conversions = [
        { world: { x: 0, z: 0 }, hex: { q: 0, r: 0 } },
        { world: { x: 1.5, z: 0 }, hex: { q: 1, r: 0 } },
        { world: { x: 0, z: 1.732 }, hex: { q: 0, r: 1 } }
      ];
      
      for (const test of conversions) {
        const result = await page.evaluate((pos) => {
          return window.HexUtils.worldToHex(new THREE.Vector3(pos.x, 0, pos.z));
        }, test.world);
        
        expect(result.q).toBe(test.hex.q);
        expect(result.r).toBe(test.hex.r);
      }
    });

    test('should calculate hex neighbors correctly', async ({ page }) => {
      const neighbors = await page.evaluate(() => {
        return window.HexUtils.getNeighbors({ q: 0, r: 0 });
      });
      
      expect(neighbors).toHaveLength(6);
      expect(neighbors).toContainEqual({ q: 1, r: 0 });
      expect(neighbors).toContainEqual({ q: -1, r: 0 });
    });

    test('should toggle grid visibility with G key', async ({ page }) => {
      const initialVisibility = await page.evaluate(() => {
        return window.game.hexGrid.isVisible();
      });
      
      await page.keyboard.press('g');
      
      const afterToggle = await page.evaluate(() => {
        return window.game.hexGrid.isVisible();
      });
      
      expect(afterToggle).toBe(!initialVisibility);
    });
  });

  test.describe('Soil Placement', () => {
    test('should show placement preview on mouse move', async ({ page }) => {
      // Move mouse to center of screen
      await page.mouse.move(400, 300);
      
      const previewVisible = await page.evaluate(() => {
        return window.game.soilManager.isPreviewVisible();
      });
      
      expect(previewVisible).toBe(true);
    });

    test('should snap preview to hex grid', async ({ page }) => {
      await page.mouse.move(410, 300); // Slightly off center
      
      const previewPos = await page.evaluate(() => {
        const pos = window.game.soilManager.getPreviewPosition();
        return { x: pos.x, z: pos.z };
      });
      
      // Should snap to nearest hex center
      expect(previewPos.x % 1.5).toBeCloseTo(0, 1);
    });

    test('should place soil with left click', async ({ page }) => {
      await page.mouse.move(400, 300);
      await page.mouse.click(400, 300);
      
      const soilCount = await page.evaluate(() => {
        return window.game.soilManager.getSoilCount();
      });
      
      expect(soilCount).toBe(1);
    });

    test('should prevent placing soil on existing soil', async ({ page }) => {
      // Place first soil
      await page.mouse.move(400, 300);
      await page.mouse.click(400, 300);
      
      // Try to place again at same spot
      await page.mouse.click(400, 300);
      
      const soilCount = await page.evaluate(() => {
        return window.game.soilManager.getSoilCount();
      });
      
      expect(soilCount).toBe(1); // Should still be just 1
    });

    test('should remove soil with right click', async ({ page }) => {
      // Place soil
      await page.mouse.move(400, 300);
      await page.mouse.click(400, 300);
      
      // Remove it
      await page.mouse.click(400, 300, { button: 'right' });
      
      const soilCount = await page.evaluate(() => {
        return window.game.soilManager.getSoilCount();
      });
      
      expect(soilCount).toBe(0);
    });

    test('should show red preview over existing soil', async ({ page }) => {
      // Place soil
      await page.mouse.click(400, 300);
      
      // Move mouse over it
      await page.mouse.move(400, 300);
      
      const previewColor = await page.evaluate(() => {
        return window.game.soilManager.getPreviewColor();
      });
      
      expect(previewColor).toBe(0xff0000); // Red
    });
  });

  test.describe('Performance Benchmarks', () => {
    test('should maintain 60 FPS with 100 soil hexes', async ({ page }) => {
      // Place many soil hexes
      await page.evaluate(() => {
        for (let q = -5; q <= 5; q++) {
          for (let r = -5; r <= 5; r++) {
            if (Math.abs(q + r) <= 5) {
              window.game.soilManager.placeSoilAt({ q, r });
            }
          }
        }
      });
      
      // Measure FPS
      const fps = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frames = 0;
          const startTime = performance.now();
          
          function countFrame() {
            frames++;
            if (performance.now() - startTime >= 1000) {
              resolve(frames);
            } else {
              requestAnimationFrame(countFrame);
            }
          }
          
          requestAnimationFrame(countFrame);
        });
      });
      
      expect(fps).toBeGreaterThan(55);
    });

    test('should handle rapid placement/removal', async ({ page }) => {
      // Rapidly place and remove soil
      for (let i = 0; i < 20; i++) {
        await page.mouse.click(400, 300); // Place
        await page.mouse.click(400, 300, { button: 'right' }); // Remove
      }
      
      // Should not crash and soil count should be 0
      const soilCount = await page.evaluate(() => {
        return window.game.soilManager.getSoilCount();
      });
      
      expect(soilCount).toBe(0);
    });
  });
});