import { test, expect } from '@playwright/test';

test.describe('Unified Inventory - Soil Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for game initialization
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game && gameWindow.game.isInitialized;
    });
  });

  test('should stack soil with same nutrients', async ({ page }) => {
    // Add two stacks of identical soil
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const SoilItem = gameWindow.SoilItem;
      
      // Add first stack of valley soil (70-50-60)
      const soil1 = new SoilItem(
        { nitrogen: 70, phosphorus: 50, potassium: 60 },
        3,
        "Test Valley"
      );
      game.unifiedInventorySystem.addSoil(soil1);
      
      // Add second stack of same valley soil
      const soil2 = new SoilItem(
        { nitrogen: 70, phosphorus: 50, potassium: 60 },
        2,
        "Test Valley"
      );
      game.unifiedInventorySystem.addSoil(soil2);
    });
    
    // Open inventory
    await page.keyboard.press('i');
    
    // Check that soils were combined into one stack
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.unifiedInventorySystem.getInventorySlots();
      
      // Count soil stacks
      let soilStacks = 0;
      let totalQuantity = 0;
      
      for (const slot of slots) {
        if (slot.item && slot.item.id === 'soil_70-50-60') {
          soilStacks++;
          totalQuantity += slot.quantity;
        }
      }
      
      return { soilStacks, totalQuantity };
    });
    
    expect(result.soilStacks).toBe(1);
    expect(result.totalQuantity).toBe(5); // 3 + 2 = 5
  });

  test('should not exceed max stack size when combining', async ({ page }) => {
    // Add two large stacks that would exceed max
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const SoilItem = gameWindow.SoilItem;
      
      // Add first stack near max (8 units)
      const soil1 = new SoilItem(
        { nitrogen: 40, phosphorus: 30, potassium: 80 },
        8,
        "Test Forest"
      );
      game.unifiedInventorySystem.addSoil(soil1);
      
      // Add second stack that would exceed max (5 units)
      const soil2 = new SoilItem(
        { nitrogen: 40, phosphorus: 30, potassium: 80 },
        5,
        "Test Forest"
      );
      game.unifiedInventorySystem.addSoil(soil2);
    });
    
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.unifiedInventorySystem.getInventorySlots();
      
      const soilSlots = [];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.item && slot.item.id === 'soil_40-30-80') {
          soilSlots.push({ index: i, quantity: slot.quantity });
        }
      }
      
      return soilSlots;
    });
    
    // Should have 2 stacks: one at max (10) and one with remainder (3)
    expect(result.length).toBe(2);
    expect(result[0].quantity).toBe(10); // Max stack
    expect(result[1].quantity).toBe(3);  // Remainder
  });

  test('should split soil stack with right-click', async ({ page }) => {
    // Add a soil stack
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const SoilItem = gameWindow.SoilItem;
      
      const soil = new SoilItem(
        { nitrogen: 40, phosphorus: 80, potassium: 50 },
        8,
        "Test Volcanic"
      );
      game.unifiedInventorySystem.addSoil(soil);
    });
    
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Right-click on the first slot (where soil should be)
    const firstSlot = await page.locator('.inventory-slot[data-index="0"]');
    await firstSlot.click({ button: 'right' });
    
    // Wait for split modal
    await page.waitForSelector('#split-amount');
    
    // Set split amount to 3
    await page.fill('#split-amount', '3');
    await page.click('#split-confirm');
    
    // Check that split worked
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.unifiedInventorySystem.getInventorySlots();
      
      const soilSlots = [];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.item && slot.item.id === 'soil_40-80-50') {
          soilSlots.push({ 
            index: i, 
            quantity: slot.quantity,
            nutrients: slot.item.metadata?.nutrients
          });
        }
      }
      
      return soilSlots;
    });
    
    expect(result.length).toBe(2);
    expect(result[0].quantity).toBe(5); // 8 - 3 = 5
    expect(result[1].quantity).toBe(3); // Split amount
    
    // Both should have same nutrients
    expect(result[0].nutrients).toEqual({ nitrogen: 40, phosphorus: 80, potassium: 50 });
    expect(result[1].nutrients).toEqual({ nitrogen: 40, phosphorus: 80, potassium: 50 });
  });

  test('should combine different soils with drag and drop', async ({ page }) => {
    // Add two different soil types
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const SoilItem = gameWindow.SoilItem;
      
      // Valley soil in slot 0
      const soil1 = new SoilItem(
        { nitrogen: 70, phosphorus: 50, potassium: 60 },
        4,
        "Valley"
      );
      game.unifiedInventorySystem.addSoil(soil1);
      
      // Volcanic soil in slot 1
      const soil2 = new SoilItem(
        { nitrogen: 40, phosphorus: 80, potassium: 50 },
        6,
        "Volcanic"
      );
      game.unifiedInventorySystem.addSoil(soil2);
    });
    
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Drag slot 0 to slot 1
    const slot0 = await page.locator('.inventory-slot[data-index="0"]');
    const slot1 = await page.locator('.inventory-slot[data-index="1"]');
    
    await slot0.dragTo(slot1);
    
    // Check the result
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.unifiedInventorySystem.getInventorySlots();
      
      // Slot 0 should be empty
      const slot0Empty = !slots[0].item;
      
      // Slot 1 should have mixed soil
      const slot1 = slots[1];
      const hasMixedSoil = slot1.item && slot1.item.metadata?.source === 'Mixed Soil';
      const quantity = slot1.quantity;
      const nutrients = slot1.item?.metadata?.nutrients;
      
      return { slot0Empty, hasMixedSoil, quantity, nutrients };
    });
    
    expect(result.slot0Empty).toBe(true);
    expect(result.hasMixedSoil).toBe(true);
    expect(result.quantity).toBe(10); // 4 + 6 = 10
    
    // Check weighted average nutrients
    // (70*4 + 40*6) / 10 = 52 nitrogen
    // (50*4 + 80*6) / 10 = 68 phosphorus  
    // (60*4 + 50*6) / 10 = 54 potassium
    expect(result.nutrients).toEqual({
      nitrogen: 52,
      phosphorus: 68,
      potassium: 54
    });
  });

  test('should show nutrient info in tooltip', async ({ page }) => {
    // Add soil with specific nutrients
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const SoilItem = gameWindow.SoilItem;
      
      const soil = new SoilItem(
        { nitrogen: 65, phosphorus: 45, potassium: 75 },
        5.5,
        "Custom Mix"
      );
      game.unifiedInventorySystem.addSoil(soil);
    });
    
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Get tooltip text
    const tooltipText = await page.evaluate(() => {
      const firstSlot = document.querySelector('.inventory-slot[data-index="0"]') as HTMLElement;
      return firstSlot?.title || '';
    });
    
    expect(tooltipText).toContain('Soil (65-45-75)');
    expect(tooltipText).toContain('N-P-K: 65-45-75');
    expect(tooltipText).toContain('Source: Custom Mix');
    expect(tooltipText).toContain('Quantity: 5.5');
  });

  test('should not allow splitting soil with quantity <= 1', async ({ page }) => {
    // Add small soil stack
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const SoilItem = gameWindow.SoilItem;
      
      const soil = new SoilItem(
        { nitrogen: 50, phosphorus: 50, potassium: 50 },
        0.8,
        "Small Stack"
      );
      game.unifiedInventorySystem.addSoil(soil);
    });
    
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Right-click should not open split modal
    const firstSlot = await page.locator('.inventory-slot[data-index="0"]');
    await firstSlot.click({ button: 'right' });
    
    // Wait a bit and check no modal appeared
    await page.waitForTimeout(200);
    const modalExists = await page.locator('#split-amount').count();
    
    expect(modalExists).toBe(0);
  });

  test('should handle split when no empty slots available', async ({ page }) => {
    // Fill inventory with items
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Fill first 39 slots with tools/seeds
      for (let i = 0; i < 39; i++) {
        game.unifiedInventorySystem.addItem({
          id: `test_item_${i}`,
          type: 'tool',
          name: `Test Item ${i}`,
          icon: '🔧',
          stackable: false,
          maxStack: 1,
          quantity: 1
        });
      }
      
      // Add splittable soil in last slot
      const SoilItem = gameWindow.SoilItem;
      const soil = new SoilItem(
        { nitrogen: 60, phosphorus: 60, potassium: 60 },
        5,
        "Test Soil"
      );
      game.unifiedInventorySystem.addSoil(soil);
    });
    
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Try to split the soil in slot 39
    const lastSlot = await page.locator('.inventory-slot[data-index="39"]');
    await lastSlot.click({ button: 'right' });
    
    // Fill in split amount and confirm
    await page.waitForSelector('#split-amount');
    await page.fill('#split-amount', '2');
    await page.click('#split-confirm');
    
    // Wait for potential alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('No empty slot available');
      await dialog.accept();
    });
    
    await page.waitForTimeout(100);
    
    // Check that soil wasn't split
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slot39 = game.unifiedInventorySystem.getInventorySlots()[39];
      
      return {
        hasSoil: slot39.item && slot39.item.id.startsWith('soil_'),
        quantity: slot39.quantity
      };
    });
    
    expect(result.hasSoil).toBe(true);
    expect(result.quantity).toBe(5); // Unchanged
  });
});