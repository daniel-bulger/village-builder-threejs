/**
 * SoilInventoryUI.ts
 * 
 * UI component for displaying and managing the soil inventory.
 * Shows soil stacks with their nutrient profiles and quantities.
 * Supports drag-and-drop for combining/splitting stacks.
 * 
 * Key features:
 * - Visual representation of N-P-K values with colors
 * - Drag to combine stacks (creates weighted average)
 * - Right-click to split stacks
 * - Hover to see detailed information
 */

import { SoilInventory, SoilSlot } from '../inventory/SoilInventory';
import { SoilItem } from '../items/SoilItem';

export class SoilInventoryUI {
  private container: HTMLDivElement;
  private inventory: SoilInventory;
  private slots: HTMLDivElement[] = [];
  private draggedSlot: number | null = null;
  private isVisible: boolean = false;
  private selectedSlot: number | null = null;
  private soilPlacerTool: any = null;

  constructor(inventory: SoilInventory) {
    this.inventory = inventory;
    this.container = this.createContainer();
    this.createSlots();
    this.setupKeyboardShortcut();
  }

  /**
   * Create the main container for the inventory UI
   */
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'soil-inventory';
    container.className = 'soil-inventory-container';
    container.innerHTML = `
      <div class="soil-inventory-header">
        <h3>Soil Inventory</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="soil-inventory-grid"></div>
      <div class="soil-inventory-info">
        <p>Drag to combine • Right-click to split</p>
      </div>
    `;

    // Style the container
    const style = document.createElement('style');
    style.textContent = `
      .soil-inventory-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid #4a5568;
        border-radius: 8px;
        padding: 20px;
        display: none;
        z-index: 1000;
        min-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }

      .soil-inventory-container.visible {
        display: block;
      }

      .soil-inventory-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        color: #e2e8f0;
      }

      .soil-inventory-header h3 {
        margin: 0;
        font-size: 20px;
      }

      .close-btn {
        background: none;
        border: none;
        color: #e2e8f0;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        color: #f56565;
      }

      .soil-inventory-grid {
        display: grid;
        grid-template-columns: repeat(4, 80px);
        gap: 10px;
        margin-bottom: 15px;
      }

      .soil-slot {
        width: 80px;
        height: 80px;
        border: 2px solid #4a5568;
        border-radius: 4px;
        background: rgba(30, 30, 40, 0.8);
        position: relative;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        user-select: none;
      }

      .soil-slot.occupied {
        background: rgba(40, 40, 50, 0.9);
        border-color: #718096;
      }

      .soil-slot.drag-over {
        border-color: #48bb78;
        box-shadow: 0 0 10px rgba(72, 187, 120, 0.5);
      }

      .soil-slot.dragging {
        opacity: 0.5;
      }

      .soil-slot.selected {
        border-color: #f6e05e;
        box-shadow: 0 0 15px rgba(246, 224, 94, 0.6);
      }

      .soil-nutrients {
        display: flex;
        gap: 2px;
        margin-bottom: 4px;
      }

      .nutrient-bar {
        width: 20px;
        height: 30px;
        border: 1px solid #2d3748;
        position: relative;
        overflow: hidden;
        border-radius: 2px;
      }

      .nutrient-fill {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        transition: height 0.2s;
      }

      .nutrient-fill.nitrogen {
        background: #ff6b6b;
      }

      .nutrient-fill.phosphorus {
        background: #51cf66;
      }

      .nutrient-fill.potassium {
        background: #339af0;
      }

      .soil-quantity {
        font-size: 14px;
        color: #cbd5e0;
        margin-top: 2px;
      }

      .soil-source {
        font-size: 10px;
        color: #718096;
        position: absolute;
        bottom: 2px;
        left: 0;
        right: 0;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 4px;
      }

      .soil-inventory-info {
        text-align: center;
        color: #718096;
        font-size: 12px;
        margin-top: 10px;
      }

      .soil-tooltip {
        position: absolute;
        background: rgba(10, 10, 20, 0.95);
        border: 1px solid #4a5568;
        border-radius: 4px;
        padding: 10px;
        color: #e2e8f0;
        font-size: 12px;
        z-index: 1001;
        pointer-events: none;
        min-width: 150px;
      }

      .soil-tooltip .nutrient-row {
        display: flex;
        justify-content: space-between;
        margin: 2px 0;
      }

      .soil-tooltip .nutrient-label {
        color: #a0aec0;
      }

      .split-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid #4a5568;
        border-radius: 8px;
        padding: 20px;
        z-index: 1002;
        color: #e2e8f0;
      }

      .split-modal input {
        background: rgba(30, 30, 40, 0.8);
        border: 1px solid #4a5568;
        color: #e2e8f0;
        padding: 5px 10px;
        margin: 10px 0;
        width: 100px;
      }

      .split-modal button {
        background: #4a5568;
        border: none;
        color: #e2e8f0;
        padding: 5px 15px;
        margin: 5px;
        cursor: pointer;
        border-radius: 4px;
      }

      .split-modal button:hover {
        background: #718096;
      }
    `;
    document.head.appendChild(style);

    // Add event listeners
    const closeBtn = container.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.hide());

    document.body.appendChild(container);
    return container;
  }

  /**
   * Create the inventory slot elements
   */
  private createSlots(): void {
    const grid = this.container.querySelector('.soil-inventory-grid')!;
    const slotCount = this.inventory.getSlotCount();

    for (let i = 0; i < slotCount; i++) {
      const slotElement = document.createElement('div');
      slotElement.className = 'soil-slot';
      slotElement.dataset.slot = i.toString();

      // Drag and drop events
      slotElement.draggable = true;
      slotElement.addEventListener('dragstart', (e) => this.handleDragStart(e, i));
      slotElement.addEventListener('dragover', (e) => this.handleDragOver(e));
      slotElement.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      slotElement.addEventListener('drop', (e) => this.handleDrop(e, i));
      slotElement.addEventListener('dragend', () => this.handleDragEnd());

      // Right-click for splitting
      slotElement.addEventListener('contextmenu', (e) => this.handleRightClick(e, i));

      // Hover for tooltip
      slotElement.addEventListener('mouseenter', (e) => this.showTooltip(e, i));
      slotElement.addEventListener('mouseleave', () => this.hideTooltip());
      
      // Click to select for placement
      slotElement.addEventListener('click', (e) => {
        if (!e.shiftKey && !e.ctrlKey) { // Normal click (not drag)
          this.selectSlot(i);
        }
      });

      grid.appendChild(slotElement);
      this.slots.push(slotElement);
    }
  }


  /**
   * Update a specific slot's visual representation
   */
  private updateSlot(index: number): void {
    const slotElement = this.slots[index];
    const slot = this.inventory.getSlot(index);
    
    if (!slot || !slot.item) {
      slotElement.className = 'soil-slot';
      slotElement.innerHTML = '';
      slotElement.draggable = false;
      return;
    }

    slotElement.className = 'soil-slot occupied';
    slotElement.draggable = true;

    const item = slot.item;
    slotElement.innerHTML = `
      <div class="soil-nutrients">
        <div class="nutrient-bar">
          <div class="nutrient-fill nitrogen" style="height: ${item.nutrients.nitrogen}%"></div>
        </div>
        <div class="nutrient-bar">
          <div class="nutrient-fill phosphorus" style="height: ${item.nutrients.phosphorus}%"></div>
        </div>
        <div class="nutrient-bar">
          <div class="nutrient-fill potassium" style="height: ${item.nutrients.potassium}%"></div>
        </div>
      </div>
      <div class="soil-quantity">${item.quantity.toFixed(1)}</div>
      <div class="soil-source">${item.source}</div>
    `;
  }

  /**
   * Show the inventory UI
   */
  public show(): void {
    this.isVisible = true;
    this.container.classList.add('visible');
    this.update();
  }

  /**
   * Hide the inventory UI
   */
  public hide(): void {
    this.isVisible = false;
    this.container.classList.remove('visible');
    this.hideTooltip();
  }

  /**
   * Toggle visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Setup keyboard shortcut (I key)
   */
  private setupKeyboardShortcut(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'i' || e.key === 'I') {
        this.toggle();
      }
    });
  }

  // Drag and drop handlers
  private handleDragStart(e: DragEvent, slotIndex: number): void {
    const slot = this.inventory.getSlot(slotIndex);
    if (!slot?.item) return;

    this.draggedSlot = slotIndex;
    const element = e.target as HTMLElement;
    element.classList.add('dragging');
    
    e.dataTransfer!.effectAllowed = 'move';
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    
    const element = e.currentTarget as HTMLElement;
    element.classList.add('drag-over');
  }

  private handleDragLeave(e: DragEvent): void {
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('drag-over');
  }

  private handleDrop(e: DragEvent, targetSlot: number): void {
    e.preventDefault();
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('drag-over');

    if (this.draggedSlot === null || this.draggedSlot === targetSlot) return;

    // Try to combine the slots
    const success = this.inventory.combineSlots(this.draggedSlot, targetSlot);
    if (success) {
      this.update();
    }
  }

  private handleDragEnd(): void {
    this.slots.forEach(slot => {
      slot.classList.remove('dragging', 'drag-over');
    });
    this.draggedSlot = null;
  }

  // Right-click to split
  private handleRightClick(e: MouseEvent, slotIndex: number): void {
    e.preventDefault();
    
    const slot = this.inventory.getSlot(slotIndex);
    if (!slot?.item || slot.item.quantity <= 1) return;

    this.showSplitModal(slotIndex);
  }

  /**
   * Show modal for splitting a stack
   */
  private showSplitModal(slotIndex: number): void {
    const slot = this.inventory.getSlot(slotIndex)!;
    const maxSplit = Math.floor(slot.item!.quantity * 10) / 10; // Round to 0.1

    const modal = document.createElement('div');
    modal.className = 'split-modal';
    modal.innerHTML = `
      <h3>Split Stack</h3>
      <p>Amount to split (max ${maxSplit.toFixed(1)}):</p>
      <input type="number" id="split-amount" min="0.1" max="${maxSplit}" step="0.1" value="${(maxSplit / 2).toFixed(1)}">
      <div>
        <button id="split-confirm">Split</button>
        <button id="split-cancel">Cancel</button>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#split-amount') as HTMLInputElement;
    const confirmBtn = modal.querySelector('#split-confirm') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#split-cancel') as HTMLButtonElement;

    confirmBtn.addEventListener('click', () => {
      const amount = parseFloat(input.value);
      if (amount > 0 && amount < slot.item!.quantity) {
        // Find empty slot
        let emptySlotIndex = -1;
        for (let i = 0; i < this.inventory.getSlotCount(); i++) {
          if (!this.inventory.getSlot(i)?.item) {
            emptySlotIndex = i;
            break;
          }
        }

        if (emptySlotIndex >= 0) {
          const success = this.inventory.splitStack(slotIndex, amount, emptySlotIndex);
          if (success) {
            this.update();
          }
        }
      }
      document.body.removeChild(modal);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    input.focus();
    input.select();
  }

  // Tooltip
  private tooltipElement: HTMLDivElement | null = null;

  private showTooltip(e: MouseEvent, slotIndex: number): void {
    const slot = this.inventory.getSlot(slotIndex);
    if (!slot?.item) return;

    const item = slot.item;
    
    if (!this.tooltipElement) {
      this.tooltipElement = document.createElement('div');
      this.tooltipElement.className = 'soil-tooltip';
      document.body.appendChild(this.tooltipElement);
    }

    this.tooltipElement.innerHTML = `
      <strong>${item.getDisplayName()}</strong>
      <div class="nutrient-row">
        <span class="nutrient-label">Nitrogen:</span>
        <span style="color: #ff6b6b">${item.nutrients.nitrogen.toFixed(1)}%</span>
      </div>
      <div class="nutrient-row">
        <span class="nutrient-label">Phosphorus:</span>
        <span style="color: #51cf66">${item.nutrients.phosphorus.toFixed(1)}%</span>
      </div>
      <div class="nutrient-row">
        <span class="nutrient-label">Potassium:</span>
        <span style="color: #339af0">${item.nutrients.potassium.toFixed(1)}%</span>
      </div>
      <div style="margin-top: 8px; color: #718096">
        Quantity: ${item.quantity.toFixed(1)} hexes<br>
        Source: ${item.source}
      </div>
    `;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltipElement.style.left = `${rect.right + 10}px`;
    this.tooltipElement.style.top = `${rect.top}px`;
  }

  private hideTooltip(): void {
    if (this.tooltipElement) {
      document.body.removeChild(this.tooltipElement);
      this.tooltipElement = null;
    }
  }

  /**
   * Select a slot for soil placement
   */
  private selectSlot(index: number): void {
    const slot = this.inventory.getSlot(index);
    
    // Clear selection if clicking empty slot or same slot
    if (!slot?.item || this.selectedSlot === index) {
      this.clearSelection();
      return;
    }
    
    // Clear previous selection
    if (this.selectedSlot !== null) {
      this.slots[this.selectedSlot].classList.remove('selected');
    }
    
    // Set new selection
    this.selectedSlot = index;
    this.slots[index].classList.add('selected');
    
    // Update soil placer tool if connected
    if (this.soilPlacerTool) {
      this.soilPlacerTool.selectSlot(index);
    }
  }
  
  /**
   * Clear slot selection
   */
  public clearSelection(): void {
    if (this.selectedSlot !== null) {
      this.slots[this.selectedSlot].classList.remove('selected');
      this.selectedSlot = null;
    }
    
    if (this.soilPlacerTool) {
      this.soilPlacerTool.clearSelection();
    }
  }
  
  /**
   * Connect to soil placer tool
   */
  public setSoilPlacerTool(tool: any): void {
    this.soilPlacerTool = tool;
  }
  
  /**
   * Update the visual representation of all slots
   */
  public update(): void {
    for (let i = 0; i < this.slots.length; i++) {
      this.updateSlot(i);
    }
    
    // Re-apply selection if it exists
    if (this.selectedSlot !== null && this.inventory.getSlot(this.selectedSlot)?.item) {
      this.slots[this.selectedSlot].classList.add('selected');
    } else if (this.selectedSlot !== null) {
      // Clear selection if slot is now empty
      this.clearSelection();
    }
  }

  /**
   * Clean up the UI
   */
  public destroy(): void {
    this.hideTooltip();
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}