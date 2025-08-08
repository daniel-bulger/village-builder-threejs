import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Working House Construction Test', () => {
  test('should build a proper multi-story house', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const screenshotDir = path.join('test-results', 'working-house-test');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Add test materials
    await page.keyboard.press('t');
    await page.waitForTimeout(500);
    
    // Build house with proper construction order
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Clear existing
      manager.components.forEach((comp: any) => {
        manager.removeComponent(comp.id);
      });
      
      const placedComponents = [];
      const errors = [];
      
      try {
        console.log('=== BUILDING GROUND FLOOR ===');
        
        // 1. FOUNDATIONS (3x3 hex area)
        console.log('Step 1: Placing foundations...');
        const foundationPositions = [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 0, r: 1 },
          { q: -1, r: 1 },
          { q: 1, r: -1 },
          { q: -1, r: 0 },
          { q: 0, r: -1 }
        ];
        
        let foundationCount = 0;
        foundationPositions.forEach(pos => {
          const foundation = manager.placeComponent({
            type: 'foundation',
            material: 'stone',
            position: { q: pos.q, r: pos.r, y: 0 },
            level: 0
          });
          
          if (foundation) {
            foundationCount++;
            placedComponents.push({ type: 'foundation', pos });
          } else {
            errors.push(`Foundation at (${pos.q}, ${pos.r})`);
          }
        });
        console.log(`Placed ${foundationCount} foundations`);
        
        // 2. GROUND FLOOR WALLS
        console.log('Step 2: Placing ground floor walls...');
        const groundWalls = [
          { pos: { q: 0, r: 0 }, edges: [0, 1, 2, 3, 4] }, // Leave edge 5 for door
          { pos: { q: 1, r: 0 }, edges: [0, 1, 2] },
          { pos: { q: 0, r: 1 }, edges: [2, 3, 4] },
          { pos: { q: -1, r: 1 }, edges: [3, 4, 5] },
          { pos: { q: -1, r: 0 }, edges: [4, 5, 0] },
          { pos: { q: 0, r: -1 }, edges: [5, 0, 1] },
          { pos: { q: 1, r: -1 }, edges: [0, 1, 2] }
        ];
        
        let wallCount = 0;
        groundWalls.forEach(config => {
          config.edges.forEach(edge => {
            const wall = manager.placeComponent({
              type: 'wall',
              material: 'wood',
              position: { q: config.pos.q, r: config.pos.r, y: 0 },
              level: 0,
              wallAlignment: edge
            });
            
            if (wall) {
              wallCount++;
              placedComponents.push({ type: 'wall', level: 0 });
            }
          });
        });
        console.log(`Placed ${wallCount} ground floor walls`);
        
        // 3. Add door
        const door = manager.placeComponent({
          type: 'wall',
          material: 'wood',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          wallAlignment: 5,
          metadata: { hasDoor: true }
        });
        if (door) placedComponents.push({ type: 'door' });
        
        // 4. MULTI-LEVEL SUPPORT PILLARS
        console.log('Step 3: Placing support pillars for upper floor...');
        
        // Place pillars at level 0 that will support level 1
        const pillarConfigs = [
          { q: 0, r: 0, vertices: [0, 2, 4] },
          { q: 1, r: 0, vertices: [1, 3] },
          { q: 0, r: 1, vertices: [3, 5] },
          { q: -1, r: 1, vertices: [4, 0] }
        ];
        
        let pillarCount = 0;
        
        // Ground level pillars
        pillarConfigs.forEach(config => {
          config.vertices.forEach(vertex => {
            const pillar = manager.placeComponent({
              type: 'pillar',
              material: 'stone',
              position: { q: config.q, r: config.r, y: 0 },
              level: 0,
              vertexIndex: vertex
            });
            if (pillar) pillarCount++;
          });
        });
        console.log(`Placed ${pillarCount} ground level pillars`);
        
        console.log('=== BUILDING SECOND FLOOR ===');
        
        // 5. UPPER LEVEL PILLARS (continuing from ground pillars)
        // These provide support at level 1
        console.log('Step 4: Extending pillars to upper level...');
        let upperPillarCount = 0;
        pillarConfigs.forEach(config => {
          config.vertices.forEach(vertex => {
            const pillar = manager.placeComponent({
              type: 'pillar',
              material: 'stone',
              position: { q: config.q, r: config.r, y: 1 },
              level: 1,
              vertexIndex: vertex
            });
            if (pillar) upperPillarCount++;
          });
        });
        console.log(`Placed ${upperPillarCount} upper level pillars`);
        
        // 6. SECOND FLOOR (now with pillar support at level 1)
        console.log('Step 5: Placing second floor...');
        let floorCount = 0;
        foundationPositions.forEach(pos => {
          const floor = manager.placeComponent({
            type: 'floor',
            material: 'wood',
            position: { q: pos.q, r: pos.r, y: 1 },
            level: 1
          });
          
          if (floor) {
            floorCount++;
            placedComponents.push({ type: 'floor', level: 1 });
          } else {
            errors.push(`Floor at (${pos.q}, ${pos.r}, 1)`);
          }
        });
        console.log(`Placed ${floorCount} second floor tiles`);
        
        // 7. SECOND FLOOR WALLS (shorter, decorative)
        console.log('Step 6: Placing second floor walls...');
        const upperWalls = [
          { pos: { q: 0, r: 0 }, edges: [0, 1, 2, 3, 4, 5] },
          { pos: { q: 1, r: 0 }, edges: [0, 1, 2] },
          { pos: { q: 0, r: 1 }, edges: [2, 3] },
          { pos: { q: -1, r: 1 }, edges: [3, 4] }
        ];
        
        let upperWallCount = 0;
        upperWalls.forEach(config => {
          config.edges.forEach(edge => {
            const wall = manager.placeComponent({
              type: 'wall',
              material: 'wood',
              position: { q: config.pos.q, r: config.pos.r, y: 1 },
              level: 1,
              wallAlignment: edge
            });
            
            if (wall) {
              upperWallCount++;
              placedComponents.push({ type: 'wall', level: 1 });
            }
          });
        });
        console.log(`Placed ${upperWallCount} second floor walls`);
        
        // 8. ROOF
        console.log('Step 7: Placing roof...');
        let roofCount = 0;
        foundationPositions.slice(0, 3).forEach(pos => {
          const roof = manager.placeComponent({
            type: 'roof',
            material: 'wood',
            position: { q: pos.q, r: pos.r, y: 2 },
            level: 2
          });
          
          if (roof) {
            roofCount++;
            placedComponents.push({ type: 'roof' });
          }
        });
        console.log(`Placed ${roofCount} roof sections`);
        
      } catch (error: any) {
        errors.push(`Exception: ${error.message}`);
      }
      
      // Get final statistics
      const componentBreakdown: any = {};
      manager.components.forEach((comp: any) => {
        const type = comp.data.type;
        componentBreakdown[type] = (componentBreakdown[type] || 0) + 1;
      });
      
      return {
        success: errors.length === 0,
        placedCount: placedComponents.length,
        errors,
        totalComponents: manager.components.size,
        breakdown: componentBreakdown,
        buildings: manager.getBuildings().length
      };
    });
    
    console.log('House construction result:', result);
    
    // Take screenshots from multiple angles
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-initial-view.png'),
      fullPage: false
    });
    
    // Rotate camera
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1200, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-rotated-view.png'),
      fullPage: false
    });
    
    // Another rotation
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(800, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-side-view.png'),
      fullPage: false
    });
    
    // Overhead view
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '04-overhead-view.png'),
      fullPage: false
    });
    
    // Zoom out
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(100);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '05-zoomed-out.png'),
      fullPage: false
    });
    
    // Verify results
    expect(result.errors).toHaveLength(0);
    expect(result.totalComponents).toBeGreaterThan(30);
    
    console.log(`\nHouse construction complete!`);
    console.log(`Total components: ${result.totalComponents}`);
    console.log(`Component breakdown:`, result.breakdown);
    console.log(`Buildings formed: ${result.buildings}`);
    console.log(`Screenshots saved to: ${screenshotDir}`);
  });
});