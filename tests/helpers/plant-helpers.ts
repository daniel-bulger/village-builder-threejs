import { Page } from '@playwright/test';

// Constants for plant tests
export const PLANT_TEST_CONSTANTS = {
  HEX_SIZE: 1,
  HEX_HEIGHT: 0.15,
  WATER_AMOUNTS: {
    MINIMAL: 1000,      // 1L - minimum for plant creation
    SMALL: 5000,        // 5L
    BASE: 10000,        // 10L - default per hex
    MEDIUM: 50000,      // 50L
    LARGE: 100000,      // 100L
    EXTRA_LARGE: 150000 // 150L
  },
  SOIL_AREA_SIZES: {
    SMALL: 3,
    MEDIUM: 5,
    LARGE: 6,
    EXTRA_LARGE: 8
  },
  GROWTH_MULTIPLIERS: {
    NORMAL: 1,
    FAST: 10,
    VERY_FAST: 100
  },
  TIME_OF_DAY: {
    MIDNIGHT: 0,
    DAWN: 0.25,
    NOON: 0.5,
    DUSK: 0.75
  }
};

// Helper to inject plant test utilities into the page
export async function injectPlantHelpers(page: Page) {
  await page.evaluate(() => {
    const gameWindow = window as any;
    
    // Helper to create large hexagonal soil areas
    gameWindow.createLargeSoilArea = (game: any, center: any, radius: number = 3) => {
      const waterSim = game.soilManager.getWaterSimulation();
      for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
          const ds = -dq - dr;
          if (Math.abs(ds) <= radius) {
            const coord = { q: center.q + dq, r: center.r + dr, y: center.y };
            game.soilManager.placeSoil(coord);
            waterSim.addWater(coord, 10000); // 10L per hex default
          }
        }
      }
    };
    
    // Helper to plant with retries and position adjustments
    gameWindow.plantWithRetry = (plantSim: any, worldPos: any, plantType: string = 'tomato') => {
      let plantId = null;
      
      // Try original position multiple times
      for (let i = 0; i < 5 && !plantId; i++) {
        plantId = plantSim.plantSeed(plantType, worldPos);
        if (plantId) return plantId;
      }
      
      // Try nearby positions with small offsets
      const offsets = [
        { x: 0.1, z: 0.1 }, { x: -0.1, z: 0.1 }, 
        { x: 0.1, z: -0.1 }, { x: -0.1, z: -0.1 },
        { x: 0.2, z: 0 }, { x: -0.2, z: 0 },
        { x: 0, z: 0.2 }, { x: 0, z: -0.2 }
      ];
      
      for (let j = 0; j < offsets.length; j++) {
        const offset = offsets[j];
        const offsetPos = new gameWindow.THREE.Vector3(
          worldPos.x + offset.x,
          worldPos.y,
          worldPos.z + offset.z
        );
        plantId = plantSim.plantSeed(plantType, offsetPos);
        if (plantId) return plantId;
      }
      
      return null;
    };
    
    // Helper to convert hex coordinates to world position
    gameWindow.hexToWorld = (coord: any) => {
      const HEX_SIZE = 1;
      const HEX_HEIGHT = 0.15;
      // Return position at TOP of hex for planting
      return new gameWindow.THREE.Vector3(
        coord.q * HEX_SIZE * 1.5,
        coord.y * HEX_HEIGHT + HEX_HEIGHT,
        (coord.r + coord.q * 0.5) * HEX_SIZE * Math.sqrt(3)
      );
    };
    
    // Helper to get total water in an area
    gameWindow.getTotalWaterInArea = (waterSim: any, center: any, radius: number) => {
      let total = 0;
      for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
          const ds = -dq - dr;
          if (Math.abs(ds) <= radius) {
            const coord = { q: center.q + dq, r: center.r + dr, y: center.y };
            total += waterSim.getWaterML(coord);
          }
        }
      }
      return total;
    };
    
    // Helper to count hexes in hexagonal area
    gameWindow.countHexesInArea = (radius: number) => {
      let count = 0;
      for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
          const ds = -dq - dr;
          if (Math.abs(ds) <= radius) {
            count++;
          }
        }
      }
      return count;
    };
  });
}

// Helper to setup a standard test environment
export async function setupPlantTest(page: Page, options: {
  disableAnimations?: boolean;
  clearState?: boolean;
} = {}) {
  const { disableAnimations = true, clearState = true } = options;
  
  await page.evaluate(({ disableAnimations, clearState }) => {
    const gameWindow = window as any;
    const game = gameWindow.game;
    
    if (disableAnimations) {
      game.setAnimationsEnabled(false);
    }
    
    if (clearState) {
      const waterSim = game.soilManager.getWaterSimulation();
      const plantSim = game.soilManager.getPlantSimulation();
      
      // Clear water hexes
      waterSim.hexes.clear();
      
      // Clear existing plants
      const existingPlants = plantSim.getAllPlants();
      existingPlants.forEach((p: any) => plantSim.removePlant(p.plant.id));
      
      // Clear soil hexes
      game.soilManager.soilHexes.clear();
    }
  }, { disableAnimations, clearState });
}

// Helper to create a plant in a standard test environment
export async function createTestPlant(page: Page, coord: any, options: {
  soilRadius?: number;
  waterAmount?: number;
  plantType?: string;
} = {}) {
  const {
    soilRadius = PLANT_TEST_CONSTANTS.SOIL_AREA_SIZES.SMALL,
    waterAmount = PLANT_TEST_CONSTANTS.WATER_AMOUNTS.MEDIUM,
    plantType = 'tomato'
  } = options;
  
  return await page.evaluate(({ coord, soilRadius, waterAmount, plantType }) => {
    const gameWindow = window as any;
    const game = gameWindow.game;
    const waterSim = game.soilManager.getWaterSimulation();
    const plantSim = game.soilManager.getPlantSimulation();
    
    // Create soil area
    gameWindow.createLargeSoilArea(game, coord, soilRadius);
    
    // Add extra water to center if specified
    if (waterAmount > 10000) {
      waterSim.addWater(coord, waterAmount - 10000);
    }
    
    // Create plant
    const worldPos = gameWindow.hexToWorld(coord);
    const plantId = gameWindow.plantWithRetry(plantSim, worldPos, plantType);
    
    return {
      plantId,
      plantCreated: !!plantId,
      initialWater: waterSim.getWaterML(coord)
    };
  }, { coord, soilRadius, waterAmount, plantType });
}