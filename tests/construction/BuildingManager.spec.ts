import { test, expect } from '@playwright/test';

test.describe('Building Manager Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should calculate correct support requirements', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Test different component types using checkSupport
      const testCases = [
        { 
          data: { type: 'foundation', material: 'stone', position: { q: 0, r: 0, y: 0 }, level: 0 },
          expectedCanSupport: true // Foundations don't need support
        },
        { 
          data: { type: 'wall', material: 'stone', position: { q: 0, r: 0, y: 0 }, level: 0, wallAlignment: 0 },
          expectedCanSupport: false // Walls at ground need foundation
        },
        { 
          data: { type: 'floor', material: 'wood', position: { q: 0, r: 0, y: 0 }, level: 0 },
          expectedCanSupport: true // Ground floor doesn't need support
        },
        { 
          data: { type: 'floor', material: 'wood', position: { q: 0, r: 0, y: 1 }, level: 1 },
          expectedCanSupport: false // Upper floor needs support
        },
      ];
      
      return testCases.map(testCase => {
        const supportCheck = manager.checkSupport(testCase.data);
        return {
          type: testCase.data.type,
          level: testCase.data.level,
          expected: testCase.expectedCanSupport,
          actual: supportCheck.canSupport,
          supportAvailable: supportCheck.supportAvailable,
          supportNeeded: supportCheck.supportNeeded,
          supportingComponents: supportCheck.supportingComponents
        };
      });
    });
    
    result.forEach(test => {
      console.log(`${test.type} at level ${test.level}: expected=${test.expected}, actual=${test.actual}, support=${test.supportAvailable}/${test.supportNeeded}`);
      expect(test.actual).toBe(test.expected);
    });
  });

  test('should find supporting components correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Place a foundation
      const foundation = manager.placeComponent({
        type: 'foundation',
        material: 'stone',
        position: { q: 0, r: 0, y: 0 },
        level: 0
      });
      
      // Place walls on the foundation
      const walls = [];
      for (let i = 0; i < 4; i++) {
        const wall = manager.placeComponent({
          type: 'wall',
          material: 'stone',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          wallAlignment: i
        });
        if (wall) walls.push(wall);
      }
      
      // Check wall support using checkSupport
      const wallSupportCheck = walls[0] ? manager.checkSupport(walls[0].data) : { supportingComponents: [] };
      
      // Place a floor above
      const floor = manager.placeComponent({
        type: 'floor',
        material: 'stone',
        position: { q: 0, r: 0, y: 1 },
        level: 1
      });
      
      // Check floor support using checkSupport
      const floorSupportCheck = floor ? manager.checkSupport(floor.data) : { supportingComponents: [] };
      
      return {
        foundationId: foundation?.id,
        wallCount: walls.length,
        wallSupportCount: wallSupportCheck.supportingComponents.length,
        wallHasSupport: wallSupportCheck.canSupport,
        floorSupportCount: floorSupportCheck.supportingComponents.length,
        floorHasSupport: floorSupportCheck.canSupport
      };
    });
    
    expect(result.wallCount).toBe(4);
    expect(result.wallSupportCount).toBeGreaterThan(0);
    expect(result.wallHasSupport).toBe(true);
    expect(result.floorSupportCount).toBeGreaterThan(0);
    expect(result.floorHasSupport).toBe(true);
  });

  test('should detect dependent components', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Build a simple structure
      const foundation = manager.placeComponent({
        type: 'foundation',
        material: 'stone',
        position: { q: 0, r: 0, y: 0 },
        level: 0
      });
      
      // Place multiple walls to properly support a floor
      const walls = [];
      for (let i = 0; i < 3; i++) {
        const wall = manager.placeComponent({
          type: 'wall',
          material: 'stone',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          wallAlignment: i
        });
        if (wall) walls.push(wall);
      }
      
      const floor = manager.placeComponent({
        type: 'floor',
        material: 'stone',
        position: { q: 0, r: 0, y: 1 },
        level: 1
      });
      
      const roofWall = manager.placeComponent({
        type: 'wall',
        material: 'stone',
        position: { q: 0, r: 0, y: 1 },
        level: 1,
        wallAlignment: 0
      });
      
      // Check what would happen if we removed each component
      // Components that depend on this one would lose support
      const foundationDeps = [];
      const wallDeps = [];
      const floorDeps = [];
      
      // Check if removing foundation would affect walls
      if (foundation && walls.length > 0) {
        for (const wall of walls) {
          const wallCheckWithoutFoundation = manager.checkSupport(wall.data);
          // Wall is dependent if it currently has support but wouldn't without foundation
          if (wallCheckWithoutFoundation.supportingComponents.includes(foundation.id)) {
            foundationDeps.push(wall.data);
          }
        }
      }
      
      // Check if removing any wall would affect floor
      if (walls.length > 0 && floor) {
        const floorCheckCurrent = manager.checkSupport(floor.data);
        for (const wall of walls) {
          if (floorCheckCurrent.supportingComponents.includes(wall.id)) {
            wallDeps.push(floor.data);
            break; // Only add floor once
          }
        }
      }
      
      // Check if removing floor would affect roof wall
      if (floor && roofWall) {
        const roofWallCheck = manager.checkSupport(roofWall.data);
        if (roofWallCheck.supportingComponents.includes(floor.id)) {
          floorDeps.push(roofWall.data);
        }
      }
      
      return {
        foundationDepCount: foundationDeps.length,
        foundationDepTypes: foundationDeps.map(d => d.type),
        wallDepCount: wallDeps.length,
        wallDepTypes: wallDeps.map(d => d.type),
        floorDepCount: floorDeps.length,
        floorDepTypes: floorDeps.map(d => d.type),
        // Also return actual component placement status
        hasFoundation: !!foundation,
        hasWalls: walls.length > 0,
        wallCount: walls.length,
        hasFloor: !!floor,
        hasRoofWall: !!roofWall
      };
    });
    
    // Check that components were placed
    expect(result.hasFoundation).toBe(true);
    expect(result.hasWalls).toBe(true);
    expect(result.wallCount).toBe(3);
    expect(result.hasFloor).toBe(true);
    expect(result.hasRoofWall).toBe(true);
    
    // Foundation supports wall
    expect(result.foundationDepCount).toBeGreaterThan(0);
    expect(result.foundationDepTypes).toContain('wall');
    
    // Wall supports floor
    expect(result.wallDepCount).toBeGreaterThan(0);
    expect(result.wallDepTypes).toContain('floor');
    
    // Floor supports upper wall
    expect(result.floorDepCount).toBeGreaterThan(0);
    expect(result.floorDepTypes).toContain('wall');
  });

  test('should enforce structural limits', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Try to build too tall with weak material
      manager.placeComponent({
        type: 'foundation',
        material: 'wood', // Max 2 levels
        position: { q: 0, r: 0, y: 0 },
        level: 0
      });
      
      // Add 3 pillars for proper floor support
      for (let i = 0; i < 3; i++) {
        manager.placeComponent({
          type: 'pillar',
          material: 'wood',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          vertexIndex: i * 2 // Use vertices 0, 2, 4 for triangular support
        });
      }
      
      const floors = [];
      
      // Try to place floors at increasing heights
      for (let level = 1; level <= 5; level++) {
        const floor = manager.placeComponent({
          type: 'floor',
          material: 'wood',
          position: { q: 0, r: 0, y: level },
          level: level
        });
        floors.push({
          level,
          placed: floor !== null
        });
      }
      
      return floors;
    });
    
    // Wood supports max 2 levels
    expect(result[0].placed).toBe(true); // Level 1 - OK
    expect(result[1].placed).toBe(false); // Level 2 - Should fail
    expect(result[2].placed).toBe(false); // Level 3 - Should fail
  });

  test('should handle complex support calculations', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Create a foundation with mixed materials
      manager.placeComponent({
        type: 'foundation',
        material: 'stone', // Strong foundation
        position: { q: 0, r: 0, y: 0 },
        level: 0
      });
      
      // Wood walls (weak)
      for (let i = 0; i < 3; i++) {
        manager.placeComponent({
          type: 'wall',
          material: 'wood',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          wallAlignment: i
        });
      }
      
      // Stone pillars (strong)
      for (let i = 3; i < 6; i++) {
        manager.placeComponent({
          type: 'pillar',
          material: 'stone',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          vertexIndex: i
        });
      }
      
      // Try heavy floor
      const heavyFloor = manager.placeComponent({
        type: 'floor',
        material: 'metal', // Very heavy
        position: { q: 0, r: 0, y: 1 },
        level: 1
      });
      
      // Calculate total support strength using checkSupport
      const supportCheck = heavyFloor ? manager.checkSupport(heavyFloor.data) : null;
      const support = supportCheck ? supportCheck.supportAvailable : 0;
      
      return {
        floorPlaced: heavyFloor !== null,
        supportStrength: support,
        // Use the actual component's weight if it was placed
        floorWeight: heavyFloor ? heavyFloor.weight : 0
      };
    });
    
    expect(result.floorPlaced).toBe(true);
    expect(result.supportStrength).toBeGreaterThan(result.floorWeight);
  });

  test('should group components into buildings', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Clear existing components
      manager.components.clear();
      
      // Build first structure
      manager.placeComponent({
        type: 'foundation',
        material: 'wood',
        position: { q: 0, r: 0, y: 0 },
        level: 0
      });
      
      manager.placeComponent({
        type: 'wall',
        material: 'wood',
        position: { q: 0, r: 0, y: 0 },
        level: 0,
        wallAlignment: 0
      });
      
      // Build second structure (separate)
      manager.placeComponent({
        type: 'foundation',
        material: 'stone',
        position: { q: 5, r: 5, y: 0 },
        level: 0
      });
      
      manager.placeComponent({
        type: 'wall',
        material: 'stone',
        position: { q: 5, r: 5, y: 0 },
        level: 0,
        wallAlignment: 0
      });
      
      // Get buildings
      const buildings = manager.getBuildings();
      
      // Debug: check components
      const allComponents = Array.from(manager.components.values());
      
      return {
        buildingCount: buildings.length,
        totalComponents: allComponents.length,
        componentsInfo: allComponents.map(c => ({ type: c.data.type, material: c.data.material })),
        building1Components: buildings[0]?.components.size || 0,
        building2Components: buildings[1]?.components.size || 0,
        building1Material: buildings[0] ? Array.from(buildings[0].components.values())[0]?.data.material : null,
        building2Material: buildings[1] ? Array.from(buildings[1].components.values())[0]?.data.material : null
      };
    });
    
    expect(result.buildingCount).toBe(2);
    expect(result.building1Components).toBe(2);
    expect(result.building2Components).toBe(2);
    expect([result.building1Material, result.building2Material].sort())
      .toEqual(['stone', 'wood']);
  });

  test('should calculate building bounds correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const manager = game.buildingManager;
      
      // Clear and build a structure
      manager.components.clear();
      
      // Place components at different positions
      manager.placeComponent({
        type: 'foundation',
        material: 'stone',
        position: { q: 0, r: 0, y: 0 },
        level: 0
      });
      
      manager.placeComponent({
        type: 'foundation',
        material: 'stone',
        position: { q: 1, r: 0, y: 0 },
        level: 0
      });
      
      manager.placeComponent({
        type: 'foundation',
        material: 'stone',
        position: { q: 0, r: 1, y: 0 },
        level: 0
      });
      
      // Place multiple walls for floor support
      for (let i = 0; i < 3; i++) {
        manager.placeComponent({
          type: 'wall',
          material: 'stone',
          position: { q: 0, r: 0, y: 0 },
          level: 0,
          wallAlignment: i
        });
      }
      
      manager.placeComponent({
        type: 'floor',
        material: 'stone',
        position: { q: 0, r: 0, y: 1 },
        level: 1
      });
      
      const buildings = manager.getBuildings();
      const bounds = buildings[0]?.bounds;
      
      return {
        hasBounds: !!bounds,
        minX: bounds?.min.x,
        maxX: bounds?.max.x,
        minY: bounds?.min.y,
        maxY: bounds?.max.y,
        minZ: bounds?.min.z,
        maxZ: bounds?.max.z,
        buildingCount: buildings.length
      };
    });
    
    expect(result.hasBounds).toBe(true);
    // The foundations at different positions create separate buildings
    expect(result.buildingCount).toBeGreaterThan(0);
    // Check the first building's bounds
    // The exact values depend on the mesh sizes, but they should be defined
    expect(result.minX).toBeDefined();
    expect(result.maxX).toBeDefined();
    expect(result.minY).toBeDefined();
    expect(result.maxY).toBeDefined();
    expect(result.minZ).toBeDefined();
    expect(result.maxZ).toBeDefined();
    // Basic sanity checks
    expect(result.maxX).toBeGreaterThan(result.minX);
    expect(result.maxY).toBeGreaterThanOrEqual(result.minY);
    expect(result.maxZ).toBeGreaterThan(result.minZ);
  });
});