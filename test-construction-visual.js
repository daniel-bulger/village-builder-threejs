// Visual testing script for construction system
// Run with: node test-construction-visual.js

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  
  // Create screenshots directory
  const screenshotDir = path.join(__dirname, 'construction-screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }
  
  try {
    console.log('1. Loading game...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-initial.png'),
      fullPage: true 
    });
    
    console.log('2. Adding test materials...');
    await page.keyboard.press('t');
    await page.waitForTimeout(500);
    
    console.log('3. Selecting construction tool...');
    // Open construction UI
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const constructionSlot = game.unifiedInventorySystem.getSlots()
        .findIndex(slot => slot.item?.id === 'construction_tool');
      game.unifiedInventorySystem.setActiveHotbarSlot(constructionSlot);
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-construction-ui.png'),
      fullPage: true 
    });
    
    console.log('4. Testing foundation placement...');
    // Click foundation button
    await page.click('button:has-text("Foundation")');
    await page.waitForTimeout(500);
    
    // Move mouse to center and take screenshot of preview
    await page.mouse.move(960, 540);
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-foundation-preview.png'),
      fullPage: true 
    });
    
    // Place foundation
    await page.mouse.click(960, 540);
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '04-foundation-placed.png'),
      fullPage: true 
    });
    
    console.log('5. Testing wall placement...');
    await page.click('button:has-text("Wall")');
    await page.waitForTimeout(500);
    
    // Show wall preview
    await page.mouse.move(960, 540);
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '05-wall-preview.png'),
      fullPage: true 
    });
    
    // Place walls in a line
    await page.mouse.click(960, 540);
    await page.mouse.move(1100, 540);
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '06-wall-line-preview.png'),
      fullPage: true 
    });
    
    await page.mouse.click(1100, 540);
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '07-walls-placed.png'),
      fullPage: true 
    });
    
    console.log('6. Testing multi-level building...');
    // Place more foundations
    await page.click('button:has-text("Foundation")');
    for (let i = 0; i < 3; i++) {
      await page.mouse.click(820 + i * 140, 540);
      await page.waitForTimeout(200);
    }
    
    // Add walls
    await page.click('button:has-text("Wall")');
    await page.mouse.click(820, 540);
    await page.mouse.click(1100, 540);
    await page.waitForTimeout(500);
    
    // Go up a level
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '08-level-1-view.png'),
      fullPage: true 
    });
    
    // Place floor
    await page.click('button:has-text("Floor")');
    await page.mouse.click(820, 540);
    await page.mouse.move(1100, 640);
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '09-floor-preview.png'),
      fullPage: true 
    });
    
    await page.mouse.click(1100, 640);
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '10-floor-placed.png'),
      fullPage: true 
    });
    
    console.log('7. Testing different camera angles...');
    // Rotate camera
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1200, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '11-rotated-view.png'),
      fullPage: true 
    });
    
    // Overhead view
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '12-overhead-view.png'),
      fullPage: true 
    });
    
    console.log('8. Testing visual helpers...');
    await page.keyboard.press('Tab'); // Back to third person
    await page.keyboard.press('g'); // Toggle grid
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '13-with-grid.png'),
      fullPage: true 
    });
    
    // Test pillar placement to see vertex highlights
    await page.click('button:has-text("Pillar")');
    await page.mouse.move(960, 540);
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: path.join(screenshotDir, '14-pillar-vertex-highlight.png'),
      fullPage: true 
    });
    
    console.log('9. Final structure view...');
    // Place some pillars
    await page.mouse.click(960, 540);
    await page.mouse.click(820, 540);
    await page.mouse.click(1100, 540);
    
    // Exit construction mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Move camera back for final view
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(800, 400);
    await page.mouse.up({ button: 'middle' });
    
    // Zoom out
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '15-final-structure.png'),
      fullPage: true 
    });
    
    console.log(`\nScreenshots saved to: ${screenshotDir}`);
    console.log('\nPlease review the screenshots to identify visual issues.');
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for manual inspection. Press Ctrl+C to close.');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('Error during visual test:', error);
    await page.screenshot({ 
      path: path.join(screenshotDir, 'error-state.png'),
      fullPage: true 
    });
  }
  
  await browser.close();
})();