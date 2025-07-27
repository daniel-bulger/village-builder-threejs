import { describe, it, expect, beforeEach } from 'vitest';
import { WaterSimulation, SoilType } from './WaterSimulation';
import { HexCoord3D } from '../utils/HexUtils';

describe('WaterSimulation', () => {
  let simulation: WaterSimulation;

  beforeEach(() => {
    simulation = new WaterSimulation();
  });

  describe('Basic water operations', () => {
    it('should add water to a hex', () => {
      const hex: HexCoord3D = { q: 0, r: 0, y: 0 };
      simulation.addHex(hex, SoilType.Loam);
      
      const added = simulation.addWater(hex, 0.3);
      expect(added).toBe(true);
      expect(simulation.getSaturation(hex)).toBe(0.3);
    });

    it('should not exceed capacity when adding water', () => {
      const hex: HexCoord3D = { q: 0, r: 0, y: 0 };
      simulation.addHex(hex, SoilType.Loam); // capacity 0.6
      
      // Add water up to capacity
      simulation.addWater(hex, 0.5);
      expect(simulation.getSaturation(hex)).toBe(0.5);
      
      // Try to add more
      simulation.addWater(hex, 0.3);
      expect(simulation.getSaturation(hex)).toBe(0.6); // Should cap at capacity
    });

    it('should return false when hex does not exist', () => {
      const hex: HexCoord3D = { q: 0, r: 0, y: 0 };
      const added = simulation.addWater(hex, 0.3);
      expect(added).toBe(false);
    });
  });

  describe('Water flow between hexes', () => {
    it('should flow water to adjacent hex', () => {
      const hex1: HexCoord3D = { q: 0, r: 0, y: 0 };
      const hex2: HexCoord3D = { q: 1, r: 0, y: 0 }; // Adjacent
      
      simulation.addHex(hex1, SoilType.Loam);
      simulation.addHex(hex2, SoilType.Loam);
      simulation.addWater(hex1, 0.5);
      
      // Simulate a few ticks
      for (let i = 0; i < 10; i++) {
        simulation.tick(0.1);
      }
      
      // Water should have spread
      expect(simulation.getSaturation(hex1)).toBeLessThan(0.5);
      expect(simulation.getSaturation(hex2)).toBeGreaterThan(0);
    });

    it('should flow water downward with gravity assist', () => {
      // Simple test: just a vertical column to show gravity works
      const top: HexCoord3D = { q: 0, r: 0, y: 2 };
      const middle: HexCoord3D = { q: 0, r: 0, y: 1 };
      const bottom: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      simulation.addHex(top, SoilType.Loam);
      simulation.addHex(middle, SoilType.Loam);
      simulation.addHex(bottom, SoilType.Loam);
      
      // Add complete barrier containment to prevent any drainage
      // Surround bottom with neighbors and barriers
      const neighbors = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
      ];
      
      // Add neighbors at all levels
      for (const n of neighbors) {
        simulation.addHex({ ...n, y: 0 }, SoilType.Loam);
        simulation.addHex({ ...n, y: 1 }, SoilType.Loam);
        simulation.addHex({ ...n, y: 2 }, SoilType.Loam);
        
        // Add barriers to prevent any horizontal flow
        simulation.addEdgeBarrier(bottom, { ...n, y: 0 });
        simulation.addEdgeBarrier(middle, { ...n, y: 1 });
        simulation.addEdgeBarrier(top, { ...n, y: 2 });
      }
      
      // Add bottom barrier
      simulation.addEdgeBarrier(bottom, { q: 0, r: 0, y: -1 });
      
      // Add water to top
      simulation.addWater(top, 0.5);
      
      // Simulate for 1 second (60 ticks)
      for (let i = 0; i < 60; i++) {
        simulation.tick(1/60);
      }
      
      const topWater = simulation.getSaturation(top);
      const middleWater = simulation.getSaturation(middle); 
      const bottomWater = simulation.getSaturation(bottom);
      const totalWater = topWater + middleWater + bottomWater;
      
      console.log(`Gravity test - Top: ${topWater.toFixed(3)}, Middle: ${middleWater.toFixed(3)}, Bottom: ${bottomWater.toFixed(3)}, Total: ${totalWater.toFixed(3)}`);
      
      // Water distributes through the column with slight preference for lower levels
      // The distribution shows capillary action counteracts some gravity
      expect(bottomWater).toBeGreaterThan(0.15); // Bottom gets substantial water
      expect(totalWater).toBeGreaterThan(0.495); // Only minor evaporation loss
    });
  });

  describe('Edge barriers', () => {
    it('should block water flow between hexes with shared edge barrier', () => {
      const hex1: HexCoord3D = { q: 0, r: 0, y: 0 };
      const hex2: HexCoord3D = { q: 1, r: 0, y: 0 }; // East neighbor
      
      simulation.addHex(hex1, SoilType.Loam);
      simulation.addHex(hex2, SoilType.Loam);
      
      // Add all neighbors to hex1 and hex2 to create controlled environment
      const allNeighbors = [
        { q: 1, r: -1, y: 0 },   // Southeast  
        { q: 0, r: -1, y: 0 },   // Southwest
        { q: -1, r: 0, y: 0 },   // West
        { q: -1, r: 1, y: 0 },   // Northwest
        { q: 0, r: 1, y: 0 },    // Northeast
        { q: 2, r: 0, y: 0 },    // hex2's east neighbor
        { q: 2, r: -1, y: 0 },   // hex2's southeast neighbor
        { q: 1, r: 1, y: 0 }     // hex2's northeast neighbor
      ];
      for (const n of allNeighbors) {
        simulation.addHex(n, SoilType.Loam);
      }
      
      // Add barriers around hex1 except to hex2
      for (const n of [
        { q: 1, r: -1, y: 0 },   // Southeast  
        { q: 0, r: -1, y: 0 },   // Southwest
        { q: -1, r: 0, y: 0 },   // West
        { q: -1, r: 1, y: 0 },   // Northwest
        { q: 0, r: 1, y: 0 }     // Northeast
      ]) {
        simulation.addEdgeBarrier(hex1, n);
      }
      
      // Add barrier between hex1 and hex2
      simulation.addEdgeBarrier(hex1, hex2);
      
      // Add bottom barrier to prevent drainage to desert
      const below: HexCoord3D = { q: 0, r: 0, y: -1 };
      simulation.addEdgeBarrier(hex1, below);
      
      // Verify barriers were added
      console.log('Barriers added:', simulation.getAllEdgeBarriers());
      
      // Add water to hex1
      simulation.addWater(hex1, 0.5);
      
      // Debug water levels during simulation
      let waterLevels = [];
      for (let i = 0; i < 20; i++) {
        simulation.tick(0.1);
        if (i % 5 === 0) {
          waterLevels.push({
            tick: i,
            hex1: simulation.getSaturation(hex1),
            hex2: simulation.getSaturation(hex2)
          });
        }
      }
      
      console.log('Water levels over time:', waterLevels);
      console.log('All hexes:', simulation.getAllHexes().map(h => ({
        coord: h.coord,
        saturation: h.saturation
      })));
      
      // Water should not flow to hex2
      expect(simulation.getSaturation(hex1)).toBeGreaterThan(0.4); // Some loss to evaporation
      expect(simulation.getSaturation(hex2)).toBe(0);
    });

    it('should block vertical water flow with horizontal barriers', () => {
      const top: HexCoord3D = { q: 0, r: 0, y: 1 };
      const bottom: HexCoord3D = { q: 0, r: 0, y: 0 };
      
      simulation.addHex(top, SoilType.Loam);
      simulation.addHex(bottom, SoilType.Loam);
      
      // Add all neighbors to prevent horizontal drainage
      const neighbors = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
      ];
      
      // Add neighbors at both levels with barriers
      for (const n of neighbors) {
        simulation.addHex({ ...n, y: 0 }, SoilType.Loam);
        simulation.addHex({ ...n, y: 1 }, SoilType.Loam);
        simulation.addEdgeBarrier(top, { ...n, y: 1 });
        simulation.addEdgeBarrier(bottom, { ...n, y: 0 });
      }
      
      // Add barrier between top and bottom (same q,r but different y)
      simulation.addEdgeBarrier(top, bottom);
      
      // Add bottom barrier to prevent drainage to desert
      simulation.addEdgeBarrier(bottom, { q: 0, r: 0, y: -1 });
      
      // Add water to top
      simulation.addWater(top, 0.5);
      
      // Simulate many ticks
      for (let i = 0; i < 20; i++) {
        simulation.tick(0.1);
      }
      
      // Water should not flow down
      expect(simulation.getSaturation(top)).toBeGreaterThan(0.4);
      expect(simulation.getSaturation(bottom)).toBe(0);
    });

    it('should retain water when surrounded by barriers (no upward drainage to air)', () => {
      const center: HexCoord3D = { q: 0, r: 0, y: 0 };
      simulation.addHex(center, SoilType.Loam);
      
      // Add all 6 neighboring hexes (they need to exist to prevent desert drainage)
      const neighbors = [
        { q: 1, r: 0, y: 0 },    // East
        { q: 1, r: -1, y: 0 },   // Southeast  
        { q: 0, r: -1, y: 0 },   // Southwest
        { q: -1, r: 0, y: 0 },   // West
        { q: -1, r: 1, y: 0 },   // Northwest
        { q: 0, r: 1, y: 0 }     // Northeast
      ];
      
      // Add the neighbor hexes AND barriers to all sides
      for (const neighbor of neighbors) {
        simulation.addHex(neighbor, SoilType.Loam);
        simulation.addEdgeBarrier(center, neighbor);
      }
      
      // Add bottom barrier
      const below: HexCoord3D = { q: 0, r: 0, y: -1 };
      simulation.addEdgeBarrier(center, below);
      
      // Add water
      simulation.addWater(center, 0.5);
      const initialWater = simulation.getSaturation(center);
      
      // Simulate 3 seconds worth of ticks
      for (let i = 0; i < 180; i++) {
        simulation.tick(1/60);
      }
      
      const finalWater = simulation.getSaturation(center);
      console.log(`Water retention test: ${initialWater} -> ${finalWater}`);
      
      // Water should be retained with only minor evaporation loss
      // (no drainage upward to air)
      expect(finalWater).toBeGreaterThan(initialWater * 0.9); // Less than 10% loss from evaporation
    });

    it('should only drain water horizontally when oversaturated', () => {
      // Create a platform with bottom barrier to prevent downward drainage
      const platform: HexCoord3D = { q: 10, r: 10, y: 1 };
      
      simulation.addHex(platform, SoilType.Loam); // capacity 0.6
      
      // Add bottom barrier to isolate horizontal drainage behavior
      simulation.addEdgeBarrier(platform, { q: 10, r: 10, y: 0 });
      
      // Add water to elevated platform but not oversaturated
      simulation.addWater(platform, 0.5);
      const initialWater = simulation.getSaturation(platform);
      
      // Simulate many ticks
      for (let i = 0; i < 180; i++) {
        simulation.tick(1/60);
      }
      
      const finalWater = simulation.getSaturation(platform);
      
      console.log(`Not oversaturated test - Initial platform: ${initialWater}, Final platform: ${finalWater}`);
      
      // Water should NOT drain horizontally since it's not oversaturated
      // Only minor evaporation loss
      expect(finalWater).toBeGreaterThan(0.495); // Almost all water retained
    });

    it('should allow oversaturated water to drain without barriers', () => {
      const center: HexCoord3D = { q: 5, r: 5, y: 0 };
      simulation.addHex(center, SoilType.Loam); // capacity 0.6
      
      // Add water beyond capacity to test oversaturation drainage
      simulation.addWater(center, 0.6); // Fill to capacity
      // Force add more water to oversaturate
      const hex = simulation['hexes'].get('5,5,0');
      if (hex) hex.saturation = 0.8; // Oversaturate
      
      const initialWater = simulation.getSaturation(center);
      
      // Simulate many ticks (3 seconds worth at 60fps)
      for (let i = 0; i < 180; i++) {
        simulation.tick(1/60);
      }
      
      const finalWater = simulation.getSaturation(center);
      
      // Oversaturated water should drain, but stop at capacity
      expect(finalWater).toBeLessThanOrEqual(0.6); // Should drain to capacity or below
      expect(finalWater).toBeLessThan(initialWater); // Some drainage occurred
    });

    it('should allow removal of barriers', () => {
      const hex1: HexCoord3D = { q: 0, r: 0, y: 0 };
      const hex2: HexCoord3D = { q: 1, r: 0, y: 0 };
      
      simulation.addHex(hex1, SoilType.Loam);
      simulation.addHex(hex2, SoilType.Loam);
      
      // Add and then remove barrier
      simulation.addEdgeBarrier(hex1, hex2);
      simulation.removeEdgeBarrier(hex1, hex2);
      
      // Add water to hex1
      simulation.addWater(hex1, 0.5);
      
      // Simulate ticks
      for (let i = 0; i < 10; i++) {
        simulation.tick(0.1);
      }
      
      // Water should flow normally
      expect(simulation.getSaturation(hex2)).toBeGreaterThan(0);
    });

    it('should NOT drain water upward to empty air', () => {
      // This is the specific fix - water should not drain upward
      const soil: HexCoord3D = { q: 0, r: 0, y: 0 };
      simulation.addHex(soil, SoilType.Loam);
      
      // Add barriers on all sides and bottom
      const neighbors = [
        { q: 1, r: 0, y: 0 },    // East
        { q: 1, r: -1, y: 0 },   // Southeast  
        { q: 0, r: -1, y: 0 },   // Southwest
        { q: -1, r: 0, y: 0 },   // West
        { q: -1, r: 1, y: 0 },   // Northwest
        { q: 0, r: 1, y: 0 }     // Northeast
      ];
      
      for (const n of neighbors) {
        simulation.addHex(n, SoilType.Loam);
        simulation.addEdgeBarrier(soil, n);
      }
      
      // Bottom barrier
      simulation.addEdgeBarrier(soil, { q: 0, r: 0, y: -1 });
      
      // Top is open - no hex above, no barrier
      
      // Add water
      simulation.addWater(soil, 0.5);
      
      // Simulate 1 second
      for (let i = 0; i < 60; i++) {
        simulation.tick(1/60);
      }
      
      // Water should be retained (only minor evaporation loss)
      const finalWater = simulation.getSaturation(soil);
      expect(finalWater).toBeGreaterThan(0.495); // Less than 1% loss from evaporation in 1 second
    });

    it('should retain water in 2-tall stack with barriers on second layer', () => {
      // Test 2-tall stack where second layer has barriers
      const bottom: HexCoord3D = { q: 0, r: 0, y: 0 };
      const top: HexCoord3D = { q: 0, r: 0, y: 1 };
      
      simulation.addHex(bottom, SoilType.Loam);
      simulation.addHex(top, SoilType.Loam);
      
      // Add all neighbors at both levels
      const neighbors = [
        { q: 1, r: 0 },    // East
        { q: 1, r: -1 },   // Southeast  
        { q: 0, r: -1 },   // Southwest
        { q: -1, r: 0 },   // West
        { q: -1, r: 1 },   // Northwest
        { q: 0, r: 1 }     // Northeast
      ];
      
      // Add neighbors and barriers at bottom level
      for (const n of neighbors) {
        const bottomNeighbor = { ...n, y: 0 };
        simulation.addHex(bottomNeighbor, SoilType.Loam);
        simulation.addEdgeBarrier(bottom, bottomNeighbor);
      }
      
      // Add neighbors and barriers at top level
      for (const n of neighbors) {
        const topNeighbor = { ...n, y: 1 };
        simulation.addHex(topNeighbor, SoilType.Loam);
        simulation.addEdgeBarrier(top, topNeighbor);
      }
      
      // Bottom barrier
      simulation.addEdgeBarrier(bottom, { q: 0, r: 0, y: -1 });
      
      // Add water to TOP hex (y=1)
      simulation.addWater(top, 0.5);
      const initialWater = simulation.getSaturation(top);
      
      // Simulate 3 seconds
      for (let i = 0; i < 180; i++) {
        simulation.tick(1/60);
      }
      
      const topWater = simulation.getSaturation(top);
      const bottomWater = simulation.getSaturation(bottom);
      
      console.log(`2-tall stack water: Initial top: ${initialWater}, Final top: ${topWater}, Bottom: ${bottomWater}`);
      
      // Water should distribute between the two hexes but not drain away
      const totalWater = topWater + bottomWater;
      expect(totalWater).toBeGreaterThan(0.49); // Only minor evaporation loss
    });

    it('should drain oversaturated water horizontally at y=1', () => {
      // Test that shows oversaturated water drains horizontally at y=1
      const bottom: HexCoord3D = { q: 5, r: 5, y: 0 };
      const top: HexCoord3D = { q: 5, r: 5, y: 1 };
      
      simulation.addHex(bottom, SoilType.Loam);
      simulation.addHex(top, SoilType.Loam); // capacity 0.6
      
      // Only add side barriers to bottom hex (no neighbors at top level)
      const neighbors = [
        { q: 6, r: 5 },    // East
        { q: 6, r: 4 },    // Southeast  
        { q: 5, r: 4 },    // Southwest
        { q: 4, r: 5 },    // West
        { q: 4, r: 6 },    // Northwest
        { q: 5, r: 6 }     // Northeast
      ];
      
      // Add neighbors and barriers only at bottom
      for (const n of neighbors) {
        const bottomNeighbor = { ...n, y: 0 };
        simulation.addHex(bottomNeighbor, SoilType.Loam);
        simulation.addEdgeBarrier(bottom, bottomNeighbor);
      }
      
      // Bottom barrier
      simulation.addEdgeBarrier(bottom, { q: 5, r: 5, y: -1 });
      
      // Oversaturate the TOP hex
      simulation.addWater(top, 0.6);
      const topHex = simulation['hexes'].get('5,5,1');
      if (topHex) topHex.saturation = 0.8; // Oversaturate
      const initialWater = simulation.getSaturation(top);
      
      // Simulate just 1 second
      for (let i = 0; i < 60; i++) {
        simulation.tick(1/60);
        if (i === 10) {
          const earlyWater = simulation.getSaturation(top);
          console.log(`After 10 ticks: ${earlyWater} (from ${initialWater})`);
        }
      }
      
      const finalTopWater = simulation.getSaturation(top);
      const finalBottomWater = simulation.getSaturation(bottom);
      
      console.log(`Oversaturated 2-tall: Initial: ${initialWater}, Final top: ${finalTopWater}, Bottom: ${finalBottomWater}`);
      
      // Oversaturated water should drain excess horizontally and some downward
      // Combined with vertical flow, top hex will lose significant water
      expect(finalTopWater).toBeLessThan(0.6); // Below capacity
      expect(finalBottomWater).toBeGreaterThan(0.2); // Bottom received water
    });

    it('should NOT drain water horizontally when not oversaturated', () => {
      // Test that water doesn't drain horizontally when not oversaturated
      // Add barriers to prevent any drainage except horizontal
      const soil: HexCoord3D = { q: 10, r: 10, y: 0 };
      
      simulation.addHex(soil, SoilType.Loam);
      
      // Add bottom barrier to prevent downward drainage
      simulation.addEdgeBarrier(soil, { q: 10, r: 10, y: -1 });
      
      // Add water but not oversaturated
      simulation.addWater(soil, 0.5); // Below capacity of 0.6
      
      // Simulate 1 second
      for (let i = 0; i < 60; i++) {
        simulation.tick(1/60);
      }
      
      const finalWater = simulation.getSaturation(soil);
      console.log(`Ground level hex with bottom barrier: Started with 0.5, ended with ${finalWater}`);
      
      // Water should be retained (only minor evaporation)
      expect(finalWater).toBeGreaterThan(0.495); // Almost all water retained
    });
    
    it('should drain water downward at ground level into desert', () => {
      // Test that water drains downward from y=0 into desert below
      const soil: HexCoord3D = { q: 20, r: 20, y: 0 };
      
      simulation.addHex(soil, SoilType.Loam);
      
      // Add water (not oversaturated)
      simulation.addWater(soil, 0.5);
      
      // Simulate
      for (let i = 0; i < 180; i++) {
        simulation.tick(1/60);
      }
      
      const finalWater = simulation.getSaturation(soil);
      console.log(`Ground level drainage to desert: Started with 0.5, ended with ${finalWater}`);
      
      // Water should drain downward into desert
      expect(finalWater).toBeLessThan(0.3); // Significant drainage
    });
    
    it('should always drain water downward due to gravity', () => {
      // Test that water drains downward even when not oversaturated
      const top: HexCoord3D = { q: 15, r: 15, y: 1 };
      const bottom: HexCoord3D = { q: 15, r: 15, y: 0 };
      
      simulation.addHex(bottom, SoilType.Loam);
      simulation.addHex(top, SoilType.Loam);
      
      // Add water to top (not oversaturated)
      simulation.addWater(top, 0.5);
      
      // Simulate
      for (let i = 0; i < 60; i++) {
        simulation.tick(1/60);
      }
      
      const topWater = simulation.getSaturation(top);
      const bottomWater = simulation.getSaturation(bottom);
      
      console.log(`Gravity drainage: Top: ${topWater}, Bottom: ${bottomWater}`);
      
      // Water should flow down due to gravity
      expect(topWater).toBeLessThan(0.5);
      expect(bottomWater).toBeGreaterThan(0);
    });
    
    it('should drain oversaturated water horizontally', () => {
      // Test simple oversaturation drainage
      const hex: HexCoord3D = { q: 0, r: 0, y: 1 };
      
      simulation.addHex(hex, SoilType.Loam); // capacity 0.6
      
      // Add bottom barrier to prevent downward drainage
      simulation.addEdgeBarrier(hex, { q: 0, r: 0, y: 0 });
      
      // Oversaturate the hex
      simulation.addWater(hex, 0.6);
      const hexObj = simulation['hexes'].get('0,0,1');
      if (hexObj) hexObj.saturation = 1.0; // Way oversaturated
      const initialWater = simulation.getSaturation(hex);
      
      // Simulate for 2 seconds
      for (let i = 0; i < 120; i++) {
        simulation.tick(1/60);
      }
      
      const finalWater = simulation.getSaturation(hex);
      
      console.log(`Oversaturated drainage - Initial: ${initialWater}, Final: ${finalWater}`);
      
      // Oversaturated water should drain to around capacity
      expect(finalWater).toBeLessThanOrEqual(0.65); // Should be close to capacity
      expect(finalWater).toBeGreaterThan(0.55); // But not too much below
    });
  });

  describe('Evaporation', () => {
    it('should only evaporate from top layer', () => {
      const bottom: HexCoord3D = { q: 0, r: 0, y: 0 };
      const top: HexCoord3D = { q: 0, r: 0, y: 1 };
      
      simulation.addHex(bottom, SoilType.Loam);
      simulation.addHex(top, SoilType.Loam);
      
      // Add water to both
      simulation.addWater(bottom, 0.5);
      simulation.addWater(top, 0.5);
      
      // Block all flow by adding barriers everywhere
      const neighbors = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
      ];
      
      for (const n of neighbors) {
        simulation.addEdgeBarrier(bottom, { ...n, y: 0 });
        simulation.addEdgeBarrier(top, { ...n, y: 1 });
      }
      
      // Block vertical flow
      simulation.addEdgeBarrier(bottom, top);
      simulation.addEdgeBarrier(bottom, { q: 0, r: 0, y: -1 });
      simulation.addEdgeBarrier(top, { q: 0, r: 0, y: 2 });
      
      // Simulate evaporation
      for (let i = 0; i < 100; i++) {
        simulation.tick(0.1);
      }
      
      // Top should lose water to evaporation, bottom should not
      expect(simulation.getSaturation(top)).toBeLessThan(0.5);
      expect(simulation.getSaturation(bottom)).toBe(0.5); // No evaporation
    });
  });

  describe('Soil types', () => {
    it('should not hold water in desert soil', () => {
      const hex: HexCoord3D = { q: 0, r: 0, y: 0 };
      simulation.addHex(hex, SoilType.Desert);
      
      const added = simulation.addWater(hex, 0.5);
      expect(added).toBe(false); // Desert has 0 capacity
      expect(simulation.getSaturation(hex)).toBe(0);
    });

    it('should flow faster through high permeability soil', () => {
      const clay1: HexCoord3D = { q: 0, r: 0, y: 0 };
      const clay2: HexCoord3D = { q: 1, r: 0, y: 0 };
      const loam1: HexCoord3D = { q: 0, r: 2, y: 0 };
      const loam2: HexCoord3D = { q: 1, r: 2, y: 0 };
      
      // Clay has low permeability (0.2), loam has medium (0.5)
      simulation.addHex(clay1, SoilType.Clay);
      simulation.addHex(clay2, SoilType.Clay);
      simulation.addHex(loam1, SoilType.Loam);
      simulation.addHex(loam2, SoilType.Loam);
      
      // Add same amount of water
      simulation.addWater(clay1, 0.5);
      simulation.addWater(loam1, 0.5);
      
      // Simulate a few ticks
      for (let i = 0; i < 5; i++) {
        simulation.tick(0.1);
      }
      
      // Loam should spread water faster
      expect(simulation.getSaturation(loam2)).toBeGreaterThan(simulation.getSaturation(clay2));
    });
  });
});