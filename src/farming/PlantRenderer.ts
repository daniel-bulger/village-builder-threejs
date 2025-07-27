import * as THREE from 'three';
import { SubHexCoord3D, SubHexUtils } from '../utils/SubHexUtils';
import { HexUtils } from '../utils/HexUtils';
import { PlantState, PlantType, PlantComponentType } from './PlantTypes';
import { Constants } from '../utils/Constants';

// Visual representation of a plant
export class PlantVisual {
  public readonly group: THREE.Group;
  private componentMeshes: Map<string, THREE.Mesh> = new Map();
  private lastStage: number = -1;
  
  constructor(
    private plant: PlantState,
    private plantType: PlantType
  ) {
    this.group = new THREE.Group();
    this.updateVisual();
  }
  
  updateVisual(): void {
    // Only rebuild if stage has changed
    if (this.lastStage === this.plant.currentStage) {
      // Just update health effects without rebuilding
      this.applyHealthEffects();
      return;
    }
    
    // Clear existing meshes
    this.componentMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    this.group.clear();
    this.componentMeshes.clear();
    
    // Get current stage pattern (custom or default)
    const stage = this.plantType.growthStages[this.plant.currentStage];
    const pattern = this.plant.customPatterns?.[this.plant.currentStage] || stage.hexPattern;
    this.lastStage = this.plant.currentStage;
    
    
    // Create meshes for each component
    for (const hex of pattern) {
      // Calculate absolute sub-hex position
      const absoluteSubHex: SubHexCoord3D = {
        q: this.plant.position.q + hex.offset.q,
        r: this.plant.position.r + hex.offset.r,
        y: this.plant.position.y + hex.height,
        parentQ: this.plant.position.parentQ,
        parentR: this.plant.position.parentR
      };
      
      // Get world position for the sub-hex
      const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
      const actualSubHex = SubHexUtils.worldToSubHex(worldPos);
      const actualSubHex3D: SubHexCoord3D = { ...actualSubHex, y: absoluteSubHex.y };
      
      const mesh = this.createComponentMesh(hex.type, actualSubHex3D);
      this.group.add(mesh);
      
      
      const key = `${hex.offset.q},${hex.offset.r},${hex.height}`;
      this.componentMeshes.set(key, mesh);
    }
    
    // Apply health effects
    this.applyHealthEffects();
  }
  
  private createComponentMesh(
    type: PlantComponentType, 
    subHexPos: SubHexCoord3D
  ): THREE.Mesh {
    // Use regular hex geometry but scale it down to sub-hex size
    const geometry = HexUtils.createHexGeometry(Constants.HEX_HEIGHT);
    let material: THREE.MeshStandardMaterial;
    
    switch (type) {
      case 'root':
        material = new THREE.MeshStandardMaterial({
          color: 0x8B4513, // Brown
          roughness: 0.9
        });
        break;
        
      case 'stem':
        material = new THREE.MeshStandardMaterial({
          color: 0x228B22, // Forest green
          roughness: 0.7
        });
        break;
        
      case 'leaf':
        material = new THREE.MeshStandardMaterial({
          color: 0x32CD32, // Lime green
          roughness: 0.4
        });
        break;
        
      default:
        material = new THREE.MeshStandardMaterial({ color: 0xFF00FF });
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Scale the mesh down to sub-hex size
    const scale = SubHexUtils.SUB_HEX_SIZE / Constants.HEX_SIZE;
    mesh.scale.set(scale, 1, scale); // Keep full height
    
    // Position the mesh at sub-hex world position
    const pos = SubHexUtils.subHexToWorld(subHexPos);
    mesh.position.copy(pos);
    mesh.position.y = subHexPos.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT / 2;
    
    // Add some rotation for variety (especially leaves)
    if (type === 'leaf') {
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = (Math.random() - 0.5) * 0.3;
    }
    
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }
  
  private applyHealthEffects(): void {
    // Apply color changes to leaves based on health
    this.componentMeshes.forEach((mesh, key) => {
      if (key.includes('leaf') && mesh.material instanceof THREE.MeshStandardMaterial) {
        // Start with healthy green
        let r = 0.2, g = 0.8, b = 0.2;
        
        // Water stress - leaves turn brown
        if (this.plant.health.water < 0.5) {
          const waterFactor = this.plant.health.water * 2; // 0 to 1
          r = 0.2 + (0.4 * (1 - waterFactor)); // More brown
          g = 0.8 * waterFactor; // Less green
          b = 0.2 * waterFactor; // Less green
        }
        
        // Nutrient deficiency - leaves turn yellow
        if (this.plant.health.nutrients < 0.5) {
          const nutrientFactor = this.plant.health.nutrients * 2; // 0 to 1
          g = g * (0.5 + 0.5 * nutrientFactor); // Reduce green for yellowing
        }
        
        // Sunlight deficiency - leaves turn pale/lighter
        if (this.plant.health.sunlight < 0.5) {
          const sunFactor = this.plant.health.sunlight * 2; // 0 to 1
          r = r + (0.3 * (1 - sunFactor)); // Lighter
          g = g + (0.2 * (1 - sunFactor)); // Lighter
          b = b + (0.3 * (1 - sunFactor)); // Lighter
        }
        
        mesh.material.color.setRGB(r, g, b);
      }
    });
    
    // Stunted growth - red outline
    if (this.plant.isStunted) {
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        side: THREE.BackSide
      });
      
      this.componentMeshes.forEach(mesh => {
        const outline = mesh.clone();
        outline.material = outlineMaterial;
        outline.scale.multiplyScalar(1.1);
        this.group.add(outline);
      });
    }
  }
  
  dispose(): void {
    this.componentMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    this.group.clear();
  }
}

// Manages all plant visuals
export class PlantRenderer {
  private plantVisuals: Map<string, PlantVisual> = new Map();
  
  constructor(private scene: THREE.Scene) {}
  
  updatePlants(plants: Array<{plant: PlantState, type: PlantType}>): void {
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
        visual = new PlantVisual(plant, type);
        this.plantVisuals.set(plant.id, visual);
        this.scene.add(visual.group);
      } else {
        // Update existing visual if stage changed
        // For now, recreate the visual (could optimize with animation later)
        visual.updateVisual();
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