/**
 * SoilInventory.ts
 * 
 * Manages the player's soil inventory with special stacking rules.
 * 
 * Key behaviors:
 * - Limited slots (default 6-10) for soil stacks
 * - Only soil with EXACT same nutrients can stack
 * - Stack size limit of 10.0 hexes worth per stack
 * - Supports combining stacks and splitting stacks
 * - Tracks total soil by nutrient profile for UI display
 */

import { SoilItem, NutrientProfile } from '../items/SoilItem';

export interface SoilSlot {
  item: SoilItem | null;
  slotIndex: number;
}

export class SoilInventory {
  private slots: SoilSlot[];
  private maxStackSize: number = 10.0; // Hexes worth per stack
  
  constructor(slotCount: number = 8) {
    this.slots = Array.from({ length: slotCount }, (_, i) => ({
      item: null,
      slotIndex: i
    }));
  }

  /**
   * Get all non-empty slots
   */
  getOccupiedSlots(): SoilSlot[] {
    return this.slots.filter(slot => slot.item !== null);
  }

  /**
   * Get slot at specific index
   */
  getSlot(index: number): SoilSlot | null {
    if (index < 0 || index >= this.slots.length) return null;
    return this.slots[index];
  }

  /**
   * Try to add soil to inventory.
   * Will attempt to stack with existing matching soil first,
   * then use empty slots if needed.
   * 
   * @returns Amount that couldn't be added (0 if all was added)
   */
  addSoil(soil: SoilItem): number {
    let remaining = soil.quantity;

    // First, try to stack with existing matching soil
    for (const slot of this.slots) {
      if (remaining <= 0) break;
      
      if (slot.item && slot.item.canStackWith(soil)) {
        const spaceInStack = this.maxStackSize - slot.item.quantity;
        if (spaceInStack > 0) {
          const amountToAdd = Math.min(remaining, spaceInStack);
          slot.item.quantity += amountToAdd;
          slot.item.quantity = Math.round(slot.item.quantity * 10) / 10;
          remaining -= amountToAdd;
        }
      }
    }

    // Then, try to use empty slots
    for (const slot of this.slots) {
      if (remaining <= 0) break;
      
      if (!slot.item) {
        const amountToAdd = Math.min(remaining, this.maxStackSize);
        slot.item = new SoilItem(
          { ...soil.nutrients },
          amountToAdd,
          soil.source
        );
        remaining -= amountToAdd;
      }
    }

    return Math.round(remaining * 10) / 10;
  }

  /**
   * Remove soil from a specific slot
   */
  removeFromSlot(slotIndex: number, amount: number): SoilItem | null {
    const slot = this.getSlot(slotIndex);
    if (!slot || !slot.item) return null;

    if (amount >= slot.item.quantity) {
      // Remove entire stack
      const removed = slot.item;
      slot.item = null;
      return removed;
    } else {
      // Split stack
      return slot.item.split(amount);
    }
  }

  /**
   * Combine two slots by mixing their soil.
   * Result goes into targetSlot, sourceSlot is emptied.
   * 
   * @returns true if successful, false if slots invalid or would exceed stack size
   */
  combineSlots(sourceIndex: number, targetIndex: number): boolean {
    const source = this.getSlot(sourceIndex);
    const target = this.getSlot(targetIndex);
    
    if (!source?.item || !target?.item || sourceIndex === targetIndex) {
      return false;
    }

    // If they can stack (same nutrients), just add quantities
    if (source.item.canStackWith(target.item)) {
      const totalQuantity = source.item.quantity + target.item.quantity;
      if (totalQuantity > this.maxStackSize) {
        return false; // Would exceed stack size
      }
      
      target.item.quantity = totalQuantity;
      source.item = null;
      return true;
    }

    // Otherwise, mix them
    const mixed = SoilItem.mix(source.item, target.item);
    if (mixed.quantity > this.maxStackSize) {
      return false; // Would exceed stack size
    }

    target.item = mixed;
    source.item = null;
    return true;
  }

  /**
   * Split a stack in a slot
   * 
   * @param slotIndex Slot to split
   * @param amount Amount to split off
   * @param targetSlotIndex Where to put the split portion (must be empty)
   * @returns true if successful
   */
  splitStack(slotIndex: number, amount: number, targetSlotIndex: number): boolean {
    const sourceSlot = this.getSlot(slotIndex);
    const targetSlot = this.getSlot(targetSlotIndex);
    
    if (!sourceSlot?.item || !targetSlot || targetSlot.item) {
      return false;
    }

    const splitItem = sourceSlot.item.split(amount);
    if (!splitItem) {
      return false;
    }

    targetSlot.item = splitItem;
    return true;
  }

  /**
   * Get total soil grouped by nutrient profile
   * Useful for UI display
   */
  getSoilByProfile(): Map<string, { profile: NutrientProfile; total: number; sources: Set<string> }> {
    const grouped = new Map<string, { profile: NutrientProfile; total: number; sources: Set<string> }>();
    
    for (const slot of this.slots) {
      if (!slot.item) continue;
      
      const key = slot.item.getNutrientString();
      const existing = grouped.get(key);
      
      if (existing) {
        existing.total += slot.item.quantity;
        existing.sources.add(slot.item.source);
      } else {
        grouped.set(key, {
          profile: { ...slot.item.nutrients },
          total: slot.item.quantity,
          sources: new Set([slot.item.source])
        });
      }
    }
    
    return grouped;
  }

  /**
   * Clear a specific slot
   */
  clearSlot(slotIndex: number): void {
    const slot = this.getSlot(slotIndex);
    if (slot) {
      slot.item = null;
    }
  }

  /**
   * Get total number of slots
   */
  getSlotCount(): number {
    return this.slots.length;
  }

  /**
   * Get number of empty slots
   */
  getEmptySlotCount(): number {
    return this.slots.filter(slot => !slot.item).length;
  }

  /**
   * Check if inventory is full (no empty slots and no stacking room)
   */
  isFull(): boolean {
    // Check for empty slots
    if (this.getEmptySlotCount() > 0) return false;
    
    // Check if any stack has room
    for (const slot of this.slots) {
      if (slot.item && slot.item.quantity < this.maxStackSize) {
        return false;
      }
    }
    
    return true;
  }
}