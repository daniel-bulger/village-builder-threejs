import { OrganicPlantState, OrganicPlantType } from '../farming/OrganicGrowthSystem';

export class OrganicPlantInspectorUI {
  private container: HTMLDivElement;
  private visible: boolean = false;
  private cachedWidth: number = 0;
  private cachedHeight: number = 0;
  private lastPlantId: string | null = null;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'organic-plant-inspector';
    this.container.style.cssText = `
      position: absolute;
      background: rgba(0, 20, 0, 0.9);
      border: 2px solid #00ff88;
      border-radius: 8px;
      padding: 12px;
      color: white;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      min-width: 250px;
      display: none;
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
    `;
    document.body.appendChild(this.container);
  }
  
  show(plant: OrganicPlantState, plantType: OrganicPlantType, mouseX: number, mouseY: number): void {
    this.visible = true;
    this.container.style.display = 'block';
    
    // Update content - remove caching to ensure live updates
    this.updateContent(plant, plantType);
    this.lastPlantId = plant.id;
    
    // Cache dimensions after content update
    const rect = this.container.getBoundingClientRect();
    this.cachedWidth = rect.width;
    this.cachedHeight = rect.height;
    
    // Position near mouse but keep on screen
    const padding = 20;
    let left = mouseX + padding;
    let top = mouseY + padding;
    
    // Adjust if would go off screen using cached dimensions
    if (this.cachedWidth > 0 && this.cachedHeight > 0) {
      if (left + this.cachedWidth > window.innerWidth) {
        left = mouseX - this.cachedWidth - padding;
      }
      if (top + this.cachedHeight > window.innerHeight) {
        top = mouseY - this.cachedHeight - padding;
      }
    }
    
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }
  
  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }
  
  updatePosition(mouseX: number, mouseY: number): void {
    if (!this.visible) return;
    
    // Position near mouse but keep on screen
    const padding = 20;
    let left = mouseX + padding;
    let top = mouseY + padding;
    
    // Adjust if would go off screen using cached dimensions
    if (this.cachedWidth > 0 && this.cachedHeight > 0) {
      if (left + this.cachedWidth > window.innerWidth) {
        left = mouseX - this.cachedWidth - padding;
      }
      if (top + this.cachedHeight > window.innerHeight) {
        top = mouseY - this.cachedHeight - padding;
      }
    }
    
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }
  
  private updateContent(plant: OrganicPlantState, plantType: OrganicPlantType): void {
    // Count components
    const componentCounts = plant.componentCount;
    const totalComponents = componentCounts.root + componentCounts.stem + componentCounts.leaf;
    
    // Count active growth points
    const activeGrowthPoints = plant.growthPoints.size;
    
    // Calculate average health
    let totalHealth = 0;
    let leafCount = 0;
    for (const component of plant.components.values()) {
      totalHealth += component.health;
      if (component.type === 'leaf') leafCount++;
    }
    const avgHealth = totalComponents > 0 ? (totalHealth / totalComponents) : 0;
    
    // Create resource bars
    const createBar = (label: string, value: number, color: string): string => {
      const percentage = Math.round(value * 100);
      const barWidth = 120;
      const filledWidth = Math.round(barWidth * value);
      return `
        <div style="margin: 4px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${label}:</span>
            <span>${percentage}%</span>
          </div>
          <div style="width: ${barWidth}px; height: 8px; background: #1a1a1a; border-radius: 4px; overflow: hidden; border: 1px solid #444;">
            <div style="width: ${filledWidth}px; height: 100%; background: ${color};"></div>
          </div>
        </div>
      `;
    };
    
    // Calculate growth activity
    let growthActivity = "Active";
    let activityColor = "#00ff88";
    if (plant.resources.water < 0.3) {
      growthActivity = "Water Limited";
      activityColor = "#ff6666";
    } else if (plant.resources.energy < 1) {
      growthActivity = "Energy Limited";
      activityColor = "#ffaa00";
    } else if (activeGrowthPoints === 0) {
      growthActivity = "Mature";
      activityColor = "#6666ff";
    }
    
    // Format age
    const ageMinutes = Math.floor(plant.age / 60);
    const ageSeconds = Math.floor(plant.age % 60);
    const ageStr = `${ageMinutes}:${ageSeconds.toString().padStart(2, '0')}`;
    
    this.container.innerHTML = `
      <div style="text-align: center; margin-bottom: 8px;">
        <strong style="color: #00ff88; font-size: 14px;">${plantType.name}</strong>
        <br>
        <span style="color: #aaa;">Organic Growth Mode</span>
        <br>
        <span style="color: ${activityColor}; font-size: 11px;">Status: ${growthActivity}</span>
      </div>
      
      <div style="border-top: 1px solid #00ff88; padding-top: 8px; margin-bottom: 8px;">
        <strong>Structure:</strong>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 4px;">
          <div style="text-align: center;">
            <div style="color: #8B4513;">Roots</div>
            <div style="font-size: 16px; font-weight: bold;">${componentCounts.root}</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #228B22;">Stems</div>
            <div style="font-size: 16px; font-weight: bold;">${componentCounts.stem}</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #32CD32;">Leaves</div>
            <div style="font-size: 16px; font-weight: bold;">${componentCounts.leaf}</div>
          </div>
        </div>
      </div>
      
      <div style="border-top: 1px solid #444; padding-top: 8px;">
        <strong>Resources:</strong>
        ${createBar('Water', plant.resources.water, '#4169E1')}
        <div style="color: #888; font-size: 10px; margin-top: -4px; margin-bottom: 4px;">
          ${(plant.resources.water * 1000).toFixed(0)} / 1000 mL
        </div>
        ${createBar('Energy', Math.min(1, plant.resources.energy / 20), '#FFD700')}
        ${createBar('Health', avgHealth, '#32CD32')}
      </div>
      
      <div style="margin-top: 8px; border-top: 1px solid #444; padding-top: 8px; color: #aaa;">
        <div style="display: flex; justify-content: space-between;">
          <span>Growth Points:</span>
          <span style="color: #00ff88;">${activeGrowthPoints}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Age:</span>
          <span>${ageStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Max Height:</span>
          <span>${plantType.maxHeight} blocks</span>
        </div>
      </div>
      
      <div style="margin-top: 8px; border-top: 1px solid #444; padding-top: 8px;">
        <div style="text-align: center; color: #888; font-size: 10px;">
          Components grow toward resources<br>
          Roots: Water | Stems: Light | Leaves: Sun
        </div>
      </div>
    `;
  }
  
  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}