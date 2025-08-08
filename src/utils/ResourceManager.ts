/**
 * ResourceManager.ts
 * 
 * Centralized resource management for Three.js objects to prevent memory leaks.
 * Tracks and disposes of geometries, materials, textures, and other GPU resources.
 */

import * as THREE from 'three';

export interface Disposable {
  dispose(): void;
}

export class ResourceManager {
  private static instance: ResourceManager;
  
  private geometries: Set<THREE.BufferGeometry> = new Set();
  private materials: Set<THREE.Material> = new Set();
  private textures: Set<THREE.Texture> = new Set();
  private renderTargets: Set<THREE.WebGLRenderTarget> = new Set();
  private disposables: Set<Disposable> = new Set();
  
  // Track resource creation for debugging
  private resourceStats = {
    geometriesCreated: 0,
    geometriesDisposed: 0,
    materialsCreated: 0,
    materialsDisposed: 0,
    texturesCreated: 0,
    texturesDisposed: 0
  };
  
  private constructor() {}
  
  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }
  
  /**
   * Register a geometry for tracking
   */
  addGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    this.geometries.add(geometry);
    this.resourceStats.geometriesCreated++;
    return geometry;
  }
  
  /**
   * Register a material for tracking
   */
  addMaterial(material: THREE.Material): THREE.Material {
    this.materials.add(material);
    this.resourceStats.materialsCreated++;
    return material;
  }
  
  /**
   * Register a texture for tracking
   */
  addTexture(texture: THREE.Texture): THREE.Texture {
    this.textures.add(texture);
    this.resourceStats.texturesCreated++;
    return texture;
  }
  
  /**
   * Register a render target for tracking
   */
  addRenderTarget(target: THREE.WebGLRenderTarget): THREE.WebGLRenderTarget {
    this.renderTargets.add(target);
    return target;
  }
  
  /**
   * Register a generic disposable object
   */
  addDisposable(disposable: Disposable): void {
    this.disposables.add(disposable);
  }
  
  /**
   * Dispose of a specific geometry
   */
  disposeGeometry(geometry: THREE.BufferGeometry): void {
    if (this.geometries.has(geometry)) {
      geometry.dispose();
      this.geometries.delete(geometry);
      this.resourceStats.geometriesDisposed++;
    }
  }
  
  /**
   * Dispose of a specific material
   */
  disposeMaterial(material: THREE.Material): void {
    if (this.materials.has(material)) {
      material.dispose();
      this.materials.delete(material);
      this.resourceStats.materialsDisposed++;
      
      // Dispose of any textures in the material
      if ('map' in material && material.map) {
        this.disposeTexture(material.map);
      }
      if ('normalMap' in material && material.normalMap) {
        this.disposeTexture(material.normalMap);
      }
      if ('roughnessMap' in material && material.roughnessMap) {
        this.disposeTexture(material.roughnessMap);
      }
      if ('metalnessMap' in material && material.metalnessMap) {
        this.disposeTexture(material.metalnessMap);
      }
    }
  }
  
  /**
   * Dispose of a specific texture
   */
  disposeTexture(texture: THREE.Texture): void {
    if (this.textures.has(texture)) {
      texture.dispose();
      this.textures.delete(texture);
      this.resourceStats.texturesDisposed++;
    }
  }
  
  /**
   * Dispose of a mesh and its resources
   */
  disposeMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry) {
      this.disposeGeometry(mesh.geometry);
    }
    
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => this.disposeMaterial(mat));
      } else {
        this.disposeMaterial(mesh.material);
      }
    }
    
    // Remove from parent if exists
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
  }
  
  /**
   * Dispose of an entire scene branch
   */
  disposeSceneNode(node: THREE.Object3D): void {
    node.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.disposeMesh(child);
      } else if (child instanceof THREE.Line) {
        if (child.geometry) {
          this.disposeGeometry(child.geometry);
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });
    
    // Remove from parent
    if (node.parent) {
      node.parent.remove(node);
    }
  }
  
  /**
   * Dispose of all tracked resources
   */
  disposeAll(): void {
    // Dispose geometries
    this.geometries.forEach(geometry => {
      geometry.dispose();
      this.resourceStats.geometriesDisposed++;
    });
    this.geometries.clear();
    
    // Dispose materials
    this.materials.forEach(material => {
      material.dispose();
      this.resourceStats.materialsDisposed++;
    });
    this.materials.clear();
    
    // Dispose textures
    this.textures.forEach(texture => {
      texture.dispose();
      this.resourceStats.texturesDisposed++;
    });
    this.textures.clear();
    
    // Dispose render targets
    this.renderTargets.forEach(target => {
      target.dispose();
    });
    this.renderTargets.clear();
    
    // Dispose generic disposables
    this.disposables.forEach(disposable => {
      disposable.dispose();
    });
    this.disposables.clear();
  }
  
  /**
   * Get resource statistics for debugging
   */
  getStats(): {
    active: {
      geometries: number;
      materials: number;
      textures: number;
      renderTargets: number;
      disposables: number;
    };
    lifetime: typeof this.resourceStats;
  } {
    return {
      active: {
        geometries: this.geometries.size,
        materials: this.materials.size,
        textures: this.textures.size,
        renderTargets: this.renderTargets.size,
        disposables: this.disposables.size
      },
      lifetime: { ...this.resourceStats }
    };
  }
  
  /**
   * Create managed geometry
   */
  createBoxGeometry(width: number, height: number, depth: number): THREE.BoxGeometry {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    return this.addGeometry(geometry) as THREE.BoxGeometry;
  }
  
  /**
   * Create managed material
   */
  createMeshBasicMaterial(params?: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial(params);
    return this.addMaterial(material) as THREE.MeshBasicMaterial;
  }
  
  /**
   * Create managed mesh
   */
  createMesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    
    // Track the resources if not already tracked
    if (!this.geometries.has(geometry)) {
      this.addGeometry(geometry);
    }
    
    if (Array.isArray(material)) {
      material.forEach(mat => {
        if (!this.materials.has(mat)) {
          this.addMaterial(mat);
        }
      });
    } else {
      if (!this.materials.has(material)) {
        this.addMaterial(material);
      }
    }
    
    return mesh;
  }
  
  /**
   * Check for potential memory leaks
   */
  checkForLeaks(): void {
    const stats = this.getStats();
    const leakRatio = stats.lifetime.geometriesCreated / Math.max(1, stats.lifetime.geometriesDisposed);
    
    if (leakRatio > 2 && stats.lifetime.geometriesCreated > 100) {
      console.warn('Potential memory leak detected:', {
        geometryLeakRatio: leakRatio,
        stats: stats
      });
    }
  }
}

// Export singleton instance for convenience
export const resourceManager = ResourceManager.getInstance();