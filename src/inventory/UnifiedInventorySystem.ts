import { InventoryItem, ItemType } from './InventorySystem';
import { SoilItem } from '../items/SoilItem';

export interface UnifiedInventorySlot {
  item: InventoryItem | null;
  quantity: number;
}

export class UnifiedInventorySystem {
  // Main inventory storage (hotbar is first 10 slots)
  private inventory: UnifiedInventorySlot[] = [];
  private readonly INVENTORY_SIZE = 40; // 4 rows of 10 slots
  private readonly HOTBAR_SIZE = 10;
  
  private activeHotbarSlot: number = 0;
  
  constructor() {
    // Initialize empty inventory
    for (let i = 0; i < this.INVENTORY_SIZE; i++) {
      this.inventory.push({
        item: null,
        quantity: 0
      });
    }
    
    // Add default items
    this.initializeDefaultItems();
  }
  
  private initializeDefaultItems(): void {
    // Watering Can - starts with 50L of water
    this.addItem({
      id: 'watering_can',
      type: ItemType.TOOL,
      name: 'Watering Can',
      icon: '💧',
      stackable: false,
      maxStack: 1,
      quantity: 1,
      metadata: {
        waterAmount: 50000, // 50 liters in milliliters
        maxCapacity: 100000 // 100 liter max capacity
      }
    });
    
    // Soil Placer Tool
    this.addItem({
      id: 'soil_placer',
      type: ItemType.TOOL,
      name: 'Soil Placer',
      icon: '🪣',
      stackable: false,
      maxStack: 1,
      quantity: 1
    });
    
    // Tomato Seeds
    this.addItem({
      id: 'tomato_seeds',
      type: ItemType.SEED,
      name: 'Tomato Seeds',
      icon: '🌱',
      stackable: true,
      maxStack: 99,
      quantity: 10,
      metadata: { plantType: 'tomato' }
    });
    
    // Inspector Tool
    this.addItem({
      id: 'inspector',
      type: ItemType.TOOL,
      name: 'Plant Inspector',
      icon: '🔍',
      stackable: false,
      maxStack: 1,
      quantity: 1
    });
    
    // Barrier Tool
    this.addItem({
      id: 'barrier_tool',
      type: ItemType.TOOL,
      name: 'Barrier Placer',
      icon: '🚧',
      stackable: false,
      maxStack: 1,
      quantity: 1
    });
    
    // Construction Tool
    this.addItem({
      id: 'construction_tool',
      type: ItemType.TOOL,
      name: 'Construction Tool',
      icon: '🔨',
      stackable: false,
      maxStack: 1,
      quantity: 1
    });
  }
  
  /**
   * Add an item to the inventory
   * @returns The index where item was added, or -1 if no space
   */
  addItem(item: InventoryItem): number {
    // If stackable, try to add to existing stacks
    if (item.stackable) {
      // Try hotbar first for convenience
      for (let i = 0; i < this.HOTBAR_SIZE; i++) {
        const slot = this.inventory[i];
        if (slot.item?.id === item.id && slot.quantity < slot.item.maxStack) {
          const spaceLeft = slot.item.maxStack - slot.quantity;
          const toAdd = Math.min(spaceLeft, item.quantity);
          slot.quantity += toAdd;
          item.quantity -= toAdd;
          
          if (item.quantity === 0) {
            return i;
          }
        }
      }
      
      // Then try rest of inventory
      for (let i = this.HOTBAR_SIZE; i < this.inventory.length; i++) {
        const slot = this.inventory[i];
        if (slot.item?.id === item.id && slot.quantity < slot.item.maxStack) {
          const spaceLeft = slot.item.maxStack - slot.quantity;
          const toAdd = Math.min(spaceLeft, item.quantity);
          slot.quantity += toAdd;
          item.quantity -= toAdd;
          
          if (item.quantity === 0) {
            return i;
          }
        }
      }
    }
    
    // Find empty slot - try hotbar first
    for (let i = 0; i < this.HOTBAR_SIZE; i++) {
      if (!this.inventory[i].item) {
        this.inventory[i] = {
          item: { ...item },
          quantity: item.quantity
        };
        return i;
      }
    }
    
    // Then try rest of inventory
    for (let i = this.HOTBAR_SIZE; i < this.inventory.length; i++) {
      if (!this.inventory[i].item) {
        this.inventory[i] = {
          item: { ...item },
          quantity: item.quantity
        };
        return i;
      }
    }
    
    return -1; // No space
  }
  
  /**
   * Add soil to the inventory
   * @returns true if all soil was added
   */
  addSoil(soil: SoilItem): boolean {
    const soilItem: InventoryItem = {
      id: `soil_${soil.getNutrientString()}`,
      type: ItemType.RESOURCE,
      name: `Soil (${soil.getNutrientString()})`,
      icon: '🟫',
      stackable: true,
      maxStack: 10, // 10 hexes worth per stack
      quantity: soil.quantity,
      metadata: {
        soilData: soil.clone(),
        nutrients: soil.nutrients,
        source: soil.source
      }
    };
    
    const index = this.addItem(soilItem);
    return index !== -1;
  }
  
  /**
   * Add seeds to the inventory
   * @returns true if seeds were added
   */
  addSeeds(seedType: string, quantity: number): boolean {
    // Map seed types to display names and icons
    const seedInfo: Record<string, { name: string, icon: string }> = {
      'tomato_seeds': { name: 'Tomato Seeds', icon: '🍅' },
      'lettuce_seeds': { name: 'Lettuce Seeds', icon: '🥬' },
      'carrot_seeds': { name: 'Carrot Seeds', icon: '🥕' },
      'bean_seeds': { name: 'Bean Seeds', icon: '🫘' },
      'mushroom_spores': { name: 'Mushroom Spores', icon: '🍄' },
      'herb_seeds': { name: 'Herb Seeds', icon: '🌿' },
      'pepper_seeds': { name: 'Pepper Seeds', icon: '🌶️' },
      'eggplant_seeds': { name: 'Eggplant Seeds', icon: '🍆' },
      'potato_seeds': { name: 'Potato Seeds', icon: '🥔' },
      'crystal_seeds': { name: 'Crystal Flower Seeds', icon: '💎' },
      'glowberry_seeds': { name: 'Glowberry Seeds', icon: '🫐' },
      'moss_spores': { name: 'Cave Moss Spores', icon: '🌱' }
    };
    
    const info = seedInfo[seedType] || { name: seedType, icon: '🌱' };
    const plantType = seedType.replace('_seeds', '').replace('_spores', '');
    
    const seedItem: InventoryItem = {
      id: seedType,
      type: ItemType.SEED,
      name: info.name,
      icon: info.icon,
      stackable: true,
      maxStack: 99,
      quantity: quantity,
      metadata: { 
        plantType: plantType,
        biomeOrigin: this.getBiomeFromSeedType(seedType)
      }
    };
    
    const index = this.addItem(seedItem);
    return index !== -1;
  }
  
  private getBiomeFromSeedType(seedType: string): string {
    // Map seeds to their origin biomes
    const biomeMap: Record<string, string> = {
      'tomato_seeds': 'fertile_valley',
      'lettuce_seeds': 'fertile_valley',
      'carrot_seeds': 'fertile_valley',
      'bean_seeds': 'ancient_forest',
      'mushroom_spores': 'ancient_forest',
      'herb_seeds': 'ancient_forest',
      'pepper_seeds': 'volcanic_ash',
      'eggplant_seeds': 'volcanic_ash',
      'potato_seeds': 'volcanic_ash',
      'crystal_seeds': 'crystal_caves',
      'glowberry_seeds': 'crystal_caves',
      'moss_spores': 'crystal_caves'
    };
    
    return biomeMap[seedType] || 'unknown';
  }
  
  /**
   * Remove item from inventory slot
   */
  removeItem(inventoryIndex: number, quantity: number = 1): InventoryItem | null {
    const slot = this.inventory[inventoryIndex];
    if (!slot || !slot.item) return null;
    
    if (slot.item.stackable && slot.quantity > quantity) {
      // Create a copy with requested quantity
      const removed = { ...slot.item, quantity };
      slot.quantity -= quantity;
      return removed;
    } else {
      // Remove entire item
      const removed = slot.item;
      slot.item = null;
      slot.quantity = 0;
      return removed;
    }
  }
  
  /**
   * Move item to hotbar slot (swap if needed)
   */
  moveToHotbar(fromIndex: number, hotbarIndex: number): boolean {
    if (hotbarIndex < 0 || hotbarIndex >= this.HOTBAR_SIZE) return false;
    if (fromIndex < 0 || fromIndex >= this.INVENTORY_SIZE) return false;
    if (!this.inventory[fromIndex].item) return false;
    
    // If moving within hotbar, just use moveItem
    if (fromIndex < this.HOTBAR_SIZE) {
      return this.moveItem(fromIndex, hotbarIndex);
    }
    
    // Swap items
    const temp = this.inventory[hotbarIndex];
    this.inventory[hotbarIndex] = this.inventory[fromIndex];
    this.inventory[fromIndex] = temp;
    
    return true;
  }
  
  /**
   * Get the active item from hotbar
   */
  getActiveItem(): InventoryItem | null {
    const slot = this.inventory[this.activeHotbarSlot];
    return slot?.item || null;
  }
  
  /**
   * Get the active item's quantity
   */
  getActiveItemQuantity(): number {
    const slot = this.inventory[this.activeHotbarSlot];
    return slot?.quantity || 0;
  }
  
  /**
   * Consume one unit of the active item
   */
  consumeActiveItem(): boolean {
    const slot = this.inventory[this.activeHotbarSlot];
    if (!slot || !slot.item) return false;
    
    // Decrease quantity
    slot.quantity--;
    
    // If quantity reaches 0, remove the item
    if (slot.quantity <= 0) {
      slot.item = null;
      slot.quantity = 0;
    }
    
    return true;
  }
  
  /**
   * Use one of the active item (for placing soil, etc)
   */
  useActiveItem(quantity: number = 1): boolean {
    const removed = this.removeItem(this.activeHotbarSlot, quantity);
    return removed !== null;
  }
  
  /**
   * Set active hotbar slot
   */
  setActiveHotbarSlot(index: number): void {
    if (index >= 0 && index < this.HOTBAR_SIZE) {
      // Stop building placement when switching tools
      if ((window as any).game?.buildingPlacer) {
        (window as any).game.buildingPlacer.stopPlacement();
      }
      this.activeHotbarSlot = index;
    }
  }
  
  /**
   * Get all inventory slots
   */
  getInventorySlots(): UnifiedInventorySlot[] {
    return this.inventory;
  }
  
  /**
   * Get hotbar slots (first 10 inventory slots)
   */
  getHotbarSlots(): UnifiedInventorySlot[] {
    return this.inventory.slice(0, this.HOTBAR_SIZE);
  }
  
  /**
   * Get active hotbar slot index
   */
  getActiveHotbarSlot(): number {
    return this.activeHotbarSlot;
  }
  
  /**
   * Get item at specific inventory index
   */
  getInventoryItem(index: number): InventoryItem | null {
    if (index < 0 || index >= this.INVENTORY_SIZE) return null;
    return this.inventory[index].item;
  }
  
  /**
   * Get quantity at specific inventory index
   */
  getInventoryQuantity(index: number): number {
    if (index < 0 || index >= this.INVENTORY_SIZE) return 0;
    return this.inventory[index].quantity;
  }
  
  /**
   * Move item between inventory slots
   */
  moveItem(fromIndex: number, toIndex: number): boolean {
    if (fromIndex === toIndex) return false;
    if (fromIndex < 0 || fromIndex >= this.INVENTORY_SIZE) return false;
    if (toIndex < 0 || toIndex >= this.INVENTORY_SIZE) return false;
    
    const fromSlot = this.inventory[fromIndex];
    const toSlot = this.inventory[toIndex];
    
    if (!fromSlot.item) return false;
    
    // If target is empty, just move
    if (!toSlot.item) {
      toSlot.item = fromSlot.item;
      toSlot.quantity = fromSlot.quantity;
      fromSlot.item = null;
      fromSlot.quantity = 0;
      return true;
    }
    
    // If same item and stackable, try to stack
    if (fromSlot.item.id === toSlot.item.id && fromSlot.item.stackable) {
      const spaceLeft = toSlot.item.maxStack - toSlot.quantity;
      if (spaceLeft > 0) {
        const toMove = Math.min(spaceLeft, fromSlot.quantity);
        toSlot.quantity += toMove;
        fromSlot.quantity -= toMove;
        
        if (fromSlot.quantity === 0) {
          fromSlot.item = null;
        }
        return true;
      }
    }
    
    // Otherwise, swap items
    const tempItem = fromSlot.item;
    const tempQuantity = fromSlot.quantity;
    fromSlot.item = toSlot.item;
    fromSlot.quantity = toSlot.quantity;
    toSlot.item = tempItem;
    toSlot.quantity = tempQuantity;
    
    return true;
  }
  
  /**
   * Check if we have a specific tool in the hotbar
   */
  hasToolInHotbar(toolId: string): boolean {
    for (let i = 0; i < this.HOTBAR_SIZE; i++) {
      const item = this.inventory[i].item;
      if (item?.id === toolId) return true;
    }
    return false;
  }
  
  /**
   * Add uprooted plant to inventory
   */
  addUprootedPlant(plantData: any): boolean {
    const plantItem: InventoryItem = {
      id: `uprooted_${plantData.id}`,
      type: ItemType.PLANT,
      name: `Uprooted ${plantData.typeName || 'Plant'}`,
      icon: '🌿',
      stackable: false,
      maxStack: 1,
      quantity: 1,
      metadata: {
        plantState: plantData,
        uprootedAt: Date.now()
      }
    };
    
    const index = this.addItem(plantItem);
    return index !== -1;
  }
  
  /**
   * Combine two soil stacks
   * If soils have same nutrients, they stack normally
   * If different nutrients, they mix into weighted average
   */
  combineSoils(fromIndex: number, toIndex: number): boolean {
    if (fromIndex === toIndex) return false;
    if (fromIndex < 0 || fromIndex >= this.INVENTORY_SIZE) return false;
    if (toIndex < 0 || toIndex >= this.INVENTORY_SIZE) return false;
    
    const fromSlot = this.inventory[fromIndex];
    const toSlot = this.inventory[toIndex];
    
    // Both must have soil items
    if (!fromSlot.item || !toSlot.item) {
      return false;
    }
    if (fromSlot.item.type !== ItemType.RESOURCE || !fromSlot.item.id.startsWith('soil_')) {
      return false;
    }
    if (toSlot.item.type !== ItemType.RESOURCE || !toSlot.item.id.startsWith('soil_')) {
      return false;
    }
    
    const fromSoil = fromSlot.item.metadata?.soilData;
    const toSoil = toSlot.item.metadata?.soilData;
    if (!fromSoil || !toSoil) {
      return false;
    }
    
    // Check if they can stack (same nutrients)
    if (fromSlot.item.id === toSlot.item.id) {
      // Same nutrients, just add quantities
      const totalQuantity = fromSlot.quantity + toSlot.quantity;
      if (totalQuantity > toSlot.item.maxStack) {
        return false; // Would exceed stack size
      }
      
      toSlot.quantity = totalQuantity;
      fromSlot.item = null;
      fromSlot.quantity = 0;
      return true;
    } else {
      // Different nutrients, mix them
      const totalQuantity = fromSlot.quantity + toSlot.quantity;
      if (totalQuantity > toSlot.item.maxStack) {
        return false; // Would exceed stack size
      }
      
      
      // Calculate weighted average of nutrients
      const fromWeight = fromSlot.quantity / totalQuantity;
      const toWeight = toSlot.quantity / totalQuantity;
      
      const mixedNutrients = {
        nitrogen: Math.round(fromSoil.nutrients.nitrogen * fromWeight + toSoil.nutrients.nitrogen * toWeight),
        phosphorus: Math.round(fromSoil.nutrients.phosphorus * fromWeight + toSoil.nutrients.phosphorus * toWeight),
        potassium: Math.round(fromSoil.nutrients.potassium * fromWeight + toSoil.nutrients.potassium * toWeight)
      };
      
      // Create new mixed soil item
      const mixedSoil = new SoilItem(mixedNutrients, totalQuantity, 'Mixed Soil');
      
      toSlot.item = {
        id: `soil_${mixedSoil.getNutrientString()}`,
        type: ItemType.RESOURCE,
        name: `Soil (${mixedSoil.getNutrientString()})`,
        icon: '🟫',
        stackable: true,
        maxStack: 10,
        quantity: totalQuantity,
        metadata: {
          soilData: mixedSoil,
          nutrients: mixedNutrients,
          source: 'Mixed Soil'
        }
      };
      toSlot.quantity = totalQuantity;
      
      // Clear source slot
      fromSlot.item = null;
      fromSlot.quantity = 0;
      return true;
    }
  }
  
  /**
   * Split a soil stack
   */
  splitSoilStack(slotIndex: number, amount: number, targetIndex: number): boolean {
    if (slotIndex === targetIndex) return false;
    if (slotIndex < 0 || slotIndex >= this.INVENTORY_SIZE) return false;
    if (targetIndex < 0 || targetIndex >= this.INVENTORY_SIZE) return false;
    
    const sourceSlot = this.inventory[slotIndex];
    const targetSlot = this.inventory[targetIndex];
    
    // Source must have soil, target must be empty
    if (!sourceSlot.item || targetSlot.item) return false;
    if (sourceSlot.item.type !== ItemType.RESOURCE || !sourceSlot.item.id.startsWith('soil_')) return false;
    
    // Can't split more than available
    if (amount <= 0 || amount >= sourceSlot.quantity) return false;
    
    const soilData = sourceSlot.item.metadata?.soilData;
    if (!soilData) return false;
    
    // Create split soil item
    const splitSoil = soilData.clone();
    splitSoil.quantity = amount;
    
    targetSlot.item = {
      id: sourceSlot.item.id,
      type: ItemType.RESOURCE,
      name: sourceSlot.item.name,
      icon: '🟫',
      stackable: true,
      maxStack: 10,
      quantity: amount,
      metadata: {
        soilData: splitSoil,
        nutrients: { ...soilData.nutrients },
        source: soilData.source
      }
    };
    targetSlot.quantity = amount;
    
    // Reduce source quantity
    sourceSlot.quantity -= amount;
    sourceSlot.item.metadata.soilData.quantity = sourceSlot.quantity;
    
    return true;
  }
}