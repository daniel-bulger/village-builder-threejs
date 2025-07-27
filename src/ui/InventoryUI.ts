import { InventorySystem, InventorySlot, InventoryItem } from '../inventory/InventorySystem';
import { FarmingActionWheel, FarmingAction } from '../inventory/FarmingActions';

export class InventoryUI {
  private container: HTMLDivElement;
  private actionWheelContainer: HTMLDivElement;
  private inventorySystem: InventorySystem;
  private actionWheel: FarmingActionWheel;
  
  constructor(inventorySystem: InventorySystem, actionWheel: FarmingActionWheel) {
    this.inventorySystem = inventorySystem;
    this.actionWheel = actionWheel;
    
    // Create inventory hotbar
    this.container = document.createElement('div');
    this.container.id = 'inventory-hotbar';
    this.container.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 5px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 10px;
      border: 2px solid #444;
    `;
    document.body.appendChild(this.container);
    
    // Create action wheel
    this.actionWheelContainer = document.createElement('div');
    this.actionWheelContainer.id = 'action-wheel';
    this.actionWheelContainer.classList.add('action-wheel');
    this.actionWheelContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 400px;
      display: none;
      pointer-events: none;
    `;
    document.body.appendChild(this.actionWheelContainer);
    
    this.updateInventoryDisplay();
    this.createActionWheel();
  }
  
  private updateInventoryDisplay(): void {
    this.container.innerHTML = '';
    const slots = this.inventorySystem.getSlots();
    
    slots.forEach((slot, index) => {
      const slotElement = this.createSlotElement(slot, index);
      this.container.appendChild(slotElement);
    });
  }
  
  private createSlotElement(slot: InventorySlot, index: number): HTMLDivElement {
    const slotDiv = document.createElement('div');
    slotDiv.classList.add('hotbar-slot');
    slotDiv.style.cssText = `
      width: 50px;
      height: 50px;
      border: 2px solid #666;
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
      background: rgba(40, 40, 40, 0.8);
      transition: all 0.2s;
    `;
    
    // Highlight active slot
    if (index === this.inventorySystem.getActiveSlot()) {
      slotDiv.classList.add('active');
      slotDiv.style.border = '2px solid #00ff88';
      slotDiv.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
    }
    
    if (slot.item) {
      // Item icon
      const icon = document.createElement('div');
      icon.style.cssText = `
        font-size: 24px;
        line-height: 1;
      `;
      icon.textContent = slot.item.icon || '?';
      slotDiv.appendChild(icon);
      
      // Quantity for stackable items
      if (slot.item.stackable && slot.item.quantity > 1) {
        const quantity = document.createElement('div');
        quantity.style.cssText = `
          position: absolute;
          bottom: 2px;
          right: 2px;
          font-size: 10px;
          color: white;
          background: rgba(0, 0, 0, 0.7);
          padding: 1px 3px;
          border-radius: 3px;
        `;
        quantity.textContent = slot.item.quantity.toString();
        slotDiv.appendChild(quantity);
      }
    }
    
    // Hotkey indicator
    if (slot.hotkey) {
      const hotkey = document.createElement('div');
      hotkey.style.cssText = `
        position: absolute;
        top: 2px;
        left: 2px;
        font-size: 10px;
        color: #aaa;
        font-weight: bold;
      `;
      hotkey.textContent = slot.hotkey;
      slotDiv.appendChild(hotkey);
    }
    
    // Tooltip
    slotDiv.title = slot.item ? slot.item.name : 'Empty slot';
    
    return slotDiv;
  }
  
  private createActionWheel(): void {
    const actions = this.actionWheel.getActions();
    const angleStep = (Math.PI * 2) / actions.length;
    const radius = 150;
    
    // Create center button
    const centerBtn = document.createElement('div');
    centerBtn.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #666;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      cursor: pointer;
      pointer-events: all;
    `;
    centerBtn.textContent = 'Close';
    centerBtn.onclick = () => this.actionWheel.hide();
    this.actionWheelContainer.appendChild(centerBtn);
    
    // Create action buttons
    actions.forEach((action, index) => {
      const angle = angleStep * index - Math.PI / 2; // Start from top
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      const actionBtn = this.createActionButton(action, x, y);
      this.actionWheelContainer.appendChild(actionBtn);
    });
  }
  
  private createActionButton(action: FarmingAction, x: number, y: number): HTMLDivElement {
    const btn = document.createElement('div');
    btn.classList.add('action-item');
    btn.dataset.actionId = action.id;
    btn.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) translate(${x}px, ${y}px);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #666;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: all;
      transition: all 0.2s;
    `;
    
    // Icon
    const icon = document.createElement('div');
    icon.style.fontSize = '24px';
    icon.textContent = action.icon;
    btn.appendChild(icon);
    
    // Action name (hidden but accessible for tests)
    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    `;
    nameSpan.textContent = action.name;
    btn.appendChild(nameSpan);
    
    // Hotkey
    if (action.hotkey) {
      const hotkey = document.createElement('div');
      hotkey.style.cssText = `
        font-size: 10px;
        color: #aaa;
        margin-top: 2px;
      `;
      hotkey.textContent = action.hotkey;
      btn.appendChild(hotkey);
    }
    
    // Highlight if active
    const activeAction = this.actionWheel.getActiveAction();
    if (activeAction && activeAction.id === action.id) {
      btn.classList.add('active');
      btn.style.border = '2px solid #00ff88';
      btn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
    }
    
    // Hover effect
    btn.onmouseover = () => {
      if (!btn.classList.contains('active')) {
        btn.style.border = '2px solid #00ff88';
      }
      btn.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1.1)`;
      this.showActionTooltip(action, btn);
    };
    
    btn.onmouseout = () => {
      if (!btn.classList.contains('active')) {
        btn.style.border = '2px solid #666';
      }
      btn.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(1)`;
      this.hideActionTooltip();
    };
    
    btn.onclick = () => {
      this.actionWheel.setActiveAction(action.id);
      this.actionWheel.hide();
      this.update(); // Update UI to reflect new active action
    };
    
    return btn;
  }
  
  private tooltipElement: HTMLDivElement | null = null;
  
  private showActionTooltip(action: FarmingAction, element: HTMLElement): void {
    if (!this.tooltipElement) {
      this.tooltipElement = document.createElement('div');
      this.tooltipElement.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid #666;
        border-radius: 5px;
        padding: 8px;
        color: white;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(this.tooltipElement);
    }
    
    this.tooltipElement.innerHTML = `
      <strong>${action.name}</strong><br>
      <span style="color: #aaa">${action.description}</span>
    `;
    
    const rect = element.getBoundingClientRect();
    this.tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
    this.tooltipElement.style.top = `${rect.bottom + 10}px`;
    this.tooltipElement.style.transform = 'translateX(-50%)';
    this.tooltipElement.style.display = 'block';
  }
  
  private hideActionTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
  }
  
  update(): void {
    this.updateInventoryDisplay();
    this.actionWheelContainer.style.display = 
      this.actionWheel.isActionWheelVisible() ? 'block' : 'none';
    
    // Update action wheel active states
    this.updateActionWheelActiveStates();
  }
  
  private updateActionWheelActiveStates(): void {
    const activeAction = this.actionWheel.getActiveAction();
    const actionItems = this.actionWheelContainer.querySelectorAll('.action-item');
    
    actionItems.forEach((item) => {
      const btn = item as HTMLDivElement;
      if (activeAction && btn.dataset.actionId === activeAction.id) {
        btn.classList.add('active');
        btn.style.border = '2px solid #00ff88';
        btn.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
      } else {
        btn.classList.remove('active');
        if (!btn.matches(':hover')) {
          btn.style.border = '2px solid #666';
          btn.style.boxShadow = '';
        }
      }
    });
  }
  
  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.actionWheelContainer.parentNode) {
      this.actionWheelContainer.parentNode.removeChild(this.actionWheelContainer);
    }
    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
    }
  }
}