import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Single Story House Visual Test', () => {
  test('should build and screenshot a complete single-story house', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotDir = path.join('test-results', 'single-story-house');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Add test materials
    await page.keyboard.press('t');
    await page.waitForTimeout(500);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, '00-empty-scene.png'),
      fullPage: false
    });
    
    // Build a single-story house
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
        console.log('Building single-story house...');
        
        // 1. FOUNDATIONS (7-hex flower pattern)
        const foundations = [
          { q: 0, r: 0 },   // Center
          { q: 1, r: 0 },   // Right
          { q: 0, r: 1 },   // Bottom-right
          { q: -1, r: 1 },  // Bottom-left
          { q: -1, r: 0 },  // Left
          { q: 0, r: -1 },  // Top-left
          { q: 1, r: -1 }   // Top-right
        ];
        
        foundations.forEach((pos, i) => {
          const f = manager.placeComponent({
            type: 'foundation',
            material: 'stone',
            position: { q: pos.q, r: pos.r, y: 0 },
            level: 0
          });
          if (f) placed.push(`Foundation ${i}`);
          else failed.push(`Foundation ${i}`);
        });
        
        // 2. EXTERIOR WALLS (perimeter only)
        const walls = [
          // Center hex - interior, only add door wall
          { q: 0, r: 0, edges: [] },
          // Outer hexes - exterior walls only
          { q: 1, r: 0, edges: [0, 1, 2] },
          { q: 0, r: 1, edges: [1, 2, 3] },
          { q: -1, r: 1, edges: [2, 3, 4] },
          { q: -1, r: 0, edges: [3, 4, 5] },
          { q: 0, r: -1, edges: [4, 5, 0] },
          { q: 1, r: -1, edges: [5, 0, 1] }
        ];
        
        walls.forEach((config, hexIndex) => {
          config.edges.forEach(edge => {
            const w = manager.placeComponent({
              type: 'wall',
              material: 'wood',
              position: { q: config.q, r: config.r, y: 0 },
              level: 0,
              wallAlignment: edge
            });
            if (w) placed.push(`Wall-${hexIndex}-edge${edge}`);
            else failed.push(`Wall-${hexIndex}-edge${edge}`);
          });
        });
        
        // 3. DOOR (on the south face of center hex)
        const door = manager.placeComponent({
          type: 'wall',
          material: 'wood',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          wallAlignment: 3,
          metadata: { hasDoor: true }
        });
        if (door) placed.push('Door');
        else failed.push('Door');
        
        // 4. WINDOWS
        const windowPositions = [
          { q: 1, r: 0, edge: 0 },   // East window
          { q: -1, r: 0, edge: 4 }    // West window
        ];
        
        windowPositions.forEach((win, i) => {
          const w = manager.placeComponent({
            type: 'wall',
            material: 'wood',
            position: { q: win.q, r: win.r, y: 0 },
            level: 0,
            wallAlignment: win.edge,
            metadata: { hasWindow: true }
          });
          if (w) placed.push(`Window ${i}`);
        });
        
        // 5. SIMPLE FLAT ROOF (using floor components as roof)
        foundations.forEach((pos, i) => {
          const roof = manager.placeComponent({
            type: 'roof',
            material: 'wood',
            position: { q: pos.q, r: pos.r, y: 1 },
            level: 1
          });
          if (roof) placed.push(`Roof ${i}`);
          else failed.push(`Roof ${i}`);
        });
        
        // 6. DECORATIVE PILLARS (corners)
        const pillars = [
          { q: 0, r: 0, vertex: 0 },
          { q: 0, r: 0, vertex: 2 },
          { q: 0, r: 0, vertex: 4 }
        ];
        
        pillars.forEach((p, i) => {
          const pillar = manager.placeComponent({
            type: 'pillar',
            material: 'stone',
            position: { q: p.q, r: p.r, y: 0 },
            level: 0,
            vertexIndex: p.vertex
          });
          if (pillar) placed.push(`Pillar ${i}`);
        });
        
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
        breakdown,
        buildings: manager.getBuildings().length
      };
    });
    
    console.log('Build result:', {
      placed: result.placed.length,
      failed: result.failed.length,
      total: result.total,
      breakdown: result.breakdown
    });
    
    if (result.failed.length > 0) {
      console.log('Failed components:', result.failed);
    }
    
    // Wait for rendering
    await page.waitForTimeout(1000);
    
    // Take screenshots from multiple angles
    
    // 1. Default view
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-default-view.png'),
      fullPage: false
    });
    
    // 2. Rotate 45 degrees
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1100, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-rotated-45.png'),
      fullPage: false
    });
    
    // 3. Rotate 90 degrees more
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1100, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-rotated-135.png'),
      fullPage: false
    });
    
    // 4. Back view
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1100, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '04-back-view.png'),
      fullPage: false
    });
    
    // 5. Final rotation
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1100, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '05-side-view.png'),
      fullPage: false
    });
    
    // 6. Overhead view
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '06-overhead.png'),
      fullPage: false
    });
    
    // 7. Zoom out
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '07-zoomed-out.png'),
      fullPage: false
    });
    
    // 8. Close up
    await page.keyboard.press('Tab'); // Back to normal view
    await page.waitForTimeout(500);
    
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(50);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '08-close-up.png'),
      fullPage: false
    });
    
    // Visual check
    const visualStats = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      let visible = 0;
      let meshCount = 0;
      
      manager.components.forEach((comp: any) => {
        if (comp.mesh) {
          meshCount++;
          if (comp.mesh.visible) visible++;
        }
      });
      
      return { visible, meshCount, total: manager.components.size };
    });
    
    console.log('Visual stats:', visualStats);
    
    // Verify house was built
    expect(result.total).toBeGreaterThan(20);
    expect(result.breakdown.foundation).toBe(7);
    expect(result.breakdown.wall).toBeGreaterThan(10);
    expect(result.breakdown.roof).toBe(7);
    
    console.log(`\n✅ Single-story house built successfully!`);
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
    console.log(`📊 Components: ${result.total}`);
    console.log(`🏠 Buildings formed: ${result.buildings}`);
  });
});