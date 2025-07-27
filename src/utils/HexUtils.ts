import * as THREE from 'three';
import { Constants } from './Constants';

export interface HexCoord {
  q: number;
  r: number;
}

export interface HexCoord3D extends HexCoord {
  y: number; // Y level for stacking
}

export class HexUtils {
  // Convert world position to hex coordinates
  static worldToHex(worldPos: THREE.Vector3): HexCoord {
    const x = worldPos.x;
    const z = worldPos.z;
    
    const q = (2/3 * x) / Constants.HEX_SIZE;
    const r = (-1/3 * x + Math.sqrt(3)/3 * z) / Constants.HEX_SIZE;
    
    return this.roundHex(q, r);
  }
  
  // Convert hex to world position
  static hexToWorld(hex: HexCoord): THREE.Vector3 {
    const x = Constants.HEX_SIZE * (3/2 * hex.q);
    const z = Constants.HEX_SIZE * (Math.sqrt(3)/2 * hex.q + Math.sqrt(3) * hex.r);
    
    return new THREE.Vector3(x, 0, z);
  }
  
  // Round fractional hex coordinates
  static roundHex(q: number, r: number): HexCoord {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    
    const q_diff = Math.abs(rq - q);
    const r_diff = Math.abs(rr - r);
    const s_diff = Math.abs(rs - s);
    
    if (q_diff > r_diff && q_diff > s_diff) {
      rq = -rr - rs;
    } else if (r_diff > s_diff) {
      rr = -rq - rs;
    }
    
    return { q: rq, r: rr };
  }
  
  // Get hex neighbors
  static getNeighbors(hex: HexCoord): HexCoord[] {
    return [
      { q: hex.q + 1, r: hex.r },
      { q: hex.q + 1, r: hex.r - 1 },
      { q: hex.q, r: hex.r - 1 },
      { q: hex.q - 1, r: hex.r },
      { q: hex.q - 1, r: hex.r + 1 },
      { q: hex.q, r: hex.r + 1 }
    ];
  }
  
  // Get hex corners in world space
  static getHexCorners(center: THREE.Vector3): THREE.Vector3[] {
    const corners: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      corners.push(new THREE.Vector3(
        center.x + Constants.HEX_SIZE * Math.cos(angle),
        center.y,
        center.z + Constants.HEX_SIZE * Math.sin(angle)
      ));
    }
    return corners;
  }
  
  // Create a unique key for hex coordinates
  static hexToKey(hex: HexCoord): string {
    return `${hex.q},${hex.r}`;
  }
  
  // Create a unique key for 3D hex coordinates
  static hex3DToKey(hex: HexCoord3D): string {
    return `${hex.q},${hex.r},${hex.y}`;
  }
  
  // Parse a hex key back to coordinates
  static keyToHex(key: string): HexCoord {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }
  
  // Parse a 3D hex key back to coordinates
  static keyToHex3D(key: string): HexCoord3D {
    const [q, r, y] = key.split(',').map(Number);
    return { q, r, y };
  }
  
  // Edge directions for a hex (0-5, clockwise from East)
  static readonly EDGE_DIRECTIONS = [
    { q: 1, r: 0 },    // 0: East
    { q: 1, r: -1 },   // 1: Southeast  
    { q: 0, r: -1 },   // 2: Southwest
    { q: -1, r: 0 },   // 3: West
    { q: -1, r: 1 },   // 4: Northwest
    { q: 0, r: 1 }     // 5: Northeast
  ];
  
  // Get the neighbor in a specific edge direction
  static getNeighborInDirection(hex: HexCoord, direction: number): HexCoord {
    const dir = this.EDGE_DIRECTIONS[direction];
    return { q: hex.q + dir.q, r: hex.r + dir.r };
  }
  
  // Get the opposite edge direction
  static getOppositeDirection(direction: number): number {
    return (direction + 3) % 6;
  }
  
  // Create key for edge barrier storage (between two hexes)
  static sharedEdgeKey(hex1: HexCoord3D, hex2: HexCoord3D): string {
    // Sort hexes to ensure consistent key regardless of direction
    const [first, second] = this.sortHexes(hex1, hex2);
    return `${first.q},${first.r},${first.y}->${second.q},${second.r},${second.y}`;
  }
  
  // Sort two hexes for consistent ordering
  static sortHexes(hex1: HexCoord3D, hex2: HexCoord3D): [HexCoord3D, HexCoord3D] {
    // Sort by q, then r, then y for consistent ordering
    if (hex1.q !== hex2.q) return hex1.q < hex2.q ? [hex1, hex2] : [hex2, hex1];
    if (hex1.r !== hex2.r) return hex1.r < hex2.r ? [hex1, hex2] : [hex2, hex1];
    return hex1.y < hex2.y ? [hex1, hex2] : [hex2, hex1];
  }
  
  // Create a unique key for an edge barrier (legacy single-hex version)
  static edgeBarrierKey(hex: HexCoord3D, direction: number): string {
    return `${hex.q},${hex.r},${hex.y},E${direction}`;
  }
  
  // Get the world space positions for an edge
  static getEdgeVertices(center: THREE.Vector3, direction: number, height: number = Constants.HEX_HEIGHT): THREE.Vector3[] {
    const corners = this.getHexCorners(center);
    const corner1 = corners[direction];
    const corner2 = corners[(direction + 1) % 6];
    
    return [
      new THREE.Vector3(corner1.x, center.y - height/2, corner1.z),
      new THREE.Vector3(corner2.x, center.y - height/2, corner2.z),
      new THREE.Vector3(corner2.x, center.y + height/2, corner2.z),
      new THREE.Vector3(corner1.x, center.y + height/2, corner1.z)
    ];
  }
  
  // Calculate distance between two hexes
  static hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }
  
  // Create hex geometry
  static createHexGeometry(height: number = Constants.HEX_HEIGHT): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = Constants.HEX_SIZE * Math.cos(angle);
      const z = Constants.HEX_SIZE * Math.sin(angle);
      
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false
    });
    
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2, 0);
    
    return geometry;
  }
}