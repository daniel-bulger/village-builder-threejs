import { test, expect } from '@playwright/test';
import { waitForGame } from './helpers';

test.describe('Water Simulation Unit Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
  });

  test.describe('Basic Water Operations', () => {
    test('should add hex and store water', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const WaterSimulation = gameWindow.WaterSimulation || gameWindow.game.soilManager.getWaterSimulation().constructor;
        const waterSim = new WaterSimulation();
        
        const coord = { q: 0, r: 0, y: 0 };
        
        // Add a hex
        waterSim.addHex(coord, 'loam');
        
        // Add water (200ML to a 290ML capacity hex)
        const added = waterSim.addWater(coord, 200);
        
        // Check saturation
        const saturation = waterSim.getSaturation(coord);
        
        return { added, saturation, expectedSat: 200 / 290 };
      });
      
      expect(result.added).toBe(true);
      expect(result.saturation).toBeCloseTo(result.expectedSat, 2); // ~0.69
    });

    test('should cap saturation at 1.0', async ({ page }) => {
      const saturation = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        // Clear existing hexes
        waterSim.hexes.clear();
        
        const coord = { q: 0, r: 0, y: 0 };
        waterSim.addHex(coord, 'loam');
        
        // Add more water than capacity (500ML to 290ML)
        waterSim.addWater(coord, 500);
        
        return waterSim.getSaturation(coord);
      });
      
      expect(saturation).toBe(1.0);
    });

    test('should return water content in ML', async ({ page }) => {
      const waterML = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        waterSim.hexes.clear();
        const coord = { q: 0, r: 0, y: 0 };
        waterSim.addHex(coord, 'loam');
        
        waterSim.addWater(coord, 150);
        
        return waterSim.getWaterML(coord);
      });
      
      expect(waterML).toBe(150);
    });
  });

  test.describe('Water Flow Between Hexes', () => {
    test('should flow water from high to low saturation', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        const hex1 = { q: 0, r: 0, y: 0 };
        const hex2 = { q: 1, r: 0, y: 0 }; // Adjacent
        
        // Add both hexes
        waterSim.addHex(hex1, 'loam');
        waterSim.addHex(hex2, 'loam');
        
        // Add water only to first hex (make it saturated)
        waterSim.addWater(hex1, 290); // Full capacity
        
        // Run simulation for a bit
        for (let i = 0; i < 10; i++) {
          waterSim.tick(0.1); // 100ms ticks
        }
        
        // Water should have flowed to hex2
        const sat1 = waterSim.getSaturation(hex1);
        const sat2 = waterSim.getSaturation(hex2);
        
        return { sat1, sat2 };
      });
      
      expect(result.sat1).toBeLessThan(1.0); // No longer fully saturated
      expect(result.sat2).toBeGreaterThan(0); // Has received water
      expect(result.sat1).toBeGreaterThan(result.sat2); // But still has more than hex2
    });

    test('should flow water downward faster due to gravity', async ({ page }) => {
      const satLower = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        const upper = { q: 0, r: 0, y: 1 };
        const lower = { q: 0, r: 0, y: 0 };
        
        waterSim.addHex(upper, 'loam');
        waterSim.addHex(lower, 'loam');
        
        // Add water to upper hex
        waterSim.addWater(upper, 200);
        
        // Run simulation
        for (let i = 0; i < 5; i++) {
          waterSim.tick(0.1);
        }
        
        // Lower hex should have received significant water
        return waterSim.getSaturation(lower);
      });
      
      expect(satLower).toBeGreaterThan(0.3);
    });
  });

  test.describe('Barriers', () => {
    test('should block water flow between hexes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        const HexUtils = gameWindow.HexUtils;
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        const hex1 = { q: 0, r: 0, y: 0 };
        const hex2 = { q: 1, r: 0, y: 0 };
        
        waterSim.addHex(hex1, 'loam');
        waterSim.addHex(hex2, 'loam');
        
        // Add barrier between them
        const edge = HexUtils.getSharedEdge(hex1, hex2);
        waterSim.addBarrier(hex1, edge);
        
        // Add water to first hex
        waterSim.addWater(hex1, 290);
        
        // Run simulation
        for (let i = 0; i < 10; i++) {
          waterSim.tick(0.1);
        }
        
        // Water should NOT have flowed to hex2
        const sat1 = waterSim.getSaturation(hex1);
        const sat2 = waterSim.getSaturation(hex2);
        
        return { sat1, sat2 };
      });
      
      expect(result.sat1).toBeGreaterThan(0.9); // Still mostly full
      expect(result.sat2).toBe(0); // No water
    });

    test('should block downward drainage with bottom barrier', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        const hex = { q: 0, r: 0, y: 1 }; // Elevated hex
        
        waterSim.addHex(hex, 'loam');
        waterSim.addBarrier(hex, 6); // Bottom barrier
        
        // Add water
        waterSim.addWater(hex, 200);
        const initialSat = waterSim.getSaturation(hex);
        
        // Run simulation (would normally drain down)
        for (let i = 0; i < 10; i++) {
          waterSim.tick(0.1);
        }
        
        // Water should be retained (minus evaporation)
        const finalSat = waterSim.getSaturation(hex);
        
        return { initialSat, finalSat };
      });
      
      expect(result.finalSat).toBeGreaterThan(result.initialSat * 0.95);
    });
  });

  test.describe('Drainage to Desert', () => {
    test('should drain water to adjacent desert', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        const hex = { q: 0, r: 0, y: 0 };
        
        waterSim.addHex(hex, 'loam');
        waterSim.addWater(hex, 200);
        
        const initialSat = waterSim.getSaturation(hex);
        
        // Run simulation - hex is surrounded by desert
        for (let i = 0; i < 20; i++) {
          waterSim.tick(0.1);
        }
        
        // Should have drained significantly
        const finalSat = waterSim.getSaturation(hex);
        
        return { initialSat, finalSat };
      });
      
      expect(result.finalSat).toBeLessThan(result.initialSat * 0.5);
    });

    test('should not drain when fully surrounded by barriers', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        const hex = { q: 0, r: 0, y: 0 };
        
        waterSim.addHex(hex, 'loam');
        
        // Add barriers on all 6 sides + bottom
        for (let edge = 0; edge < 7; edge++) {
          waterSim.addBarrier(hex, edge);
        }
        
        waterSim.addWater(hex, 200);
        const initialSat = waterSim.getSaturation(hex);
        
        // Run simulation
        for (let i = 0; i < 20; i++) {
          waterSim.tick(0.1);
        }
        
        // Should retain most water (only evaporation loss)
        const finalSat = waterSim.getSaturation(hex);
        
        return { initialSat, finalSat };
      });
      
      expect(result.finalSat).toBeGreaterThan(result.initialSat * 0.9);
    });
  });

  test.describe('Evaporation', () => {
    test('should evaporate water over time', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        const hex = { q: 0, r: 0, y: 0 };
        
        waterSim.addHex(hex, 'loam');
        
        // Surround with barriers to prevent drainage
        for (let edge = 0; edge < 7; edge++) {
          waterSim.addBarrier(hex, edge);
        }
        
        waterSim.addWater(hex, 100);
        const initialWater = waterSim.getWaterML(hex);
        
        // Set high temperature for faster evaporation
        waterSim.setTemperature(35); // 35°C
        
        // Run for simulated time
        for (let i = 0; i < 100; i++) {
          waterSim.tick(0.1);
        }
        
        const finalWater = waterSim.getWaterML(hex);
        
        return { initialWater, finalWater };
      });
      
      expect(result.finalWater).toBeLessThan(result.initialWater);
      expect(result.finalWater).toBeGreaterThan(result.initialWater * 0.8); // But not too much
    });
  });

  test.describe('Soil Types', () => {
    test('should have different capacities for different soil types', async ({ page }) => {
      const capacities = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        const coord = { q: 0, r: 0, y: 0 };
        const soilTypes = ['sand', 'loam', 'clay'];
        const capacities: number[] = [];
        
        for (const soilType of soilTypes) {
          waterSim.hexes.clear();
          waterSim.addHex(coord, soilType as any);
          
          // Get the hex to check capacity
          const hexes = waterSim.getAllHexes();
          capacities.push(hexes[0].capacity);
        }
        
        return capacities;
      });
      
      // Sand < Loam < Clay
      expect(capacities[0]).toBeLessThan(capacities[1]); // sand < loam
      expect(capacities[1]).toBeLessThan(capacities[2]); // loam < clay
    });

    test('should flow at different rates based on permeability', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        // Test clay first (low permeability)
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        const clay1 = { q: 0, r: 0, y: 0 };
        const clay2 = { q: 1, r: 0, y: 0 };
        
        waterSim.addHex(clay1, 'clay');
        waterSim.addHex(clay2, 'clay');
        waterSim.addWater(clay1, 100);
        
        // Run simulation
        for (let i = 0; i < 5; i++) {
          waterSim.tick(0.1);
        }
        
        const clayFlow = waterSim.getSaturation(clay2);
        
        // Now test with sand (high permeability)
        waterSim.hexes.clear();
        
        const sand1 = { q: 0, r: 0, y: 0 };
        const sand2 = { q: 1, r: 0, y: 0 };
        
        waterSim.addHex(sand1, 'sand');
        waterSim.addHex(sand2, 'sand');
        waterSim.addWater(sand1, 100);
        
        for (let i = 0; i < 5; i++) {
          waterSim.tick(0.1);
        }
        
        const sandFlow = waterSim.getSaturation(sand2);
        
        return { clayFlow, sandFlow };
      });
      
      // Sand should have transferred more water
      expect(result.sandFlow).toBeGreaterThan(result.clayFlow);
    });
  });

  test.describe('Complex Scenarios', () => {
    test('should handle water flow in multi-level structure', async ({ page }) => {
      const saturations = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        // Create a stepped structure
        const hexes = [
          { q: 0, r: 0, y: 2 }, // Top
          { q: 1, r: 0, y: 1 }, // Middle
          { q: 2, r: 0, y: 0 }, // Bottom
        ];
        
        hexes.forEach(hex => waterSim.addHex(hex, 'loam'));
        
        // Add water at top
        waterSim.addWater(hexes[0], 200);
        
        // Run simulation
        for (let i = 0; i < 20; i++) {
          waterSim.tick(0.1);
        }
        
        // Water should flow downward
        return hexes.map(hex => waterSim.getSaturation(hex));
      });
      
      expect(saturations[0]).toBeLessThan(0.5); // Top lost water
      expect(saturations[2]).toBeGreaterThan(0.3); // Bottom gained water
    });

    test('should handle circular water flow prevention', async ({ page }) => {
      const result = await page.evaluate(() => {
        const gameWindow = window as any;
        const waterSim = gameWindow.game.soilManager.getWaterSimulation();
        const HexUtils = gameWindow.HexUtils;
        
        waterSim.hexes.clear();
        waterSim.barriers.clear();
        
        // Create a ring of hexes
        const center = { q: 0, r: 0, y: 0 };
        const neighbors = HexUtils.getNeighbors(center);
        
        waterSim.addHex(center, 'loam');
        neighbors.forEach((n: any) => waterSim.addHex({ ...n, y: 0 }, 'loam'));
        
        // Add water to center
        waterSim.addWater(center, 290);
        
        // Run simulation
        for (let i = 0; i < 10; i++) {
          waterSim.tick(0.1);
        }
        
        // Water should spread evenly to neighbors
        const neighborSaturations = neighbors.map((n: any) => 
          waterSim.getSaturation({ ...n, y: 0 })
        );
        
        // All neighbors should have similar saturation
        const avgSat = neighborSaturations.reduce((a: number, b: number) => a + b) / neighborSaturations.length;
        
        return { neighborSaturations, avgSat };
      });
      
      // All neighbors should have similar saturation
      result.neighborSaturations.forEach((sat: number) => {
        expect(Math.abs(sat - result.avgSat)).toBeLessThan(0.1);
      });
    });
  });
});