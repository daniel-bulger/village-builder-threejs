import { BuildingManager } from '../construction/BuildingManager';
import { BuildingPlacer } from '../construction/BuildingPlacer';

export class ConstructionDebugUI {
  private container: HTMLDivElement;
  private buildingManager: BuildingManager;
  private buildingPlacer: BuildingPlacer;
  private updateInterval: number;
  
  constructor(buildingManager: BuildingManager, buildingPlacer: BuildingPlacer) {
    this.buildingManager = buildingManager;
    this.buildingPlacer = buildingPlacer;
    
    this.container = document.createElement('div');
    this.container.id = 'construction-debug';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 5px;
      display: none;
      z-index: 1000;
      max-width: 300px;
    `;
    
    document.body.appendChild(this.container);
    
    // Toggle with F3
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });
  }
  
  toggle(): void {
    if (this.container.style.display === 'none') {
      this.container.style.display = 'block';
      this.startUpdate();
    } else {
      this.container.style.display = 'none';
      this.stopUpdate();
    }
  }
  
  private startUpdate(): void {
    this.updateInterval = window.setInterval(() => this.update(), 100);
  }
  
  private stopUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
  
  private update(): void {
    const placementInfo = this.buildingPlacer.getPlacementInfo();
    const buildings = this.buildingManager.getBuildings();
    const componentCount = Array.from(this.buildingManager.components.values()).length;
    
    let debugInfo = `<strong>Construction Debug</strong><br>`;
    debugInfo += `<hr>`;
    
    // Placement info
    debugInfo += `<strong>Placement Mode:</strong><br>`;
    debugInfo += `Active: ${placementInfo.isPlacing}<br>`;
    debugInfo += `Mode: ${placementInfo.mode}<br>`;
    debugInfo += `Component: ${placementInfo.componentType}<br>`;
    debugInfo += `Material: ${placementInfo.material}<br>`;
    debugInfo += `Level: ${placementInfo.level}<br>`;
    debugInfo += `<br>`;
    
    // Building stats
    debugInfo += `<strong>Building Stats:</strong><br>`;
    debugInfo += `Total Components: ${componentCount}<br>`;
    debugInfo += `Buildings: ${buildings.length}<br>`;
    debugInfo += `Can Undo: ${this.buildingManager.canUndo()}<br>`;
    debugInfo += `Can Redo: ${this.buildingManager.canRedo()}<br>`;
    debugInfo += `<br>`;
    
    // Component breakdown
    const componentTypes: Record<string, number> = {};
    this.buildingManager.components.forEach(comp => {
      componentTypes[comp.data.type] = (componentTypes[comp.data.type] || 0) + 1;
    });
    
    debugInfo += `<strong>Components by Type:</strong><br>`;
    Object.entries(componentTypes).forEach(([type, count]) => {
      debugInfo += `${type}: ${count}<br>`;
    });
    debugInfo += `<br>`;
    
    // Preview info
    if (this.buildingManager.previewComponent) {
      debugInfo += `<strong>Preview:</strong><br>`;
      debugInfo += `Valid: ${this.buildingManager.previewValid}<br>`;
      debugInfo += `Position: (${this.buildingManager.previewComponent.data.position.q}, ${this.buildingManager.previewComponent.data.position.r}, ${this.buildingManager.previewComponent.data.position.y})<br>`;
    }
    
    // Path info
    if (this.buildingPlacer.placementPath && this.buildingPlacer.placementPath.length > 0) {
      debugInfo += `<strong>Path:</strong><br>`;
      debugInfo += `Length: ${this.buildingPlacer.placementPath.length}<br>`;
      debugInfo += `Start: ${this.buildingPlacer.placementStart ? 'Set' : 'None'}<br>`;
    }
    
    this.container.innerHTML = debugInfo;
  }
  
  dispose(): void {
    this.stopUpdate();
    if (this.container.parentElement) {
      this.container.remove();
    }
  }
}