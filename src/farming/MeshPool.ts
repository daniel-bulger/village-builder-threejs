import * as THREE from 'three';

// Pool configuration for different mesh types
interface PoolConfig {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  initialSize: number;
  maxSize: number;
}

// Mesh pool for efficient object reuse
export class MeshPool {
  private available: THREE.Mesh[] = [];
  private inUse: Set<THREE.Mesh> = new Set();
  private geometry: THREE.BufferGeometry;
  private material: THREE.Material;
  private maxSize: number;
  
  constructor(config: PoolConfig) {
    this.geometry = config.geometry;
    this.material = config.material;
    this.maxSize = config.maxSize;
    
    // Pre-allocate initial meshes
    for (let i = 0; i < config.initialSize; i++) {
      this.available.push(this.createMesh());
    }
  }
  
  private createMesh(): THREE.Mesh {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false; // Start hidden
    return mesh;
  }
  
  acquire(): THREE.Mesh | null {
    let mesh: THREE.Mesh | undefined;
    
    if (this.available.length > 0) {
      mesh = this.available.pop()!;
    } else if (this.inUse.size < this.maxSize) {
      mesh = this.createMesh();
    } else {
      return null; // Pool exhausted
    }
    
    this.inUse.add(mesh);
    mesh.visible = true;
    return mesh;
  }
  
  release(mesh: THREE.Mesh): void {
    if (!this.inUse.has(mesh)) return;
    
    this.inUse.delete(mesh);
    mesh.visible = false;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    
    this.available.push(mesh);
  }
  
  releaseAll(): void {
    for (const mesh of this.inUse) {
      mesh.visible = false;
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      this.available.push(mesh);
    }
    this.inUse.clear();
  }
  
  dispose(): void {
    // Clean up all meshes
    const allMeshes = [...this.available, ...this.inUse];
    for (const mesh of allMeshes) {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    }
    
    // Don't dispose geometry/material as they're shared
    this.available = [];
    this.inUse.clear();
  }
  
  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}

// Manager for multiple mesh pools
export class MeshPoolManager {
  private pools: Map<string, MeshPool> = new Map();
  private geometries: Map<string, THREE.BufferGeometry> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  
  constructor() {
    this.initializeCommonAssets();
  }
  
  private initializeCommonAssets(): void {
    // Create shared geometries
    const hexGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 6);
    hexGeometry.rotateY(Math.PI / 6); // Align hex points
    this.geometries.set('hex', hexGeometry);
    
    const subHexGeometry = new THREE.CylinderGeometry(0.16, 0.16, 0.15, 6);
    subHexGeometry.rotateY(Math.PI / 6);
    this.geometries.set('subhex', subHexGeometry);
    
    // Create shared materials
    this.materials.set('root', new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9
    }));
    
    this.materials.set('stem', new THREE.MeshStandardMaterial({
      color: 0x228B22,
      roughness: 0.7
    }));
    
    this.materials.set('leaf', new THREE.MeshStandardMaterial({
      color: 0x32CD32,
      roughness: 0.4
    }));
    
    this.materials.set('soil', new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.95,
      metalness: 0
    }));
    
    this.materials.set('barrier', new THREE.MeshStandardMaterial({
      color: 0x505050,
      roughness: 0.3,
      metalness: 0.1
    }));
  }
  
  getPool(poolName: string, geometryType: string, materialType: string): MeshPool {
    let pool = this.pools.get(poolName);
    
    if (!pool) {
      const geometry = this.geometries.get(geometryType);
      const material = this.materials.get(materialType);
      
      if (!geometry || !material) {
        throw new Error(`Missing geometry (${geometryType}) or material (${materialType})`);
      }
      
      // Create pool with sensible defaults
      pool = new MeshPool({
        geometry,
        material,
        initialSize: 50,
        maxSize: 500
      });
      
      this.pools.set(poolName, pool);
    }
    
    return pool;
  }
  
  releaseAll(): void {
    for (const pool of this.pools.values()) {
      pool.releaseAll();
    }
  }
  
  dispose(): void {
    // Dispose all pools
    for (const pool of this.pools.values()) {
      pool.dispose();
    }
    this.pools.clear();
    
    // Dispose geometries
    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }
    this.geometries.clear();
    
    // Dispose materials
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();
  }
  
  getStats(): Record<string, { available: number; inUse: number; total: number }> {
    const stats: Record<string, { available: number; inUse: number; total: number }> = {};
    
    for (const [name, pool] of this.pools) {
      stats[name] = pool.getStats();
    }
    
    return stats;
  }
}