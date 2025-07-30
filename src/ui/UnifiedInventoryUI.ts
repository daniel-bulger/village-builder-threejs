import { UnifiedInventorySystem } from '../inventory/UnifiedInventorySystem';
import { ItemType } from '../inventory/InventorySystem';

export class UnifiedInventoryUI {
  private unifiedInventory: UnifiedInventorySystem;
  private container: HTMLDivElement;
  private inventoryGrid: HTMLDivElement;
  private hotbarContainer: HTMLDivElement;
  private isOpen: boolean = false;
  
  // Drag state
  private draggedFromIndex: number | null = null;
  private draggedFromHotbar: boolean = false;
  private dragPreview: HTMLDivElement | null = null;
  private lastDragOverTarget: { element: HTMLElement; index: number } | null = null;
  private mouseUpHandler: ((e: MouseEvent) => void) | null = null;
  
  constructor(unifiedInventory: UnifiedInventorySystem) {
    this.unifiedInventory = unifiedInventory;
    this.container = this.createContainer();
    this.inventoryGrid = this.createInventoryGrid();
    this.hotbarContainer = this.createHotbar();
    
    this.setupEventListeners();
    this.update();
  }
  
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'unified-inventory';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid #444;
      border-radius: 8px;
      padding: 20px;
      padding-left: 70px;
      display: none;
      z-index: 1000;
      user-select: none;
    `;
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Inventory';
    title.style.cssText = `
      color: white;
      margin: 0 0 15px 0;
      text-align: center;
      font-family: Arial, sans-serif;
    `;
    container.appendChild(title);
    
    // Info text
    const info = document.createElement('p');
    info.style.cssText = `
      color: #888;
      font-size: 11px;
      margin: -10px 0 15px 0;
      text-align: center;
      font-family: Arial, sans-serif;
    `;
    info.textContent = 'Soil: Drag to swap, Shift+drag to merge • Right-click to split';
    container.appendChild(info);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
    `;
    closeBtn.onclick = () => this.close();
    container.appendChild(closeBtn);
    
    document.body.appendChild(container);
    return container;
  }
  
  private createInventoryGrid(): HTMLDivElement {
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(10, 50px);
      grid-template-rows: repeat(4, 50px);
      gap: 4px;
      margin-bottom: 20px;
    `;
    
    // Create 40 inventory slots
    for (let i = 0; i < 40; i++) {
      const slot = this.createInventorySlot(i);
      grid.appendChild(slot);
    }
    
    // Add label for hotbar row
    const hotbarLabel = document.createElement('div');
    hotbarLabel.style.cssText = `
      position: absolute;
      top: 55px;
      left: -50px;
      color: #aaa;
      font-size: 12px;
      font-family: Arial, sans-serif;
      transform: rotate(-90deg);
      transform-origin: center;
      width: 80px;
      text-align: center;
    `;
    hotbarLabel.textContent = 'Hotbar';
    this.container.appendChild(hotbarLabel);
    
    this.container.appendChild(grid);
    return grid;
  }
  
  private createHotbar(): HTMLDivElement {
    // Hotbar always visible at bottom of screen
    const hotbarContainer = document.createElement('div');
    hotbarContainer.id = 'hotbar-container';
    hotbarContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px;
      padding-top: 25px;
      border-radius: 8px;
      border: 1px solid #444;
      z-index: 100;
    `;
    
    // Add "Hotbar" label
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: 5px;
      left: 50%;
      transform: translateX(-50%);
      color: #aaa;
      font-size: 11px;
      font-family: Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    label.textContent = 'Hotbar';
    hotbarContainer.appendChild(label);
    
    // Create 10 hotbar slots
    for (let i = 0; i < 10; i++) {
      const slot = this.createHotbarSlot(i);
      hotbarContainer.appendChild(slot);
    }
    
    document.body.appendChild(hotbarContainer);
    return hotbarContainer;
  }
  
  private createInventorySlot(index: number): HTMLDivElement {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.dataset.index = index.toString();
    
    // Style first 10 slots (hotbar) differently
    const isHotbar = index < 10;
    slot.style.cssText = `
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, ${isHotbar ? '0.15' : '0.1'});
      border: ${isHotbar ? '2px solid #888' : '1px solid #666'};
      border-radius: 4px;
      position: relative;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    `;
    
    // Add hotkey label for hotbar slots
    if (isHotbar) {
      const hotkey = document.createElement('div');
      hotkey.style.cssText = `
        position: absolute;
        top: 2px;
        left: 4px;
        color: #ccc;
        font-size: 12px;
        font-family: Arial, sans-serif;
      `;
      hotkey.textContent = index < 9 ? `${index + 1}` : '0';
      slot.appendChild(hotkey);
    }
    
    // Make draggable
    slot.draggable = true;
    slot.ondragstart = (e) => this.onDragStart(e, index, false);
    slot.ondragenter = (e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      return false;
    };
    slot.ondragover = (e) => this.onDragOver(e);
    slot.ondragleave = (e) => this.onDragLeave(e);
    slot.ondrop = (e) => this.onDrop(e, index, false);
    slot.ondragend = (e) => this.onDragEnd(e);
    
    // Click to assign to hotbar
    slot.onclick = () => this.onInventorySlotClick(index);
    
    // Right-click to split soil
    slot.oncontextmenu = (e) => this.onRightClick(e, index);
    
    return slot;
  }
  
  private createHotbarSlot(index: number): HTMLDivElement {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';
    slot.dataset.hotbarIndex = index.toString();
    slot.style.cssText = `
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, 0.15);
      border: 2px solid #888;
      border-radius: 4px;
      position: relative;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    `;
    
    // Hotkey label
    const hotkey = document.createElement('div');
    hotkey.style.cssText = `
      position: absolute;
      top: 2px;
      left: 4px;
      color: #ccc;
      font-size: 12px;
      font-family: Arial, sans-serif;
    `;
    hotkey.textContent = index < 9 ? `${index + 1}` : '0';
    slot.appendChild(hotkey);
    
    // Make draggable and droppable
    slot.draggable = true;
    slot.ondragstart = (e) => this.onDragStart(e, index, true);
    slot.ondragenter = (e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      return false;
    };
    slot.ondragover = (e) => this.onDragOver(e);
    slot.ondragleave = (e) => this.onDragLeave(e);
    slot.ondrop = (e) => this.onDrop(e, index, true);
    slot.ondragend = (e) => this.onDragEnd(e);
    
    // Click to select hotbar slot
    slot.onclick = () => {
      this.unifiedInventory.setActiveHotbarSlot(index);
      this.update();
    };
    
    return slot;
  }
  
  private onDragStart(e: DragEvent, index: number, isHotbar: boolean): void {
    this.draggedFromIndex = index;
    this.draggedFromHotbar = isHotbar;
    
    // Get the item being dragged
    const item = this.unifiedInventory.getInventoryItem(index);
    if (item) {
      e.dataTransfer!.effectAllowed = 'move';
      // Set multiple data types to ensure compatibility
      e.dataTransfer!.setData('text/plain', index.toString());
      e.dataTransfer!.setData('application/x-inventory-slot', index.toString());
      
      // Add drag class for styling
      const element = e.currentTarget as HTMLElement;
      element.style.opacity = '0.5';
      
      // Set a custom drag image if needed
      const dragImage = element.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.8';
      document.body.appendChild(dragImage);
      e.dataTransfer!.setDragImage(dragImage, 25, 25);
      setTimeout(() => document.body.removeChild(dragImage), 0);
      
      // Add global mouse up handler as backup
      this.mouseUpHandler = (mouseEvent: MouseEvent) => {
        // Check if we're over a valid drop target
        const target = document.elementFromPoint(mouseEvent.clientX, mouseEvent.clientY);
        if (target && (target.classList.contains('inventory-slot') || target.classList.contains('hotbar-slot'))) {
          const dropIndex = parseInt(target.getAttribute('data-index') || target.getAttribute('data-hotbar-index') || '-1');
          if (dropIndex >= 0 && this.draggedFromIndex !== null) {
            // Simulate drop
            const isHotbarTarget = target.classList.contains('hotbar-slot');
            const fakeDropEvent = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              shiftKey: mouseEvent.shiftKey,
              ctrlKey: mouseEvent.ctrlKey,
              altKey: mouseEvent.altKey
            });
            this.onDrop(fakeDropEvent, dropIndex, isHotbarTarget);
          }
        }
        this.cleanupDrag();
      };
      
      // Add listener with slight delay to avoid interfering with normal drop
      setTimeout(() => {
        if (this.mouseUpHandler) {
          document.addEventListener('mouseup', this.mouseUpHandler, { capture: true });
        }
      }, 100);
    } else {
      // Prevent dragging empty slots
      e.preventDefault();
    }
  }
  
  private onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    
    // Force the browser to allow drop
    e.dataTransfer!.dropEffect = 'move';
    
    // Only allow drop if we're actually dragging something
    if (this.draggedFromIndex !== null) {
      // Get the slot index from the target
      const target = e.currentTarget as HTMLElement;
      const targetIndex = parseInt(target.dataset.index || target.dataset.hotbarIndex || '-1');
      
      // Store the current drop target for use in dragend if needed
      this.lastDragOverTarget = { element: target, index: targetIndex };
      
      // Check if this would be a valid drop
      const fromItem = this.unifiedInventory.getInventoryItem(this.draggedFromIndex);
      const toItem = targetIndex >= 0 ? this.unifiedInventory.getInventoryItem(targetIndex) : null;
      
      // Update drop effect based on operation type
      if (fromItem && toItem && 
          fromItem.type === ItemType.RESOURCE && fromItem.id.startsWith('soil_') &&
          toItem.type === ItemType.RESOURCE && toItem.id.startsWith('soil_')) {
        const sameSoil = fromItem.id === toItem.id;
        e.dataTransfer!.dropEffect = (sameSoil || e.shiftKey) ? 'copy' : 'move';
      } else {
        e.dataTransfer!.dropEffect = 'move';
      }
      
      // Add visual feedback
      if (target) {
        // Different color based on what will happen
        if (fromItem && toItem && 
            fromItem.type === ItemType.RESOURCE && fromItem.id.startsWith('soil_') &&
            toItem.type === ItemType.RESOURCE && toItem.id.startsWith('soil_')) {
          
          const sameSoil = fromItem.id === toItem.id;
          // Show merge color if same soil OR shift is held
          if (sameSoil || e.shiftKey) {
            target.style.backgroundColor = 'rgba(255, 170, 0, 0.3)'; // Orange for merge
            target.style.cursor = 'cell'; // Merge cursor
          } else {
            target.style.backgroundColor = 'rgba(100, 200, 255, 0.3)'; // Blue for swap
            target.style.cursor = 'move'; // Move cursor
          }
        } else {
          target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; // White for move
          target.style.cursor = 'move';
        }
      }
    } else {
      e.dataTransfer!.dropEffect = 'none';
    }
    
    // Prevent default handling
    return false;
  }
  
  private onDragEnd(e: DragEvent): void {
    // Clean up but let mouseup handler deal with the drop if needed
    this.cleanupDrag();
  }
  
  private cleanupDrag(): void {
    // Remove mouse up handler
    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler, { capture: true });
      this.mouseUpHandler = null;
    }
    
    // Reset drag state
    this.draggedFromIndex = null;
    this.draggedFromHotbar = false;
    this.lastDragOverTarget = null;
    
    // Clean up visual feedback
    const allSlots = document.querySelectorAll('.inventory-slot, .hotbar-slot');
    allSlots.forEach(slot => {
      const el = slot as HTMLElement;
      el.style.opacity = '1';
      el.style.cursor = 'pointer';
      if (el.classList.contains('hotbar-slot')) {
        el.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      } else {
        el.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      }
    });
  }
  
  private onDragLeave(e: DragEvent): void {
    // Remove visual feedback
    const target = e.currentTarget as HTMLElement;
    if (target) {
      // Reset to original background
      const isHotbar = target.classList.contains('hotbar-slot');
      target.style.backgroundColor = isHotbar ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)';
    }
  }
  
  private onDrop(e: DragEvent, dropIndex: number, dropToHotbar: boolean): void {
    // Multiple prevention methods to ensure drop works
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    e.cancelBubble = true;
    e.returnValue = false;
    
    // Reset visual feedback
    const target = e.currentTarget as HTMLElement;
    if (target) {
      const isHotbar = target.classList.contains('hotbar-slot');
      target.style.backgroundColor = isHotbar ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)';
      target.style.cursor = 'pointer';
    }
    
    if (this.draggedFromIndex === null) {
      console.log('onDrop: no draggedFromIndex');
      return;
    }
    
    console.log(`onDrop: from ${this.draggedFromIndex} to ${dropIndex}`);
    
    // Check if both slots contain soil
    const fromItem = this.unifiedInventory.getInventoryItem(this.draggedFromIndex);
    const toItem = this.unifiedInventory.getInventoryItem(dropIndex);
    
    if (fromItem && toItem && 
        fromItem.type === ItemType.RESOURCE && fromItem.id.startsWith('soil_') &&
        toItem.type === ItemType.RESOURCE && toItem.id.startsWith('soil_')) {
      
      // Check if soils have same nutrients (comparing IDs)
      const sameSoil = fromItem.id === toItem.id;
      
      // If same soil type OR shift is held, try to combine them
      if (sameSoil || e.shiftKey) {
        // Try to combine soils
        const combined = this.unifiedInventory.combineSoils(this.draggedFromIndex, dropIndex);
        if (combined) {
          this.draggedFromIndex = null;
          this.draggedFromHotbar = false;
          this.update();
          return;
        } else {
          // Combine failed - check why
          const totalQuantity = this.unifiedInventory.getInventoryQuantity(this.draggedFromIndex) + 
                               this.unifiedInventory.getInventoryQuantity(dropIndex);
          
          if (totalQuantity > 10) {
            // Would exceed max stack size - show a visual indication
            console.log('Cannot combine: would exceed max stack size of 10');
            // Still clean up state
            this.draggedFromIndex = null;
            this.draggedFromHotbar = false;
            return; // Don't swap if user intended to merge
          }
        }
      }
      // If not combining (no shift key), fall through to normal swap behavior
    }
    
    if (dropToHotbar) {
      // Move to hotbar slot
      this.unifiedInventory.moveToHotbar(this.draggedFromIndex, dropIndex);
    } else {
      // Regular inventory move
      this.unifiedInventory.moveItem(this.draggedFromIndex, dropIndex);
    }
    
    this.cleanupDrag();
    this.update();
  }
  
  private onInventorySlotClick(index: number): void {
    if (!this.unifiedInventory.getInventoryItem(index)) return;
    
    // If clicking on a hotbar slot, select it
    if (index < 10) {
      this.unifiedInventory.setActiveHotbarSlot(index);
      this.update();
      return;
    }
    
    // Otherwise, try to move to first empty hotbar slot
    const hotbarSlots = this.unifiedInventory.getHotbarSlots();
    for (let i = 0; i < hotbarSlots.length; i++) {
      if (!hotbarSlots[i].item) {
        this.unifiedInventory.moveItem(index, i);
        this.update();
        break;
      }
    }
  }
  
  private setupEventListeners(): void {
    // Toggle inventory with 'I' key
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'i') {
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }
  
  public update(): void {
    // Update inventory slots
    const inventorySlots = this.inventoryGrid.querySelectorAll('.inventory-slot');
    const inventory = this.unifiedInventory.getInventorySlots();
    const activeSlot = this.unifiedInventory.getActiveHotbarSlot();
    
    inventorySlots.forEach((slotEl, index) => {
      const slot = inventory[index];
      const item = slot.item;
      
      // Highlight active hotbar slot in inventory
      if (index === activeSlot) {
        (slotEl as HTMLElement).style.borderColor = '#ffaa00';
        (slotEl as HTMLElement).style.borderWidth = '3px';
      } else if (index < 10) {
        (slotEl as HTMLElement).style.borderColor = '#888';
        (slotEl as HTMLElement).style.borderWidth = '2px';
      } else {
        (slotEl as HTMLElement).style.borderColor = '#666';
        (slotEl as HTMLElement).style.borderWidth = '1px';
      }
      
      // Clear previous content but keep hotkey label if it exists
      const children = Array.from(slotEl.children);
      children.forEach(child => {
        const isHotkey = child.textContent === '1' || child.textContent === '2' || 
                        child.textContent === '3' || child.textContent === '4' || 
                        child.textContent === '5' || child.textContent === '6' || 
                        child.textContent === '7' || child.textContent === '8' || 
                        child.textContent === '9' || child.textContent === '0';
        if (!isHotkey) {
          child.remove();
        }
      });
      
      if (item) {
        // Icon
        const icon = document.createElement('div');
        icon.textContent = item.icon || '📦';
        icon.style.cssText = 'font-size: 24px;';
        slotEl.appendChild(icon);
        
        // Quantity for stackable items
        // Always show quantity for soil, even if less than 1
        const isSoil = item.type === ItemType.RESOURCE && item.id.startsWith('soil_');
        if (item.stackable && (slot.quantity > 1 || isSoil)) {
          const qty = document.createElement('div');
          qty.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 4px;
            color: white;
            font-size: 12px;
            font-family: Arial, sans-serif;
            text-shadow: 1px 1px 2px black;
          `;
          // For soil, show one decimal place if fractional
          qty.textContent = isSoil && slot.quantity % 1 !== 0 
            ? slot.quantity.toFixed(1)
            : slot.quantity.toString();
          slotEl.appendChild(qty);
        }
        
        // Show water level for watering can
        if (item.id === 'watering_can' && item.metadata?.waterAmount !== undefined) {
          const waterIndicator = document.createElement('div');
          waterIndicator.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 4px;
            color: #4FC3F7;
            font-size: 11px;
            font-family: Arial, sans-serif;
            text-shadow: 1px 1px 2px black;
            font-weight: bold;
          `;
          const waterL = Math.floor(item.metadata.waterAmount / 1000);
          waterIndicator.textContent = `${waterL}L`;
          slotEl.appendChild(waterIndicator);
        }
        
        // Tooltip with description
        (slotEl as HTMLElement).title = this.getItemDescription(item);
      }
    });
    
    // Update hotbar (first 10 slots of inventory)
    const hotbarSlots = this.hotbarContainer.querySelectorAll('.hotbar-slot');
    
    hotbarSlots.forEach((slotEl, index) => {
      const slot = this.unifiedInventory.getInventorySlots()[index];
      const item = slot.item;
      
      // Clear previous content (except hotkey)
      const children = Array.from(slotEl.children);
      children.forEach(child => {
        if (child.textContent !== (index < 9 ? `${index + 1}` : '0')) {
          child.remove();
        }
      });
      
      // Highlight active slot
      if (index === activeSlot) {
        (slotEl as HTMLElement).style.borderColor = '#ffaa00';
        (slotEl as HTMLElement).style.borderWidth = '3px';
      } else {
        (slotEl as HTMLElement).style.borderColor = '#888';
        (slotEl as HTMLElement).style.borderWidth = '2px';
      }
      
      if (item) {
        // Icon
        const icon = document.createElement('div');
        icon.textContent = item.icon || '📦';
        icon.style.cssText = 'font-size: 24px;';
        slotEl.appendChild(icon);
        
        // Quantity for stackable items
        // Always show quantity for soil, even if less than 1
        const isSoil = item.type === ItemType.RESOURCE && item.id.startsWith('soil_');
        if (item.stackable && (slot.quantity > 1 || isSoil)) {
          const qty = document.createElement('div');
          qty.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 4px;
            color: white;
            font-size: 12px;
            font-family: Arial, sans-serif;
            text-shadow: 1px 1px 2px black;
          `;
          // For soil, show one decimal place if fractional
          qty.textContent = isSoil && slot.quantity % 1 !== 0 
            ? slot.quantity.toFixed(1)
            : slot.quantity.toString();
          slotEl.appendChild(qty);
        }
        
        // Show water level for watering can
        if (item.id === 'watering_can' && item.metadata?.waterAmount !== undefined) {
          const waterIndicator = document.createElement('div');
          waterIndicator.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 4px;
            color: #4FC3F7;
            font-size: 11px;
            font-family: Arial, sans-serif;
            text-shadow: 1px 1px 2px black;
            font-weight: bold;
          `;
          const waterL = Math.floor(item.metadata.waterAmount / 1000);
          waterIndicator.textContent = `${waterL}L`;
          slotEl.appendChild(waterIndicator);
        }
        
        // Tooltip with description
        (slotEl as HTMLElement).title = this.getItemDescription(item);
      }
    });
  }
  
  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  public open(): void {
    this.isOpen = true;
    this.container.style.display = 'block';
    this.update();
  }
  
  public close(): void {
    this.isOpen = false;
    this.container.style.display = 'none';
  }
  
  public isInventoryOpen(): boolean {
    return this.isOpen;
  }
  
  private onRightClick(e: MouseEvent, slotIndex: number): void {
    e.preventDefault();
    
    const item = this.unifiedInventory.getInventoryItem(slotIndex);
    if (!item || item.type !== ItemType.RESOURCE || !item.id.startsWith('soil_')) return;
    
    const quantity = this.unifiedInventory.getInventoryQuantity(slotIndex);
    if (quantity <= 1) return;
    
    this.showSplitModal(slotIndex, quantity);
  }
  
  private showSplitModal(slotIndex: number, maxQuantity: number): void {
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #444;
      border-radius: 8px;
      padding: 20px;
      z-index: 2000;
      color: white;
      font-family: Arial, sans-serif;
    `;
    
    modal.innerHTML = `
      <h3 style="margin: 0 0 15px 0;">Split Soil Stack</h3>
      <p style="margin: 10px 0;">Amount to split (max ${maxQuantity - 1}):</p>
      <input type="number" id="split-amount" min="1" max="${maxQuantity - 1}" value="${Math.floor(maxQuantity / 2)}" 
             style="background: #333; border: 1px solid #666; color: white; padding: 5px; width: 100px; margin: 10px 0;">
      <div style="margin-top: 15px;">
        <button id="split-confirm" style="background: #4a5568; border: none; color: white; padding: 8px 16px; margin-right: 10px; cursor: pointer; border-radius: 4px;">Split</button>
        <button id="split-cancel" style="background: #666; border: none; color: white; padding: 8px 16px; cursor: pointer; border-radius: 4px;">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = modal.querySelector('#split-amount') as HTMLInputElement;
    const confirmBtn = modal.querySelector('#split-confirm') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#split-cancel') as HTMLButtonElement;
    
    confirmBtn.onclick = () => {
      const amount = parseInt(input.value);
      if (amount > 0 && amount < maxQuantity) {
        // Find empty slot
        let emptySlot = -1;
        for (let i = 0; i < 40; i++) {
          if (!this.unifiedInventory.getInventoryItem(i)) {
            emptySlot = i;
            break;
          }
        }
        
        if (emptySlot >= 0) {
          const success = this.unifiedInventory.splitSoilStack(slotIndex, amount, emptySlot);
          if (success) {
            this.update();
          }
        } else {
          alert('No empty slot available for split soil');
        }
      }
      document.body.removeChild(modal);
    };
    
    cancelBtn.onclick = () => {
      document.body.removeChild(modal);
    };
    
    // Focus and select input
    input.focus();
    input.select();
  }
  
  private getItemDescription(item: InventoryItem): string {
    let description = item.name;
    
    // Add specific details based on item type
    if (item.type === ItemType.RESOURCE && item.id.startsWith('soil_')) {
      // Show nutrient levels for soil
      if (item.metadata?.nutrients) {
        const n = item.metadata.nutrients;
        description += `\nN-P-K: ${n.nitrogen}-${n.phosphorus}-${n.potassium}`;
        
        // Add source if available
        if (item.metadata.source) {
          description += `\nSource: ${item.metadata.source}`;
        }
      }
    } else if (item.type === ItemType.SEED) {
      // Show seed details
      const seedDescriptions: { [key: string]: string } = {
        'tomato_seeds': 'Grows delicious tomatoes\nNeeds: High phosphorus',
        'lettuce_seeds': 'Fast-growing leafy greens\nNeeds: High nitrogen',
        'carrot_seeds': 'Sweet root vegetables\nNeeds: Loose, sandy soil',
        'bean_seeds': 'Nitrogen-fixing legumes\nImproves soil quality',
        'mushroom_spores': 'Grows in shade\nNeeds: Moist conditions',
        'herb_seeds': 'Aromatic cooking herbs\nNeeds: Well-drained soil',
        'pepper_seeds': 'Spicy hot peppers\nNeeds: Warm temperatures',
        'eggplant_seeds': 'Purple vegetables\nNeeds: High phosphorus',
        'potato_seeds': 'Starchy tubers\nNeeds: High potassium',
        'crystal_seeds': 'Mystical crystal flowers\nNeeds: High potassium',
        'glowberry_seeds': 'Luminescent berries\nNeeds: Dark environments',
        'moss_spores': 'Cave-dwelling moss\nNeeds: Humid conditions'
      };
      
      if (seedDescriptions[item.id]) {
        description += `\n${seedDescriptions[item.id]}`;
      } else if (item.metadata?.plantType) {
        description += `\nPlant Type: ${item.metadata.plantType}`;
      }
      
      // Add biome origin
      if (item.metadata?.biomeOrigin) {
        const biomeNames: { [key: string]: string } = {
          'fertile_valley': 'Fertile Valley',
          'ancient_forest': 'Ancient Forest',
          'volcanic_ash': 'Volcanic Ash',
          'crystal_caves': 'Crystal Caves'
        };
        const biomeName = biomeNames[item.metadata.biomeOrigin] || item.metadata.biomeOrigin;
        description += `\nOrigin: ${biomeName}`;
      }
    } else if (item.type === ItemType.PLANT) {
      // Show uprooted plant details
      if (item.metadata?.plantState) {
        const state = item.metadata.plantState;
        description += `\nGrowth Stage: ${state.growthStage || 0}`;
        if (state.health) {
          description += `\nHealth: ${Math.round(state.health.water * 100)}%`;
        }
      }
    } else if (item.type === ItemType.TOOL) {
      // Add tool descriptions
      const toolDescriptions: { [key: string]: string } = {
        'watering_can': 'Waters plants and soil',
        'soil_placer': 'Places soil hexes',
        'inspector': 'Examine plant health',
        'barrier_tool': 'Place barriers on hex edges'
      };
      
      if (toolDescriptions[item.id]) {
        description += `\n${toolDescriptions[item.id]}`;
      }
      
      // Show water amount for watering can
      if (item.id === 'watering_can' && item.metadata?.waterAmount !== undefined) {
        const waterL = (item.metadata.waterAmount / 1000).toFixed(1);
        const maxL = (item.metadata.maxCapacity / 1000).toFixed(0);
        description += `\nWater: ${waterL}L / ${maxL}L`;
      }
    }
    
    // Add quantity for stackable items (always show for soil)
    const isSoil = item.type === ItemType.RESOURCE && item.id.startsWith('soil_');
    if (item.stackable && (item.quantity > 1 || isSoil)) {
      // For soil, show decimal if fractional
      const quantityStr = isSoil && item.quantity % 1 !== 0 
        ? item.quantity.toFixed(1)
        : item.quantity.toString();
      description += `\nQuantity: ${quantityStr}`;
    }
    
    return description;
  }
}