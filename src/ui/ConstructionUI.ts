import { BuildingPlacer } from '../construction/BuildingPlacer';
import { ComponentType, MaterialType } from '../construction/BuildingTypes';

export class ConstructionUI {
  private container: HTMLDivElement;
  private buildingPlacer: BuildingPlacer;
  private visible: boolean = false;
  
  // UI elements
  private componentButtons: Map<ComponentType, HTMLButtonElement> = new Map();
  private materialButtons: Map<MaterialType, HTMLButtonElement> = new Map();
  private currentComponent: ComponentType = ComponentType.WALL;
  private currentMaterial: MaterialType = MaterialType.WOOD;
  
  constructor(buildingPlacer: BuildingPlacer) {
    this.buildingPlacer = buildingPlacer;
    
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'construction-ui';
    this.container.style.cssText = `
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(to bottom, rgba(20, 20, 20, 0.95), rgba(10, 10, 10, 0.95));
      border: 2px solid #5a5a5a;
      border-radius: 15px;
      padding: 20px;
      display: none;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: white;
      user-select: none;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      min-width: 600px;
      backdrop-filter: blur(5px);
    `;
    
    this.createComponentSection();
    this.createMaterialSection();
    this.createInfoSection();
    
    document.body.appendChild(this.container);
  }
  
  private createComponentSection(): void {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #333;
    `;
    
    const label = document.createElement('div');
    label.textContent = 'Component Type:';
    label.style.marginBottom = '5px';
    section.appendChild(label);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    `;
    
    const components: { type: ComponentType; label: string; icon: string }[] = [
      { type: ComponentType.FOUNDATION, label: 'Foundation', icon: '⬛' },
      { type: ComponentType.WALL, label: 'Wall', icon: '🧱' },
      { type: ComponentType.FLOOR, label: 'Floor', icon: '⬜' },
      { type: ComponentType.PILLAR, label: 'Pillar', icon: '🏛️' },
      { type: ComponentType.DOOR, label: 'Door', icon: '🚪' },
      { type: ComponentType.WINDOW, label: 'Window', icon: '🪟' },
      { type: ComponentType.STAIRS, label: 'Stairs', icon: '🪜' },
      { type: ComponentType.ROOF, label: 'Roof', icon: '🏠' },
    ];
    
    components.forEach(({ type, label, icon }) => {
      const button = document.createElement('button');
      button.textContent = `${icon} ${label}`;
      button.style.cssText = `
        padding: 8px 12px;
        background: #333;
        border: 1px solid #666;
        border-radius: 5px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      `;
      
      button.addEventListener('mouseenter', () => {
        button.style.background = '#444';
        button.style.borderColor = '#888';
      });
      
      button.addEventListener('mouseleave', () => {
        if (this.currentComponent !== type) {
          button.style.background = '#333';
          button.style.borderColor = '#666';
        }
      });
      
      button.addEventListener('click', () => {
        this.selectComponent(type);
      });
      
      this.componentButtons.set(type, button);
      buttonContainer.appendChild(button);
    });
    
    section.appendChild(buttonContainer);
    this.container.appendChild(section);
  }
  
  private createMaterialSection(): void {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #333;
    `;
    
    const label = document.createElement('div');
    label.textContent = 'Material:';
    label.style.marginBottom = '5px';
    section.appendChild(label);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 5px;
    `;
    
    const materials: { type: MaterialType; label: string; color: string }[] = [
      { type: MaterialType.WOOD, label: 'Wood', color: '#8B6F47' },
      { type: MaterialType.STONE, label: 'Stone', color: '#8B8989' },
      { type: MaterialType.BRICK, label: 'Brick', color: '#B22222' },
      { type: MaterialType.CRYSTAL, label: 'Crystal', color: '#87CEEB' },
      { type: MaterialType.METAL, label: 'Metal', color: '#708090' },
    ];
    
    materials.forEach(({ type, label, color }) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.style.cssText = `
        padding: 8px 16px;
        background: ${color}44;
        border: 2px solid ${color};
        border-radius: 5px;
        color: white;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.2s;
      `;
      
      button.addEventListener('mouseenter', () => {
        button.style.background = `${color}66`;
      });
      
      button.addEventListener('mouseleave', () => {
        if (this.currentMaterial !== type) {
          button.style.background = `${color}44`;
        }
      });
      
      button.addEventListener('click', () => {
        this.selectMaterial(type);
      });
      
      this.materialButtons.set(type, button);
      buttonContainer.appendChild(button);
    });
    
    section.appendChild(buttonContainer);
    this.container.appendChild(section);
  }
  
  private createInfoSection(): void {
    const section = document.createElement('div');
    section.style.cssText = `
      font-size: 12px;
      color: #aaa;
      text-align: center;
      margin-top: 10px;
    `;
    
    section.innerHTML = `
      <div id="placement-mode-indicator" style="color: #4CAF50; margin-bottom: 5px;">Mode: Single Placement</div>
      <div id="level-indicator" style="color: #2196F3; margin-bottom: 5px;">Level: Ground (0)</div>
      <div>Left Click: Place | Right Click: Cancel</div>
      <div>R/Q: Rotate | PageUp/Down: Change Level | G: Grid | ESC: Exit</div>
      <div style="font-size: 10px; color: #888;">Ctrl+Z: Undo | Ctrl+Y: Redo</div>
    `;
    
    this.container.appendChild(section);
  }
  
  private selectComponent(type: ComponentType): void {
    this.currentComponent = type;
    
    // Update button states
    this.componentButtons.forEach((button, buttonType) => {
      if (buttonType === type) {
        button.style.background = '#555';
        button.style.borderColor = '#aaa';
      } else {
        button.style.background = '#333';
        button.style.borderColor = '#666';
      }
    });
    
    // Start placement with new component
    if (this.visible) {
      this.buildingPlacer.startPlacement(type, this.currentMaterial);
      
      // Update placement mode indicator
      const modeIndicator = document.getElementById('placement-mode-indicator');
      if (modeIndicator) {
        const placementInfo = this.buildingPlacer.getPlacementInfo();
        let modeText = 'Single Placement';
        switch (placementInfo.mode) {
          case 'wall_line':
            modeText = 'Line Mode (Click start and end)';
            break;
          case 'floor_fill':
            modeText = 'Fill Mode (Click corners to fill area)';
            break;
          case 'room':
            modeText = 'Room Mode (Click corners for walls)';
            break;
        }
        modeIndicator.textContent = `Mode: ${modeText}`;
      }
      
      // Update level indicator
      this.updateLevelIndicator();
    }
  }
  
  private updateLevelIndicator(): void {
    const levelIndicator = document.getElementById('level-indicator');
    if (levelIndicator && this.visible) {
      const placementInfo = this.buildingPlacer.getPlacementInfo();
      const levelName = placementInfo.level === 0 ? 'Ground' : `Floor ${placementInfo.level}`;
      levelIndicator.textContent = `Level: ${levelName} (${placementInfo.level})`;
    }
  }
  
  private selectMaterial(type: MaterialType): void {
    this.currentMaterial = type;
    
    // Update button states
    const materials: Record<MaterialType, string> = {
      [MaterialType.WOOD]: '#8B6F47',
      [MaterialType.STONE]: '#8B8989',
      [MaterialType.BRICK]: '#B22222',
      [MaterialType.CRYSTAL]: '#87CEEB',
      [MaterialType.METAL]: '#708090',
    };
    
    this.materialButtons.forEach((button, buttonType) => {
      const color = materials[buttonType];
      if (buttonType === type) {
        button.style.background = `${color}88`;
      } else {
        button.style.background = `${color}44`;
      }
    });
    
    // Update placement with new material
    if (this.visible) {
      this.buildingPlacer.startPlacement(this.currentComponent, type);
    }
  }
  
  show(): void {
    this.visible = true;
    this.container.style.display = 'block';
    
    // Start with default selection
    this.selectComponent(ComponentType.WALL);
    this.selectMaterial(MaterialType.WOOD);
    
    // Start placement
    this.buildingPlacer.startPlacement(this.currentComponent, this.currentMaterial);
  }
  
  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    
    // Stop placement
    this.buildingPlacer.stopPlacement();
  }
  
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  isVisible(): boolean {
    return this.visible;
  }
  
  dispose(): void {
    this.hide();
    if (this.container.parentElement) {
      this.container.remove();
    }
  }
}