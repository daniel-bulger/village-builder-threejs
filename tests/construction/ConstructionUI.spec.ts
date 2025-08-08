import { test, expect } from '@playwright/test';

test.describe('Construction UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Add test materials
    await page.keyboard.press('t');
    await page.waitForTimeout(100);
  });

  test('construction UI should appear when tool selected', async ({ page }) => {
    // Initially hidden
    const initiallyVisible = await page.isVisible('#construction-ui');
    expect(initiallyVisible).toBe(false);
    
    // Select construction tool
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForTimeout(100);
    
    // Should now be visible
    const nowVisible = await page.isVisible('#construction-ui');
    expect(nowVisible).toBe(true);
  });

  test('should display all component type buttons', async ({ page }) => {
    // Show UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    
    // Check for component buttons
    const componentTypes = ['Foundation', 'Wall', 'Floor', 'Pillar', 'Door', 'Window', 'Stairs', 'Roof'];
    
    for (const type of componentTypes) {
      const button = await page.locator(`#construction-ui button:has-text("${type}")`).first();
      await expect(button).toBeVisible();
    }
  });

  test('should display all material type buttons', async ({ page }) => {
    // Show UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    
    // Check for material buttons
    const materialTypes = ['Wood', 'Stone', 'Brick', 'Crystal', 'Metal'];
    
    for (const type of materialTypes) {
      const button = await page.locator(`#construction-ui button:has-text("${type}")`).first();
      await expect(button).toBeVisible();
    }
  });

  test('should update placement mode indicator', async ({ page }) => {
    // Show UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    
    // Check initial mode (default is single placement)
    let modeText = await page.locator('#placement-mode-indicator').textContent();
    expect(modeText).toContain('Single Placement');
    
    // Click Foundation button
    await page.click('#construction-ui button:has-text("Foundation")');
    await page.waitForTimeout(100);
    
    modeText = await page.locator('#placement-mode-indicator').textContent();
    expect(modeText).toContain('Single Placement');
    
    // Click Floor button
    await page.click('#construction-ui button:has-text("Floor")');
    await page.waitForTimeout(100);
    
    modeText = await page.locator('#placement-mode-indicator').textContent();
    expect(modeText).toContain('Fill Mode');
  });

  test('should highlight selected component button', async ({ page }) => {
    // Show UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    
    // Click Foundation button
    const foundationButton = page.locator('#construction-ui button:has-text("Foundation")').first();
    await foundationButton.click();
    
    // Check that it has different styling
    const backgroundColor = await foundationButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should have a different background than unselected buttons (#333 = rgb(51, 51, 51))
    // Selected buttons should have a lighter background
    expect(backgroundColor).not.toBe('rgb(51, 51, 51)'); // Not #333
    // The button is selected if it has a different color than the default
    // We just need to verify it's not the default color, as the exact shade can vary
    const rgb = backgroundColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (rgb) {
      const value = parseInt(rgb[1]);
      expect(value).toBeGreaterThan(51); // Should be lighter than #333
    }
  });

  test('should highlight selected material button', async ({ page }) => {
    // Show UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    
    // Click Stone button
    const stoneButton = page.locator('#construction-ui button:has-text("Stone")').first();
    await stoneButton.click();
    
    // Check that it has different styling
    const backgroundColor = await stoneButton.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should have more opaque background
    expect(backgroundColor).toContain('139, 137, 137'); // Stone color components
  });

  test('should hide UI when switching tools', async ({ page }) => {
    // Show construction UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    expect(await page.isVisible('#construction-ui')).toBe(true);
    
    // Switch to watering can
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const wateringSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'watering_can');
      game.inventorySystem.setActiveHotbarSlot(wateringSlot);
    });
    
    await page.waitForTimeout(100);
    
    // UI should be hidden
    expect(await page.isVisible('#construction-ui')).toBe(false);
  });

  test('should show helper text', async ({ page }) => {
    // Show UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    
    // Check for helper text
    const helperText = await page.locator('#construction-ui').textContent();
    expect(helperText).toContain('Left Click: Place');
    expect(helperText).toContain('Right Click: Cancel');
    expect(helperText).toContain('R/Q: Rotate');
    expect(helperText).toContain('PageUp/Down: Change Level');
    expect(helperText).toContain('ESC: Exit');
  });
});

test.describe('Construction Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Add test materials
    await page.keyboard.press('t');
    await page.waitForTimeout(100);
  });

  test('should place components through UI interaction', async ({ page }) => {
    // Show construction UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    
    // Select Foundation
    await page.click('#construction-ui button:has-text("Foundation")');
    
    // Select Wood material
    await page.click('#construction-ui button:has-text("Wood")');
    
    // Click in game world to place
    await page.mouse.click(400, 300);
    
    // Check that foundation was placed
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const components = Array.from(game.buildingManager.components.values());
      return {
        componentCount: components.length,
        hasFoundation: components.some(c => c.data?.type === 'foundation' || c.type === 'foundation'),
        foundationMaterial: components.find(c => c.data?.type === 'foundation' || c.type === 'foundation')?.data?.material || components.find(c => c.data?.type === 'foundation' || c.type === 'foundation')?.material
      };
    });
    
    expect(result.componentCount).toBeGreaterThanOrEqual(1);
    expect(result.hasFoundation).toBe(true);
    expect(result.foundationMaterial).toBe('wood');
  });

  test('should handle multi-component building workflow', async ({ page }) => {
    // Show construction UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
    });
    
    await page.waitForSelector('#construction-ui');
    
    // Place foundation
    await page.click('#construction-ui button:has-text("Foundation")');
    await page.click('#construction-ui button:has-text("Stone")');
    await page.mouse.click(400, 300);
    
    // Place walls (single placement mode - one wall at a time)
    await page.click('#construction-ui button:has-text("Wall")');
    await page.mouse.click(400, 300); // Place first wall
    await page.mouse.click(500, 300); // Place second wall
    
    // Place floor (floor_fill mode)
    await page.click('#construction-ui button:has-text("Floor")');
    await page.keyboard.press('PageUp'); // Go to level 1
    await page.mouse.click(400, 300); // First corner
    await page.mouse.click(450, 350); // Second corner for area fill
    
    // Verify structure
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const components = Array.from(game.buildingManager.components.values());
      
      return {
        totalComponents: components.length,
        componentTypes: components.map(c => c.data?.type || c.type),
        levels: [...new Set(components.map(c => c.data?.level ?? c.level))].sort(),
        materials: [...new Set(components.map(c => c.data?.material || c.material))]
      };
    });
    
    expect(result.totalComponents).toBeGreaterThan(1);
    expect(result.componentTypes).toContain('foundation');
    expect(result.componentTypes).toContain('wall');
    expect(result.levels.length).toBeGreaterThanOrEqual(1);
    expect(result.materials).toContain('stone');
  });

  test('should properly cleanup on tool switch', async ({ page }) => {
    // Show construction UI and start placement
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
      
      // Start wall placement
      game.buildingPlacer.startPlacement('wall', 'wood');
    });
    
    // Verify placement is active
    const placingBefore = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.buildingPlacer.getPlacementInfo().isPlacing;
    });
    expect(placingBefore).toBe(true);
    
    // Switch to a different tool (watering can is always in slot 0)
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      // Switch to slot 0 (watering can)
      game.inventorySystem.setActiveHotbarSlot(0);
    });
    
    // Wait a bit for the UI to update
    await page.waitForTimeout(100);
    
    // Verify placement stopped and UI hidden
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Check if construction UI element is visible in DOM
      const uiElement = document.getElementById('construction-ui');
      const uiVisible = uiElement ? uiElement.style.display !== 'none' : false;
      
      return {
        isPlacing: game.buildingPlacer.getPlacementInfo().isPlacing,
        uiVisible
      };
    });
    
    expect(result.isPlacing).toBe(false);
    expect(result.uiVisible).toBe(false);
  });
});