import * as THREE from 'three';
import { Constants } from '../utils/Constants';

interface DesertTile {
  mesh: THREE.Mesh;
  x: number;
  z: number;
}

export class Desert {
  private tiles: Map<string, DesertTile> = new Map();
  private material: THREE.Material;
  private geometry: THREE.PlaneGeometry;
  
  constructor(private scene: THREE.Scene) {
    this.createMaterial();
    this.createGeometry();
    this.generateInitialTiles(new THREE.Vector3(0, 0, 0));
  }
  
  private createMaterial(): void {
    // Create desert texture (we'll use a simple color for now)
    // In a real game, you'd load a texture here
    this.material = new THREE.MeshStandardMaterial({
      color: Constants.DESERT_COLOR,
      roughness: 0.9,
      metalness: 0.0,
    });
    
    // Add some variation with vertex colors
    this.material.vertexColors = true;
  }
  
  private createGeometry(): void {
    // Create a plane for each tile
    this.geometry = new THREE.PlaneGeometry(
      Constants.TILE_SIZE,
      Constants.TILE_SIZE,
      10,
      10
    );
    
    // Rotate to be horizontal
    this.geometry.rotateX(-Math.PI / 2);
    
    // Add color variation only (no height variation to keep grid visible)
    const positions = this.geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    
    for (let i = 0; i < positions.count; i++) {
      // Color variation
      const shade = 0.9 + Math.random() * 0.1;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade * 0.8;
      colors[i * 3 + 2] = shade * 0.6;
    }
    
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.computeVertexNormals();
  }
  
  private generateInitialTiles(centerPos: THREE.Vector3): void {
    const centerTileX = Math.floor(centerPos.x / Constants.TILE_SIZE);
    const centerTileZ = Math.floor(centerPos.z / Constants.TILE_SIZE);
    
    // Generate tiles around center
    const halfTiles = Math.floor(Constants.TILES_PER_SIDE / 2);
    
    for (let x = -halfTiles; x <= halfTiles; x++) {
      for (let z = -halfTiles; z <= halfTiles; z++) {
        this.createTile(centerTileX + x, centerTileZ + z);
      }
    }
  }
  
  private createTile(tileX: number, tileZ: number): void {
    const key = `${tileX},${tileZ}`;
    
    if (this.tiles.has(key)) return;
    
    // Create new tile mesh
    const mesh = new THREE.Mesh(this.geometry.clone(), this.material);
    mesh.position.set(
      tileX * Constants.TILE_SIZE,
      0,
      tileZ * Constants.TILE_SIZE
    );
    mesh.receiveShadow = true;
    
    // Add to scene and map
    this.scene.add(mesh);
    this.tiles.set(key, { mesh, x: tileX, z: tileZ });
  }
  
  private removeTile(key: string): void {
    const tile = this.tiles.get(key);
    if (tile) {
      this.scene.remove(tile.mesh);
      tile.mesh.geometry.dispose();
      this.tiles.delete(key);
    }
  }
  
  update(playerPos: THREE.Vector3): void {
    const centerTileX = Math.floor(playerPos.x / Constants.TILE_SIZE);
    const centerTileZ = Math.floor(playerPos.z / Constants.TILE_SIZE);
    const halfTiles = Math.floor(Constants.TILES_PER_SIDE / 2);
    
    // Create set of tiles that should exist
    const requiredTiles = new Set<string>();
    
    for (let x = -halfTiles; x <= halfTiles; x++) {
      for (let z = -halfTiles; z <= halfTiles; z++) {
        const tileX = centerTileX + x;
        const tileZ = centerTileZ + z;
        requiredTiles.add(`${tileX},${tileZ}`);
      }
    }
    
    // Remove tiles that are too far
    for (const [key, tile] of this.tiles) {
      if (!requiredTiles.has(key)) {
        this.removeTile(key);
      }
    }
    
    // Add missing tiles
    for (const key of requiredTiles) {
      if (!this.tiles.has(key)) {
        const [x, z] = key.split(',').map(Number);
        this.createTile(x, z);
      }
    }
  }
  
  getTileCount(): number {
    return this.tiles.size;
  }
  
  // Get the desert plane for raycasting
  get plane(): THREE.Mesh {
    // Return a large invisible plane for raycasting
    if (!this._raycastPlane) {
      const geometry = new THREE.PlaneGeometry(10000, 10000);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ visible: false });
      this._raycastPlane = new THREE.Mesh(geometry, material);
      this.scene.add(this._raycastPlane);
    }
    return this._raycastPlane;
  }
  
  private _raycastPlane?: THREE.Mesh;
}