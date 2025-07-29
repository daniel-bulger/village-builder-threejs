import { test, expect } from '@playwright/test';

test.describe('Unified Inventory System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for game initialization
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game && gameWindow.game.isInitialized;
    });
  });

  test('should open inventory with I key', async ({ page }) => {
    // Press I to open inventory
    await page.keyboard.press('i');
    
    // Check that inventory is visible
    const inventoryVisible = await page.evaluate(() => {
      const inventory = document.getElementById('unified-inventory');
      return inventory && inventory.style.display !== 'none';
    });
    
    expect(inventoryVisible).toBe(true);
    
    // Press Escape to close
    await page.keyboard.press('Escape');
    
    const inventoryClosed = await page.evaluate(() => {
      const inventory = document.getElementById('unified-inventory');
      return inventory && inventory.style.display === 'none';
    });
    
    expect(inventoryClosed).toBe(true);
  });

  test('should have hotbar visible at bottom of screen', async ({ page }) => {
    const hotbarVisible = await page.evaluate(() => {
      const hotbar = document.getElementById('hotbar-container');
      return hotbar && window.getComputedStyle(hotbar).display !== 'none';
    });
    
    expect(hotbarVisible).toBe(true);
    
    // Check for 10 hotbar slots
    const slotCount = await page.evaluate(() => {
      const hotbar = document.getElementById('hotbar-container');
      return hotbar ? hotbar.querySelectorAll('.hotbar-slot').length : 0;
    });
    
    expect(slotCount).toBe(10);
  });

  test('should add soil to inventory with T key', async ({ page }) => {
    // Press T to add test soil
    await page.keyboard.press('t');
    
    // Open inventory
    await page.keyboard.press('i');
    
    // Check that soil was added
    const hasSoil = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.inventorySystem.getInventorySlots();
      
      return slots.some(slot => 
        slot.item && 
        slot.item.type === 'resource' && 
        slot.item.id.startsWith('soil_')
      );
    });
    
    expect(hasSoil).toBe(true);
  });

  test('should select hotbar slots with number keys', async ({ page }) => {
    // Add some items to ensure hotbar has content
    await page.keyboard.press('t');
    
    // Select slot 2 (press '2')
    await page.keyboard.press('2');
    
    const activeSlot = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.inventorySystem.getActiveHotbarSlot();
    });
    
    expect(activeSlot).toBe(1); // Index 1 for slot 2
    
    // Select slot 0 (press '0')
    await page.keyboard.press('0');
    
    const activeSlot10 = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.inventorySystem.getActiveHotbarSlot();
    });
    
    expect(activeSlot10).toBe(9); // Index 9 for slot 0
  });

  test('should place soil from inventory', async ({ page }) => {
    // Add soil to inventory
    await page.keyboard.press('t');
    
    // Find and select the soil in hotbar
    const soilSlotIndex = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.inventorySystem.getInventorySlots();
      
      // Find soil in inventory
      for (let i = 0; i < slots.length; i++) {
        const item = slots[i].item;
        if (item && item.type === 'resource' && item.id.startsWith('soil_')) {
          // Assign to first hotbar slot
          game.inventorySystem.assignToHotbar(i, 0);
          game.inventorySystem.setActiveHotbarSlot(0);
          return 0;
        }
      }
      return -1;
    });
    
    expect(soilSlotIndex).toBe(0);
    
    // Get initial soil count
    const initialSoilCount = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.soilManager.getSoilCount();
    });
    
    // Click to place soil
    await page.click('canvas', {
      position: { x: 400, y: 300 }
    });
    
    // Wait a bit for placement
    await page.waitForTimeout(100);
    
    // Check that soil was placed
    const finalSoilCount = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.soilManager.getSoilCount();
    });
    
    expect(finalSoilCount).toBe(initialSoilCount + 1);
    
    // Check that soil quantity decreased
    const remainingQuantity = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const activeItem = game.inventorySystem.getActiveItem();
      return activeItem ? game.inventorySystem.getActiveItemQuantity() : 0;
    });
    
    expect(remainingQuantity).toBeLessThan(10); // Started with more than 1
  });

  test('should show correct soil nutrients when placed', async ({ page }) => {
    // Add specific soil type
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const SoilItem = gameWindow.SoilItem || class SoilItem {
        constructor(nutrients, quantity, source) {
          this.nutrients = nutrients;
          this.quantity = quantity;
          this.source = source;
        }
        getNutrientString() {
          return `${this.nutrients.nitrogen}-${this.nutrients.phosphorus}-${this.nutrients.potassium}`;
        }
        clone() { return this; }
      };
      
      // Add volcanic ash soil (40-80-50)
      const volcanicSoil = new SoilItem(
        { nitrogen: 40, phosphorus: 80, potassium: 50 },
        5,
        "Volcanic Ash"
      );
      
      game.inventorySystem.addSoil(volcanicSoil);
      
      // Find it and assign to hotbar
      const slots = game.inventorySystem.getInventorySlots();
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].item && slots[i].item.id === 'soil_40-80-50') {
          game.inventorySystem.assignToHotbar(i, 0);
          game.inventorySystem.setActiveHotbarSlot(0);
          break;
        }
      }
    });
    
    // Place the soil
    await page.click('canvas', {
      position: { x: 400, y: 300 }
    });
    
    await page.waitForTimeout(100);
    
    // Check the placed soil has correct nutrients
    const placedNutrients = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Get the first placed soil
      const soilHexes = Array.from(game.soilManager.soilHexes.values());
      if (soilHexes.length > 0) {
        const coord = soilHexes[0].coord;
        const nutrients = game.soilManager.getNutrientSystem().getNutrients(coord);
        return {
          nitrogen: Math.round(nutrients.nitrogen * 100),
          phosphorus: Math.round(nutrients.phosphorus * 100),
          potassium: Math.round(nutrients.potassium * 100)
        };
      }
      return null;
    });
    
    expect(placedNutrients).toEqual({
      nitrogen: 40,
      phosphorus: 80,
      potassium: 50
    });
  });
});