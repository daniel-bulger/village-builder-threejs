import * as THREE from 'three';
import { HexCoord3D, HexUtils } from '../utils/HexUtils';
import { Constants } from '../utils/Constants';
import { SoilType } from './WaterSimulation';

// Instanced rendering for soil hexes
export class InstancedSoilRenderer {
  private scene: THREE.Scene;
  private instancedMeshes: Map<SoilType, THREE.InstancedMesh> = new Map();
  private hexPositions: Map<string, { type: SoilType; instanceId: number }> = new Map();
  private freeInstances: Map<SoilType, number[]> = new Map();
  private maxInstancesPerType = 10000;
  
  // Shared geometry for all hex instances
  private hexGeometry: THREE.CylinderGeometry;
  
  // Materials for different soil types
  private materials: Map<SoilType, THREE.MeshStandardMaterial> = new Map();
  
  // Color update tracking
  private colorUpdateQueue: Map<SoilType, Set<number>> = new Map();
  private colorAttributes: Map<SoilType, THREE.InstancedBufferAttribute> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createGeometry();
    this.createMaterials();
    this.createInstancedMeshes();
  }
  
  private createGeometry(): void {
    this.hexGeometry = new THREE.CylinderGeometry(
      Constants.HEX_SIZE,
      Constants.HEX_SIZE,
      Constants.HEX_HEIGHT,
      6
    );
    this.hexGeometry.rotateY(Math.PI / 6); // Align hex points
  }
  
  private createMaterials(): void {
    // Soil material
    this.materials.set(SoilType.Loam, new THREE.MeshStandardMaterial({
      vertexColors: true, // Enable per-instance colors
      roughness: 0.95,
      metalness: 0
    }));
    
    // Clay material
    this.materials.set(SoilType.Clay, new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0
    }));
    
    // Barrier material
    this.materials.set(SoilType.Barrier, new THREE.MeshStandardMaterial({
      color: Constants.BARRIER_COLOR,
      roughness: 0.3,
      metalness: 0.1
    }));
  }
  
  private createInstancedMeshes(): void {
    for (const [type, material] of this.materials) {
      const instancedMesh = new THREE.InstancedMesh(
        this.hexGeometry,
        material,
        this.maxInstancesPerType
      );
      
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      instancedMesh.count = 0; // Start with no instances
      
      // Initialize color attribute for non-barrier types
      if (type !== SoilType.Barrier) {
        const colors = new Float32Array(this.maxInstancesPerType * 3);
        const colorAttribute = new THREE.InstancedBufferAttribute(colors, 3);
        instancedMesh.instanceColor = colorAttribute;
        this.colorAttributes.set(type, colorAttribute);
      }
      
      this.instancedMeshes.set(type, instancedMesh);
      this.freeInstances.set(type, []);
      this.colorUpdateQueue.set(type, new Set());
      
      this.scene.add(instancedMesh);
    }
  }
  
  addHex(coord: HexCoord3D, soilType: SoilType = SoilType.Loam): void {
    const key = HexUtils.hex3DToKey(coord);
    
    // Check if hex already exists
    if (this.hexPositions.has(key)) return;
    
    const instancedMesh = this.instancedMeshes.get(soilType);
    if (!instancedMesh) return;
    
    // Get an instance ID
    let instanceId: number;
    const freeList = this.freeInstances.get(soilType)!;
    
    if (freeList.length > 0) {
      instanceId = freeList.pop()!;
    } else {
      instanceId = instancedMesh.count;
      if (instanceId >= this.maxInstancesPerType) {
        console.warn(`Instance limit reached for soil type ${soilType}`);
        return;
      }
      instancedMesh.count++;
    }
    
    // Set transform matrix
    const worldPos = HexUtils.hexToWorld(coord);
    const matrix = new THREE.Matrix4();
    matrix.setPosition(
      worldPos.x,
      coord.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT / 2,
      worldPos.z
    );
    
    instancedMesh.setMatrixAt(instanceId, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    // Set initial color (if not barrier)
    if (soilType !== SoilType.Barrier) {
      this.setHexColor(soilType, instanceId, Constants.SOIL_COLOR);
    }
    
    // Store hex info
    this.hexPositions.set(key, { type: soilType, instanceId });
  }
  
  removeHex(coord: HexCoord3D): void {
    const key = HexUtils.hex3DToKey(coord);
    const hexInfo = this.hexPositions.get(key);
    
    if (!hexInfo) return;
    
    const { type, instanceId } = hexInfo;
    const instancedMesh = this.instancedMeshes.get(type);
    
    if (!instancedMesh) return;
    
    // Move instance out of view
    const matrix = new THREE.Matrix4();
    matrix.setPosition(0, -1000, 0);
    instancedMesh.setMatrixAt(instanceId, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    // Add to free list
    this.freeInstances.get(type)!.push(instanceId);
    this.hexPositions.delete(key);
  }
  
  updateHexColor(coord: HexCoord3D, color: THREE.Color): void {
    const key = HexUtils.hex3DToKey(coord);
    const hexInfo = this.hexPositions.get(key);
    
    if (!hexInfo || hexInfo.type === SoilType.Barrier) return;
    
    const { type, instanceId } = hexInfo;
    this.setHexColor(type, instanceId, color);
    
    // Queue for batch update
    this.colorUpdateQueue.get(type)!.add(instanceId);
  }
  
  private setHexColor(type: SoilType, instanceId: number, color: THREE.Color): void {
    const colorAttribute = this.colorAttributes.get(type);
    if (!colorAttribute) return;
    
    const array = colorAttribute.array as Float32Array;
    const offset = instanceId * 3;
    
    array[offset] = color.r;
    array[offset + 1] = color.g;
    array[offset + 2] = color.b;
  }
  
  // Batch update colors (call after all color changes)
  flushColorUpdates(): void {
    for (const [type, instanceIds] of this.colorUpdateQueue) {
      if (instanceIds.size === 0) continue;
      
      const colorAttribute = this.colorAttributes.get(type);
      if (colorAttribute) {
        colorAttribute.needsUpdate = true;
      }
      
      instanceIds.clear();
    }
  }
  
  setVisible(visible: boolean): void {
    for (const mesh of this.instancedMeshes.values()) {
      mesh.visible = visible;
    }
  }
  
  dispose(): void {
    // Remove from scene
    for (const mesh of this.instancedMeshes.values()) {
      this.scene.remove(mesh);
      mesh.dispose();
    }
    
    // Dispose geometry
    this.hexGeometry.dispose();
    
    // Dispose materials
    for (const material of this.materials.values()) {
      material.dispose();
    }
    
    // Clear maps
    this.instancedMeshes.clear();
    this.hexPositions.clear();
    this.freeInstances.clear();
    this.materials.clear();
    this.colorAttributes.clear();
    this.colorUpdateQueue.clear();
  }
  
  getStats(): { 
    totalHexes: number; 
    instancesByType: Record<string, number>;
    memoryUsage: number;
  } {
    const instancesByType: Record<string, number> = {};
    let totalHexes = 0;
    
    for (const [type, mesh] of this.instancedMeshes) {
      instancesByType[type] = mesh.count;
      totalHexes += mesh.count;
    }
    
    // Estimate memory usage (very rough)
    const bytesPerInstance = 16 * 4 + 3 * 4; // Matrix4 + color
    const memoryUsage = totalHexes * bytesPerInstance;
    
    return {
      totalHexes,
      instancesByType,
      memoryUsage
    };
  }
}