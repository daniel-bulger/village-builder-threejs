import { test, expect } from '@playwright/test';
import { waitForGame, placeSoilAt, hideUIElements, setFixedTimeOfDay } from './helpers';

test.describe('Phase 1 - Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    
    // Set consistent conditions for visual tests
    await hideUIElements(page);
    await setFixedTimeOfDay(page, 0.5); // Noon
    
    // Disable animations
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(false);
    });
  });

  test('initial desert view', async ({ page }) => {
    await expect(page).toHaveScreenshot('desert-initial.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
  });

  test('hex grid overlay', async ({ page }) => {
    await page.keyboard.press('g'); // Toggle grid
    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('hex-grid-overlay.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
  });

  test('soil placement preview - valid', async ({ page }) => {
    await page.mouse.move(400, 300);
    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('soil-preview-valid.png', {
      fullPage: false,
      clip: { x: 300, y: 200, width: 200, height: 200 }
    });
  });

  test('single soil hex placed', async ({ page }) => {
    await placeSoilAt(page, 400, 300);
    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('soil-single-hex.png', {
      fullPage: false,
      clip: { x: 300, y: 200, width: 200, height: 200 }
    });
  });

  test('multiple soil hexes pattern', async ({ page }) => {
    // Create a small flower pattern
    const positions = [
      { x: 400, y: 300 }, // Center
      { x: 430, y: 300 }, // Right
      { x: 370, y: 300 }, // Left
      { x: 415, y: 280 }, // Top-right
      { x: 385, y: 280 }, // Top-left
      { x: 415, y: 320 }, // Bottom-right
      { x: 385, y: 320 }, // Bottom-left
    ];
    
    for (const pos of positions) {
      await placeSoilAt(page, pos.x, pos.y);
    }
    
    await expect(page).toHaveScreenshot('soil-flower-pattern.png', {
      fullPage: false,
      clip: { x: 250, y: 150, width: 300, height: 300 }
    });
  });

  test('overhead camera view', async ({ page }) => {
    // Place some soil for reference
    for (let i = 0; i < 5; i++) {
      await placeSoilAt(page, 380 + i * 20, 300);
    }
    
    await page.keyboard.press('Tab'); // Switch to overhead
    await page.waitForTimeout(200); // Let camera move
    
    await expect(page).toHaveScreenshot('camera-overhead.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
  });

  test('dawn lighting', async ({ page }) => {
    await setFixedTimeOfDay(page, 0.25); // Dawn
    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('lighting-dawn.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
  });

  test('dusk lighting', async ({ page }) => {
    await setFixedTimeOfDay(page, 0.75); // Dusk
    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('lighting-dusk.png', {
      fullPage: false,
      clip: { x: 0, y: 0, width: 800, height: 600 }
    });
  });

  test('soil placement preview - invalid', async ({ page }) => {
    // Place soil first
    await placeSoilAt(page, 400, 300);
    
    // Move mouse over existing soil
    await page.mouse.move(400, 300);
    await page.waitForTimeout(100);
    
    await expect(page).toHaveScreenshot('soil-preview-invalid.png', {
      fullPage: false,
      clip: { x: 300, y: 200, width: 200, height: 200 }
    });
  });
});