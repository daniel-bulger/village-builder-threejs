import { test, expect } from '@playwright/test';
import { waitForGame, selectInventorySlot, getActiveItem, selectToolByName, selectActionByName, getCurrentToolType, placeSoilAt, applyToolAt } from './helpers';

test.describe('Inventory System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    await page.waitForTimeout(500); // Wait for camera to settle
  });

  test.describe('Inventory Management', () => {
    test('should have default items in inventory', async ({ page }) => {
      // Check all default slots
      const slots = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.inventorySystem.getSlots().map((slot: any) => ({
          item: slot.item ? { id: slot.item.id, name: slot.item.name } : null,
          hotkey: slot.hotkey
        }));
      });
      
      expect(slots[0].item?.id).toBe('watering_can');
      expect(slots[1].item?.id).toBe('shovel');
      expect(slots[2].item?.id).toBe('tomato_seeds');
      expect(slots[3].item?.id).toBe('inspector');
      expect(slots[4].item?.id).toBe('barrier_tool');
    });

    test('should switch slots with inventory methods', async ({ page }) => {
      // Test switching to different slots
      for (let i = 0; i < 5; i++) {
        await selectInventorySlot(page, i);
        
        const activeSlot = await page.evaluate(() => {
          const gameWindow = window as any;
          return gameWindow.game.inventorySystem.getActiveSlot();
        });
        
        expect(activeSlot).toBe(i);
      }
      
      // Test slot 10 (index 9)
      await selectInventorySlot(page, 9);
      
      const activeSlot = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.inventorySystem.getActiveSlot();
      });
      
      expect(activeSlot).toBe(9);
    });

    test('should show active item in hotbar UI', async ({ page }) => {
      await selectToolByName(page, 'Watering Can');
      
      // Check if hotbar slot is marked as active
      const activeSlotElement = await page.locator('.hotbar-slot.active');
      await expect(activeSlotElement).toBeVisible();
      
      const slotText = await activeSlotElement.textContent();
      expect(slotText).toContain('💧');
    });
  });

  test.describe('Action Wheel', () => {
    test('should toggle action wheel with Tab', async ({ page }) => {
      // Initially hidden
      let isVisible = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.actionWheel.isActionWheelVisible();
      });
      expect(isVisible).toBe(false);
      
      // Press Tab to show
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      isVisible = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.actionWheel.isActionWheelVisible();
      });
      expect(isVisible).toBe(true);
      
      // Check UI visibility
      const actionWheel = await page.locator('.action-wheel');
      await expect(actionWheel).toBeVisible();
      
      // Press Tab again to hide
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      isVisible = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.actionWheel.isActionWheelVisible();
      });
      expect(isVisible).toBe(false);
    });

    test('should select actions from action wheel', async ({ page }) => {
      // Open action wheel
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      // Select remove soil action
      const success = await selectActionByName(page, 'Remove Soil');
      expect(success).toBe(true);
      
      // Check it maps to remove tool
      const toolType = await getCurrentToolType(page);
      expect(toolType).toBe('remove');
      
      // Close action wheel
      await page.keyboard.press('Tab');
    });

    test('should show active action in UI', async ({ page }) => {
      // Open action wheel
      await page.keyboard.press('Tab');
      
      // Select harvest action
      await selectActionByName(page, 'Harvest');
      
      // Check UI shows active state
      const activeAction = await page.locator('.action-item.active');
      await expect(activeAction).toBeVisible();
      
      const actionText = await activeAction.textContent();
      expect(actionText).toContain('Harvest');
      
      // Close action wheel
      await page.keyboard.press('Tab');
    });
  });

  test.describe('Tool Integration', () => {
    test('should map inventory items to correct tools', async ({ page }) => {
      const toolMappings = [
        { itemName: 'Watering Can', expectedTool: 'water' },
        { itemName: 'Shovel', expectedTool: 'place' },
        { itemName: 'Tomato Seeds', expectedTool: 'plant' },
        { itemName: 'Plant Inspector', expectedTool: 'inspect' },
        { itemName: 'Barrier Placer', expectedTool: 'barrier' }
      ];
      
      for (const mapping of toolMappings) {
        await selectToolByName(page, mapping.itemName);
        const toolType = await getCurrentToolType(page);
        expect(toolType).toBe(mapping.expectedTool);
      }
    });

    test('should map action wheel actions to correct tools', async ({ page }) => {
      await page.keyboard.press('Tab'); // Open action wheel
      
      const actionMappings = [
        { actionName: 'Remove Soil', expectedTool: 'remove' },
        { actionName: 'Harvest', expectedTool: 'harvest' },
        { actionName: 'Uproot Plant', expectedTool: 'harvest' }
      ];
      
      for (const mapping of actionMappings) {
        await selectActionByName(page, mapping.actionName);
        const toolType = await getCurrentToolType(page);
        expect(toolType).toBe(mapping.expectedTool);
      }
      
      await page.keyboard.press('Tab'); // Close action wheel
    });
  });

  test.describe('Uprooted Plants', () => {
    test('should add uprooted plant to inventory', async ({ page }) => {
      // Listen for console logs
      page.on('console', msg => {
        if (msg.type() === 'log') {
          console.log('Browser console:', msg.text());
        }
      });
      
      // Use the helper functions to place soil properly
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 640, 360);
      await placeSoilAt(page, 660, 360);
      await placeSoilAt(page, 620, 360);
      
      // Verify soil was placed
      const soilCount = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getSoilCount();
      });
      
      if (soilCount === 0) {
        throw new Error('Failed to place soil');
      }
      
      // Add water to the center soil
      await selectToolByName(page, 'Watering Can');
      await applyToolAt(page, 640, 360);
      await page.waitForTimeout(100);
      
      // Plant seed
      await selectToolByName(page, 'Tomato Seeds');
      await applyToolAt(page, 640, 360);
      await page.waitForTimeout(100);
      
      // Verify plant was created
      const plantCountBefore = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlantSimulation().getAllPlants().length;
      });
      
      if (plantCountBefore === 0) {
        throw new Error('Failed to plant seed');
      }
      
      // Speed up time for plant to grow a bit
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.setAnimationsEnabled(true);
        gameWindow.game.timeScale = 100;
      });
      
      await page.waitForTimeout(2000);
      
      // Reset time scale
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.timeScale = 1;
      });
      
      // Open action wheel and select uproot
      await page.keyboard.press('Tab');
      await selectActionByName(page, 'Uproot Plant');
      await page.keyboard.press('Tab');
      
      // Uproot the plant
      await applyToolAt(page, 640, 360);
      await page.waitForTimeout(100);
      
      // Check inventory for uprooted plant
      const debugInfo = await page.evaluate(() => {
        const gameWindow = window as any;
        const plantCount = gameWindow.game.soilManager.getPlantSimulation().getAllPlants().length;
        const slots = gameWindow.game.inventorySystem.getSlots().map((slot: any) => ({
          item: slot.item ? { 
            id: slot.item.id, 
            name: slot.item.name,
            type: slot.item.type 
          } : null
        }));
        
        // Log debug info in the page
        console.log('Plant count after uproot:', plantCount);
        console.log('Inventory slots:', slots);
        
        return { plantCount, slots };
      });
      
      const uprootedPlant = debugInfo.slots.find((slot: any) => 
        slot.item?.type === 'plant' && slot.item?.id.includes('uprooted')
      );
      
      expect(uprootedPlant).toBeTruthy();
      expect(uprootedPlant?.item?.name).toContain('Uprooted');
    });

    test('should replant uprooted plant from inventory', async ({ page }) => {
      // Use the helper functions to place soil properly
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 640, 360);
      await placeSoilAt(page, 660, 360);
      await placeSoilAt(page, 620, 360);
      
      // Add water to the center soil
      await selectToolByName(page, 'Watering Can');
      await applyToolAt(page, 640, 360);
      await page.waitForTimeout(100);
      
      // Plant and grow
      await selectToolByName(page, 'Tomato Seeds');
      await applyToolAt(page, 640, 360);
      await page.waitForTimeout(100);
      
      // Let it grow
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.setAnimationsEnabled(true);
        gameWindow.game.timeScale = 100;
      });
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        const gameWindow = window as any;
        gameWindow.game.timeScale = 1;
      });
      
      // Uproot
      await page.keyboard.press('Tab');
      await selectActionByName(page, 'Uproot Plant');
      await page.keyboard.press('Tab');
      await applyToolAt(page, 640, 360);
      await page.waitForTimeout(100);
      
      // Find the uprooted plant slot
      const uprootedSlot = await page.evaluate(() => {
        const gameWindow = window as any;
        const slots = gameWindow.game.inventorySystem.getSlots();
        for (let i = 0; i < slots.length; i++) {
          if (slots[i].item?.type === 'plant') {
            return i;
          }
        }
        return -1;
      });
      
      expect(uprootedSlot).toBeGreaterThanOrEqual(0);
      
      // Select the uprooted plant
      await selectInventorySlot(page, uprootedSlot);
      
      // Place new soil elsewhere
      await selectToolByName(page, 'Shovel');
      await placeSoilAt(page, 680, 360);
      await page.waitForTimeout(100);
      
      // Add water to new soil
      await selectToolByName(page, 'Watering Can');
      await applyToolAt(page, 680, 360);
      await page.waitForTimeout(100);
      
      // Replant the uprooted plant
      await selectInventorySlot(page, uprootedSlot);
      await applyToolAt(page, 680, 360);
      await page.waitForTimeout(100);
      
      // Check that plant was replanted
      const plantCount = await page.evaluate(() => {
        const gameWindow = window as any;
        return gameWindow.game.soilManager.getPlantSimulation().getPlantCount();
      });
      
      expect(plantCount).toBe(1);
    });
  });

  test.describe('Info Panel Integration', () => {
    test('should show active item in info panel', async ({ page }) => {
      await selectToolByName(page, 'Watering Can');
      await page.waitForTimeout(100);
      
      const infoText = await page.textContent('#info-content');
      expect(infoText).toContain('Active: Watering Can');
      
      // Switch to action
      await page.keyboard.press('Tab');
      await selectActionByName(page, 'Remove Soil');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const updatedInfoText = await page.textContent('#info-content');
      expect(updatedInfoText).toContain('Active: Remove Soil');
    });
  });
});