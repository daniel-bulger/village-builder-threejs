import * as THREE from 'three';
import { 
  ComponentData, 
  ComponentType, 
  MaterialType,
  COMPONENT_DIMENSIONS,
  MATERIAL_PROPERTIES,
  WallAlignment,
  calculateComponentWeight,
  calculateSupportProvided,
  getWallWorldPosition,
  getPillarWorldPosition
} from './BuildingTypes';
import { HexCoord3D } from '../utils/HexUtils';
import { resourceManager } from '../utils/ResourceManager';

export class BuildingComponent {
  public id: string;
  public data: ComponentData;
  public mesh: THREE.Mesh;
  public weight: number;
  public supportProvided: number;
  public supportRequired: number;
  public connections: Set<string> = new Set();
  
  constructor(data: ComponentData) {
    this.id = data.id;
    this.data = data;
    
    // Calculate physical properties
    this.weight = calculateComponentWeight(data);
    this.supportProvided = calculateSupportProvided(data);
    this.supportRequired = this.weight; // Components need support for their own weight
    
    // Create mesh
    this.mesh = this.createMesh();
    this.positionMesh();
  }
  
  private createMesh(): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    const material = this.createMaterial();
    
    // Register material with ResourceManager
    resourceManager.addMaterial(material);
    
    switch (this.data.type) {
      case ComponentType.WALL:
        geometry = this.createWallGeometry();
        break;
      case ComponentType.FLOOR:
      case ComponentType.FOUNDATION:
        geometry = this.createFloorGeometry();
        break;
      case ComponentType.PILLAR:
        geometry = this.createPillarGeometry();
        break;
      case ComponentType.ROOF:
        geometry = this.createFloorGeometry(); // Roofs use same hex shape as floors
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    
    // Register geometry with ResourceManager
    resourceManager.addGeometry(geometry);
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { componentId: this.id };
    
    return mesh;
  }
  
  private createWallGeometry(): THREE.BufferGeometry {
    const dims = COMPONENT_DIMENSIONS.WALL;
    let geometry: THREE.BufferGeometry;
    
    if (this.data.metadata?.hasDoor) {
      // Create wall with door opening
      const doorDims = COMPONENT_DIMENSIONS.DOOR;
      const shape = new THREE.Shape();
      
      // Outer wall rectangle
      shape.moveTo(-dims.length/2, 0);
      shape.lineTo(dims.length/2, 0);
      shape.lineTo(dims.length/2, dims.height);
      shape.lineTo(-dims.length/2, dims.height);
      shape.lineTo(-dims.length/2, 0);
      
      // Door hole
      const doorHole = new THREE.Path();
      doorHole.moveTo(-doorDims.width/2, 0);
      doorHole.lineTo(doorDims.width/2, 0);
      doorHole.lineTo(doorDims.width/2, doorDims.height);
      doorHole.lineTo(-doorDims.width/2, doorDims.height);
      doorHole.lineTo(-doorDims.width/2, 0);
      
      shape.holes.push(doorHole);
      
      const extrudeSettings = {
        depth: dims.thickness,
        bevelEnabled: false
      };
      
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
    } else if (this.data.metadata?.hasWindow) {
      // Create wall with window opening
      const winDims = COMPONENT_DIMENSIONS.WINDOW;
      const shape = new THREE.Shape();
      
      // Outer wall rectangle
      shape.moveTo(-dims.length/2, 0);
      shape.lineTo(dims.length/2, 0);
      shape.lineTo(dims.length/2, dims.height);
      shape.lineTo(-dims.length/2, dims.height);
      shape.lineTo(-dims.length/2, 0);
      
      // Window hole
      const windowHole = new THREE.Path();
      windowHole.moveTo(-winDims.width/2, winDims.sillHeight);
      windowHole.lineTo(winDims.width/2, winDims.sillHeight);
      windowHole.lineTo(winDims.width/2, winDims.sillHeight + winDims.height);
      windowHole.lineTo(-winDims.width/2, winDims.sillHeight + winDims.height);
      windowHole.lineTo(-winDims.width/2, winDims.sillHeight);
      
      shape.holes.push(windowHole);
      
      const extrudeSettings = {
        depth: dims.thickness,
        bevelEnabled: false
      };
      
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
    } else {
      // Simple wall - thickness along X-axis, length along Z-axis
      // This way when we rotate around Y, the wall aligns properly
      geometry = new THREE.BoxGeometry(dims.thickness, dims.height, dims.length);
    }
    
    return geometry;
  }
  
  private createFloorGeometry(): THREE.BufferGeometry {
    // Create hexagonal floor/foundation
    const shape = new THREE.Shape();
    const HEX_SIZE = 1; // Unit hex
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6; // Start at 30 degrees for pointy-top hex
      const x = Math.cos(angle) * HEX_SIZE;
      const z = Math.sin(angle) * HEX_SIZE;
      
      if (i === 0) {
        shape.moveTo(x, z);
      } else {
        shape.lineTo(x, z);
      }
    }
    shape.closePath();
    
    const thickness = this.data.type === ComponentType.FOUNDATION 
      ? COMPONENT_DIMENSIONS.FOUNDATION.thickness
      : COMPONENT_DIMENSIONS.FLOOR.thickness;
    
    // Rotate shape 90 degrees to match game's hex orientation
    const rotatedShape = new THREE.Shape();
    shape.getPoints().forEach((point, i) => {
      const rotatedPoint = {
        x: -point.y,
        y: point.x
      };
      if (i === 0) {
        rotatedShape.moveTo(rotatedPoint.x, rotatedPoint.y);
      } else {
        rotatedShape.lineTo(rotatedPoint.x, rotatedPoint.y);
      }
    });
    rotatedShape.closePath();
    
    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false
    };
    
    return new THREE.ExtrudeGeometry(rotatedShape, extrudeSettings);
  }
  
  private createPillarGeometry(): THREE.BufferGeometry {
    const dims = COMPONENT_DIMENSIONS.PILLAR;
    return new THREE.CylinderGeometry(
      dims.radius, 
      dims.radius, 
      dims.height, 
      8 // 8-sided for performance
    );
  }
  
  private createMaterial(): THREE.Material {
    const matProps = MATERIAL_PROPERTIES[this.data.material];
    const colors = this.getMaterialColors();
    
    const material = new THREE.MeshStandardMaterial({
      color: colors.base,
      roughness: this.getMaterialRoughness(),
      metalness: this.getMaterialMetalness(),
    });
    
    // Add emissive for crystal materials
    if (this.data.material === MaterialType.CRYSTAL) {
      material.emissive = new THREE.Color(colors.emissive || 0x000000);
      material.emissiveIntensity = 0.2;
    }
    
    return material;
  }
  
  private getMaterialColors(): { base: number; emissive?: number } {
    switch (this.data.material) {
      case MaterialType.WOOD:
        return { base: 0x8B6F47 };
      case MaterialType.STONE:
        return { base: 0x8B8989 };
      case MaterialType.BRICK:
        return { base: 0xB22222 };
      case MaterialType.CRYSTAL:
        return { base: 0x87CEEB, emissive: 0x4169E1 };
      case MaterialType.METAL:
        return { base: 0x708090 };
      default:
        return { base: 0x808080 };
    }
  }
  
  private getMaterialRoughness(): number {
    switch (this.data.material) {
      case MaterialType.WOOD: return 0.8;
      case MaterialType.STONE: return 0.9;
      case MaterialType.BRICK: return 0.85;
      case MaterialType.CRYSTAL: return 0.1;
      case MaterialType.METAL: return 0.3;
      default: return 0.5;
    }
  }
  
  private getMaterialMetalness(): number {
    switch (this.data.material) {
      case MaterialType.METAL: return 0.9;
      case MaterialType.CRYSTAL: return 0.3;
      default: return 0.0;
    }
  }
  
  private positionMesh(): void {
    let position: THREE.Vector3;
    
    switch (this.data.type) {
      case ComponentType.WALL:
        if (this.data.wallAlignment !== undefined) {
          position = getWallWorldPosition(this.data.position, this.data.wallAlignment);
          // Rotate wall to align with hex edge
          // Wall geometry has thickness along X, length along Z (points north at 90° by default)
          // Floor hex is rotated 90°, vertices at 60°, 120°, 180°, 240°, 300°, 0°
          // Edge directions: 180°, 240°, 300°, 0°, 60°, 120°
          // Wall needs rotation FROM 90° TO edge direction
          // Edge 0: runs at 180°, needs rotation of 90° (180° - 90°)
          // Edge 1: runs at 240°, needs rotation of 150° (240° - 90°)
          // Edge 2: runs at 300°, needs rotation of 210° (300° - 90°)
          // Edge 3: runs at 0°, needs rotation of 270° (0° - 90° + 360°)
          // Edge 4: runs at 60°, needs rotation of 330° (60° - 90° + 360°)
          // Edge 5: runs at 120°, needs rotation of 30° (120° - 90°)
          // Formula: rotation = -edge * 60° + 90° (negative to reverse direction)
          this.mesh.rotation.y = -(this.data.wallAlignment * Math.PI) / 3 + Math.PI / 2;
        } else {
          position = this.hexToWorld(this.data.position);
        }
        // Center wall vertically at its level
        position.y += COMPONENT_DIMENSIONS.WALL.height / 2;
        break;
        
      case ComponentType.PILLAR:
        if (this.data.vertexIndex !== undefined) {
          position = getPillarWorldPosition(this.data.position, this.data.vertexIndex);
        } else {
          position = this.hexToWorld(this.data.position);
        }
        // Center pillar vertically at its level
        position.y += COMPONENT_DIMENSIONS.PILLAR.height / 2;
        break;
        
      case ComponentType.FLOOR:
        position = this.hexToWorld(this.data.position);
        position.y -= COMPONENT_DIMENSIONS.FLOOR.thickness / 2;
        // Rotate to lay flat (ExtrudeGeometry extrudes along Z by default)
        this.mesh.rotation.x = -Math.PI / 2;
        break;
        
      case ComponentType.FOUNDATION:
        position = this.hexToWorld(this.data.position);
        // Foundation sits at ground level
        // Rotate to lay flat (ExtrudeGeometry extrudes along Z by default)
        this.mesh.rotation.x = -Math.PI / 2;
        break;
        
      case ComponentType.ROOF:
        position = this.hexToWorld(this.data.position);
        // Rotate to lay flat (ExtrudeGeometry extrudes along Z by default)
        this.mesh.rotation.x = -Math.PI / 2;
        break;
        
      default:
        position = this.hexToWorld(this.data.position);
    }
    
    this.mesh.position.copy(position);
  }
  
  private hexToWorld(coord: HexCoord3D): THREE.Vector3 {
    const HEX_SIZE = 1;
    return new THREE.Vector3(
      coord.q * HEX_SIZE * 1.5,
      coord.y * 3.0, // 3m per level
      (coord.r + coord.q * 0.5) * HEX_SIZE * Math.sqrt(3)
    );
  }
  
  // Check if this component can connect to another
  canConnectTo(other: BuildingComponent): boolean {
    // Same level check for most connections
    if (Math.abs(this.data.level - other.data.level) > 1) {
      return false;
    }
    
    // Type-specific connection rules
    if (this.data.type === ComponentType.WALL && other.data.type === ComponentType.WALL) {
      // Walls can connect if they share a vertex
      return this.wallsShareVertex(other);
    }
    
    if (this.data.type === ComponentType.FLOOR && other.data.type === ComponentType.WALL) {
      // Floors support walls on the same hex
      return this.isSameHex(other) && this.data.level === other.data.level - 1;
    }
    
    // Add more connection rules as needed
    return false;
  }
  
  private wallsShareVertex(other: BuildingComponent): boolean {
    if (!this.data.wallAlignment || !other.data.wallAlignment) return false;
    
    // Complex logic to determine if walls share a vertex
    // This would check if the walls are on adjacent hex edges
    // Implementation depends on your hex grid system
    return false; // Placeholder
  }
  
  private isSameHex(other: BuildingComponent): boolean {
    return this.data.position.q === other.data.position.q &&
           this.data.position.r === other.data.position.r;
  }
  
  // Update visual state based on structural integrity
  updateVisualState(stressed: boolean, stressLevel: number = 0): void {
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    
    if (stressed) {
      // Interpolate color from normal to red based on stress
      const baseColor = this.getMaterialColors().base;
      const stressColor = 0xFF0000;
      
      const r = ((baseColor >> 16) & 0xFF) * (1 - stressLevel) + ((stressColor >> 16) & 0xFF) * stressLevel;
      const g = ((baseColor >> 8) & 0xFF) * (1 - stressLevel) + ((stressColor >> 8) & 0xFF) * stressLevel;
      const b = (baseColor & 0xFF) * (1 - stressLevel) + (stressColor & 0xFF) * stressLevel;
      
      material.color.setRGB(r / 255, g / 255, b / 255);
      
      // Add slight shake at high stress
      if (stressLevel > 0.8) {
        const shake = (Math.random() - 0.5) * 0.01 * stressLevel;
        this.mesh.position.x += shake;
        this.mesh.position.z += shake;
      }
    } else {
      // Reset to normal color
      material.color.setHex(this.getMaterialColors().base);
    }
  }
  
  dispose(): void {
    // Use ResourceManager for proper cleanup
    resourceManager.disposeMesh(this.mesh);
    
    // Clear connections
    this.connections.clear();
  }
}