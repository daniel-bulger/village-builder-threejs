import { HexCoord3D } from '../utils/HexUtils';
import { NutrientLevels } from '../farming/NutrientSystem';
import { WaterHex, SoilType } from '../farming/WaterSimulation';

export class SoilInspectorUI {
  private container: HTMLDivElement;
  private visible: boolean = false;
  private cachedWidth: number = 0;
  private cachedHeight: number = 0;
  private lastHexKey: string | null = null;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'soil-inspector';
    this.container.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid #444;
      border-radius: 8px;
      padding: 12px;
      color: white;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      min-width: 200px;
      display: none;
    `;
    document.body.appendChild(this.container);
  }
  
  show(coord: HexCoord3D, nutrients: NutrientLevels | null, waterInfo: { waterML: number; capacityML: number; saturation: number; soilType: SoilType } | null, mouseX: number, mouseY: number): void {
    this.visible = true;
    this.container.style.display = 'block';
    
    // Update content if it's a different hex
    const hexKey = `${coord.q},${coord.r},${coord.y}`;
    if (hexKey !== this.lastHexKey) {
      this.updateContent(coord, nutrients, waterInfo);
      this.lastHexKey = hexKey;
      // Cache dimensions after content update
      const rect = this.container.getBoundingClientRect();
      this.cachedWidth = rect.width;
      this.cachedHeight = rect.height;
    }
    
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
  
  private updateContent(coord: HexCoord3D, nutrients: NutrientLevels | null, waterInfo: WaterHex | null): void {
    if (!nutrients || !waterInfo) {
      this.container.innerHTML = `
        <div style="color: #ff6666;">No soil data</div>
      `;
      return;
    }
    
    // Create nutrient bars
    const createBar = (label: string, value: number, color: string): string => {
      const percentage = Math.round(value * 100);
      const barWidth = 100;
      const filledWidth = Math.round(barWidth * value);
      return `
        <div style="margin: 4px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${label}:</span>
            <span>${percentage}%</span>
          </div>
          <div style="width: ${barWidth}px; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
            <div style="width: ${filledWidth}px; height: 100%; background: ${color};"></div>
          </div>
        </div>
      `;
    };
    
    // Water info
    const waterPercent = Math.round(waterInfo.saturation * 100);
    const waterML = Math.round(waterInfo.waterML);
    const capacityML = Math.round(waterInfo.capacityML);
    
    this.container.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #88ff88;">
        Soil at (${coord.q}, ${coord.r}, Y:${coord.y})
      </div>
      
      <div style="margin-bottom: 8px;">
        <strong>Soil Type:</strong> ${waterInfo.soilType}
      </div>
      
      <div style="margin-bottom: 8px; border-bottom: 1px solid #444; padding-bottom: 8px;">
        <strong>Water Content</strong>
        ${createBar('Water', waterInfo.saturation, '#4488ff')}
        <div style="font-size: 10px; color: #888; margin-top: 2px;">
          ${waterML} / ${capacityML} mL
        </div>
      </div>
      
      <div>
        <strong>Nutrients (N-P-K)</strong>
        ${createBar('Nitrogen', nutrients.nitrogen, '#00ff00')}
        ${createBar('Phosphorus', nutrients.phosphorus, '#ff00ff')}
        ${createBar('Potassium', nutrients.potassium, '#ff8800')}
      </div>
      
      <div style="margin-top: 8px; font-size: 10px; color: #888;">
        Tip: Plant beans to restore nitrogen
      </div>
    `;
  }
  
  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}