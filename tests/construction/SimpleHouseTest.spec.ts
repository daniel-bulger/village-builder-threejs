import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Simple House Build Test', () => {
  test('should build a minimal house structure', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotDir = path.join('test-results', 'simple-house-test');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Add test materials
    await page.keyboard.press('t');
    await page.waitForTimeout(500);
    
    // Build a very simple structure
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Clear existing
      manager.components.forEach((comp: any) => {
        manager.removeComponent(comp.id);
      });
      
      const results = {
        placed: [],
        failed: [],
        debug: {}
      };
      
      try {
        // First, check what's happening with the manager
        results.debug.managerExists = !!manager;
        results.debug.componentsMapSize = manager.components.size;
        
        // Place a single foundation at origin
        console.log('Attempting single foundation...');
        const foundation1 = manager.placeComponent({
          type: 'foundation',
          material: 'stone',
          position: { q: 0, r: 0, y: 0 },
          level: 0
        });
        
        if (foundation1) {
          results.placed.push('Foundation at (0,0,0)');
          console.log('Foundation placed successfully:', foundation1);
          
          // Now try a wall on this foundation
          console.log('Attempting wall on foundation...');
          const wall1 = manager.placeComponent({
            type: 'wall',
            material: 'wood',
            position: { q: 0, r: 0, y: 0 },
            level: 0,
            wallAlignment: 0
          });
          
          if (wall1) {
            results.placed.push('Wall at (0,0,0) edge 0');
            console.log('Wall placed successfully');
          } else {
            results.failed.push('Wall at (0,0,0) edge 0');
            console.log('Wall failed to place');
            
            // Check support calculation
            const supportCheck = manager.checkSupport({
              type: 'wall',
              material: 'wood',
              position: { q: 0, r: 0, y: 0 },
              level: 0,
              wallAlignment: 0
            });
            results.debug.wallSupportCheck = supportCheck;
          }
        } else {
          results.failed.push('Foundation at (0,0,0)');
          console.log('Foundation failed to place');
        }
        
        // Try placing a floor directly (should fail without support)
        console.log('Attempting floor without support...');
        const floor1 = manager.placeComponent({
          type: 'floor',
          material: 'wood',
          position: { q: 0, r: 0, y: 0 },  // y=0 for ground hex, level=1 for first floor
          level: 1
        });
        
        if (floor1) {
          results.placed.push('Floor at level 1 without support - SHOULD HAVE FAILED');
        } else {
          results.failed.push('Floor at level 1 - expected to fail');
        }
        
        // Now let's try building a minimal supported structure
        console.log('Building minimal supported structure...');
        
        // Place 4 pillars on the foundation
        const pillarPositions = [
          { vertex: 0 },
          { vertex: 2 },
          { vertex: 3 },
          { vertex: 5 }
        ];
        
        pillarPositions.forEach((config, i) => {
          const pillar = manager.placeComponent({
            type: 'pillar',
            material: 'stone',
            position: { q: 0, r: 0, y: 0 },
            level: 0,
            vertexIndex: config.vertex
          });
          
          if (pillar) {
            results.placed.push(`Pillar ${i} at vertex ${config.vertex}`);
          } else {
            results.failed.push(`Pillar ${i} at vertex ${config.vertex}`);
          }
        });
        
        // After pillars, try floor again
        console.log('Attempting floor with pillar support...');
        const floor2 = manager.placeComponent({
          type: 'floor',
          material: 'wood',
          position: { q: 0, r: 0, y: 0 },  // y=0 for ground hex, level=1 for first floor
          level: 1
        });
        
        if (floor2) {
          results.placed.push('Floor at level 1 with support');
        } else {
          results.failed.push('Floor at level 1 with support - SHOULD HAVE SUCCEEDED');
        }
        
      } catch (error: any) {
        results.debug.error = error.message;
      }
      
      // Final stats
      results.debug.finalComponentCount = manager.components.size;
      results.debug.componentTypes = {};
      manager.components.forEach((comp: any) => {
        const type = comp.data.type;
        results.debug.componentTypes[type] = (results.debug.componentTypes[type] || 0) + 1;
      });
      
      return results;
    });
    
    console.log('Simple house test results:', JSON.stringify(result, null, 2));
    
    // Take screenshots
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-simple-structure.png'),
      fullPage: false
    });
    
    // Rotate camera
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1000, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-simple-structure-rotated.png'),
      fullPage: false
    });
    
    // Overhead view
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-simple-structure-overhead.png'),
      fullPage: false
    });
    
    // Verify results
    expect(result.placed.length).toBeGreaterThan(0);
    expect(result.placed).toContain('Foundation at (0,0,0)');
    
    console.log(`\nPlaced: ${result.placed.length} components`);
    console.log(`Failed: ${result.failed.length} components`);
    console.log(`Final component count: ${result.debug.finalComponentCount}`);
    console.log(`Component types:`, result.debug.componentTypes);
    
    if (result.debug.wallSupportCheck) {
      console.log('Wall support check:', result.debug.wallSupportCheck);
    }
  });
});