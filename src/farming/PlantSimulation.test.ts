import { describe, it, expect, beforeEach } from 'vitest';
import { PlantSimulation } from './PlantSimulation';
import { WaterSimulation, SoilType } from './WaterSimulation';
import { HexCoord3D } from '../utils/HexUtils';

describe('PlantSimulation', () => {
  let waterSim: WaterSimulation;
  let plantSim: PlantSimulation;
  
  beforeEach(() => {
    waterSim = new WaterSimulation();
    plantSim = new PlantSimulation(waterSim);
  });
  
  describe('Basic planting', () => {
    it('should plant a seed on soil', () => {
      const position: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      // Add soil hex
      waterSim.addHex(position, SoilType.Loam);
      
      // Plant tomato
      const plantId = plantSim.plantSeed('tomato', position);
      
      expect(plantId).toBeTruthy();
      expect(plantId).toMatch(/^plant_\d+$/);
    });
    
    it('should not plant without soil', () => {
      const position: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      // Try to plant without soil
      const plantId = plantSim.plantSeed('tomato', position);
      
      expect(plantId).toBeNull();
    });
    
    it('should not plant in occupied space', () => {
      const position: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      // Add soil
      waterSim.addHex(position, SoilType.Loam);
      
      // Plant first tomato
      const plant1 = plantSim.plantSeed('tomato', position);
      expect(plant1).toBeTruthy();
      
      // Try to plant second tomato in same spot
      const plant2 = plantSim.plantSeed('tomato', position);
      expect(plant2).toBeNull();
    });
  });
  
  describe('Plant growth', () => {
    it('should advance growth stage when conditions are met', () => {
      const position: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      // Create a contained test environment with barriers on all sides
      // Add soil layers
      waterSim.addHex(position, SoilType.Loam);
      
      // Also add soil below for roots (wheat roots go to y=-1)
      const rootPos = { ...position, y: -1 };
      waterSim.addHex(rootPos, SoilType.Loam);
      
      // Add soil above for wheat to grow into (stage 1 needs y=1 and y=2)
      waterSim.addHex({ ...position, y: 1 }, SoilType.Loam);
      waterSim.addHex({ ...position, y: 2 }, SoilType.Loam);
      
      // Add barriers to prevent all water drainage
      // Bottom barrier
      waterSim.addEdgeBarrier(rootPos, { ...rootPos, y: -2 });
      
      // Side barriers at root level to prevent horizontal drainage
      const neighbors = [
        { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
        { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }
      ];
      for (const neighbor of neighbors) {
        const neighborPos = { ...neighbor, y: -1 };
        waterSim.addEdgeBarrier(rootPos, neighborPos);
      }
      
      // Now add water after all barriers are in place
      waterSim.addWater(position, 0.6); // Full capacity at plant level
      waterSim.addWater(rootPos, 0.6); // Full capacity at root level
      
      // Run one water simulation tick to let things settle
      waterSim.tick(0.016); // 1 frame at 60fps
      
      // Verify water is there
      const waterLevel = waterSim.getSaturation(rootPos);
      expect(waterLevel).toBeGreaterThan(0.4); // Should retain most water
      
      // Plant wheat (simpler growth pattern)
      const plantId = plantSim.plantSeed('wheat', position);
      expect(plantId).toBeTruthy();
      
      // Speed up time for testing (but not too much to avoid water starvation)
      plantSim.setTimeScale(10);
      
      // Get initial plant state
      let plants = plantSim.getAllPlants();
      expect(plants).toHaveLength(1);
      expect(plants[0].plant.currentStage).toBe(0);
      
      // Simulate growth (wheat stage 0 duration is 180 seconds)
      // With 10x speed, need 18 seconds of simulation
      for (let i = 0; i < 1100; i++) {
        // Run water simulation too to maintain water levels
        waterSim.tick(1/60);
        plantSim.tick(1/60); // 60 FPS
        
        // Refill water periodically to compensate for 100x consumption
        if (i % 10 === 0) {
          const currentWater = waterSim.getSaturation(rootPos);
          if (currentWater < 0.5) {
            waterSim.addWater(rootPos, 0.6 - currentWater);
          }
        }
      }
      
      // Check plant state
      plants = plantSim.getAllPlants();
      
      // Check if advanced to next stage
      expect(plants[0].plant.currentStage).toBe(1);
    });
    
    it('should consume water from soil', () => {
      const position: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      // Add soil with water
      waterSim.addHex(position, SoilType.Loam);
      waterSim.addWater(position, 0.5);
      
      // Add root soil
      waterSim.addHex({ ...position, y: -1 }, SoilType.Loam);
      waterSim.addWater({ ...position, y: -1 }, 0.5);
      
      const initialWater = waterSim.getSaturation({ ...position, y: -1 });
      
      // Plant
      plantSim.plantSeed('tomato', position);
      
      // Simulate for a while
      for (let i = 0; i < 60; i++) {
        plantSim.tick(1/60);
      }
      
      const finalWater = waterSim.getSaturation({ ...position, y: -1 });
      
      // Water should be consumed
      expect(finalWater).toBeLessThan(initialWater);
    });
  });
  
  describe('Harvesting', () => {
    it('should harvest mature plants', () => {
      const position: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      // Setup soil
      waterSim.addHex(position, SoilType.Loam);
      
      // Plant and get ID
      const plantId = plantSim.plantSeed('wheat', position);
      if (!plantId) throw new Error('Failed to plant');
      
      // Force plant to mature stage
      const plants = plantSim.getAllPlants();
      plants[0].plant.currentStage = 1; // Wheat has 2 stages (0, 1)
      
      // Harvest
      const harvestYield = plantSim.harvestPlant(plantId);
      
      expect(harvestYield).toBe(5); // Wheat yields 5
    });
    
    it('should not harvest immature plants', () => {
      const position: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      // Setup and plant
      waterSim.addHex(position, SoilType.Loam);
      const plantId = plantSim.plantSeed('wheat', position);
      if (!plantId) throw new Error('Failed to plant');
      
      // Try to harvest immature plant
      const harvestYield = plantSim.harvestPlant(plantId);
      
      expect(harvestYield).toBe(0);
    });
  });
});