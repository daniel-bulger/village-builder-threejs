import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('House Construction Visual Test', () => {
  test('should build a complete small house and verify appearance', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Navigate to game
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Create screenshots directory
    const screenshotDir = path.join('test-results', 'house-visual-test');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Add test materials
    await page.keyboard.press('t');
    await page.waitForTimeout(500);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: path.join(screenshotDir, '01-initial-state.png'),
      fullPage: false
    });
    
    console.log('Building house programmatically...');
    
    // Build the house using low-level methods
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Log manager state
      console.log('BuildingManager exists:', !!manager);
      console.log('PlaceComponent method exists:', typeof manager.placeComponent);
      
      // Clear any existing components
      manager.components.forEach((comp: any) => {
        manager.removeComponent(comp.id);
      });
      
      const placedComponents = [];
      const errors = [];
      
      try {
        // === FOUNDATION LAYER (3x3 hex area) ===
        console.log('Placing foundations...');
        
        // Test a single foundation first
        console.log('Testing single foundation placement...');
        const testFoundation = manager.placeComponent({
          type: 'foundation',
          material: 'stone',
          position: { q: 0, r: 0, y: 0 },
          level: 0
        });
        console.log('Test foundation result:', testFoundation);
        
        const foundationPositions = [
          { q: 0, r: 0, y: 0 },
          { q: 1, r: 0, y: 0 },
          { q: 0, r: 1, y: 0 },
          { q: -1, r: 1, y: 0 },
          { q: 1, r: -1, y: 0 },
          { q: -1, r: 0, y: 0 },
          { q: 0, r: -1, y: 0 }
        ];
        
        foundationPositions.forEach(pos => {
          const foundation = manager.placeComponent({
            type: 'foundation',
            material: 'stone',
            position: pos,
            level: 0
          });
          
          if (foundation) {
            placedComponents.push({
              type: 'foundation',
              position: pos,
              success: true
            });
          } else {
            errors.push(`Failed to place foundation at (${pos.q}, ${pos.r})`);
          }
        });
        
        // === GROUND FLOOR WALLS ===
        console.log('Placing ground floor walls...');
        
        // Place walls around the center hex
        const wallConfigs = [
          { pos: { q: 0, r: 0, y: 0 }, edges: [0, 1, 3, 4] }, // Center hex - leave openings
          { pos: { q: 1, r: 0, y: 0 }, edges: [0, 1, 2] },
          { pos: { q: 0, r: 1, y: 0 }, edges: [1, 2, 3] },
          { pos: { q: -1, r: 1, y: 0 }, edges: [2, 3, 4] },
          { pos: { q: -1, r: 0, y: 0 }, edges: [3, 4, 5] },
          { pos: { q: 0, r: -1, y: 0 }, edges: [4, 5, 0] },
          { pos: { q: 1, r: -1, y: 0 }, edges: [5, 0, 1] }
        ];
        
        wallConfigs.forEach(config => {
          config.edges.forEach(edge => {
            const wall = manager.placeComponent({
              type: 'wall',
              material: 'wood',
              position: config.pos,
              level: 0,
              wallAlignment: edge
            });
            
            if (wall) {
              placedComponents.push({
                type: 'wall',
                position: config.pos,
                edge,
                success: true
              });
            } else {
              errors.push(`Failed to place wall at (${config.pos.q}, ${config.pos.r}) edge ${edge}`);
            }
          });
        });
        
        // === ADD DOOR ===
        console.log('Adding door...');
        const door = manager.placeComponent({
          type: 'wall',
          material: 'wood',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          wallAlignment: 5,
          metadata: { hasDoor: true }
        });
        
        if (door) {
          placedComponents.push({ type: 'door', success: true });
        } else {
          errors.push('Failed to place door');
        }
        
        // === ADD WINDOW ===
        console.log('Adding window...');
        const windowWall = manager.placeComponent({
          type: 'wall',
          material: 'wood',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          wallAlignment: 2,
          metadata: { hasWindow: true }
        });
        
        if (windowWall) {
          placedComponents.push({ type: 'window', success: true });
        } else {
          errors.push('Failed to place window');
        }
        
        // === ADD PILLARS FOR SUPPORT ===
        console.log('Adding support pillars...');
        const pillarPositions = [
          { pos: { q: 0, r: 0, y: 0 }, vertices: [0, 3] },
          { pos: { q: 1, r: 0, y: 0 }, vertices: [1, 2] },
          { pos: { q: 0, r: 1, y: 0 }, vertices: [2, 3] },
          { pos: { q: -1, r: 1, y: 0 }, vertices: [3, 4] }
        ];
        
        pillarPositions.forEach(config => {
          config.vertices.forEach(vertex => {
            const pillar = manager.placeComponent({
              type: 'pillar',
              material: 'stone',
              position: config.pos,
              level: 0,
              vertexIndex: vertex
            });
            
            if (pillar) {
              placedComponents.push({
                type: 'pillar',
                position: config.pos,
                vertex,
                success: true
              });
            }
          });
        });
        
        // === SECOND FLOOR ===
        console.log('Adding second floor...');
        foundationPositions.forEach(pos => {
          const floor = manager.placeComponent({
            type: 'floor',
            material: 'wood',
            position: { ...pos, y: 1 },
            level: 1
          });
          
          if (floor) {
            placedComponents.push({
              type: 'floor',
              position: { ...pos, y: 1 },
              success: true
            });
          } else {
            errors.push(`Failed to place floor at (${pos.q}, ${pos.r}, 1)`);
          }
        });
        
        // === SECOND FLOOR WALLS (shorter) ===
        console.log('Adding second floor walls...');
        const secondFloorWalls = [
          { pos: { q: 0, r: 0, y: 1 }, edges: [0, 1, 2, 3, 4, 5] },
          { pos: { q: 1, r: 0, y: 1 }, edges: [0, 1, 2] },
          { pos: { q: 0, r: 1, y: 1 }, edges: [2, 3] },
          { pos: { q: -1, r: 1, y: 1 }, edges: [3, 4] },
          { pos: { q: -1, r: 0, y: 1 }, edges: [4, 5] },
          { pos: { q: 0, r: -1, y: 1 }, edges: [5, 0] }
        ];
        
        secondFloorWalls.forEach(config => {
          config.edges.forEach(edge => {
            const wall = manager.placeComponent({
              type: 'wall',
              material: 'wood',
              position: config.pos,
              level: 1,
              wallAlignment: edge
            });
            
            if (wall) {
              placedComponents.push({
                type: 'wall-2f',
                position: config.pos,
                edge,
                success: true
              });
            }
          });
        });
        
        // === ROOF ===
        console.log('Adding roof...');
        foundationPositions.forEach(pos => {
          const roof = manager.placeComponent({
            type: 'roof',
            material: 'wood',
            position: { ...pos, y: 2 },
            level: 2
          });
          
          if (roof) {
            placedComponents.push({
              type: 'roof',
              position: { ...pos, y: 2 },
              success: true
            });
          }
        });
        
      } catch (error: any) {
        errors.push(`Exception: ${error.message}`);
      }
      
      // Get final statistics
      const stats = {
        totalComponents: manager.components.size,
        foundations: placedComponents.filter(c => c.type === 'foundation').length,
        walls: placedComponents.filter(c => c.type === 'wall' || c.type === 'wall-2f').length,
        floors: placedComponents.filter(c => c.type === 'floor').length,
        pillars: placedComponents.filter(c => c.type === 'pillar').length,
        roofs: placedComponents.filter(c => c.type === 'roof').length,
        doors: placedComponents.filter(c => c.type === 'door').length,
        windows: placedComponents.filter(c => c.type === 'window').length
      };
      
      return {
        success: errors.length === 0,
        placedComponents: placedComponents.length,
        errors,
        stats,
        buildings: manager.getBuildings().length
      };
    });
    
    console.log('House building result:', result);
    
    // Verify construction was successful
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.placedComponents).toBeGreaterThan(30); // Should have many components
    
    // Wait for rendering
    await page.waitForTimeout(1000);
    
    // Take screenshot of completed house from default angle
    await page.screenshot({ 
      path: path.join(screenshotDir, '02-house-complete-default.png'),
      fullPage: false
    });
    
    // Rotate camera for different angles
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(1200, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '03-house-rotated-1.png'),
      fullPage: false
    });
    
    // Another angle
    await page.mouse.down({ button: 'middle' });
    await page.mouse.move(800, 540);
    await page.mouse.up({ button: 'middle' });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '04-house-rotated-2.png'),
      fullPage: false
    });
    
    // Overhead view
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '05-house-overhead.png'),
      fullPage: false
    });
    
    // Zoom out to see full structure
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(100);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotDir, '06-house-zoomed-out.png'),
      fullPage: false
    });
    
    // Visual validation checks
    const visualCheck = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Check that components are visible
      let visibleCount = 0;
      let inFrustum = 0;
      
      manager.components.forEach((comp: any) => {
        if (comp.mesh && comp.mesh.visible) {
          visibleCount++;
          
          // Simple frustum check
          const pos = comp.mesh.position;
          if (Math.abs(pos.x) < 20 && Math.abs(pos.z) < 20) {
            inFrustum++;
          }
        }
      });
      
      // Check building bounds
      const buildings = manager.getBuildings();
      const bounds = buildings[0]?.bounds;
      
      return {
        visibleComponents: visibleCount,
        componentsInView: inFrustum,
        buildingCount: buildings.length,
        hasBounds: !!bounds,
        boundsSize: bounds ? {
          width: bounds.max.x - bounds.min.x,
          height: bounds.max.y - bounds.min.y,
          depth: bounds.max.z - bounds.min.z
        } : null
      };
    });
    
    console.log('Visual validation:', visualCheck);
    
    // Verify visual properties
    expect(visualCheck.visibleComponents).toBeGreaterThan(30);
    expect(visualCheck.componentsInView).toBeGreaterThan(20);
    expect(visualCheck.buildingCount).toBeGreaterThan(0);
    expect(visualCheck.hasBounds).toBe(true);
    
    // Check that house has reasonable dimensions
    if (visualCheck.boundsSize) {
      expect(visualCheck.boundsSize.width).toBeGreaterThan(2);
      expect(visualCheck.boundsSize.width).toBeLessThan(10);
      expect(visualCheck.boundsSize.height).toBeGreaterThan(3);
      expect(visualCheck.boundsSize.height).toBeLessThan(15);
    }
    
    console.log(`\nScreenshots saved to: ${screenshotDir}`);
    console.log('Please review the screenshots to verify the house looks correct.');
  });
});