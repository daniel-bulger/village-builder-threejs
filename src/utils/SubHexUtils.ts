import * as THREE from 'three';
import { HexCoord, HexUtils } from './HexUtils';
import { Constants } from './Constants';

// Sub-hex coordinate (relative to a parent hex)
export interface SubHexCoord {
  q: number;  // Sub-grid q coordinate
  r: number;  // Sub-grid r coordinate
  parentQ: number;  // Parent hex q coordinate
  parentR: number;  // Parent hex r coordinate
}

export interface SubHexCoord3D extends SubHexCoord {
  y: number;  // Y level (same scale as main grid)
}

export class SubHexUtils {
  // Number of sub-hexes per edge of main hex
  // A value of 10 means each main hex contains 271 sub-hexes
  static readonly SUB_GRID_DIVISIONS = 10;
  
  // Size of each sub-hex
  static readonly SUB_HEX_SIZE = Constants.HEX_SIZE / SubHexUtils.SUB_GRID_DIVISIONS;
  
  // Convert world position to sub-hex coordinates
  static worldToSubHex(worldPos: THREE.Vector3): SubHexCoord {
    // First find which main hex we're in
    const mainHex = HexUtils.worldToHex(worldPos);
    
    // Get the world position of the main hex center
    const mainHexCenter = HexUtils.hexToWorld(mainHex);
    
    // Calculate position relative to main hex center
    const relX = worldPos.x - mainHexCenter.x;
    const relZ = worldPos.z - mainHexCenter.z;
    
    // Convert to sub-hex coordinates using smaller hex size
    const subQ = (2/3 * relX) / this.SUB_HEX_SIZE;
    const subR = (-1/3 * relX + Math.sqrt(3)/3 * relZ) / this.SUB_HEX_SIZE;
    
    const rounded = HexUtils.roundHex(subQ, subR);
    
    return {
      q: rounded.q,
      r: rounded.r,
      parentQ: mainHex.q,
      parentR: mainHex.r
    };
  }
  
  // Convert sub-hex to world position
  static subHexToWorld(subHex: SubHexCoord): THREE.Vector3 {
    // Get parent hex world position
    const parentPos = HexUtils.hexToWorld({ q: subHex.parentQ, r: subHex.parentR });
    
    // Calculate sub-hex offset from parent center
    const x = this.SUB_HEX_SIZE * (3/2 * subHex.q);
    const z = this.SUB_HEX_SIZE * (Math.sqrt(3)/2 * subHex.q + Math.sqrt(3) * subHex.r);
    
    // Add offset to parent position
    return new THREE.Vector3(
      parentPos.x + x,
      0,
      parentPos.z + z
    );
  }
  
  // Get all sub-hexes within a main hex
  static getSubHexesInMainHex(mainHex: HexCoord): SubHexCoord[] {
    const subHexes: SubHexCoord[] = [];
    const radius = this.SUB_GRID_DIVISIONS - 1;
    
    // Generate all sub-hexes in a hexagonal pattern
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      
      for (let r = r1; r <= r2; r++) {
        subHexes.push({
          q,
          r,
          parentQ: mainHex.q,
          parentR: mainHex.r
        });
      }
    }
    
    return subHexes;
  }
  
  // Get all main hexes that a sub-hex overlaps with
  static getOverlappingMainHexes(subHex: SubHexCoord): HexCoord[] {
    const overlapping: HexCoord[] = [];
    const worldPos = this.subHexToWorld(subHex);
    
    // Check center
    const centerHex = HexUtils.worldToHex(worldPos);
    overlapping.push(centerHex);
    
    // Check vertices of the sub-hex to find all overlapping main hexes
    const vertices = this.getSubHexVertices(subHex);
    const checkedKeys = new Set<string>();
    checkedKeys.add(HexUtils.hexToKey(centerHex));
    
    for (const vertex of vertices) {
      const hex = HexUtils.worldToHex(vertex);
      const key = HexUtils.hexToKey(hex);
      
      if (!checkedKeys.has(key)) {
        overlapping.push(hex);
        checkedKeys.add(key);
      }
    }
    
    return overlapping;
  }
  
  // Get world positions of sub-hex vertices
  static getSubHexVertices(subHex: SubHexCoord): THREE.Vector3[] {
    const center = this.subHexToWorld(subHex);
    const vertices: THREE.Vector3[] = [];
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = center.x + this.SUB_HEX_SIZE * Math.cos(angle);
      const z = center.z + this.SUB_HEX_SIZE * Math.sin(angle);
      vertices.push(new THREE.Vector3(x, 0, z));
    }
    
    return vertices;
  }
  
  // Convert sub-hex to a unique key string
  static subHexToKey(subHex: SubHexCoord): string {
    return `${subHex.parentQ},${subHex.parentR}:${subHex.q},${subHex.r}`;
  }
  
  // Convert sub-hex 3D to a unique key string
  static subHex3DToKey(subHex: SubHexCoord3D): string {
    return `${subHex.parentQ},${subHex.parentR}:${subHex.q},${subHex.r},${subHex.y}`;
  }
  
  // Parse key back to sub-hex
  static keyToSubHex(key: string): SubHexCoord {
    const [parent, sub] = key.split(':');
    const [parentQ, parentR] = parent.split(',').map(Number);
    const [q, r] = sub.split(',').map(Number);
    
    return { q, r, parentQ, parentR };
  }
  
  // Parse key back to sub-hex 3D
  static keyToSubHex3D(key: string): SubHexCoord3D {
    const [parent, sub] = key.split(':');
    const [parentQ, parentR] = parent.split(',').map(Number);
    const parts = sub.split(',').map(Number);
    
    return { 
      q: parts[0], 
      r: parts[1], 
      y: parts[2],
      parentQ, 
      parentR 
    };
  }
  
  // Get neighboring sub-hexes
  static getSubHexNeighbors(subHex: SubHexCoord): SubHexCoord[] {
    const neighbors: SubHexCoord[] = [];
    const directions = HexUtils.EDGE_DIRECTIONS;
    
    for (const dir of directions) {
      const newQ = subHex.q + dir.q;
      const newR = subHex.r + dir.r;
      
      // Check if still within same parent hex
      const worldPos = this.subHexToWorld({
        q: newQ,
        r: newR,
        parentQ: subHex.parentQ,
        parentR: subHex.parentR
      });
      
      // Convert back to get actual parent
      const actualSubHex = this.worldToSubHex(worldPos);
      neighbors.push(actualSubHex);
    }
    
    return neighbors;
  }
  
  // Create sub-hex geometry (smaller than main hex)
  static createSubHexGeometry(height: number = Constants.HEX_HEIGHT): THREE.BufferGeometry {
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    // Top face vertices
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = this.SUB_HEX_SIZE * Math.cos(angle);
      const z = this.SUB_HEX_SIZE * Math.sin(angle);
      
      // Center
      vertices.push(0, height/2, 0);
      normals.push(0, 1, 0);
      uvs.push(0.5, 0.5);
      
      // Current vertex
      vertices.push(x, height/2, z);
      normals.push(0, 1, 0);
      uvs.push(0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle));
      
      // Next vertex
      const nextAngle = (Math.PI / 3) * ((i + 1) % 6);
      const nextX = this.SUB_HEX_SIZE * Math.cos(nextAngle);
      const nextZ = this.SUB_HEX_SIZE * Math.sin(nextAngle);
      vertices.push(nextX, height/2, nextZ);
      normals.push(0, 1, 0);
      uvs.push(0.5 + 0.5 * Math.cos(nextAngle), 0.5 + 0.5 * Math.sin(nextAngle));
    }
    
    // Side faces
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const nextAngle = (Math.PI / 3) * ((i + 1) % 6);
      
      const x1 = this.SUB_HEX_SIZE * Math.cos(angle);
      const z1 = this.SUB_HEX_SIZE * Math.sin(angle);
      const x2 = this.SUB_HEX_SIZE * Math.cos(nextAngle);
      const z2 = this.SUB_HEX_SIZE * Math.sin(nextAngle);
      
      // Two triangles for the side
      vertices.push(
        x1, height/2, z1,
        x1, -height/2, z1,
        x2, height/2, z2,
        
        x2, height/2, z2,
        x1, -height/2, z1,
        x2, -height/2, z2
      );
      
      // Normal facing outward
      const nx = (x1 + x2) / 2;
      const nz = (z1 + z2) / 2;
      const len = Math.sqrt(nx * nx + nz * nz);
      const normalX = nx / len;
      const normalZ = nz / len;
      
      for (let j = 0; j < 6; j++) {
        normals.push(normalX, 0, normalZ);
      }
      
      // Simple UV mapping
      uvs.push(
        0, 0,
        0, 1,
        1, 0,
        1, 0,
        0, 1,
        1, 1
      );
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    return geometry;
  }
}