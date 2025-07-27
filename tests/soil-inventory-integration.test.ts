/**
 * Integration tests for the soil inventory system
 * 
 * Tests:
 * - Opening/closing the inventory with 'I' key
 * - Adding test soil with 'T' key
 * - Drag and drop to combine soil stacks
 * - Right-click to split stacks
 * - Visual representation of nutrients
 */

import { test, expect } from '@playwright/test';

test.describe('Soil Inventory System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for game to initialize
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game?.isInitialized === true;
    });
  });

  test('should toggle inventory with I key', async ({ page }) => {
    // Initially hidden
    await expect(page.locator('#soil-inventory')).not.toBeVisible();
    
    // Press I to open
    await page.keyboard.press('i');
    await expect(page.locator('#soil-inventory')).toBeVisible();
    
    // Press I again to close
    await page.keyboard.press('i');
    await expect(page.locator('#soil-inventory')).not.toBeVisible();
  });

  test('should add test soil with T key', async ({ page }) => {
    // Open inventory
    await page.keyboard.press('i');
    
    // Add test soil
    await page.keyboard.press('t');
    
    // Check that slots are populated
    const slots = await page.locator('.soil-slot.occupied').count();
    expect(slots).toBeGreaterThan(0);
    
    // Check nutrient bars are visible
    await expect(page.locator('.nutrient-bar').first()).toBeVisible();
  });

  test('should display soil nutrients correctly', async ({ page }) => {
    // Add test soil and open inventory
    await page.keyboard.press('t');
    await page.keyboard.press('i');
    
    // Get soil data from game
    const soilData = await page.evaluate(() => {
      const gameWindow = window as any;
      const inventory = gameWindow.game.soilInventory;
      const slots = [];
      
      for (let i = 0; i < inventory.getSlotCount(); i++) {
        const slot = inventory.getSlot(i);
        if (slot?.item) {
          slots.push({
            nutrients: slot.item.nutrients,
            quantity: slot.item.quantity,
            source: slot.item.source
          });
        }
      }
      
      return slots;
    });
    
    // Verify we have different soil types
    expect(soilData.length).toBeGreaterThan(0);
    
    // Check that nutrient bars match the data
    const firstSlot = page.locator('.soil-slot.occupied').first();
    await expect(firstSlot.locator('.nutrient-fill.nitrogen')).toBeVisible();
    await expect(firstSlot.locator('.nutrient-fill.phosphorus')).toBeVisible();
    await expect(firstSlot.locator('.nutrient-fill.potassium')).toBeVisible();
  });

  test('should show tooltip on hover', async ({ page }) => {
    // Add test soil and open inventory
    await page.keyboard.press('t');
    await page.keyboard.press('i');
    
    // Hover over first occupied slot
    const firstSlot = page.locator('.soil-slot.occupied').first();
    await firstSlot.hover();
    
    // Check tooltip appears
    await expect(page.locator('.soil-tooltip')).toBeVisible();
    
    // Verify tooltip content
    await expect(page.locator('.soil-tooltip')).toContainText('Nitrogen');
    await expect(page.locator('.soil-tooltip')).toContainText('Phosphorus');
    await expect(page.locator('.soil-tooltip')).toContainText('Potassium');
  });

  test('should combine soil stacks with drag and drop', async ({ page }) => {
    // Add test soil twice to get stackable items
    await page.keyboard.press('t');
    await page.keyboard.press('t');
    await page.keyboard.press('i');
    
    // Get initial state
    const initialState = await page.evaluate(() => {
      const gameWindow = window as any;
      const inventory = gameWindow.game.soilInventory;
      return {
        occupiedSlots: inventory.getOccupiedSlots().length,
        firstSlotQuantity: inventory.getSlot(0)?.item?.quantity || 0
      };
    });
    
    // Find two slots with the same soil type (Fertile Valley)
    const sourceSlot = page.locator('.soil-slot.occupied').first();
    const targetSlot = page.locator('.soil-slot.occupied').nth(1);
    
    // Drag and drop
    await sourceSlot.dragTo(targetSlot);
    
    // Wait for UI update
    await page.waitForTimeout(100);
    
    // Check that stacks were combined
    const finalState = await page.evaluate(() => {
      const gameWindow = window as any;
      const inventory = gameWindow.game.soilInventory;
      return {
        occupiedSlots: inventory.getOccupiedSlots().length,
        firstSlotQuantity: inventory.getSlot(0)?.item?.quantity || 0
      };
    });
    
    // Should have fewer occupied slots after combining
    expect(finalState.occupiedSlots).toBeLessThan(initialState.occupiedSlots);
  });

  test('should split stack with right-click', async ({ page }) => {
    // Add test soil and open inventory
    await page.keyboard.press('t');
    await page.keyboard.press('i');
    
    // Get initial occupied slots
    const initialSlots = await page.locator('.soil-slot.occupied').count();
    
    // Right-click on first occupied slot
    const firstSlot = page.locator('.soil-slot.occupied').first();
    await firstSlot.click({ button: 'right' });
    
    // Split modal should appear
    await expect(page.locator('.split-modal')).toBeVisible();
    
    // Confirm split
    await page.locator('#split-confirm').click();
    
    // Wait for UI update
    await page.waitForTimeout(100);
    
    // Should have one more occupied slot
    const finalSlots = await page.locator('.soil-slot.occupied').count();
    expect(finalSlots).toBe(initialSlots + 1);
  });

  test('should close inventory with close button', async ({ page }) => {
    // Open inventory
    await page.keyboard.press('i');
    await expect(page.locator('#soil-inventory')).toBeVisible();
    
    // Click close button
    await page.locator('.close-btn').click();
    
    // Should be hidden
    await expect(page.locator('#soil-inventory')).not.toBeVisible();
  });

  test('should stack identical nutrients automatically', async ({ page }) => {
    // Add test soil
    await page.keyboard.press('t');
    
    // Check how many Fertile Valley stacks we have
    const stacks = await page.evaluate(() => {
      const gameWindow = window as any;
      const inventory = gameWindow.game.soilInventory;
      let fertileValleyStacks = 0;
      
      for (let i = 0; i < inventory.getSlotCount(); i++) {
        const slot = inventory.getSlot(i);
        if (slot?.item && slot.item.nutrients.nitrogen === 65) { // Fertile Valley
          fertileValleyStacks++;
        }
      }
      
      return fertileValleyStacks;
    });
    
    // Should only have one stack of Fertile Valley (auto-stacked)
    expect(stacks).toBe(1);
  });
});