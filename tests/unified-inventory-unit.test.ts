import { UnifiedInventorySystem } from '../src/inventory/UnifiedInventorySystem';
import { SoilItem } from '../src/items/SoilItem';
import { ItemType } from '../src/inventory/InventorySystem';

describe('UnifiedInventorySystem - Unit Tests', () => {
  let inventory: UnifiedInventorySystem;

  beforeEach(() => {
    inventory = new UnifiedInventorySystem();
  });

  describe('Default Items', () => {
    test('should initialize with default items', () => {
      const slots = inventory.getInventorySlots();
      const items = slots.filter(slot => slot.item !== null);
      
      expect(items.length).toBeGreaterThan(0);
      
      // Check for specific default items
      const itemIds = items.map(slot => slot.item?.id);
      expect(itemIds).toContain('watering_can');
      expect(itemIds).toContain('soil_placer');
      expect(itemIds).toContain('tomato_seeds');
      expect(itemIds).toContain('inspector');
      expect(itemIds).toContain('barrier_tool');
    });
  });

  describe('Soil Stacking', () => {
    test('should stack soil with identical nutrients', () => {
      const soil1 = new SoilItem(
        { nitrogen: 70, phosphorus: 50, potassium: 60 },
        3,
        'Test Valley'
      );
      const soil2 = new SoilItem(
        { nitrogen: 70, phosphorus: 50, potassium: 60 },
        2,
        'Test Valley'
      );
      
      inventory.addSoil(soil1);
      inventory.addSoil(soil2);
      
      const slots = inventory.getInventorySlots();
      const soilSlots = slots.filter(slot => 
        slot.item?.id === 'soil_70-50-60'
      );
      
      expect(soilSlots.length).toBe(1);
      expect(soilSlots[0].quantity).toBe(5); // 3 + 2
    });

    test('should not exceed max stack size', () => {
      const soil1 = new SoilItem(
        { nitrogen: 40, phosphorus: 30, potassium: 80 },
        8,
        'Test Forest'
      );
      const soil2 = new SoilItem(
        { nitrogen: 40, phosphorus: 30, potassium: 80 },
        5,
        'Test Forest'
      );
      
      inventory.addSoil(soil1);
      inventory.addSoil(soil2);
      
      const slots = inventory.getInventorySlots();
      const soilSlots = slots.filter(slot => 
        slot.item?.id === 'soil_40-30-80'
      ).map(slot => slot.quantity);
      
      expect(soilSlots.length).toBe(2);
      expect(soilSlots[0]).toBe(10); // Max stack
      expect(soilSlots[1]).toBe(3);  // Remainder
    });
  });

  describe('Soil Combining', () => {
    test('should combine different soils with weighted average', () => {
      // Add soils to specific slots
      const soil1 = new SoilItem(
        { nitrogen: 70, phosphorus: 50, potassium: 60 },
        4,
        'Valley'
      );
      const soil2 = new SoilItem(
        { nitrogen: 40, phosphorus: 80, potassium: 50 },
        6,
        'Volcanic'
      );
      
      inventory.addSoil(soil1);
      inventory.addSoil(soil2);
      
      // Find their slot indices
      const slots = inventory.getInventorySlots();
      let slot1Index = -1, slot2Index = -1;
      
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].item?.id === 'soil_70-50-60') slot1Index = i;
        if (slots[i].item?.id === 'soil_40-80-50') slot2Index = i;
      }
      
      // Combine them
      const success = inventory.combineSoils(slot1Index, slot2Index);
      expect(success).toBe(true);
      
      // Check result
      const resultSlot = inventory.getInventorySlots()[slot2Index];
      expect(resultSlot.quantity).toBe(10); // 4 + 6
      expect(resultSlot.item?.metadata?.nutrients).toEqual({
        nitrogen: 52,   // (70*4 + 40*6) / 10
        phosphorus: 68, // (50*4 + 80*6) / 10
        potassium: 54   // (60*4 + 50*6) / 10
      });
      expect(resultSlot.item?.metadata?.source).toBe('Mixed Soil');
    });
  });

  describe('Soil Splitting', () => {
    test('should split soil stack correctly', () => {
      const soil = new SoilItem(
        { nitrogen: 50, phosphorus: 60, potassium: 70 },
        8,
        'Test Soil'
      );
      
      inventory.addSoil(soil);
      
      // Find the soil slot
      const slots = inventory.getInventorySlots();
      let soilIndex = -1;
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].item?.id === 'soil_50-60-70') {
          soilIndex = i;
          break;
        }
      }
      
      // Find empty slot
      let emptyIndex = -1;
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i].item) {
          emptyIndex = i;
          break;
        }
      }
      
      // Split 3 units
      const success = inventory.splitSoilStack(soilIndex, 3, emptyIndex);
      expect(success).toBe(true);
      
      // Check results
      const updatedSlots = inventory.getInventorySlots();
      expect(updatedSlots[soilIndex].quantity).toBe(5); // 8 - 3
      expect(updatedSlots[emptyIndex].quantity).toBe(3);
      expect(updatedSlots[emptyIndex].item?.metadata?.nutrients).toEqual({
        nitrogen: 50,
        phosphorus: 60,
        potassium: 70
      });
    });

    test('should not split if amount is invalid', () => {
      const soil = new SoilItem(
        { nitrogen: 50, phosphorus: 50, potassium: 50 },
        2,
        'Small Stack'
      );
      
      inventory.addSoil(soil);
      
      const slots = inventory.getInventorySlots();
      let soilIndex = -1;
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].item?.id === 'soil_50-50-50') {
          soilIndex = i;
          break;
        }
      }
      
      // Try to split more than available
      const success = inventory.splitSoilStack(soilIndex, 3, 20);
      expect(success).toBe(false);
      
      // Original stack should be unchanged
      expect(slots[soilIndex].quantity).toBe(2);
    });
  });

  describe('Hotbar Management', () => {
    test('should set and get active hotbar slot', () => {
      inventory.setActiveHotbarSlot(3);
      expect(inventory.getActiveHotbarSlot()).toBe(3);
      
      inventory.setActiveHotbarSlot(9);
      expect(inventory.getActiveHotbarSlot()).toBe(9);
      
      // Should not set invalid slots
      inventory.setActiveHotbarSlot(10);
      expect(inventory.getActiveHotbarSlot()).toBe(9); // Unchanged
    });

    test('should get active item from hotbar', () => {
      // Watering can should be in first slot by default
      inventory.setActiveHotbarSlot(0);
      const activeItem = inventory.getActiveItem();
      
      expect(activeItem).not.toBeNull();
      expect(activeItem?.id).toBe('watering_can');
    });
  });

  describe('Item Usage', () => {
    test('should use items from active slot', () => {
      // Add some stackable items
      inventory.addItem({
        id: 'test_seeds',
        type: ItemType.SEED,
        name: 'Test Seeds',
        icon: '🌰',
        stackable: true,
        maxStack: 99,
        quantity: 10
      });
      
      // Find and select the slot
      const slots = inventory.getInventorySlots();
      let seedIndex = -1;
      for (let i = 0; i < 10; i++) { // Check hotbar
        if (slots[i].item?.id === 'test_seeds') {
          seedIndex = i;
          break;
        }
      }
      
      inventory.setActiveHotbarSlot(seedIndex);
      
      // Use 3 seeds
      const success = inventory.useActiveItem(3);
      expect(success).toBe(true);
      
      // Check remaining
      expect(inventory.getActiveItemQuantity()).toBe(7);
    });
  });
});