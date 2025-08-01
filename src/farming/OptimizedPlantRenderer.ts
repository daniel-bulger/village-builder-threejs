import * as THREE from 'three';
import { PlantState, PlantType, PlantComponentType, PLANT_TYPES } from './PlantTypes';
import { SubHexCoord3D, SubHexUtils } from '../utils/SubHexUtils';
import { Constants } from '../utils/Constants';
import { MeshPoolManager } from './MeshPool';

// Optimized plant visual using pooled meshes
class OptimizedPlantVisual {
  private meshes: THREE.Mesh[] = [];
  private lastStage: number = -1;
  private poolManager: MeshPoolManager;
  
  constructor(
    private plant: PlantState,
    private plantType: PlantType,
    poolManager: MeshPoolManager
  ) {
    this.poolManager = poolManager;
  }
  
  update(): boolean {
    // Check if rebuild needed
    if (this.lastStage === this.plant.currentStage) {
      this.updateHealthEffects();
      return false; // No structural changes
    }
    
    // Release old meshes
    this.release();
    
    // Build new visual
    this.lastStage = this.plant.currentStage;
    const stage = this.plantType.growthStages[this.plant.currentStage];
    const pattern = this.plant.customPatterns?.[this.plant.currentStage] || stage.hexPattern;
    
    for (const hex of pattern) {
      const poolName = `plant_${hex.type}`;
      const pool = this.poolManager.getPool(poolName, 'subhex', hex.type);
      const mesh = pool.acquire();
      
      if (!mesh) {
        console.warn(`Mesh pool exhausted for ${poolName}`);
        continue;
      }
      
      // Calculate position
      const absoluteSubHex: SubHexCoord3D = {
        q: this.plant.position.q + hex.offset.q,
        r: this.plant.position.r + hex.offset.r,
        y: this.plant.position.y + hex.height,
        parentQ: this.plant.position.parentQ,
        parentR: this.plant.position.parentR
      };
      
      const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
      mesh.position.copy(worldPos);
      mesh.position.y = absoluteSubHex.y * Constants.HEX_HEIGHT;
      
      this.meshes.push(mesh);
    }
    
    this.updateHealthEffects();
    return true; // Visual was rebuilt
  }
  
  private updateHealthEffects(): void {
    const healthFactor = (this.plant.health.water + this.plant.health.nutrients + this.plant.health.sunlight) / 3;
    
    // Update material properties for health
    for (const mesh of this.meshes) {
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        // Darken color based on poor health
        const darkness = 1 - (1 - healthFactor) * 0.5;
        mesh.material.color.multiplyScalar(darkness);
        
        // Make less rough when unhealthy (wilted appearance)
        mesh.material.roughness = 0.4 + healthFactor * 0.4;
      }
    }
  }
  
  release(): void {
    for (const mesh of this.meshes) {
      const type = this.getTypeFromMesh(mesh);
      const poolName = `plant_${type}`;
      const pool = this.poolManager.getPool(poolName, 'subhex', type);
      pool.release(mesh);
    }
    this.meshes = [];
  }
  
  private getTypeFromMesh(mesh: THREE.Mesh): PlantComponentType {
    // Determine type from material color
    const material = mesh.material as THREE.MeshStandardMaterial;
    const color = material.color.getHex();
    
    if (color === 0x8B4513) return 'root';
    if (color === 0x228B22) return 'stem';
    return 'leaf';
  }
  
  setVisible(visible: boolean): void {
    for (const mesh of this.meshes) {
      mesh.visible = visible;
    }
  }
}

// Optimized plant renderer with LOD and pooling
export class OptimizedPlantRenderer {
  private plantVisuals: Map<string, OptimizedPlantVisual> = new Map();
  private poolManager: MeshPoolManager;
  private scene: THREE.Scene;
  private camera: THREE.Camera | null = null;
  
  // LOD settings
  private lodDistances = {
    high: 20,    // Full detail within 20 units
    medium: 50,  // Reduced detail 20-50 units
    low: 100     // Minimal detail 50-100 units
  };
  
  constructor(scene: THREE.Scene, poolManager: MeshPoolManager) {
    this.scene = scene;
    this.poolManager = poolManager;
    
    // Add all mesh pools to scene
    this.addPoolsToScene();
  }
  
  private addPoolsToScene(): void {
    // Add all plant component pools to the scene
    const componentTypes: PlantComponentType[] = ['root', 'stem', 'leaf'];
    for (const type of componentTypes) {
      const poolName = `plant_${type}`;
      const pool = this.poolManager.getPool(poolName, 'subhex', type);
      // Pool meshes are added to scene when created
    }
  }
  
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  updatePlants(plants: PlantState[]): void {
    const currentPlantIds = new Set(plants.map(p => p.id));
    
    // Remove visuals for plants that no longer exist
    for (const [id, visual] of this.plantVisuals) {
      if (!currentPlantIds.has(id)) {
        visual.release();
        this.plantVisuals.delete(id);
      }
    }
    
    // Update or create visuals for current plants
    for (const plant of plants) {
      let visual = this.plantVisuals.get(plant.id);
      
      if (!visual) {
        const plantType = PLANT_TYPES.get(plant.typeId);
        if (!plantType) continue;
        
        visual = new OptimizedPlantVisual(plant, plantType, this.poolManager);
        this.plantVisuals.set(plant.id, visual);
      }
      
      // Update visual (returns true if rebuilt)
      const wasRebuilt = visual.update();
      
      // Apply LOD if camera is set
      if (this.camera && !wasRebuilt) {
        this.applyLOD(plant, visual);
      }
    }
  }
  
  private applyLOD(plant: PlantState, visual: OptimizedPlantVisual): void {
    if (!this.camera) return;
    
    // Calculate distance from camera
    const plantWorldPos = SubHexUtils.subHexToWorld(plant.position);
    plantWorldPos.y = plant.position.y * Constants.HEX_HEIGHT;
    
    const distance = this.camera.position.distanceTo(plantWorldPos);
    
    // Apply LOD based on distance
    if (distance > this.lodDistances.low) {
      // Too far - hide completely
      visual.setVisible(false);
    } else if (distance > this.lodDistances.medium) {
      // Low detail - could reduce mesh count here
      visual.setVisible(true);
    } else if (distance > this.lodDistances.high) {
      // Medium detail
      visual.setVisible(true);
    } else {
      // Full detail
      visual.setVisible(true);
    }
  }
  
  setVisible(visible: boolean): void {
    for (const visual of this.plantVisuals.values()) {
      visual.setVisible(visible);
    }
  }
  
  dispose(): void {
    // Release all plant visuals
    for (const visual of this.plantVisuals.values()) {
      visual.release();
    }
    this.plantVisuals.clear();
  }
  
  getStats(): { plantCount: number; meshCount: number; poolStats: any } {
    let meshCount = 0;
    for (const visual of this.plantVisuals.values()) {
      // Count meshes per visual (approximate)
      meshCount += 10; // Average meshes per plant
    }
    
    return {
      plantCount: this.plantVisuals.size,
      meshCount,
      poolStats: this.poolManager.getStats()
    };
  }
}