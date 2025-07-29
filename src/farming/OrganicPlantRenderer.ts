import * as THREE from 'three';
import { SubHexUtils } from '../utils/SubHexUtils';
import { Constants } from '../utils/Constants';
import { OrganicPlantState, OrganicPlantType, PlantComponent } from './OrganicGrowthSystem';

// Visual representation of an organic plant
export class OrganicPlantVisual {
  public readonly group: THREE.Group;
  private componentMeshes: Map<string, THREE.Mesh> = new Map();
  private growthPointMarkers: Map<string, THREE.Mesh> = new Map();
  private showGrowthPoints: boolean = false;
  
  constructor(
    private plant: OrganicPlantState,
    private plantType: OrganicPlantType
  ) {
    this.group = new THREE.Group();
    this.updateVisual();
  }
  
  updateVisual(showGrowthPoints: boolean = false): void {
    this.showGrowthPoints = showGrowthPoints;
    
    // Update existing components
    for (const [compId, component] of this.plant.components) {
      let mesh = this.componentMeshes.get(compId);
      
      if (!mesh) {
        // Create new mesh for component
        mesh = this.createComponentMesh(component);
        this.componentMeshes.set(compId, mesh);
        this.group.add(mesh);
      } else {
        // Update existing mesh
        this.updateComponentMesh(mesh, component);
      }
    }
    
    // Remove meshes for deleted components
    for (const [compId, mesh] of this.componentMeshes) {
      if (!this.plant.components.has(compId)) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
        this.componentMeshes.delete(compId);
      }
    }
    
    // Update growth point markers
    this.updateGrowthPointMarkers();
  }
  
  private createComponentMesh(component: PlantComponent): THREE.Mesh {
    // Create geometry based on component size
    const baseSize = SubHexUtils.SUB_HEX_SIZE * 3; // Make 3x larger than sub-hex
    const scale = 0.3 + (component.size * 0.7); // Scale from 30% to 100%
    
    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;
    
    switch (component.type) {
      case 'root':
        // Roots use cylinder geometry pointing down
        geometry = new THREE.CylinderGeometry(
          baseSize * scale * 0.5,  // Top radius (increased from 0.3)
          baseSize * scale * 0.7,  // Bottom radius (wider, increased from 0.5)
          Constants.HEX_HEIGHT * 0.9,
          8
        );
        material = new THREE.MeshStandardMaterial({
          color: 0x8B4513,
          roughness: 0.9
        });
        break;
        
      case 'stem':
        // Stems use cylinder geometry
        geometry = new THREE.CylinderGeometry(
          baseSize * scale * 0.6,  // Increased from 0.4
          baseSize * scale * 0.7,  // Increased from 0.5
          Constants.HEX_HEIGHT,
          8
        );
        material = new THREE.MeshStandardMaterial({
          color: 0x228B22,
          roughness: 0.7
        });
        break;
        
      case 'leaf':
        // Leaves use a flattened sphere
        geometry = new THREE.SphereGeometry(baseSize * scale * 1.5, 8, 6);  // Larger leaves
        geometry.scale(1.2, 0.4, 1);
        material = new THREE.MeshStandardMaterial({
          color: 0x32CD32,
          roughness: 0.4
        });
        break;
        
      default:
        geometry = new THREE.BoxGeometry(baseSize * scale, Constants.HEX_HEIGHT, baseSize * scale);
        material = new THREE.MeshStandardMaterial({ color: 0xFF00FF });
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position the mesh
    const worldPos = SubHexUtils.subHexToWorld(component.position);
    mesh.position.copy(worldPos);
    mesh.position.y = component.position.y * Constants.HEX_HEIGHT;
    
    // Add some visual variety
    if (component.type === 'leaf') {
      // Random rotation for leaves
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = (Math.random() - 0.5) * 0.5;
      
      // Position leaves slightly offset from center
      const offset = baseSize * 0.3;
      mesh.position.x += (Math.random() - 0.5) * offset;
      mesh.position.z += (Math.random() - 0.5) * offset;
    }
    
    // Apply health-based color
    this.updateComponentColor(mesh, component);
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }
  
  private updateComponentMesh(mesh: THREE.Mesh, component: PlantComponent): void {
    // Update scale based on component size
    const targetScale = 0.3 + (component.size * 0.7);
    
    // Smooth scale transition
    mesh.scale.x = THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.1);
    mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, targetScale, 0.1);
    mesh.scale.z = THREE.MathUtils.lerp(mesh.scale.z, targetScale, 0.1);
    
    // Update color based on health
    this.updateComponentColor(mesh, component);
  }
  
  private updateComponentColor(mesh: THREE.Mesh, component: PlantComponent): void {
    if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
    
    const health = component.health;
    
    switch (component.type) {
      case 'root':
        // Healthy brown to dark/black when dying
        const rootR = 0.545 * health;
        const rootG = 0.271 * health;
        const rootB = 0.075 * health;
        mesh.material.color.setRGB(rootR, rootG, rootB);
        break;
        
      case 'stem':
        // Green to brown when unhealthy
        const stemR = 0.133 + (0.4 * (1 - health));
        const stemG = 0.545 * health;
        const stemB = 0.133 * health;
        mesh.material.color.setRGB(stemR, stemG, stemB);
        break;
        
      case 'leaf':
        // Dynamic leaf color based on health and conditions
        let r = 0.2, g = 0.8, b = 0.2;
        
        // Low health = yellowing/browning
        if (health < 0.7) {
          const factor = health / 0.7;
          r = 0.2 + (0.3 * (1 - factor));
          g = 0.8 * factor + 0.2 * (1 - factor);
          b = 0.2 * factor;
        }
        
        // Water stress = browning
        if (this.plant.resources.water < 0.3) {
          const waterFactor = this.plant.resources.water / 0.3;
          r = r * waterFactor + 0.4 * (1 - waterFactor);
          g = g * waterFactor + 0.2 * (1 - waterFactor);
          b = b * waterFactor;
        }
        
        // Low light = pale
        const light = component.sunExposure || 0;
        if (light < 0.5) {
          const lightFactor = light / 0.5;
          r = r * lightFactor + 0.3 * (1 - lightFactor);
          g = g * lightFactor + 0.3 * (1 - lightFactor);
          b = b * lightFactor + 0.3 * (1 - lightFactor);
        }
        
        mesh.material.color.setRGB(r, g, b);
        
        // Transparency for dying leaves
        mesh.material.transparent = health < 0.3;
        mesh.material.opacity = Math.max(0.3, health);
        break;
    }
  }
  
  private updateGrowthPointMarkers(): void {
    if (!this.showGrowthPoints) {
      // Remove all markers
      for (const marker of this.growthPointMarkers.values()) {
        this.group.remove(marker);
        marker.geometry.dispose();
        if (marker.material instanceof THREE.Material) {
          marker.material.dispose();
        }
      }
      this.growthPointMarkers.clear();
      return;
    }
    
    // Update markers for active growth points
    for (const [gpId, growthPoint] of this.plant.growthPoints) {
      let marker = this.growthPointMarkers.get(gpId);
      
      if (!marker) {
        // Create marker
        const geometry = new THREE.SphereGeometry(SubHexUtils.SUB_HEX_SIZE * 0.2, 8, 6);
        const material = new THREE.MeshBasicMaterial({
          color: growthPoint.type === 'root' ? 0x8B4513 : 0x00FF00
        });
        
        marker = new THREE.Mesh(geometry, material);
        this.growthPointMarkers.set(gpId, marker);
        this.group.add(marker);
      }
      
      // Position marker
      const worldPos = SubHexUtils.subHexToWorld(growthPoint.position);
      marker.position.copy(worldPos);
      marker.position.y = growthPoint.position.y * Constants.HEX_HEIGHT;
      
      // Scale based on growth potential
      const potential = growthPoint.growthPotential / this.plantType.growthRules.growthThreshold;
      const scale = 0.5 + potential * 0.5;
      marker.scale.setScalar(scale);
      
      // Color intensity based on dominance
      if (marker.material instanceof THREE.MeshBasicMaterial) {
        // Adjust opacity based on dominance
        marker.material.opacity = 0.5 + growthPoint.dominance * 0.5;
        marker.material.transparent = true;
      }
    }
    
    // Remove markers for deleted growth points
    for (const [gpId, marker] of this.growthPointMarkers) {
      if (!this.plant.growthPoints.has(gpId)) {
        this.group.remove(marker);
        marker.geometry.dispose();
        if (marker.material instanceof THREE.Material) {
          marker.material.dispose();
        }
        this.growthPointMarkers.delete(gpId);
      }
    }
  }
  
  dispose(): void {
    // Clean up all meshes
    for (const mesh of this.componentMeshes.values()) {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    }
    
    for (const marker of this.growthPointMarkers.values()) {
      marker.geometry.dispose();
      if (marker.material instanceof THREE.Material) {
        marker.material.dispose();
      }
    }
    
    this.group.clear();
  }
}

// Manages all organic plant visuals
export class OrganicPlantRenderer {
  private plantVisuals: Map<string, OrganicPlantVisual> = new Map();
  private showGrowthPoints: boolean = false;
  
  constructor(private scene: THREE.Scene) {}
  
  public setVisible(visible: boolean): void {
    for (const visual of this.plantVisuals.values()) {
      visual.group.visible = visible;
    }
  }
  
  setShowGrowthPoints(show: boolean): void {
    this.showGrowthPoints = show;
    // Update all existing visuals
    for (const visual of this.plantVisuals.values()) {
      visual.updateVisual(show);
    }
  }
  
  updatePlants(plants: Array<{plant: OrganicPlantState, type: OrganicPlantType}>): void {
    // Remove visuals for plants that no longer exist
    const currentIds = new Set(plants.map(p => p.plant.id));
    for (const [id, visual] of this.plantVisuals) {
      if (!currentIds.has(id)) {
        this.scene.remove(visual.group);
        visual.dispose();
        this.plantVisuals.delete(id);
      }
    }
    
    // Update or create visuals for current plants
    for (const { plant, type } of plants) {
      let visual = this.plantVisuals.get(plant.id);
      
      if (!visual) {
        // Create new visual
        visual = new OrganicPlantVisual(plant, type);
        this.plantVisuals.set(plant.id, visual);
        this.scene.add(visual.group);
      } else {
        // Update existing visual
        visual.updateVisual(this.showGrowthPoints);
      }
    }
  }
  
  dispose(): void {
    for (const visual of this.plantVisuals.values()) {
      this.scene.remove(visual.group);
      visual.dispose();
    }
    this.plantVisuals.clear();
  }
}