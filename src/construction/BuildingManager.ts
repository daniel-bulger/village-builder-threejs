import * as THREE from 'three';
import { BuildingComponent } from './BuildingComponent';
import { 
  ComponentData, 
  ComponentType, 
  SupportCheck,
  WallAlignment,
  calculateComponentWeight 
} from './BuildingTypes';
import { HexCoord3D } from '../utils/HexUtils';

interface BuildAction {
  type: 'place' | 'remove';
  components: ComponentData[];
  timestamp: number;
}

export interface Building {
  id: string;
  components: Map<string, BuildingComponent>;
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
  structuralIntegrity: number; // 0-1, where < 0.3 is critical
}

export class BuildingManager {
  private scene: THREE.Scene;
  private components: Map<string, BuildingComponent> = new Map();
  private buildings: Map<string, Building> = new Map();
  private spatialIndex: Map<string, Set<string>> = new Map(); // hex coord string -> component IDs
  private nextComponentId: number = 1;
  
  // Undo/Redo support
  private actionHistory: BuildAction[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 50;
  private nextBuildingId: number = 1;
  
  // Visual helpers
  private stressVisualizationEnabled: boolean = false;
  private previewComponent: BuildingComponent | null = null;
  private previewValid: boolean = false;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  // Create a component preview for placement
  createPreview(data: Partial<ComponentData>): BuildingComponent | null {
    if (this.previewComponent) {
      this.scene.remove(this.previewComponent.mesh);
      this.previewComponent.dispose();
    }
    
    // Create temporary component data
    const previewData: ComponentData = {
      id: 'preview',
      type: data.type || ComponentType.WALL,
      material: data.material || 'wood',
      position: data.position || { q: 0, r: 0, y: 0 },
      level: data.level || 0,
      wallAlignment: data.wallAlignment,
      vertexIndex: data.vertexIndex,
      metadata: data.metadata
    };
    
    this.previewComponent = new BuildingComponent(previewData);
    this.previewComponent.mesh.material = this.createPreviewMaterial();
    this.scene.add(this.previewComponent.mesh);
    
    this.updatePreviewValidity();
    
    return this.previewComponent;
  }
  
  // Update preview position and validity
  updatePreview(position: HexCoord3D, wallAlignment?: WallAlignment, vertexIndex?: number): void {
    if (!this.previewComponent) return;
    
    // Check if we need to recreate the mesh (component type specific data changed)
    const needsRecreate = 
      (wallAlignment !== undefined && wallAlignment !== this.previewComponent.data.wallAlignment) ||
      (vertexIndex !== undefined && vertexIndex !== this.previewComponent.data.vertexIndex);
    
    this.previewComponent.data.position = position;
    if (wallAlignment !== undefined) {
      this.previewComponent.data.wallAlignment = wallAlignment;
    }
    if (vertexIndex !== undefined) {
      this.previewComponent.data.vertexIndex = vertexIndex;
    }
    
    if (needsRecreate) {
      // Recreate mesh only when necessary
      this.scene.remove(this.previewComponent.mesh);
      this.previewComponent.mesh = this.previewComponent['createMesh']();
      this.previewComponent.mesh.material = this.createPreviewMaterial();
      this.scene.add(this.previewComponent.mesh);
    }
    
    // Always reposition
    this.previewComponent['positionMesh']();
    
    // Update validity check
    const wasValid = this.previewValid;
    this.updatePreviewValidity();
    
    // Only update material if validity changed
    if (wasValid !== this.previewValid) {
      this.previewComponent.mesh.material = this.createPreviewMaterial();
    }
  }
  
  // Clear preview
  clearPreview(): void {
    if (this.previewComponent) {
      this.scene.remove(this.previewComponent.mesh);
      this.previewComponent.dispose();
      this.previewComponent = null;
    }
  }
  
  // Place a component
  placeComponent(data: Partial<ComponentData>): BuildingComponent | null {
    // Generate ID
    const componentData: ComponentData = {
      ...data,
      id: `comp_${this.nextComponentId++}`,
      type: data.type || ComponentType.WALL,
      material: data.material || 'wood',
      position: data.position || { q: 0, r: 0, y: 0 },
      level: data.level || 0
    };
    
    // Check if placement is valid
    const supportCheck = this.checkSupport(componentData);
    if (!supportCheck.canSupport && componentData.type !== ComponentType.FOUNDATION) {
      console.warn('Cannot place component: insufficient support');
      return null;
    }
    
    // Create component
    const component = new BuildingComponent(componentData);
    this.components.set(component.id, component);
    this.scene.add(component.mesh);
    
    // Update spatial index (use only q,r for hex column indexing)
    const basePosition = { ...componentData.position, y: 0 };
    const hexKey = this.getHexKey(basePosition);
    if (!this.spatialIndex.has(hexKey)) {
      this.spatialIndex.set(hexKey, new Set());
    }
    this.spatialIndex.get(hexKey)!.add(component.id);
    
    // Find or create building
    this.assignToBuilding(component);
    
    // Update structural integrity
    this.updateStructuralIntegrity();
    
    // Clear preview
    this.clearPreview();
    
    return component;
  }
  
  // Remove a component
  removeComponent(componentId: string): boolean {
    const component = this.components.get(componentId);
    if (!component) return false;
    
    // Check if removal would cause collapse
    const dependentComponents = this.findDependentComponents(componentId);
    if (dependentComponents.length > 0) {
      console.warn(`Cannot remove component: ${dependentComponents.length} components depend on it`);
      return false;
    }
    
    // Remove from scene
    this.scene.remove(component.mesh);
    
    // Remove from spatial index (use only q,r for hex column indexing)
    const basePosition = { ...component.data.position, y: 0 };
    const hexKey = this.getHexKey(basePosition);
    this.spatialIndex.get(hexKey)?.delete(componentId);
    
    // Remove from components map
    this.components.delete(componentId);
    
    // Update building
    this.removeFromBuilding(component);
    
    // Update structural integrity
    this.updateStructuralIntegrity();
    
    // Dispose
    component.dispose();
    
    return true;
  }
  
  // Check if a component position has adequate support
  checkSupport(componentData: ComponentData): SupportCheck {
    // Foundations don't need support
    if (componentData.type === ComponentType.FOUNDATION) {
      return {
        canSupport: true,
        supportAvailable: Infinity,
        supportNeeded: 0,
        supportingComponents: []
      };
    }
    
    // Find components below this position
    const supportingComponents = this.findSupportingComponents(componentData);
    
    // Calculate total support available
    let supportAvailable = 0;
    const supportingIds: string[] = [];
    
    for (const comp of supportingComponents) {
      supportAvailable += comp.supportProvided;
      supportingIds.push(comp.id);
    }
    
    // Calculate support needed (weight of component + anything above)
    const supportNeeded = this.calculateTotalLoad(componentData);
    
    // Special check for floors
    if (componentData.type === ComponentType.FLOOR) {
      // Ground floor (level 0) is always supported - it sits on the ground
      if (componentData.level === 0) {
        return {
          canSupport: true,
          supportAvailable: Infinity,
          supportNeeded: supportNeeded,
          supportingComponents: []
        };
      }
      
      // Upper floors need at least 3 support points (pillars) or adequate wall coverage
      const pillarCount = supportingComponents.filter(c => c.data.type === ComponentType.PILLAR).length;
      const wallCount = supportingComponents.filter(c => c.data.type === ComponentType.WALL).length;
      
      // Need at least 3 pillars OR at least 3 wall segments for adequate support distribution
      const hasMinimumSupportPoints = pillarCount >= 3 || wallCount >= 3 || (pillarCount + wallCount >= 4);
      
      if (!hasMinimumSupportPoints) {
        return {
          canSupport: false,
          supportAvailable,
          supportNeeded,
          supportingComponents: supportingIds
        };
      }
    }
    
    return {
      canSupport: supportAvailable >= supportNeeded,
      supportAvailable,
      supportNeeded,
      supportingComponents: supportingIds
    };
  }
  
  // Find components that could support the given component
  private findSupportingComponents(componentData: ComponentData): BuildingComponent[] {
    const supporting: BuildingComponent[] = [];
    
    // For walls, check for foundations or floors they stand on
    if (componentData.type === ComponentType.WALL) {
      if (componentData.level === 0) {
        // Ground level walls need foundations at the same level
        const sameHex = this.getComponentsAt(componentData.position, 0);
        supporting.push(...sameHex.filter(c => 
          c.data.type === ComponentType.FOUNDATION
        ));
      } else {
        // Upper level walls stand on the floor at the same level
        // (The floor is what they're built on top of)
        const sameLevel = this.getComponentsAt(componentData.position, componentData.level);
        supporting.push(...sameLevel.filter(c => 
          c.data.type === ComponentType.FLOOR
        ));
        
        // Also can be supported by walls/pillars extending from below
        const belowLevel = componentData.level - 1;
        const componentsBelow = this.getComponentsAt(componentData.position, belowLevel);
        supporting.push(...componentsBelow.filter(c => 
          c.data.type === ComponentType.WALL || c.data.type === ComponentType.PILLAR
        ));
      }
      
      // Also check for pillars at the same level that could provide support
      const sameLevel = this.getComponentsAt(componentData.position, componentData.level);
      supporting.push(...sameLevel.filter(c => 
        c.data.type === ComponentType.PILLAR
      ));
    }
    
    // For floors, check for walls/pillars below that extend up to this level
    if (componentData.type === ComponentType.FLOOR) {
      // Ground floor (level 0) doesn't need support - it sits on the ground
      if (componentData.level === 0) {
        // Ground floor is always supported - return early with no supporting components needed
        // This will be handled in checkSupport()
      } else {
        // Upper floors need support from walls/pillars that start below and extend to this level
        const belowLevel = componentData.level - 1;
        if (belowLevel >= 0) {
          const componentsBelow = this.getComponentsAt(componentData.position, belowLevel);
          
          // Find all walls and pillars below that can provide support
          const pillarsBelow = componentsBelow.filter(c => c.data.type === ComponentType.PILLAR);
          const wallsBelow = componentsBelow.filter(c => c.data.type === ComponentType.WALL);
          
          // Include all pillars and walls as potential support
          // The minimum support check will be done in checkSupport()
          supporting.push(...pillarsBelow);
          supporting.push(...wallsBelow);
        }
        
        // Also check for walls/pillars at the same level (they might provide lateral support)
        // But these alone shouldn't be enough to support a floor
        const sameLevel = this.getComponentsAt(componentData.position, componentData.level);
        const sameLevelSupport = sameLevel.filter(c => 
          c.data.type === ComponentType.WALL || 
          c.data.type === ComponentType.PILLAR
        );
        
        // Same level components only count if we already have some support from below
        if (supporting.length > 0) {
          supporting.push(...sameLevelSupport);
        }
      }
    }
    
    // For pillars at level > 0, check for pillars/walls below
    if (componentData.type === ComponentType.PILLAR && componentData.level > 0) {
      const belowLevel = componentData.level - 1;
      const sameHexBelow = this.getComponentsAt(componentData.position, belowLevel);
      supporting.push(...sameHexBelow.filter(c => 
        c.data.type === ComponentType.PILLAR || 
        c.data.type === ComponentType.WALL
      ));
    }
    
    // For pillars at level 0, check for foundations
    if (componentData.type === ComponentType.PILLAR && componentData.level === 0) {
      const sameHex = this.getComponentsAt(componentData.position, 0);
      supporting.push(...sameHex.filter(c => 
        c.data.type === ComponentType.FOUNDATION
      ));
    }
    
    return supporting;
  }
  
  // Find components that depend on the given component for support
  private findDependentComponents(componentId: string): BuildingComponent[] {
    const component = this.components.get(componentId);
    if (!component) return [];
    
    const dependents: BuildingComponent[] = [];
    
    // Check components at the level above
    const aboveLevel = component.data.level + 1;
    const componentsAbove = this.getComponentsAt(component.data.position, aboveLevel);
    
    for (const comp of componentsAbove) {
      const supportCheck = this.checkSupport(comp.data);
      if (supportCheck.supportingComponents.includes(componentId)) {
        // Would removing this component cause insufficient support?
        const remainingSupport = supportCheck.supportAvailable - component.supportProvided;
        if (remainingSupport < supportCheck.supportNeeded) {
          dependents.push(comp);
        }
      }
    }
    
    return dependents;
  }
  
  // Calculate total load on a component (its weight + everything above)
  private calculateTotalLoad(componentData: ComponentData): number {
    let totalLoad = calculateComponentWeight(componentData);
    
    // Add weight of components directly above
    // This is simplified - in reality would need full load path analysis
    const aboveLevel = componentData.level + 1;
    const componentsAbove = this.getComponentsAt(componentData.position, aboveLevel);
    
    for (const comp of componentsAbove) {
      totalLoad += comp.weight * 0.5; // Simplified load distribution
    }
    
    return totalLoad;
  }
  
  // Get components at a specific hex and level
  private getComponentsAt(position: HexCoord3D, level?: number): BuildingComponent[] {
    // For finding components, we should ignore the y-coordinate of the position
    // and use only q and r to find components at the hex column, then filter by level
    const basePosition = { ...position, y: 0 }; // Always use y=0 for spatial lookup
    const hexKey = this.getHexKey(basePosition);
    const componentIds = this.spatialIndex.get(hexKey);
    if (!componentIds) return [];
    
    const components: BuildingComponent[] = [];
    for (const id of componentIds) {
      const comp = this.components.get(id);
      if (comp && (level === undefined || comp.data.level === level)) {
        components.push(comp);
      }
    }
    
    return components;
  }
  
  // Assign component to a building
  private assignToBuilding(component: BuildingComponent): void {
    // Find adjacent components
    const adjacent = this.findAdjacentComponents(component);
    
    if (adjacent.length === 0) {
      // Create new building
      const building: Building = {
        id: `building_${this.nextBuildingId++}`,
        components: new Map([[component.id, component]]),
        bounds: this.calculateBounds([component]),
        structuralIntegrity: 1.0
      };
      this.buildings.set(building.id, building);
    } else {
      // Add to existing building
      // (For now, just add to the first adjacent building)
      for (const adj of adjacent) {
        for (const [buildingId, building] of this.buildings) {
          if (building.components.has(adj.id)) {
            building.components.set(component.id, component);
            building.bounds = this.calculateBounds(Array.from(building.components.values()));
            return;
          }
        }
      }
    }
  }
  
  // Remove component from its building
  private removeFromBuilding(component: BuildingComponent): void {
    for (const [buildingId, building] of this.buildings) {
      if (building.components.has(component.id)) {
        building.components.delete(component.id);
        
        if (building.components.size === 0) {
          // Remove empty building
          this.buildings.delete(buildingId);
        } else {
          // Update bounds
          building.bounds = this.calculateBounds(Array.from(building.components.values()));
        }
        
        return;
      }
    }
  }
  
  // Find components adjacent to the given one
  private findAdjacentComponents(component: BuildingComponent): BuildingComponent[] {
    const adjacent: BuildingComponent[] = [];
    
    // Check same hex
    const sameHex = this.getComponentsAt(component.data.position);
    adjacent.push(...sameHex.filter(c => c.id !== component.id));
    
    // Check neighboring hexes (would need hex neighbor calculation)
    // This is simplified - you'd want to check actual hex neighbors
    
    return adjacent;
  }
  
  // Calculate bounding box for a set of components
  private calculateBounds(components: BuildingComponent[]): Building['bounds'] {
    if (components.length === 0) {
      return { min: new THREE.Vector3(), max: new THREE.Vector3() };
    }
    
    const bounds = new THREE.Box3();
    for (const comp of components) {
      bounds.expandByObject(comp.mesh);
    }
    
    return { min: bounds.min, max: bounds.max };
  }
  
  // Update structural integrity for all buildings
  private updateStructuralIntegrity(): void {
    for (const building of this.buildings.values()) {
      let totalStress = 0;
      let componentCount = 0;
      
      for (const component of building.components.values()) {
        const supportCheck = this.checkSupport(component.data);
        const stressRatio = supportCheck.supportNeeded / Math.max(supportCheck.supportAvailable, 1);
        totalStress += Math.min(stressRatio, 2); // Cap at 200% stress
        componentCount++;
        
        // Update visual state
        if (this.stressVisualizationEnabled) {
          component.updateVisualState(stressRatio > 1, stressRatio - 1);
        }
      }
      
      building.structuralIntegrity = 1 - (totalStress / componentCount / 2);
    }
  }
  
  // Cached preview materials
  private validPreviewMaterial: THREE.Material | null = null;
  private invalidPreviewMaterial: THREE.Material | null = null;
  
  // Create preview material
  private createPreviewMaterial(): THREE.Material {
    // Cache materials to avoid recreation
    if (this.previewValid) {
      if (!this.validPreviewMaterial) {
        this.validPreviewMaterial = new THREE.MeshStandardMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.5,
          emissive: 0x00ff00,
          emissiveIntensity: 0.2
        });
      }
      return this.validPreviewMaterial;
    } else {
      if (!this.invalidPreviewMaterial) {
        this.invalidPreviewMaterial = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.5,
          emissive: 0xff0000,
          emissiveIntensity: 0.2
        });
      }
      return this.invalidPreviewMaterial;
    }
  }
  
  // Update preview validity
  private updatePreviewValidity(): void {
    if (!this.previewComponent) return;
    
    const supportCheck = this.checkSupport(this.previewComponent.data);
    this.previewValid = supportCheck.canSupport || 
                       this.previewComponent.data.type === ComponentType.FOUNDATION;
    
    // Update material color
    this.previewComponent.mesh.material = this.createPreviewMaterial();
  }
  
  // Convert hex coordinates to string key (uses only q,r for hex column indexing)
  private getHexKey(coord: HexCoord3D): string {
    // We only use q,r for spatial indexing, not y
    // This allows us to find all components in a hex column regardless of their y position
    return `${coord.q},${coord.r}`;
  }
  
  // Toggle stress visualization
  toggleStressVisualization(): void {
    this.stressVisualizationEnabled = !this.stressVisualizationEnabled;
    this.updateStructuralIntegrity();
    
    if (!this.stressVisualizationEnabled) {
      // Reset all component colors
      for (const component of this.components.values()) {
        component.updateVisualState(false);
      }
    }
  }
  
  // Get all buildings
  getBuildings(): Building[] {
    return Array.from(this.buildings.values());
  }
  
  // Get building at position
  getBuildingAt(position: HexCoord3D): Building | null {
    const components = this.getComponentsAt(position);
    if (components.length === 0) return null;
    
    for (const building of this.buildings.values()) {
      if (building.components.has(components[0].id)) {
        return building;
      }
    }
    
    return null;
  }
}