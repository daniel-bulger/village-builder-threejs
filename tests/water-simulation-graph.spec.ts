import { test, expect } from '@playwright/test';
import { waitForGame } from './helpers';

test.describe('Water Simulation Graph Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
    
    // Disable animations by default to prevent water flow during setup
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(false);
    });
  });

  test.describe('Basic Water Storage', () => {
    test('should store water in hex', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        const coord = { q: 50, r: 50, y: 0 };
        waterSim.addHex(coord, 'loam');
        
        // Add 100L of water (100,000 mL)
        waterSim.addWater(coord, 100000);
        
        return {
          saturation: waterSim.getSaturation(coord),
          waterML: waterSim.getWaterML(coord),
          capacityML: 150800 // Expected for loam
        };
      });
      
      expect(result.waterML).toBe(100000);
      expect(result.saturation).toBeCloseTo(100000 / 150800, 2); // ~0.66
    });

    test('should cap water at capacity', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        const coord = { q: 51, r: 51, y: 0 };
        waterSim.addHex(coord, 'loam');
        
        // Try to add 200L (more than capacity of 150.8L)
        waterSim.addWater(coord, 200000);
        
        return {
          saturation: waterSim.getSaturation(coord),
          waterML: waterSim.getWaterML(coord)
        };
      });
      
      expect(result.waterML).toBe(150800); // Capped at capacity
      expect(result.saturation).toBe(1.0);
    });
  });

  test.describe('Water Flow', () => {
    test('should flow between adjacent hexes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        // Create two adjacent hexes
        const hex1 = { q: 60, r: 60, y: 0 };
        const hex2 = { q: 61, r: 60, y: 0 };
        
        waterSim.addHex(hex1, 'loam');
        waterSim.addHex(hex2, 'loam');
        
        // Fill first hex
        waterSim.addWater(hex1, 150800);
        
        // Enable animations and run simulation
        gameWindow.game.setAnimationsEnabled(true);
        
        // Run for 1 second (10 ticks of 0.1s)
        for (let i = 0; i < 10; i++) {
          waterSim.tick(0.1);
        }
        
        return {
          sat1: waterSim.getSaturation(hex1),
          sat2: waterSim.getSaturation(hex2),
          water1: waterSim.getWaterML(hex1),
          water2: waterSim.getWaterML(hex2)
        };
      });
      
      // Water should have flowed from hex1 to hex2
      expect(result.sat1).toBeLessThan(1.0);
      expect(result.sat2).toBeGreaterThan(0);
      expect(result.water1).toBeGreaterThan(result.water2); // But hex1 still has more
    });

    test('should flow downward faster', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        // Create vertically adjacent hexes
        const upper = { q: 70, r: 70, y: 1 };
        const lower = { q: 70, r: 70, y: 0 };
        
        waterSim.addHex(upper, 'loam');
        waterSim.addHex(lower, 'loam');
        
        // Add 50L to upper hex
        waterSim.addWater(upper, 50000);
        
        gameWindow.game.setAnimationsEnabled(true);
        
        // Run for 0.5 seconds
        for (let i = 0; i < 5; i++) {
          waterSim.tick(0.1);
        }
        
        return {
          upperWater: waterSim.getWaterML(upper),
          lowerWater: waterSim.getWaterML(lower)
        };
      });
      
      // Significant water should have flowed down
      expect(result.lowerWater).toBeGreaterThan(20000); // At least 20L
      expect(result.upperWater).toBeLessThan(30000); // Less than 30L left
    });
  });

  test.describe('Barriers', () => {
    test('should block horizontal flow', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        const HexUtils = gameWindow.HexUtils;
        
        const hex1 = { q: 80, r: 80, y: 0 };
        const hex2 = { q: 81, r: 80, y: 0 };
        
        waterSim.addHex(hex1, 'loam');
        waterSim.addHex(hex2, 'loam');
        
        // Add barrier between them
        const edge = HexUtils.getSharedEdge(hex1, hex2);
        waterSim.addBarrier(hex1, edge);
        
        // Fill first hex
        waterSim.addWater(hex1, 150800);
        
        gameWindow.game.setAnimationsEnabled(true);
        
        // Run simulation
        for (let i = 0; i < 10; i++) {
          waterSim.tick(0.1);
        }
        
        return {
          water1: waterSim.getWaterML(hex1),
          water2: waterSim.getWaterML(hex2)
        };
      });
      
      // Water should not have flowed through barrier
      expect(result.water2).toBe(0);
      // Hex1 might lose some water to drainage but not to hex2
      expect(result.water1).toBeGreaterThan(100000); // Still has most water
    });

    test('should prevent drainage with bottom barrier', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        const hex = { q: 90, r: 90, y: 0 };
        
        waterSim.addHex(hex, 'loam');
        
        // Add all barriers including bottom
        for (let edge = 0; edge < 7; edge++) {
          waterSim.addBarrier(hex, edge);
        }
        
        // Add 100L
        waterSim.addWater(hex, 100000);
        const initialWater = waterSim.getWaterML(hex);
        
        gameWindow.game.setAnimationsEnabled(true);
        
        // Run for 2 seconds
        for (let i = 0; i < 20; i++) {
          waterSim.tick(0.1);
        }
        
        const finalWater = waterSim.getWaterML(hex);
        
        return {
          initialWater,
          finalWater,
          retained: finalWater / initialWater
        };
      });
      
      // Should retain most water (only evaporation loss)
      expect(result.retained).toBeGreaterThan(0.95); // >95% retained
    });
  });

  test.describe('Drainage', () => {
    test('should drain to desert', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        // Single hex surrounded by desert
        const hex = { q: 100, r: 100, y: 0 };
        
        waterSim.addHex(hex, 'loam');
        waterSim.addWater(hex, 100000); // 100L
        
        gameWindow.game.setAnimationsEnabled(true);
        
        const waterLevels = [waterSim.getWaterML(hex)];
        
        // Run for 2 seconds and track drainage
        for (let i = 0; i < 20; i++) {
          waterSim.tick(0.1);
          if (i % 5 === 4) { // Every 0.5s
            waterLevels.push(waterSim.getWaterML(hex));
          }
        }
        
        return {
          waterLevels,
          totalDrained: waterLevels[0] - waterLevels[waterLevels.length - 1]
        };
      });
      
      // Should drain significantly
      expect(result.totalDrained).toBeGreaterThan(50000); // More than 50L drained
      
      // Each measurement should be less than previous
      for (let i = 1; i < result.waterLevels.length; i++) {
        expect(result.waterLevels[i]).toBeLessThan(result.waterLevels[i - 1]);
      }
    });
  });

  test.describe('Soil Types', () => {
    test('should have different capacities', async ({ page }) => {
      const capacities = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        const soilTypes = ['sand', 'loam', 'clay'];
        const results: any = {};
        
        soilTypes.forEach((soilType, index) => {
          const coord = { q: 110 + index, r: 110, y: 0 };
          waterSim.addHex(coord, soilType as any);
          
          const hexes = waterSim.getAllHexes();
          const hex = hexes.find((h: any) => h.coord.q === coord.q);
          
          results[soilType] = {
            capacityML: hex.capacityML,
            capacityL: hex.capacityML / 1000
          };
        });
        
        return results;
      });
      
      // Sand < Loam < Clay
      expect(capacities.sand.capacityML).toBeLessThan(capacities.loam.capacityML);
      expect(capacities.loam.capacityML).toBeLessThan(capacities.clay.capacityML);
      
      console.log('Soil capacities:', capacities);
    });

    test('should flow at different rates', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        // Test sand (high permeability)
        const sand1 = { q: 120, r: 120, y: 0 };
        const sand2 = { q: 121, r: 120, y: 0 };
        
        waterSim.addHex(sand1, 'sand');
        waterSim.addHex(sand2, 'sand');
        waterSim.addWater(sand1, 50000); // 50L
        
        gameWindow.game.setAnimationsEnabled(true);
        
        // Run for 0.5s
        for (let i = 0; i < 5; i++) {
          waterSim.tick(0.1);
        }
        
        const sandFlow = waterSim.getWaterML(sand2);
        
        // Test clay (low permeability)
        gameWindow.game.setAnimationsEnabled(false);
        
        const clay1 = { q: 130, r: 130, y: 0 };
        const clay2 = { q: 131, r: 130, y: 0 };
        
        waterSim.addHex(clay1, 'clay');
        waterSim.addHex(clay2, 'clay');
        waterSim.addWater(clay1, 50000); // 50L
        
        gameWindow.game.setAnimationsEnabled(true);
        
        // Run for 0.5s
        for (let i = 0; i < 5; i++) {
          waterSim.tick(0.1);
        }
        
        const clayFlow = waterSim.getWaterML(clay2);
        
        return { sandFlow, clayFlow };
      });
      
      // Sand should transfer water faster than clay
      expect(result.sandFlow).toBeGreaterThan(result.clayFlow);
      console.log('Flow rates - Sand:', result.sandFlow, 'mL, Clay:', result.clayFlow, 'mL');
    });
  });
});