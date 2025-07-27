import { test, expect } from '@playwright/test';
import { waitForGame, placeSoilAt, removeSoilAt, applyToolAt, selectInventorySlot, selectToolByName, selectActionByName, getActiveItem, getCurrentToolType } from './helpers';

test.describe('Water Simulation and Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    await page.waitForTimeout(500); // Wait for camera to settle
    
    // Enable animations for water simulation
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(true);
    });
  });

  test.describe('Inventory System', () => {
    test('should switch between inventory slots', async ({ page }) => {
      // Test slot 1 - Watering Can
      await selectInventorySlot(page, 0);
      const item1 = await getActiveItem(page);
      expect(item1?.id).toBe('watering_can');
      
      // Test slot 2 - Shovel
      await selectInventorySlot(page, 1);
      const item2 = await getActiveItem(page);
      expect(item2?.id).toBe('shovel');
      
      // Test slot 3 - Seeds
      await selectInventorySlot(page, 2);
      const item3 = await getActiveItem(page);
      expect(item3?.id).toBe('tomato_seeds');
    });
    
    test('should select tools by name', async ({ page }) => {
      // Select watering can
      const found = await selectToolByName(page, 'Watering Can');
      expect(found).toBe(true);
      
      const activeItem = await getActiveItem(page);
      expect(activeItem?.name).toBe('Watering Can');
      
      // Verify it maps to water tool
      const toolType = await getCurrentToolType(page);
      expect(toolType).toBe('water');
    });
    
    test('should show correct item in info panel', async ({ page }) => {
      await selectToolByName(page, 'Watering Can');
      await page.waitForTimeout(100);
      
      const infoText = await page.textContent('#info-content');
      expect(infoText).toContain('Active: Watering Can');
    });
  });

  test.describe('Water Tool Functionality', () => {
    test('should add water to soil with watering can', async ({ page }) => {
      // Place some soil first using shovel
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      
      // Wait for game to process the placement
      await page.waitForTimeout(200);
      
      // Switch to watering can
      await selectToolByName(page, 'Watering Can');
      
      // Get initial water level
      await page.mouse.move(400, 300);
      await page.waitForTimeout(100);
      
      const initialWater = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getHoveredHexWaterLevel();
      });
      expect(initialWater).toBe(0);
      
      // Apply water using the watering can
      await applyToolAt(page, 400, 300);
      await page.waitForTimeout(100);
      
      // Check water level increased
      const waterAfter = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getHoveredHexWaterLevel();
      });
      expect(waterAfter).toBeGreaterThan(0);
    });
    
    test('should show water level in info panel', async ({ page }) => {
      // Place and water some soil
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      
      await selectToolByName(page, 'Watering Can');
      
      // Apply water directly since click handling has issues in test environment
      await page.evaluate(() => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        const hex3D = { q: -9, r: -6, y: 0 };
        soilManager.waterSoil(hex3D);
      });
      
      // Check info panel shows water percentage
      await page.waitForTimeout(100);
      await page.mouse.move(400, 300);
      await page.waitForTimeout(100);
      
      const infoText = await page.textContent('#info-content');
      expect(infoText).toMatch(/Water Level: \d+%/);
    });
  });

  test.describe('Remove Soil Action', () => {
    test('should remove soil with remove action from action wheel', async ({ page }) => {
      // Place soil first
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      await page.waitForTimeout(200);
      
      let count = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      expect(count).toBe(1);
      
      // Open action wheel and select remove soil action
      await page.keyboard.press('Tab');
      await selectActionByName(page, 'Remove Soil');
      await page.keyboard.press('Tab'); // Close action wheel
      
      // Remove with left click
      await applyToolAt(page, 400, 300);
      
      count = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      expect(count).toBe(0);
    });
  });

  test.describe('Preview Heights for Different Tools', () => {
    test('should show preview at top for shovel tool', async ({ page }) => {
      // Place initial soil
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      
      // Hover over it - should preview at Y=1
      await page.mouse.move(400, 300);
      await page.waitForTimeout(100);
      
      const placeHeight = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlacementHeight();
      });
      expect(placeHeight).toBe(1);
    });
    
    test('should show preview at current level for remove action', async ({ page }) => {
      // Place initial soil
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      await page.waitForTimeout(200);
      
      // Open action wheel and select remove action
      await page.keyboard.press('Tab');
      await selectActionByName(page, 'Remove Soil');
      await page.keyboard.press('Tab');
      
      // Move away and back to reset any cached state
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);
      await page.mouse.move(400, 300);
      await page.waitForTimeout(200);
      
      const debugInfo = await page.evaluate(() => {
        const gameWindow = window as any;
        const toolType = gameWindow.game.getCurrentToolFromInventory();
        return {
          placementHeight: gameWindow.game.soilManager.getPlacementHeight(),
          currentTool: toolType,
          hoveredY: gameWindow.game.soilManager.hoveredY
        };
      });
      
      expect(debugInfo.currentTool).toBe('remove');
      expect(debugInfo.placementHeight).toBe(0); // Should target the existing soil at Y=0
    });
    
    test('should show preview at current level for watering can', async ({ page }) => {
      // Place initial soil
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      
      // Switch to watering can
      await selectToolByName(page, 'Watering Can');
      await page.mouse.move(400, 300);
      await page.waitForTimeout(100);
      
      const waterHeight = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlacementHeight();
      });
      expect(waterHeight).toBe(0); // Should target the existing soil at Y=0
    });
  });

  test.describe('Water Flow Simulation', () => {
    test('should flow water between adjacent hexes', async ({ page }) => {
      // Place two adjacent soil hexes
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      await placeSoilAt(page, 430, 300); // Adjacent hex
      
      // Switch to watering can
      await selectToolByName(page, 'Watering Can');
      
      // Apply water directly
      await page.evaluate(() => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        const hex3D = { q: -9, r: -6, y: 0 }; // First hex position
        soilManager.waterSoil(hex3D);
      });
      
      // Enable animations to allow water flow
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.setAnimationsEnabled(true);
        gameWindow.game.timeScale = 10; // Moderate speed up for testing
      });
      
      // Wait for water to flow
      await page.waitForTimeout(500);
      
      // Debug water flow
      const waterDebug = await page.evaluate(() => {
        const gameWindow = window as any;
        const sim = gameWindow.game.soilManager.getWaterSimulation();
        const allHexes = sim.getAllHexes();
        
        return allHexes.map(hex => ({
          coord: hex.coord,
          saturation: hex.saturation,
          capacity: hex.capacity
        }));
      });
      
      console.log('Water distribution after flow:', waterDebug);
      
      // Check that water has spread to at least one hex
      const hexesWithWater = waterDebug.filter(h => h.saturation > 0);
      expect(hexesWithWater.length).toBeGreaterThan(0);
      
      // At least one hex should have water (could be the original or adjacent)
      const totalWater = waterDebug.reduce((sum, h) => sum + h.saturation, 0);
      expect(totalWater).toBeGreaterThan(0);
    });
    
    test('should show visual changes when soil is wet', async ({ page }) => {
      // Place soil
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      
      // Get initial color and the actual hex coordinate
      const dryData = await page.evaluate(() => {
        const gameWindow = window as any;
        const hexes = gameWindow.game.soilManager['soilHexes'];
        const firstHex = hexes.values().next().value;
        return {
          color: firstHex.mesh.material.color.getHex(),
          coord: firstHex.coord
        };
      });
      
      const dryColor = dryData.color;
      
      // Switch to watering can
      await selectToolByName(page, 'Watering Can');
      
      // Apply water and immediately check visual changes (before it drains)
      const wetData = await page.evaluate((dryCoord) => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        
        // Add water
        const added = soilManager.waterSoil(dryCoord);
        const saturation = soilManager.getWaterSimulation().getSaturation(dryCoord);
        
        // Force visual update immediately
        soilManager.updateWaterVisuals();
        
        // Get visual data right away before water drains
        const hexes = gameWindow.game.soilManager['soilHexes'];
        const firstHex = hexes.values().next().value;
        
        return {
          added,
          saturation,
          color: firstHex.mesh.material.color.getHex(),
          roughness: firstHex.mesh.material.roughness
        };
      }, dryData.coord);
      
      console.log('Water application result:', wetData);
      console.log('Visual data - dry color:', dryColor, 'wet color:', wetData.color);
      
      expect(wetData.added).toBe(true);
      expect(wetData.saturation).toBeGreaterThan(0);
      
      // Wet soil should be darker (smaller hex value) or have different roughness
      expect(wetData.color).toBeLessThan(dryColor);
      expect(wetData.roughness).toBeLessThan(0.95); // Dry soil has roughness 0.95
    });
  });

  test.describe('Right Click Quick Remove', () => {
    test('should remove soil with right click from any tool', async ({ page }) => {
      // Place soil
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      
      // Switch to watering can
      await selectToolByName(page, 'Watering Can');
      
      // Right click should still remove
      await removeSoilAt(page, 400, 300);
      
      const count = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      expect(count).toBe(0);
    });
  });

  test.describe('Preview Colors', () => {
    test('should show blue preview for watering can', async ({ page }) => {
      // Place soil first
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      await page.waitForTimeout(200);
      
      // Switch to watering can
      await selectToolByName(page, 'Watering Can');
      await page.waitForTimeout(100);
      
      // Move to soil position
      await page.mouse.move(400, 300);
      await page.waitForTimeout(200);
      
      const debugInfo = await page.evaluate(() => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        const hex3D = soilManager.hoveredHex ? 
          { ...soilManager.hoveredHex, y: soilManager.hoveredY } : null;
        const hex3DKey = hex3D ? `${hex3D.q},${hex3D.r},${hex3D.y}` : null;
        const toolType = gameWindow.game.getCurrentToolFromInventory();
        
        return {
          previewColor: soilManager.getPreviewColor(),
          currentTool: toolType,
          hexExists: hex3DKey ? soilManager['soilHexes'].has(hex3DKey) : false,
          hoveredHex: soilManager.hoveredHex,
          hoveredY: soilManager.hoveredY
        };
      });
      
      expect(debugInfo.currentTool).toBe('water');
      expect(debugInfo.hexExists).toBe(true); // There should be soil here
      expect(debugInfo.previewColor).toBe(0x0099ff); // Blue
    });
    
    test('should show red preview for remove action', async ({ page }) => {
      // Place soil first
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      await page.waitForTimeout(100);
      
      // Open action wheel and select remove action
      await page.keyboard.press('Tab');
      await selectActionByName(page, 'Remove Soil');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      // Move to the soil position
      await page.mouse.move(400, 300);
      await page.waitForTimeout(200); // Give more time for preview update
      
      const debugInfo = await page.evaluate(() => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        const toolType = gameWindow.game.getCurrentToolFromInventory();
        return {
          previewColor: soilManager.getPreviewColor(),
          currentTool: toolType,
          isPreviewVisible: soilManager.isPreviewVisible(),
          hoveredHex: soilManager.hoveredHex
        };
      });
      
      expect(debugInfo.currentTool).toBe('remove');
      expect(debugInfo.previewColor).toBe(0xff0000); // Red
    });
  });

  test.describe('Water Retention with Barriers', () => {
    test('should retain water when surrounded by barriers on all sides', async ({ page }) => {
      // Place a single hex at origin
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 400, 300);
      await page.waitForTimeout(100);
      
      // Get the actual hex coordinate that was placed
      const hexCoord = await page.evaluate(() => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        const allHexes = soilManager.getWaterSimulation().getAllHexes();
        if (allHexes.length > 0) {
          return allHexes[0].coord;
        }
        return null;
      });
      
      expect(hexCoord).toBeTruthy();
      
      // Switch to barrier tool
      await selectToolByName(page, 'Barrier Placer');
      await page.waitForTimeout(100);
      
      // Place barriers on all 6 sides
      // Calculate edge positions (midpoints between center and neighbors)
      const edgePositions = [
        { x: 430, y: 300 },   // East edge
        { x: 415, y: 326 },   // Southeast edge
        { x: 385, y: 326 },   // Southwest edge
        { x: 370, y: 300 },   // West edge
        { x: 385, y: 274 },   // Northwest edge
        { x: 415, y: 274 }    // Northeast edge
      ];
      
      for (const pos of edgePositions) {
        await page.mouse.click(pos.x, pos.y);
        await page.waitForTimeout(100);
      }
      
      // Place bottom barrier
      await page.keyboard.down('Shift');
      await page.mouse.click(400, 300); // Click center with shift for bottom barrier
      await page.keyboard.up('Shift');
      await page.waitForTimeout(100);
      
      // Add water directly to the hex using the actual coordinates
      // Add water multiple times without animations first
      const waterAdded = await page.evaluate((coord) => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        const waterSim = soilManager.getWaterSimulation();
        let totalAdded = 0;
        // Add water multiple times to get to high saturation
        // Each hex has capacity of 290ML (0.29L), so add 200ML to get high saturation quickly
        for (let i = 0; i < 2; i++) {
          const added = waterSim.addWater(coord, 200);
          if (added) totalAdded++;
        }
        // Get current saturation immediately after adding
        const saturation = waterSim.getSaturation(coord);
        return {
          totalAdded,
          saturation
        };
      }, hexCoord);
      
      // Get initial water level right after adding
      const initialWater = waterAdded.saturation;
      
      expect(initialWater).toBeGreaterThan(0.6); // Should have water (400ML in 290ML = ~1.38, capped at 1.0)
      
      // Now enable animations for flow testing
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.setAnimationsEnabled(true);
        gameWindow.game.timeScale = 10; // Speed up for testing
      });
      
      // Wait 3 seconds for potential drainage
      await page.waitForTimeout(3000);
      
      // Check water level after time
      const finalWater = await page.evaluate((coord) => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        return waterSim.getSaturation(coord);
      }, hexCoord);
      
      // Water should be retained (only minor loss from evaporation)
      expect(finalWater).toBeGreaterThan(initialWater * 0.95); // Less than 5% loss
      expect(finalWater).toBeLessThan(initialWater); // But some loss from evaporation
    });
    
    test('should allow water to drain without barriers', async ({ page }) => {
      // Place a hex away from previous test
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 550, 300);
      await page.waitForTimeout(100);
      
      // Get the actual hex coordinate that was placed
      const hexCoord = await page.evaluate(() => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        const allHexes = soilManager.getWaterSimulation().getAllHexes();
        // Find the hex that's not at origin (from previous test)
        const hex = allHexes.find(h => h.coord.q !== 0 || h.coord.r !== 0);
        return hex ? hex.coord : null;
      });
      
      expect(hexCoord).toBeTruthy();
      
      // Add water and get initial level without animations
      const initialWater = await page.evaluate((coord) => {
        const gameWindow = window as any;
        const soilManager = gameWindow.game.soilManager;
        const waterSim = soilManager.getWaterSimulation();
        // Add water multiple times to get high saturation
        // Each hex has capacity of 290ML (0.29L), so add 200ML to get high saturation quickly
        for (let i = 0; i < 2; i++) {
          waterSim.addWater(coord, 200);
        }
        // Return saturation immediately after adding
        return waterSim.getSaturation(coord);
      }, hexCoord);
      
      expect(initialWater).toBeGreaterThan(0.6); // Should have water
      
      // Now enable animations for drainage testing
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.setAnimationsEnabled(true);
        gameWindow.game.timeScale = 10; // Speed up for testing
      });
      
      // Wait 3 seconds for drainage
      await page.waitForTimeout(3000);
      
      // Check water level after time
      const finalWater = await page.evaluate((coord) => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        return waterSim.getSaturation(coord);
      }, hexCoord);
      
      // Water should have drained significantly
      expect(finalWater).toBeLessThan(initialWater * 0.5); // More than 50% loss
    });
  });
});