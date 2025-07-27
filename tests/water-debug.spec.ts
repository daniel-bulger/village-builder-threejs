import { test, expect } from '@playwright/test';
import { waitForGame } from './helpers';

test.describe('Water Simulation Debug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForGame(page);
  });

  test('debug water capacity and drainage', async ({ page }) => {
    const debug = await page.evaluate(() => {
      const gameWindow = window as any;
      const waterSim = gameWindow.game.soilManager.getWaterSimulation();
      
      // Check if animations are enabled
      const animationsEnabled = gameWindow.game.animationsEnabled;
      
      // Disable animations to prevent drainage during test
      gameWindow.game.setAnimationsEnabled(false);
      
      // Clear any existing hexes
      const hexMap = (waterSim as any).hexes;
      if (hexMap && hexMap.clear) {
        hexMap.clear();
      }
      
      const coord = { q: 10, r: 10, y: 0 }; // Use a coord away from existing soil
      
      // Add a hex
      waterSim.addHex(coord, 'loam');
      
      // Get hex info before adding water
      const hexesBefore = waterSim.getAllHexes();
      const hexBefore = hexesBefore.find((h: any) => h.coord.q === coord.q && h.coord.r === coord.r);
      
      // Add water
      const waterAdded = waterSim.addWater(coord, 200);
      
      // Get immediate saturation
      const immediateSat = waterSim.getSaturation(coord);
      const immediateWaterML = waterSim.getWaterML(coord);
      
      // Run one tick
      waterSim.tick(0.1);
      
      // Get saturation after tick
      const afterTickSat = waterSim.getSaturation(coord);
      const afterTickWaterML = waterSim.getWaterML(coord);
      
      // Check hex properties
      const hexesAfter = waterSim.getAllHexes();
      const hexAfter = hexesAfter.find((h: any) => h.coord.q === coord.q && h.coord.r === coord.r);
      
      return {
        animationsEnabled,
        hexBefore: hexBefore ? {
          capacity: hexBefore.capacity,
          capacityML: hexBefore.capacityML,
          waterML: hexBefore.waterML,
          saturation: hexBefore.saturation,
          soilType: hexBefore.soilType
        } : null,
        waterAdded,
        immediateSat,
        immediateWaterML,
        afterTickSat,
        afterTickWaterML,
        hexAfter: hexAfter ? {
          capacity: hexAfter.capacity,
          capacityML: hexAfter.capacityML,
          waterML: hexAfter.waterML,
          saturation: hexAfter.saturation,
          permeability: hexAfter.permeability
        } : null,
        expectedSat: 200 / 290,
        drainageAmount: immediateWaterML - afterTickWaterML
      };
    });
    
    console.log('Water Debug Info:', JSON.stringify(debug, null, 2));
    
    // Assertions
    expect(debug.waterAdded).toBe(true);
    expect(debug.hexBefore).toBeTruthy();
    expect(debug.hexAfter).toBeTruthy();
    
    // Check capacity
    expect(debug.hexAfter.capacityML).toBe(290);
    
    // Check immediate saturation
    expect(debug.immediateSat).toBeCloseTo(debug.expectedSat, 2);
    
    // Check drainage
    if (debug.drainageAmount > 0) {
      console.log(`Water drained: ${debug.drainageAmount}ML in 0.1s`);
    }
  });

  test('check drainage rate to desert', async ({ page }) => {
    const drainTest = await page.evaluate(() => {
      const gameWindow = window as any;
      const waterSim = gameWindow.game.soilManager.getWaterSimulation();
      
      // Disable animations
      gameWindow.game.setAnimationsEnabled(false);
      
      // Clear hexes
      const hexMap = (waterSim as any).hexes;
      if (hexMap && hexMap.clear) {
        hexMap.clear();
      }
      
      // Add a single hex surrounded by desert
      const coord = { q: 20, r: 20, y: 0 };
      waterSim.addHex(coord, 'loam');
      
      // Add water
      waterSim.addWater(coord, 290); // Full capacity
      
      const startWater = waterSim.getWaterML(coord);
      
      // Enable drainage by enabling animations
      gameWindow.game.setAnimationsEnabled(true);
      
      // Run 10 ticks of 0.1s each = 1 second
      const waterLevels = [startWater];
      for (let i = 0; i < 10; i++) {
        waterSim.tick(0.1);
        waterLevels.push(waterSim.getWaterML(coord));
      }
      
      return {
        startWater,
        waterLevels,
        finalWater: waterLevels[waterLevels.length - 1],
        totalDrained: startWater - waterLevels[waterLevels.length - 1],
        drainRatePerSecond: startWater - waterLevels[waterLevels.length - 1]
      };
    });
    
    console.log('Drainage Test:', JSON.stringify(drainTest, null, 2));
    
    // Water should drain
    expect(drainTest.totalDrained).toBeGreaterThan(0);
  });

  test('check if game update affects water', async ({ page }) => {
    const updateTest = await page.evaluate(() => {
      const gameWindow = window as any;
      const waterSim = gameWindow.game.soilManager.getWaterSimulation();
      
      // Clear and add hex
      const hexMap = (waterSim as any).hexes;
      if (hexMap && hexMap.clear) {
        hexMap.clear();
      }
      
      const coord = { q: 30, r: 30, y: 0 };
      waterSim.addHex(coord, 'loam');
      waterSim.addWater(coord, 200);
      
      const beforeUpdate = waterSim.getSaturation(coord);
      
      // Run a game update
      gameWindow.game.update();
      
      const afterUpdate = waterSim.getSaturation(coord);
      
      return {
        beforeUpdate,
        afterUpdate,
        changed: beforeUpdate !== afterUpdate,
        animationsEnabled: gameWindow.game.animationsEnabled
      };
    });
    
    console.log('Update Test:', updateTest);
  });
});