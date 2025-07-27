import { describe, expect, test, beforeEach } from '@jest/globals';
import { NutrientSystem, CROP_NUTRIENT_NEEDS, DEPLETION_PER_STAGE } from '../src/farming/NutrientSystem';
import { HexCoord3D } from '../src/utils/HexUtils';

describe('NutrientSystem', () => {
  let nutrientSystem: NutrientSystem;
  const testHex: HexCoord3D = { q: 0, r: 0, y: 0 };
  
  beforeEach(() => {
    nutrientSystem = new NutrientSystem();
  });
  
  describe('Basic Operations', () => {
    test('should add hex with default nutrients', () => {
      nutrientSystem.addHex(testHex);
      const nutrients = nutrientSystem.getNutrients(testHex);
      
      expect(nutrients).toBeDefined();
      expect(nutrients!.nitrogen).toBe(0.5);
      expect(nutrients!.phosphorus).toBe(0.5);
      expect(nutrients!.potassium).toBe(0.5);
    });
    
    test('should add hex with custom nutrients', () => {
      nutrientSystem.addHex(testHex, { nitrogen: 0.8, phosphorus: 0.3, potassium: 0.6 });
      const nutrients = nutrientSystem.getNutrients(testHex);
      
      expect(nutrients!.nitrogen).toBe(0.8);
      expect(nutrients!.phosphorus).toBe(0.3);
      expect(nutrients!.potassium).toBe(0.6);
    });
    
    test('should remove hex', () => {
      nutrientSystem.addHex(testHex);
      nutrientSystem.removeHex(testHex);
      const nutrients = nutrientSystem.getNutrients(testHex);
      
      expect(nutrients).toBeNull();
    });
    
    test('should not add duplicate hex', () => {
      nutrientSystem.addHex(testHex, { nitrogen: 0.5, phosphorus: 0.5, potassium: 0.5 });
      nutrientSystem.addHex(testHex, { nitrogen: 0.8, phosphorus: 0.8, potassium: 0.8 });
      
      const nutrients = nutrientSystem.getNutrients(testHex);
      expect(nutrients!.nitrogen).toBe(0.5); // Should keep original values
    });
  });
  
  describe('Nutrient Consumption', () => {
    beforeEach(() => {
      nutrientSystem.addHex(testHex);
    });
    
    test('should deplete nutrients for tomato growth', () => {
      const initialNutrients = nutrientSystem.getNutrients(testHex)!;
      
      // Simulate tomato growing from stage 0 to 1
      nutrientSystem.depleteNutrients(testHex, 'tomato', 0);
      
      const afterNutrients = nutrientSystem.getNutrients(testHex)!;
      const tomatoNeeds = CROP_NUTRIENT_NEEDS['tomato'];
      
      // Check depletion matches expected (1/3 of total needs per stage)
      expect(afterNutrients.nitrogen).toBeCloseTo(
        initialNutrients.nitrogen - (tomatoNeeds.nitrogen * DEPLETION_PER_STAGE)
      );
      expect(afterNutrients.phosphorus).toBeCloseTo(
        initialNutrients.phosphorus - (tomatoNeeds.phosphorus * DEPLETION_PER_STAGE)
      );
      expect(afterNutrients.potassium).toBeCloseTo(
        initialNutrients.potassium - (tomatoNeeds.potassium * DEPLETION_PER_STAGE)
      );
    });
    
    test('should deplete nutrients for corn (heavy nitrogen feeder)', () => {
      nutrientSystem.depleteNutrients(testHex, 'corn', 0);
      
      const nutrients = nutrientSystem.getNutrients(testHex)!;
      const cornNeeds = CROP_NUTRIENT_NEEDS['corn'];
      
      // Corn should deplete more nitrogen than P or K
      expect(nutrients.nitrogen).toBeCloseTo(0.5 - (cornNeeds.nitrogen * DEPLETION_PER_STAGE));
      expect(nutrients.phosphorus).toBeCloseTo(0.5 - (cornNeeds.phosphorus * DEPLETION_PER_STAGE));
      expect(nutrients.potassium).toBeCloseTo(0.5 - (cornNeeds.potassium * DEPLETION_PER_STAGE));
      
      // Verify corn uses more N than P or K
      expect(cornNeeds.nitrogen).toBeGreaterThan(cornNeeds.phosphorus);
      expect(cornNeeds.nitrogen).toBeGreaterThan(cornNeeds.potassium);
    });
    
    test('should not deplete below zero', () => {
      // Set very low nutrients
      nutrientSystem.addHex(testHex, { nitrogen: 0.1, phosphorus: 0.1, potassium: 0.1 });
      
      // Deplete multiple times
      nutrientSystem.depleteNutrients(testHex, 'corn', 0);
      nutrientSystem.depleteNutrients(testHex, 'corn', 1);
      nutrientSystem.depleteNutrients(testHex, 'corn', 2);
      
      const nutrients = nutrientSystem.getNutrients(testHex)!;
      expect(nutrients.nitrogen).toBeGreaterThanOrEqual(0);
      expect(nutrients.phosphorus).toBeGreaterThanOrEqual(0);
      expect(nutrients.potassium).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Nitrogen Fixation', () => {
    beforeEach(() => {
      nutrientSystem.addHex(testHex);
    });
    
    test('should add nitrogen when beans grow', () => {
      const initialNutrients = nutrientSystem.getNutrients(testHex)!;
      
      // Beans have negative nitrogen requirement
      nutrientSystem.depleteNutrients(testHex, 'beans', 0);
      
      const afterNutrients = nutrientSystem.getNutrients(testHex)!;
      const beanNeeds = CROP_NUTRIENT_NEEDS['beans'];
      
      // Nitrogen should increase (negative depletion)
      expect(afterNutrients.nitrogen).toBeGreaterThan(initialNutrients.nitrogen);
      expect(afterNutrients.nitrogen).toBeCloseTo(
        initialNutrients.nitrogen - (beanNeeds.nitrogen * DEPLETION_PER_STAGE)
      );
      
      // P and K should still be depleted normally
      expect(afterNutrients.phosphorus).toBeLessThan(initialNutrients.phosphorus);
      expect(afterNutrients.potassium).toBeLessThan(initialNutrients.potassium);
    });
    
    test('should not exceed 100% nitrogen when fixing', () => {
      // Start with high nitrogen
      nutrientSystem.addHex(testHex, { nitrogen: 0.9, phosphorus: 0.5, potassium: 0.5 });
      
      // Grow beans multiple times
      nutrientSystem.depleteNutrients(testHex, 'beans', 0);
      nutrientSystem.depleteNutrients(testHex, 'beans', 1);
      nutrientSystem.depleteNutrients(testHex, 'beans', 2);
      
      const nutrients = nutrientSystem.getNutrients(testHex)!;
      expect(nutrients.nitrogen).toBeLessThanOrEqual(1.0);
    });
    
    test('peas should also fix nitrogen but less than beans', () => {
      const initialN = nutrientSystem.getNutrients(testHex)!.nitrogen;
      
      // Test peas
      nutrientSystem.depleteNutrients(testHex, 'peas', 0);
      const afterPeasN = nutrientSystem.getNutrients(testHex)!.nitrogen;
      
      // Reset
      nutrientSystem.removeHex(testHex);
      nutrientSystem.addHex(testHex);
      
      // Test beans
      nutrientSystem.depleteNutrients(testHex, 'beans', 0);
      const afterBeansN = nutrientSystem.getNutrients(testHex)!.nitrogen;
      
      // Both should increase nitrogen
      expect(afterPeasN).toBeGreaterThan(initialN);
      expect(afterBeansN).toBeGreaterThan(initialN);
      
      // Beans should fix more nitrogen than peas
      const beanNeeds = CROP_NUTRIENT_NEEDS['beans'];
      const peaNeeds = CROP_NUTRIENT_NEEDS['peas'];
      expect(Math.abs(beanNeeds.nitrogen)).toBeGreaterThan(Math.abs(peaNeeds.nitrogen));
    });
  });
  
  describe('Adding Nutrients', () => {
    beforeEach(() => {
      nutrientSystem.addHex(testHex);
    });
    
    test('should add nutrients correctly', () => {
      nutrientSystem.addNutrients(testHex, { nitrogen: 0.2, phosphorus: 0.1, potassium: 0.15 });
      
      const nutrients = nutrientSystem.getNutrients(testHex)!;
      expect(nutrients.nitrogen).toBeCloseTo(0.7); // 0.5 + 0.2
      expect(nutrients.phosphorus).toBeCloseTo(0.6); // 0.5 + 0.1
      expect(nutrients.potassium).toBeCloseTo(0.65); // 0.5 + 0.15
    });
    
    test('should add partial nutrients', () => {
      nutrientSystem.addNutrients(testHex, { nitrogen: 0.3 }); // Only add nitrogen
      
      const nutrients = nutrientSystem.getNutrients(testHex)!;
      expect(nutrients.nitrogen).toBeCloseTo(0.8);
      expect(nutrients.phosphorus).toBe(0.5); // Unchanged
      expect(nutrients.potassium).toBe(0.5); // Unchanged
    });
    
    test('should not exceed 100% when adding', () => {
      nutrientSystem.addNutrients(testHex, { nitrogen: 0.6, phosphorus: 0.6, potassium: 0.6 });
      
      const nutrients = nutrientSystem.getNutrients(testHex)!;
      expect(nutrients.nitrogen).toBe(1.0);
      expect(nutrients.phosphorus).toBe(1.0);
      expect(nutrients.potassium).toBe(1.0);
    });
  });
  
  describe('Nutrient Validation', () => {
    beforeEach(() => {
      nutrientSystem.addHex(testHex);
    });
    
    test('should allow planting when nutrients are sufficient', () => {
      expect(nutrientSystem.hasEnoughNutrients(testHex, 'tomato')).toBe(true);
      expect(nutrientSystem.hasEnoughNutrients(testHex, 'corn')).toBe(true);
      expect(nutrientSystem.hasEnoughNutrients(testHex, 'beans')).toBe(true);
    });
    
    test('should prevent planting when nutrients are too low', () => {
      // Remove hex and re-add with very low nutrients
      nutrientSystem.removeHex(testHex);
      nutrientSystem.addHex(testHex, { nitrogen: 0.05, phosphorus: 0.05, potassium: 0.05 });
      
      expect(nutrientSystem.hasEnoughNutrients(testHex, 'tomato')).toBe(false);
      expect(nutrientSystem.hasEnoughNutrients(testHex, 'corn')).toBe(false);
    });
    
    test('should allow nitrogen fixers to plant with low N', () => {
      // Remove hex and re-add with low nitrogen but adequate P and K
      nutrientSystem.removeHex(testHex);
      nutrientSystem.addHex(testHex, { nitrogen: 0.05, phosphorus: 0.2, potassium: 0.2 });
      
      // Beans should still be plantable (they add nitrogen)
      expect(nutrientSystem.hasEnoughNutrients(testHex, 'beans')).toBe(true);
      
      // But heavy N feeders should not
      expect(nutrientSystem.hasEnoughNutrients(testHex, 'corn')).toBe(false);
    });
    
    test('should handle unknown crop types gracefully', () => {
      expect(nutrientSystem.hasEnoughNutrients(testHex, 'unknown_crop')).toBe(true);
      
      const result = nutrientSystem.depleteNutrients(testHex, 'unknown_crop', 0);
      expect(result).toBe(false);
      
      // Nutrients should remain unchanged
      const nutrients = nutrientSystem.getNutrients(testHex)!;
      expect(nutrients.nitrogen).toBe(0.5);
    });
  });
  
  describe('Crop Rotation Tracking', () => {
    beforeEach(() => {
      nutrientSystem.addHex(testHex);
    });
    
    test('should track crop history', () => {
      nutrientSystem.recordCropPlanting(testHex, 'tomato');
      nutrientSystem.recordCropPlanting(testHex, 'beans');
      nutrientSystem.recordCropPlanting(testHex, 'corn');
      
      // Can't directly access crop history, but rotation multiplier should reflect it
      const tomatoMultiplier = nutrientSystem.getRotationMultiplier(testHex, 'tomato');
      const newCropMultiplier = nutrientSystem.getRotationMultiplier(testHex, 'wheat');
      
      // Tomato was planted once, 1 repeat = -10%, 3 unique crops = +15%, total = 1.05
      expect(tomatoMultiplier).toBeCloseTo(1.05);
      
      // Wheat is new, should have diversity bonus
      expect(newCropMultiplier).toBeGreaterThan(1.0);
    });
    
    test('should apply penalties for repeated crops', () => {
      // Plant same crop multiple times
      nutrientSystem.recordCropPlanting(testHex, 'corn');
      nutrientSystem.recordCropPlanting(testHex, 'corn');
      nutrientSystem.recordCropPlanting(testHex, 'corn');
      
      const multiplier = nutrientSystem.getRotationMultiplier(testHex, 'corn');
      
      // Should have penalty: 3 repeats = -30%, 1 unique crop = +5%, total = 0.75
      expect(multiplier).toBeCloseTo(0.75);
    });
    
    test('should only track last 3 crops', () => {
      // Plant 4 different crops
      nutrientSystem.recordCropPlanting(testHex, 'tomato');
      nutrientSystem.recordCropPlanting(testHex, 'beans');
      nutrientSystem.recordCropPlanting(testHex, 'corn');
      nutrientSystem.recordCropPlanting(testHex, 'wheat');
      
      // Tomato should no longer be in history (only last 3)
      const tomatoMultiplier = nutrientSystem.getRotationMultiplier(testHex, 'tomato');
      
      // Should have diversity bonus but no repeat penalty
      expect(tomatoMultiplier).toBeGreaterThan(1.0);
    });
  });
  
  describe('Natural Recovery', () => {
    beforeEach(() => {
      nutrientSystem.addHex(testHex, { nitrogen: 0.1, phosphorus: 0.1, potassium: 0.1 });
    });
    
    test('should slowly recover nutrients over time', () => {
      const initial = nutrientSystem.getNutrients(testHex)!;
      
      // Simulate 10 seconds
      nutrientSystem.naturalRecovery(10);
      
      const after = nutrientSystem.getNutrients(testHex)!;
      
      // Should increase slightly toward 20% baseline
      expect(after.nitrogen).toBeGreaterThan(initial.nitrogen);
      expect(after.phosphorus).toBeGreaterThan(initial.phosphorus);
      expect(after.potassium).toBeGreaterThan(initial.potassium);
      
      // But still less than 20%
      expect(after.nitrogen).toBeLessThan(0.2);
    });
    
    test('should not recover above baseline', () => {
      // Remove and re-add hex above baseline
      nutrientSystem.removeHex(testHex);
      nutrientSystem.addHex(testHex, { nitrogen: 0.3, phosphorus: 0.3, potassium: 0.3 });
      
      const initial = nutrientSystem.getNutrients(testHex)!;
      nutrientSystem.naturalRecovery(10);
      const after = nutrientSystem.getNutrients(testHex)!;
      
      // Should not change (already above 20% baseline)
      expect(after.nitrogen).toBe(initial.nitrogen);
      expect(after.phosphorus).toBe(initial.phosphorus);
      expect(after.potassium).toBe(initial.potassium);
    });
  });
  
  describe('Multiple Hex Management', () => {
    test('should handle multiple hexes independently', () => {
      const hex1: HexCoord3D = { q: 0, r: 0, y: 0 };
      const hex2: HexCoord3D = { q: 1, r: 0, y: 0 };
      const hex3: HexCoord3D = { q: 0, r: 1, y: 0 };
      
      nutrientSystem.addHex(hex1, { nitrogen: 0.8, phosphorus: 0.8, potassium: 0.8 });
      nutrientSystem.addHex(hex2, { nitrogen: 0.2, phosphorus: 0.2, potassium: 0.2 });
      nutrientSystem.addHex(hex3); // Default 50%
      
      // Deplete hex1
      nutrientSystem.depleteNutrients(hex1, 'corn', 0);
      
      // Add to hex2
      nutrientSystem.addNutrients(hex2, { nitrogen: 0.3 });
      
      // Check all are independent
      const n1 = nutrientSystem.getNutrients(hex1)!;
      const n2 = nutrientSystem.getNutrients(hex2)!;
      const n3 = nutrientSystem.getNutrients(hex3)!;
      
      expect(n1.nitrogen).toBeLessThan(0.8); // Depleted
      expect(n2.nitrogen).toBe(0.5); // Added
      expect(n3.nitrogen).toBe(0.5); // Unchanged
    });
    
    test('getAllHexes should return all nutrient hexes', () => {
      nutrientSystem.addHex({ q: 0, r: 0, y: 0 });
      nutrientSystem.addHex({ q: 1, r: 0, y: 0 });
      nutrientSystem.addHex({ q: 0, r: 1, y: 1 });
      
      const allHexes = nutrientSystem.getAllHexes();
      expect(allHexes).toHaveLength(3);
      
      // Check each hex has expected properties
      allHexes.forEach(hex => {
        expect(hex.coord).toBeDefined();
        expect(hex.nitrogen).toBeDefined();
        expect(hex.phosphorus).toBeDefined();
        expect(hex.potassium).toBeDefined();
        expect(hex.cropHistory).toBeDefined();
      });
    });
  });

  describe('Plant Growth Integration', () => {
    test('should consume nutrients when plant grows through stages', () => {
      const coord = { q: 0, r: 0, y: 0 };
      nutrientSystem.addHex(coord);
      
      // Get initial nutrients
      const initial = nutrientSystem.getNutrients(coord);
      expect(initial.nitrogen).toBe(0.5);
      expect(initial.phosphorus).toBe(0.5);
      expect(initial.potassium).toBe(0.5);
      
      // Simulate tomato plant growing through 2 stages
      // Stage 1: Seedling (growthStage 0)
      nutrientSystem.depleteNutrients(coord, 'tomato', 0);
      let after1 = nutrientSystem.getNutrients(coord);
      expect(after1.nitrogen).toBeLessThan(0.5);
      expect(after1.phosphorus).toBeLessThan(0.5);
      expect(after1.potassium).toBeLessThan(0.5);
      
      // Stage 2: Young Plant (growthStage 1)
      nutrientSystem.depleteNutrients(coord, 'tomato', 1);
      let after2 = nutrientSystem.getNutrients(coord);
      expect(after2.nitrogen).toBeLessThan(after1.nitrogen);
      expect(after2.phosphorus).toBeLessThan(after1.phosphorus);
      expect(after2.potassium).toBeLessThan(after1.potassium);
      
      // Verify actual consumption amounts
      // Tomato consumes N:0.4, P:0.5, K:0.3 per stage * 0.33 multiplier
      const totalNConsumed = 0.5 - after2.nitrogen;
      const totalPConsumed = 0.5 - after2.phosphorus;
      const totalKConsumed = 0.5 - after2.potassium;
      
      expect(totalNConsumed).toBeCloseTo(0.264, 2); // 2 stages * 0.4 * 0.33
      expect(totalPConsumed).toBeCloseTo(0.33, 2); // 2 stages * 0.5 * 0.33
      expect(totalKConsumed).toBeCloseTo(0.198, 2); // 2 stages * 0.3 * 0.33
    });

    test('bean plants should add nitrogen when growing', () => {
      const coord = { q: 0, r: 0, y: 0 };
      nutrientSystem.addHex(coord);
      
      // Deplete nitrogen first
      nutrientSystem.addNutrients(coord, { nitrogen: -0.3, phosphorus: 0, potassium: 0 });
      const initial = nutrientSystem.getNutrients(coord);
      expect(initial.nitrogen).toBeCloseTo(0.2);
      
      // Grow beans through 2 stages
      nutrientSystem.depleteNutrients(coord, 'beans', 0);
      nutrientSystem.depleteNutrients(coord, 'beans', 1);
      
      const after = nutrientSystem.getNutrients(coord);
      // Beans add 0.3 nitrogen per stage * 0.33 multiplier
      expect(after.nitrogen).toBeGreaterThan(initial.nitrogen);
      expect(after.nitrogen).toBeCloseTo(0.398, 2); // 0.2 + (2 * 0.3 * 0.33)
    });

    test('should track nutrient consumption correctly with logging', () => {
      const coord = { q: 0, r: 0, y: 0 };
      nutrientSystem.addHex(coord);
      
      // Get initial state
      const initial = nutrientSystem.getNutrients(coord);
      console.log('Initial nutrients:', initial);
      
      // First growth stage
      const result1 = nutrientSystem.depleteNutrients(coord, 'tomato', 0);
      expect(result1).toBe(true);
      const after1 = nutrientSystem.getNutrients(coord);
      console.log('After stage 0:', after1);
      
      // Second growth stage
      const result2 = nutrientSystem.depleteNutrients(coord, 'tomato', 1);
      expect(result2).toBe(true);
      const after2 = nutrientSystem.getNutrients(coord);
      console.log('After stage 1:', after2);
      
      // Verify depletion happened
      expect(after2.nitrogen).toBeLessThan(initial.nitrogen);
      expect(after2.phosphorus).toBeLessThan(initial.phosphorus);
      expect(after2.potassium).toBeLessThan(initial.potassium);
    });
  });
});