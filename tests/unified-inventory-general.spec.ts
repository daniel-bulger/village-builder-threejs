import { test, expect } from '@playwright/test';

test.describe('Unified Inventory - General Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for game initialization
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game && gameWindow.game.isInitialized;
    });
  });

  test('should have default items in inventory', async ({ page }) => {
    const defaultItems = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.unifiedInventorySystem.getInventorySlots();
      
      const items = [];
      for (let i = 0; i < 10; i++) { // Check first 10 slots (hotbar)
        const slot = slots[i];
        if (slot.item) {
          items.push({
            id: slot.item.id,
            name: slot.item.name,
            type: slot.item.type
          });
        }
      }
      
      return items;
    });
    
    // Check for expected default items
    const itemIds = defaultItems.map(item => item.id);
    expect(itemIds).toContain('watering_can');
    expect(itemIds).toContain('soil_placer');
    expect(itemIds).toContain('tomato_seeds');
    expect(itemIds).toContain('inspector');
    expect(itemIds).toContain('barrier_tool');
  });

  test('should toggle inventory with I key', async ({ page }) => {
    // Initially closed
    let isVisible = await page.evaluate(() => {
      const inventory = document.getElementById('unified-inventory');
      return inventory && inventory.style.display !== 'none';
    });
    expect(isVisible).toBe(false);
    
    // Press I to open
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    isVisible = await page.evaluate(() => {
      const inventory = document.getElementById('unified-inventory');
      return inventory && inventory.style.display !== 'none';
    });
    expect(isVisible).toBe(true);
    
    // Press I again to close
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    isVisible = await page.evaluate(() => {
      const inventory = document.getElementById('unified-inventory');
      return inventory && inventory.style.display === 'none';
    });
    expect(isVisible).toBe(true);
  });

  test('should close inventory with Escape key', async ({ page }) => {
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    
    const isVisible = await page.evaluate(() => {
      const inventory = document.getElementById('unified-inventory');
      return inventory && inventory.style.display !== 'none';
    });
    
    expect(isVisible).toBe(false);
  });

  test('should select hotbar slots with number keys', async ({ page }) => {
    // Press 1 for first slot
    await page.keyboard.press('1');
    
    let activeSlot = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.unifiedInventorySystem.getActiveHotbarSlot();
    });
    expect(activeSlot).toBe(0);
    
    // Press 5 for fifth slot
    await page.keyboard.press('5');
    
    activeSlot = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.unifiedInventorySystem.getActiveHotbarSlot();
    });
    expect(activeSlot).toBe(4);
    
    // Press 0 for tenth slot
    await page.keyboard.press('0');
    
    activeSlot = await page.evaluate(() => {
      const gameWindow = window as any;
      return gameWindow.game.unifiedInventorySystem.getActiveHotbarSlot();
    });
    expect(activeSlot).toBe(9);
  });

  test('should highlight active hotbar slot', async ({ page }) => {
    // Select slot 3
    await page.keyboard.press('3');
    
    // Check visual highlight
    const slotStyles = await page.evaluate(() => {
      const hotbarSlots = document.querySelectorAll('.hotbar-slot');
      const styles = [];
      
      hotbarSlots.forEach((slot, index) => {
        const element = slot as HTMLElement;
        styles.push({
          index,
          borderColor: element.style.borderColor,
          borderWidth: element.style.borderWidth
        });
      });
      
      return styles;
    });
    
    // Slot 2 (index 2) should be highlighted
    expect(slotStyles[2].borderColor).toBe('rgb(255, 170, 0)'); // #ffaa00
    expect(slotStyles[2].borderWidth).toBe('3px');
    
    // Other slots should have normal border
    expect(slotStyles[0].borderColor).toBe('rgb(136, 136, 136)'); // #888
    expect(slotStyles[0].borderWidth).toBe('2px');
  });

  test('should move items between inventory slots', async ({ page }) => {
    // Add an item to a non-hotbar slot
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Add item to slot 15
      game.unifiedInventorySystem.addItem({
        id: 'test_resource',
        type: 'resource',
        name: 'Test Resource',
        icon: '💎',
        stackable: true,
        maxStack: 64,
        quantity: 10
      });
    });
    
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Drag from slot 15 to slot 20
    const slot15 = await page.locator('.inventory-slot[data-index="15"]');
    const slot20 = await page.locator('.inventory-slot[data-index="20"]');
    
    await slot15.dragTo(slot20);
    
    // Check the move worked
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.unifiedInventorySystem.getInventorySlots();
      
      return {
        slot15: slots[15].item,
        slot20: slots[20].item?.id
      };
    });
    
    expect(result.slot15).toBeNull();
    expect(result.slot20).toBe('test_resource');
  });

  test('should move items to hotbar', async ({ page }) => {
    // Clear hotbar slot 7 and add item to regular inventory
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Clear hotbar slot 7
      game.unifiedInventorySystem.removeItem(7);
      
      // Add item to slot 25
      const slots = game.unifiedInventorySystem.getInventorySlots();
      slots[25] = {
        item: {
          id: 'magic_seeds',
          type: 'seed',
          name: 'Magic Seeds',
          icon: '✨',
          stackable: true,
          maxStack: 99,
          quantity: 5
        },
        quantity: 5
      };
    });
    
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Click on slot 25 to move to hotbar
    const slot25 = await page.locator('.inventory-slot[data-index="25"]');
    await slot25.click();
    
    // Check item moved to hotbar
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.unifiedInventorySystem.getInventorySlots();
      
      // Find where magic seeds ended up in hotbar
      let hotbarSlot = -1;
      for (let i = 0; i < 10; i++) {
        if (slots[i].item?.id === 'magic_seeds') {
          hotbarSlot = i;
          break;
        }
      }
      
      return {
        hotbarSlot,
        slot25Empty: !slots[25].item
      };
    });
    
    expect(result.hotbarSlot).toBe(7); // Should go to first empty hotbar slot
    expect(result.slot25Empty).toBe(true);
  });

  test('should show hotbar and inventory are connected', async ({ page }) => {
    // Open inventory
    await page.keyboard.press('i');
    await page.waitForTimeout(100);
    
    // Check that first 10 inventory slots match hotbar styling
    const slotStyles = await page.evaluate(() => {
      const inventorySlots = document.querySelectorAll('.inventory-slot');
      const styles = [];
      
      for (let i = 0; i < 20; i++) { // Check first 20 slots
        const slot = inventorySlots[i] as HTMLElement;
        if (slot) {
          styles.push({
            index: i,
            background: slot.style.background,
            borderWidth: slot.style.borderWidth,
            hasHotkey: slot.querySelector('div')?.textContent?.match(/[0-9]/) !== null
          });
        }
      }
      
      return styles;
    });
    
    // First 10 slots should have hotbar styling
    for (let i = 0; i < 10; i++) {
      expect(slotStyles[i].borderWidth).toBe('2px'); // Thicker border
      expect(slotStyles[i].hasHotkey).toBe(true); // Has number label
    }
    
    // Slots 10+ should have regular styling
    for (let i = 10; i < 20; i++) {
      expect(slotStyles[i].borderWidth).toBe('1px'); // Thinner border
      expect(slotStyles[i].hasHotkey).toBe(false); // No number label
    }
  });

  test('should stack items correctly', async ({ page }) => {
    // Add stackable items
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Add 50 seeds
      game.unifiedInventorySystem.addItem({
        id: 'wheat_seeds',
        type: 'seed',
        name: 'Wheat Seeds',
        icon: '🌾',
        stackable: true,
        maxStack: 99,
        quantity: 50
      });
      
      // Add 60 more of the same seeds
      game.unifiedInventorySystem.addItem({
        id: 'wheat_seeds',
        type: 'seed',
        name: 'Wheat Seeds',
        icon: '🌾',
        stackable: true,
        maxStack: 99,
        quantity: 60
      });
    });
    
    // Check stacking result
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const slots = game.unifiedInventorySystem.getInventorySlots();
      
      const wheatSlots = [];
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].item?.id === 'wheat_seeds') {
          wheatSlots.push({
            index: i,
            quantity: slots[i].quantity
          });
        }
      }
      
      return wheatSlots;
    });
    
    // Should have 2 stacks: 99 (max) and 11 (remainder)
    expect(result.length).toBe(2);
    expect(result[0].quantity).toBe(99);
    expect(result[1].quantity).toBe(11);
  });
});