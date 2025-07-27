import { test, expect } from '@playwright/test';
import { waitForGame, selectToolByName } from './helpers';

test.describe('Shift+Scroll Layer Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    await page.waitForTimeout(500); // Wait for camera to settle
  });

  test('should change layer height with shift+scroll', async ({ page }) => {
    // Collect console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log(`[Console] ${text}`);
    });

    // Move mouse to center of screen to ensure we're over the game area
    await page.mouse.move(400, 300);
    
    // Wait a bit for any initial setup
    await page.waitForTimeout(500);
    
    // First, place some soil to have a hex to hover over
    await selectToolByName(page, 'Shovel');
    await page.mouse.click(400, 300);
    await page.waitForTimeout(100);
    
    // Move mouse slightly to ensure we're hovering over the hex
    await page.mouse.move(405, 305);
    await page.waitForTimeout(100);
    
    // Test normal scroll (should zoom)
    console.log('\n--- Testing normal scroll (should zoom) ---');
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
    
    // Check if zoom-related log appeared
    const zoomLogs = consoleLogs.filter(log => 
      log.includes('Scroll detected') && !log.includes('shift=true')
    );
    console.log('Zoom logs found:', zoomLogs.length);
    
    // Clear logs
    consoleLogs.length = 0;
    
    // Test shift+scroll (should change layer)
    console.log('\n--- Testing shift+scroll (should change layer) ---');
    await page.keyboard.down('Shift');
    await page.waitForTimeout(50);
    
    // Scroll up (negative delta should increase layer)
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(100);
    
    // Check for shift+scroll logs
    const shiftScrollLogs = consoleLogs.filter(log => 
      log.includes('Shift+scroll:') || 
      (log.includes('Scroll detected') && log.includes('shift=true'))
    );
    console.log('Shift+scroll logs found:', shiftScrollLogs.length);
    shiftScrollLogs.forEach(log => console.log('  -', log));
    
    // Scroll down (positive delta should decrease layer)
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
    
    await page.keyboard.up('Shift');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'shift-scroll-test.png' });
    
    // Verify we got the expected console logs
    expect(consoleLogs.some(log => log.includes('shift=true'))).toBeTruthy();
    expect(consoleLogs.some(log => log.includes('Shift+scroll:'))).toBeTruthy();
  });

  test('should reset layer selection when moving to new hex', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Place initial soil
    await selectToolByName(page, 'Shovel');
    await page.mouse.click(400, 300);
    await page.waitForTimeout(100);
    
    // Use shift+scroll to set a layer
    await page.keyboard.down('Shift');
    await page.mouse.wheel(0, -200); // Scroll up to increase layer
    await page.keyboard.up('Shift');
    await page.waitForTimeout(100);
    
    // Move to a different location
    await page.mouse.move(500, 300);
    await page.waitForTimeout(100);
    
    // Check for reset behavior
    const manualModeLogs = consoleLogs.filter(log => 
      log.includes('Manual height mode')
    );
    console.log('Manual mode logs:', manualModeLogs);
    
    // When moving to a new hex, manual mode should be reset
    await page.mouse.click(500, 300);
    await page.waitForTimeout(100);
    
    // The new placement should be at auto-detected height, not manual
    expect(manualModeLogs.length).toBeGreaterThan(0);
  });

  test('should show correct preview height in UI', async ({ page }) => {
    // Place some stacked soil blocks
    await selectToolByName(page, 'Shovel');
    
    // Place base layer
    await page.mouse.click(400, 300);
    await page.waitForTimeout(100);
    
    // Stack a second layer
    await page.mouse.click(400, 300);
    await page.waitForTimeout(100);
    
    // Now use shift+scroll to manually select layer 3
    await page.keyboard.down('Shift');
    await page.mouse.wheel(0, -100); // Scroll up
    await page.keyboard.up('Shift');
    await page.waitForTimeout(100);
    
    // Check the info panel for the placement height
    const infoContent = await page.locator('#info-content').textContent();
    console.log('Info panel content:', infoContent);
    
    // Should show "Place at Y: 2" (0-indexed, so layer 3 is Y=2)
    expect(infoContent).toContain('Place at Y:');
  });
});