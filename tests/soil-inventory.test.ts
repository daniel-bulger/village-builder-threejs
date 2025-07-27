/**
 * Tests for SoilItem and SoilInventory
 * 
 * Verifies:
 * - Soil stacking rules (exact nutrient match required)
 * - Mixing with weighted averages
 * - Stack splitting preserves nutrient ratios
 * - Inventory management and slot operations
 */

import { SoilItem, BIOME_SOILS } from '../src/items/SoilItem';
import { SoilInventory } from '../src/inventory/SoilInventory';

describe('SoilItem', () => {
  describe('stacking', () => {
    it('should allow stacking identical nutrient profiles', () => {
      const soil1 = new SoilItem({ nitrogen: 50, phosphorus: 50, potassium: 50 }, 1.0);
      const soil2 = new SoilItem({ nitrogen: 50, phosphorus: 50, potassium: 50 }, 2.0);
      
      expect(soil1.canStackWith(soil2)).toBe(true);
    });

    it('should only stack exact nutrient matches without mixing', () => {
      const soil1 = new SoilItem({ nitrogen: 50, phosphorus: 50, potassium: 50 }, 1.0);
      const soil2 = new SoilItem({ nitrogen: 50, phosphorus: 50, potassium: 51 }, 1.0);
      
      // Different nutrients don't auto-stack (need explicit mixing)
      expect(soil1.canStackWith(soil2)).toBe(false);
    });
  });

  describe('mixing', () => {
    it('should calculate weighted average correctly', () => {
      const soil1 = new SoilItem({ nitrogen: 80, phosphorus: 20, potassium: 40 }, 1.0);
      const soil2 = new SoilItem({ nitrogen: 40, phosphorus: 60, potassium: 20 }, 3.0);
      
      const mixed = SoilItem.mix(soil1, soil2);
      
      expect(mixed.quantity).toBe(4.0);
      expect(mixed.nutrients.nitrogen).toBe(50); // (80*1 + 40*3) / 4 = 50
      expect(mixed.nutrients.phosphorus).toBe(50); // (20*1 + 60*3) / 4 = 50
      expect(mixed.nutrients.potassium).toBe(25); // (40*1 + 20*3) / 4 = 25
    });

    it('should handle equal quantities', () => {
      const soil1 = new SoilItem({ nitrogen: 100, phosphorus: 0, potassium: 50 }, 2.0);
      const soil2 = new SoilItem({ nitrogen: 0, phosphorus: 100, potassium: 50 }, 2.0);
      
      const mixed = SoilItem.mix(soil1, soil2);
      
      expect(mixed.quantity).toBe(4.0);
      expect(mixed.nutrients.nitrogen).toBe(50);
      expect(mixed.nutrients.phosphorus).toBe(50);
      expect(mixed.nutrients.potassium).toBe(50);
    });
  });

  describe('splitting', () => {
    it('should preserve nutrient ratios when splitting', () => {
      const original = new SoilItem({ nitrogen: 75, phosphorus: 25, potassium: 60 }, 5.0);
      
      const split = original.split(2.0);
      
      expect(split).not.toBeNull();
      expect(split!.quantity).toBe(2.0);
      expect(split!.nutrients.nitrogen).toBe(75);
      expect(split!.nutrients.phosphorus).toBe(25);
      expect(split!.nutrients.potassium).toBe(60);
      expect(original.quantity).toBe(3.0);
    });

    it('should return null for invalid split amounts', () => {
      const soil = new SoilItem({ nitrogen: 50, phosphorus: 50, potassium: 50 }, 5.0);
      
      expect(soil.split(0)).toBeNull();
      expect(soil.split(-1)).toBeNull();
      expect(soil.split(5.0)).toBeNull();
      expect(soil.split(6.0)).toBeNull();
    });

    it('should handle fractional amounts', () => {
      const soil = new SoilItem({ nitrogen: 50, phosphorus: 50, potassium: 50 }, 2.5);
      
      const split = soil.split(0.7);
      
      expect(split!.quantity).toBe(0.7);
      expect(soil.quantity).toBe(1.8);
    });
  });

  describe('display', () => {
    it('should format nutrient string correctly', () => {
      const soil = new SoilItem({ nitrogen: 65.4, phosphorus: 30.7, potassium: 45.2 }, 1.0);
      
      expect(soil.getNutrientString()).toBe('65-31-45');
      expect(soil.getDisplayName()).toBe('Soil (65-31-45)');
    });
  });
});

describe('SoilInventory', () => {
  let inventory: SoilInventory;

  beforeEach(() => {
    inventory = new SoilInventory(6);
  });

  describe('adding soil', () => {
    it('should add soil to empty slot', () => {
      const soil = new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 3.0);
      
      const remaining = inventory.addSoil(soil);
      
      expect(remaining).toBe(0);
      expect(inventory.getOccupiedSlots()).toHaveLength(1);
      expect(inventory.getSlot(0)!.item!.quantity).toBe(3.0);
    });

    it('should stack with matching soil', () => {
      const soil1 = new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 3.0);
      const soil2 = new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 4.0);
      
      inventory.addSoil(soil1);
      const remaining = inventory.addSoil(soil2);
      
      expect(remaining).toBe(0);
      expect(inventory.getOccupiedSlots()).toHaveLength(1);
      expect(inventory.getSlot(0)!.item!.quantity).toBe(7.0);
    });

    it('should respect max stack size', () => {
      const soil1 = new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 8.0);
      const soil2 = new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 5.0);
      
      inventory.addSoil(soil1);
      const remaining = inventory.addSoil(soil2);
      
      expect(remaining).toBe(0);
      expect(inventory.getOccupiedSlots()).toHaveLength(2);
      expect(inventory.getSlot(0)!.item!.quantity).toBe(10.0); // Max stack
      expect(inventory.getSlot(1)!.item!.quantity).toBe(3.0);  // Overflow
    });

    it('should not stack different nutrients', () => {
      const soil1 = new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 3.0);
      const soil2 = new SoilItem(BIOME_SOILS.ANCIENT_FOREST, 2.0);
      
      inventory.addSoil(soil1);
      inventory.addSoil(soil2);
      
      expect(inventory.getOccupiedSlots()).toHaveLength(2);
    });

    it('should return excess when inventory full', () => {
      // Fill all 6 slots with max stacks
      for (let i = 0; i < 6; i++) {
        inventory.addSoil(new SoilItem(
          { nitrogen: i * 10, phosphorus: 50, potassium: 50 }, 
          10.0
        ));
      }
      
      const extraSoil = new SoilItem(BIOME_SOILS.DEPLETED_WASTES, 5.0);
      const remaining = inventory.addSoil(extraSoil);
      
      expect(remaining).toBe(5.0);
      expect(inventory.isFull()).toBe(true);
    });
  });

  describe('combining slots', () => {
    it('should combine matching soils', () => {
      // Use different nutrients to force separate slots
      inventory.addSoil(new SoilItem({ nitrogen: 50, phosphorus: 50, potassium: 50 }, 3.0));
      inventory.addSoil(new SoilItem({ nitrogen: 50, phosphorus: 50, potassium: 50 }, 4.0));
      
      // Since they auto-stacked, add a different one to test combining
      inventory.addSoil(new SoilItem({ nitrogen: 60, phosphorus: 60, potassium: 60 }, 2.0));
      
      // Now slot 0 has 7.0 of 50-50-50, slot 1 has 2.0 of 60-60-60
      // Let's split slot 0 first to create two separate stacks of same nutrients
      inventory.splitStack(0, 3.0, 2);
      
      // Now combine slots 2 and 0
      const success = inventory.combineSlots(2, 0);
      
      expect(success).toBe(true);
      expect(inventory.getSlot(0)!.item!.quantity).toBe(7.0);
      expect(inventory.getSlot(2)!.item).toBeNull();
    });

    it('should mix different soils', () => {
      inventory.addSoil(new SoilItem({ nitrogen: 80, phosphorus: 20, potassium: 40 }, 1.0));
      inventory.addSoil(new SoilItem({ nitrogen: 40, phosphorus: 60, potassium: 20 }, 3.0));
      
      const success = inventory.combineSlots(1, 0);
      
      expect(success).toBe(true);
      const mixed = inventory.getSlot(0)!.item!;
      expect(mixed.quantity).toBe(4.0);
      expect(mixed.nutrients.nitrogen).toBe(50);
      expect(mixed.nutrients.phosphorus).toBe(50);
      expect(mixed.nutrients.potassium).toBe(25);
    });

    it('should fail if result exceeds max stack', () => {
      // Add 7.0 - goes to slot 0
      inventory.addSoil(new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 7.0));
      // Add 10.0 - will auto-stack 3.0 to slot 0 (making it 10.0), rest 7.0 to slot 1  
      inventory.addSoil(new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 10.0));
      // Add 6.0 - will auto-stack 3.0 to slot 1 (making it 10.0), rest 3.0 to slot 2
      inventory.addSoil(new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 6.0));
      
      // At this point: slot 0 = 10.0, slot 1 = 10.0, slot 2 = 3.0
      
      const success = inventory.combineSlots(2, 0);
      
      expect(success).toBe(false); // Can't combine 3.0 + 10.0 (exceeds max)
      expect(inventory.getSlot(0)!.item!.quantity).toBe(10.0);
      expect(inventory.getSlot(2)!.item!.quantity).toBe(3.0);
    });
  });

  describe('splitting stacks', () => {
    it('should split stack into empty slot', () => {
      inventory.addSoil(new SoilItem(BIOME_SOILS.VOLCANIC_ASH, 5.0));
      
      const success = inventory.splitStack(0, 2.0, 2);
      
      expect(success).toBe(true);
      expect(inventory.getSlot(0)!.item!.quantity).toBe(3.0);
      expect(inventory.getSlot(2)!.item!.quantity).toBe(2.0);
      expect(inventory.getSlot(2)!.item!.nutrients).toEqual(BIOME_SOILS.VOLCANIC_ASH);
    });

    it('should fail if target slot occupied', () => {
      inventory.addSoil(new SoilItem(BIOME_SOILS.VOLCANIC_ASH, 5.0));
      inventory.addSoil(new SoilItem(BIOME_SOILS.CRYSTAL_CAVES, 3.0));
      
      const success = inventory.splitStack(0, 2.0, 1);
      
      expect(success).toBe(false);
    });
  });

  describe('soil grouping', () => {
    it('should group soil by nutrient profile', () => {
      // First two will auto-stack since they match
      inventory.addSoil(new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 3.0, "Valley 1"));
      inventory.addSoil(new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 4.0, "Valley 2"));
      inventory.addSoil(new SoilItem(BIOME_SOILS.ANCIENT_FOREST, 2.0, "Forest"));
      
      const grouped = inventory.getSoilByProfile();
      
      expect(grouped.size).toBe(2);
      
      const valley = grouped.get('65-65-65')!;
      expect(valley.total).toBe(7.0);
      // Since they auto-stacked, the source becomes "Valley 1" (first added)
      expect(valley.sources.size).toBe(1);
      expect(valley.sources.has("Valley 1")).toBe(true);
      
      const forest = grouped.get('80-40-40')!;
      expect(forest.total).toBe(2.0);
      expect(forest.sources.size).toBe(1);
    });
  });

  describe('removal', () => {
    it('should remove entire stack', () => {
      inventory.addSoil(new SoilItem(BIOME_SOILS.CRYSTAL_CAVES, 4.0));
      
      const removed = inventory.removeFromSlot(0, 4.0);
      
      expect(removed).not.toBeNull();
      expect(removed!.quantity).toBe(4.0);
      expect(inventory.getSlot(0)!.item).toBeNull();
    });

    it('should remove partial amount', () => {
      inventory.addSoil(new SoilItem(BIOME_SOILS.CRYSTAL_CAVES, 4.0));
      
      const removed = inventory.removeFromSlot(0, 1.5);
      
      expect(removed).not.toBeNull();
      expect(removed!.quantity).toBe(1.5);
      expect(inventory.getSlot(0)!.item!.quantity).toBe(2.5);
    });
  });
});