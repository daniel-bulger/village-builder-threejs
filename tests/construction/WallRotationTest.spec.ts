import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Wall Single Placement Test', () => {
  test('should place walls one at a time with rotation', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotDir = path.join('test-results', 'wall-rotation-test');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Add test materials
    await page.keyboard.press('t');
    await page.waitForTimeout(500);
    
    // Build using low-level API to test single wall placement
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Clear existing
      manager.components.forEach((comp: any) => {
        manager.removeComponent(comp.id);
      });
      
      const placed = [];
      const failed = [];
      
      try {
        // Place a foundation first
        const foundation = manager.placeComponent({
          type: 'foundation',
          material: 'stone',
          position: { q: 0, r: 0, y: 0 },
          level: 0
        });
        
        if (foundation) {
          placed.push('Foundation at (0,0,0)');
        } else {
          failed.push('Foundation');
        }
        
        // Place individual walls on different edges
        const wallEdges = [0, 1, 2, 3, 4, 5];
        
        wallEdges.forEach(edge => {
          const wall = manager.placeComponent({
            type: 'wall',
            material: 'wood',
            position: { q: 0, r: 0, y: 0 },
            level: 0,
            wallAlignment: edge
          });
          
          if (wall) {
            placed.push(`Wall on edge ${edge}`);
          } else {
            failed.push(`Wall on edge ${edge}`);
          }
        });
        
        // Place another foundation and walls at different position
        const foundation2 = manager.placeComponent({
          type: 'foundation',
          material: 'stone',
          position: { q: 2, r: 0, y: 0 },
          level: 0
        });
        
        if (foundation2) {
          placed.push('Foundation at (2,0,0)');
          
          // Place only 3 walls to show partial coverage
          [0, 2, 4].forEach(edge => {
            const wall = manager.placeComponent({
              type: 'wall',
              material: 'wood',
              position: { q: 2, r: 0, y: 0 },
              level: 0,
              wallAlignment: edge
            });
            
            if (wall) {
              placed.push(`Wall at (2,0) edge ${edge}`);
            }
          });
        }
        
      } catch (error: any) {
        failed.push(`Error: ${error.message}`);
      }
      
      // Stats
      const breakdown: any = {};
      manager.components.forEach((comp: any) => {
        const type = comp.data.type;
        breakdown[type] = (breakdown[type] || 0) + 1;
      });
      
      return {
        placed,
        failed,
        total: manager.components.size,
        breakdown
      };
    });
    
    console.log('Wall placement test result:', {
      placed: result.placed.length,
      failed: result.failed.length,
      total: result.total,
      breakdown: result.breakdown
    });
    
    // Take screenshots
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-walls-placed.png'),
      fullPage: false
    });
    
    // Rotate view
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1100, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-walls-rotated-view.png'),
      fullPage: false
    });
    
    // Overhead view
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-walls-overhead.png'),
      fullPage: false
    });
    
    // Verify results
    expect(result.breakdown.foundation).toBe(2);
    expect(result.breakdown.wall).toBe(9); // 6 on first hex, 3 on second
    expect(result.failed).toHaveLength(0);
    
    console.log('✅ Wall single placement test passed!');
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
  });
});