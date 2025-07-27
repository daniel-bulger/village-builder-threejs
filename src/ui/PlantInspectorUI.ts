import { PlantState, PlantType } from '../farming/PlantTypes';

export class PlantInspectorUI {
  private container: HTMLDivElement;
  private visible: boolean = false;
  private currentTimeOfDay: number = 0.5;
  private lastPlantId: string | null = null;
  private lastUpdateTime: number = 0;
  private cachedWidth: number = 0;
  private cachedHeight: number = 0;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'plant-inspector';
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
  
  setTimeOfDay(timeOfDay: number): void {
    this.currentTimeOfDay = timeOfDay;
  }
  
  show(plant: PlantState, plantType: PlantType, mouseX: number, mouseY: number): void {
    this.visible = true;
    this.container.style.display = 'block';
    
    // Only update content if it's a different plant or enough time has passed
    const now = Date.now();
    if (plant.id !== this.lastPlantId || now - this.lastUpdateTime > 500) {
      this.updateContent(plant, plantType);
      this.lastPlantId = plant.id;
      this.lastUpdateTime = now;
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
  
  private updateContent(plant: PlantState, plantType: PlantType): void {
    const stage = plantType.growthStages[plant.currentStage];
    const isHarvestable = stage.harvestYield && stage.harvestYield > 0;
    
    // Calculate progress percentage
    let progress = 0;
    let progressColor = '#aaa';
    if (stage.duration > 0) {
      progress = Math.round((plant.growthTimer / stage.duration) * 100);
      // Color code progress
      if (progress >= 100 && plant.currentStage < plantType.growthStages.length - 1) {
        progressColor = '#ff9900'; // Orange when stuck at 100%+
      }
    }
    
    // Create health bars
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
    
    // Format stunted status
    let stuntedInfo = '';
    if (plant.isStunted) {
      stuntedInfo = `
        <div style="color: #ff6666; margin-top: 8px; border-top: 1px solid #444; padding-top: 8px;">
          <strong>STUNTED</strong> - Growth blocked
          ${plant.stuntedBy ? `<br>Blocked by: ${plant.stuntedBy.length} plant(s)` : ''}
        </div>
      `;
    }
    
    // Format harvest info
    let harvestInfo = '';
    if (isHarvestable) {
      const expectedYield = plant.accumulatedYield !== undefined 
        ? Math.floor(plant.accumulatedYield)
        : Math.floor(stage.harvestYield! * Math.min(
            plant.health.water,
            plant.health.nutrients,
            plant.health.sunlight
          ));
      
      const isMaxYield = plant.accumulatedYield !== undefined && 
                        plant.accumulatedYield >= stage.harvestYield!;
      
      harvestInfo = `
        <div style="color: #66ff66; margin-top: 8px; border-top: 1px solid #444; padding-top: 8px;">
          <strong>Ready to Harvest!</strong>
          <br>Expected yield: ${expectedYield} / ${stage.harvestYield}
          ${isMaxYield ? '<br><span style="color: #ffaa00;">Max yield reached - no longer consuming resources</span>' : ''}
        </div>
      `;
    }
    
    // Calculate water consumption rate based on time of day
    let consumptionRate = "Normal";
    let consumptionColor = "#4169E1";
    let consumptionDetail = "";
    
    if (plant.health.water <= 0.3) {
      consumptionRate = "Stopped";
      consumptionColor = "#ff6666";
      consumptionDetail = "(stomata closed)";
    } else {
      const isDaytime = this.currentTimeOfDay > 0.25 && this.currentTimeOfDay < 0.75;
      if (!isDaytime) {
        consumptionRate = "Minimal";
        consumptionColor = "#6666ff";
        consumptionDetail = "(10% - night)";
      } else if (this.currentTimeOfDay >= 0.4 && this.currentTimeOfDay <= 0.6) {
        consumptionRate = "Maximum";
        consumptionColor = "#ff9900";
        consumptionDetail = "(100% - midday)";
      } else {
        consumptionRate = "Moderate";
        consumptionDetail = "(ramping)";
      }
    }
    
    // Determine growth status
    let growthStatus = "Growing";
    let growthColor = "#66ff66";
    const isDaytime = this.currentTimeOfDay > 0.25 && this.currentTimeOfDay < 0.75;
    const readyToAdvance = progress >= 100 && plant.currentStage < plantType.growthStages.length - 1;
    
    if (plant.health.water <= 0.3) {
      growthStatus = "Paused - No Water";
      growthColor = "#ff6666";
    } else if (!isDaytime) {
      growthStatus = "Paused - Night";
      growthColor = "#6666ff";
    } else if (plant.health.water < 0.5 || plant.health.nutrients < 0.5 || plant.health.sunlight < 0.5) {
      growthStatus = "Slowed - Low Resources";
      growthColor = "#ffaa00";
    } else if (plant.isStunted) {
      growthStatus = "Stunted - Blocked";
      growthColor = "#ff6666";
    } else if (readyToAdvance && !plant.isStunted) {
      growthStatus = "Ready to Advance";
      growthColor = "#ff9900";
    }
    
    this.container.innerHTML = `
      <div style="text-align: center; margin-bottom: 8px;">
        <strong style="color: #66ff66;">${plantType.name}</strong>
        <br>
        <span style="color: #aaa;">Stage: ${stage.name}</span>
        ${stage.duration > 0 ? `<br><span style="color: ${progressColor};">Progress: ${progress}%</span>` : ''}
        <br><span style="color: ${growthColor}; font-size: 11px;">Status: ${growthStatus}</span>
      </div>
      
      <div style="border-top: 1px solid #444; padding-top: 8px;">
        <strong>Health Status:</strong>
        ${createBar('Water', plant.health.water, '#4169E1')}
        ${createBar('Nutrients', plant.health.nutrients, '#32CD32')}
        ${createBar('Sunlight', plant.health.sunlight, '#FFD700')}
      </div>
      
      <div style="margin-top: 8px; border-top: 1px solid #444; padding-top: 8px; color: #aaa;">
        <strong>Requirements:</strong>
        <br>Water: ${stage.requirements.water}/tick
        <br>N-P-K: ${stage.requirements.nutrients.N}-${stage.requirements.nutrients.P}-${stage.requirements.nutrients.K}
        <br>Sun: ${stage.requirements.sunlight} hours
      </div>
      
      <div style="margin-top: 8px; border-top: 1px solid #444; padding-top: 8px;">
        <strong>Water Usage:</strong> <span style="color: ${consumptionColor}">${consumptionRate}</span>
        <br><span style="color: #888; font-size: 11px;">${consumptionDetail}</span>
      </div>
      
      ${harvestInfo}
      ${stuntedInfo}
    `;
  }
  
  dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}