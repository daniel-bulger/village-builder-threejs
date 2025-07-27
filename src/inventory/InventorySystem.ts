export interface InventoryItem {
  id: string;
  type: ItemType;
  name: string;
  icon?: string; // emoji or image path
  stackable: boolean;
  maxStack: number;
  quantity: number;
  metadata?: any; // For complex items like uprooted plants
}

export enum ItemType {
  TOOL = 'tool',
  SEED = 'seed',
  PLANT = 'plant',
  RESOURCE = 'resource',
  CONTAINER = 'container'
}

export interface InventorySlot {
  item: InventoryItem | null;
  hotkey?: string; // '1', '2', etc
}

export class InventorySystem {
  private slots: InventorySlot[] = [];
  private activeSlot: number = 0;
  private readonly MAX_SLOTS = 10;
  
  constructor() {
    // Initialize empty slots
    for (let i = 0; i < this.MAX_SLOTS; i++) {
      this.slots.push({
        item: null,
        hotkey: i < 9 ? `${i + 1}` : '0'
      });
    }
    
    // Add default items
    this.initializeDefaultItems();
  }
  
  private initializeDefaultItems(): void {
    // Watering Can
    this.addItem({
      id: 'watering_can',
      type: ItemType.TOOL,
      name: 'Watering Can',
      icon: '💧',
      stackable: false,
      maxStack: 1,
      quantity: 1
    });
    
    // Soil Shovel
    this.addItem({
      id: 'shovel',
      type: ItemType.TOOL,
      name: 'Shovel',
      icon: '🔨',
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
    
    // Soil Placer
    this.addItem({
      id: 'soil_placer',
      type: ItemType.TOOL,
      name: 'Soil Placer',
      icon: '🪣',
      stackable: false,
      maxStack: 1,
      quantity: 1
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
  }
  
  addItem(item: InventoryItem): boolean {
    // If stackable, try to add to existing stack
    if (item.stackable) {
      const existingSlot = this.slots.find(slot => 
        slot.item?.id === item.id && 
        slot.item.quantity < slot.item.maxStack
      );
      
      if (existingSlot && existingSlot.item) {
        const spaceLeft = existingSlot.item.maxStack - existingSlot.item.quantity;
        const toAdd = Math.min(spaceLeft, item.quantity);
        existingSlot.item.quantity += toAdd;
        item.quantity -= toAdd;
        
        if (item.quantity === 0) {
          return true;
        }
      }
    }
    
    // Find empty slot
    const emptySlot = this.slots.find(slot => slot.item === null);
    if (emptySlot) {
      emptySlot.item = { ...item };
      return true;
    }
    
    return false; // No space
  }
  
  removeItem(slotIndex: number, quantity: number = 1): InventoryItem | null {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.item) return null;
    
    const item = slot.item;
    if (item.stackable && item.quantity > quantity) {
      // Create a copy with requested quantity
      const removed = { ...item, quantity };
      item.quantity -= quantity;
      return removed;
    } else {
      // Remove entire item
      slot.item = null;
      return item;
    }
  }
  
  getActiveItem(): InventoryItem | null {
    return this.slots[this.activeSlot]?.item || null;
  }
  
  setActiveSlot(index: number): void {
    if (index >= 0 && index < this.MAX_SLOTS) {
      this.activeSlot = index;
    }
  }
  
  getSlots(): InventorySlot[] {
    return this.slots;
  }
  
  getActiveSlot(): number {
    return this.activeSlot;
  }
  
  // Add uprooted plant to inventory
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
    
    return this.addItem(plantItem);
  }
}