import { HexCoord, HexCoord3D } from '../utils/HexUtils';
import * as THREE from 'three';

export enum ComponentType {
  FOUNDATION = 'foundation',
  WALL = 'wall',
  FLOOR = 'floor',
  ROOF = 'roof',
  PILLAR = 'pillar',
  DOOR = 'door',
  WINDOW = 'window',
  STAIRS = 'stairs'
}

export enum MaterialType {
  WOOD = 'wood',
  STONE = 'stone',
  BRICK = 'brick',
  CRYSTAL = 'crystal',
  METAL = 'metal'
}

export enum WallAlignment {
  EDGE_0 = 0,  // Right edge (positive Q direction)
  EDGE_1 = 1,  // Top-right edge
  EDGE_2 = 2,  // Top-left edge
  EDGE_3 = 3,  // Left edge (negative Q direction)
  EDGE_4 = 4,  // Bottom-left edge
  EDGE_5 = 5   // Bottom-right edge
}

// Component dimensions
export const COMPONENT_DIMENSIONS = {
  WALL: {
    thickness: 0.2,    // 20cm thick
    height: 3.0,       // 3m tall per level
    length: 1.0,       // Length of hex edge (for unit hex with radius 1)
  },
  FLOOR: {
    thickness: 0.3,    // 30cm thick floors
  },
  FOUNDATION: {
    thickness: 0.5,    // 50cm thick
    overhang: 0.1,     // Extends slightly beyond walls
  },
  PILLAR: {
    radius: 0.2,       // 20cm radius
    height: 3.0,       // Same as wall height
  },
  DOOR: {
    width: 0.9,        // 90cm wide
    height: 2.1,       // 2.1m tall
  },
  WINDOW: {
    width: 0.8,        // 80cm wide
    height: 1.2,       // 1.2m tall
    sillHeight: 0.9,   // 90cm from floor
  }
};

// Material properties (maintaining backward compatibility)
export const MATERIAL_PROPERTIES = {
  wood: {
    cost: 10,
    weight: 5,
    strength: 100,
    durability: 50,
    fireResistance: 0,
    maxSupportLevel: 2,
    color: 0x8B6F47,
    // Extended properties
    density: 500,           // kg/m³
    maxSupportHeight: 6,    // Can support 2 levels (6m)
    insulation: 0.6,
    aestheticValue: 1.0
  },
  stone: {
    cost: 20,
    weight: 20,
    strength: 300,
    durability: 200,
    fireResistance: 100,
    maxSupportLevel: 4,
    color: 0x8B8989,
    // Extended properties
    density: 2000,
    maxSupportHeight: 12,   // Can support 4 levels
    insulation: 0.8,
    aestheticValue: 1.5
  },
  brick: {
    cost: 15,
    weight: 15,
    strength: 250,
    durability: 150,
    fireResistance: 80,
    maxSupportLevel: 5,
    color: 0xB22222,
    // Extended properties
    density: 1800,
    maxSupportHeight: 15,   // Can support 5 levels
    insulation: 0.9,
    aestheticValue: 2.0
  },
  crystal: {
    cost: 50,
    weight: 10,
    strength: 400,
    durability: 300,
    fireResistance: 100,
    maxSupportLevel: 6,
    color: 0x87CEEB,
    // Extended properties
    density: 1200,
    maxSupportHeight: 18,   // Can support 6 levels
    insulation: 0.7,
    aestheticValue: 4.0
  },
  metal: {
    cost: 40,
    weight: 25,
    strength: 500,
    durability: 250,
    fireResistance: 100,
    maxSupportLevel: 8,
    color: 0x708090,
    // Extended properties
    density: 3000,
    maxSupportHeight: 24,   // Can support 8 levels
    insulation: 0.4,
    aestheticValue: 2.5
  }
};

export interface MaterialProperties {
  // Legacy properties
  cost: number;
  weight: number;
  strength: number;
  durability: number;
  fireResistance: number;
  maxSupportLevel: number;
  color: number;
  // Extended properties
  density: number;           // kg/m³
  maxSupportHeight: number;  // Maximum height this material can support
  insulation: number;        // 0-1, affects temperature
  aestheticValue: number;    // Multiplier for beauty calculations
}

export interface ComponentData {
  id: string;
  type: ComponentType;
  material: MaterialType;
  position: HexCoord3D;     // Use 3D coords to include Y level
  level: number;            // Which floor (0 = ground)
  rotation?: number;        // For components that can rotate (0, 90, 180, 270)
  wallAlignment?: WallAlignment; // For wall pieces
  vertexIndex?: number;     // For pillars (0-5, which vertex of the hex)
  metadata?: any;           // Additional component-specific data
}

// Component rotation support
export const ROTATABLE_COMPONENTS = [
  ComponentType.DOOR,
  ComponentType.WINDOW,
  ComponentType.STAIRS,
  ComponentType.ROOF
];

export interface BuildingComponent extends ComponentData {
  mesh?: THREE.Mesh;
  weight: number;          // Calculated based on volume and material
  supportProvided: number; // How much weight this can support
  supportRequired: number; // How much support this needs
  connections: string[];   // IDs of connected components
}

// Support calculations
export function calculateComponentWeight(component: ComponentData): number {
  const material = MATERIAL_PROPERTIES[component.material];
  let volume = 0;
  
  switch (component.type) {
    case ComponentType.WALL:
      volume = COMPONENT_DIMENSIONS.WALL.thickness * 
               COMPONENT_DIMENSIONS.WALL.height * 
               COMPONENT_DIMENSIONS.WALL.length;
      break;
    case ComponentType.FLOOR:
      // Hex area = 3√3/2 * s² where s = 1
      volume = 2.598 * COMPONENT_DIMENSIONS.FLOOR.thickness;
      break;
    case ComponentType.FOUNDATION:
      volume = 2.598 * COMPONENT_DIMENSIONS.FOUNDATION.thickness * 1.2; // Slightly larger
      break;
    case ComponentType.PILLAR:
      volume = Math.PI * Math.pow(COMPONENT_DIMENSIONS.PILLAR.radius, 2) * 
               COMPONENT_DIMENSIONS.PILLAR.height;
      break;
  }
  
  return volume * material.density;
}

export function calculateSupportProvided(component: ComponentData): number {
  const material = MATERIAL_PROPERTIES[component.material];
  
  switch (component.type) {
    case ComponentType.FOUNDATION:
      return material.maxSupportHeight * 10000; // Foundations provide massive support
    case ComponentType.WALL:
      return material.maxSupportHeight * 1000;  // Walls provide good vertical support
    case ComponentType.PILLAR:
      return material.maxSupportHeight * 1500;  // Pillars are excellent for support
    case ComponentType.FLOOR:
      return 0; // Floors don't provide vertical support
    default:
      return 0;
  }
}

// Get the world position for a wall segment
export function getWallWorldPosition(hexCoord: HexCoord3D, edge: WallAlignment): THREE.Vector3 {
  const HEX_SIZE = 1;
  const center = new THREE.Vector3(
    hexCoord.q * HEX_SIZE * 1.5,
    hexCoord.y * 3.0, // Height per level
    (hexCoord.r + hexCoord.q * 0.5) * HEX_SIZE * Math.sqrt(3)
  );
  
  // Calculate edge midpoint offset from hex center
  // The floor hex has been rotated 90°, so edge midpoints are at:
  // Edge 0: 90°, Edge 1: 150°, Edge 2: 210°, Edge 3: 270°, Edge 4: 330°, Edge 5: 30°
  const angle = (edge * Math.PI) / 3 + Math.PI / 2; // Add 90° to match floor rotation
  const edgeDistance = HEX_SIZE * Math.sqrt(3) / 2; // Distance to edge midpoint
  
  center.x += Math.cos(angle) * edgeDistance;
  center.z += Math.sin(angle) * edgeDistance;
  
  return center;
}

// Get the world position for a pillar (hex vertex)
export function getPillarWorldPosition(hexCoord: HexCoord3D, vertexIndex: number): THREE.Vector3 {
  const HEX_SIZE = 1;
  const center = new THREE.Vector3(
    hexCoord.q * HEX_SIZE * 1.5,
    hexCoord.y * 3.0,
    (hexCoord.r + hexCoord.q * 0.5) * HEX_SIZE * Math.sqrt(3)
  );
  
  // Calculate vertex offset from hex center
  // Floor hex is rotated 90°, so vertices are at 60°, 120°, 180°, 240°, 300°, 0°
  const angle = (vertexIndex * Math.PI) / 3 + Math.PI / 3; // First vertex at 60 degrees (30° + 90° rotation)
  const vertexDistance = HEX_SIZE; // Distance to vertex
  
  center.x += Math.cos(angle) * vertexDistance;
  center.z += Math.sin(angle) * vertexDistance;
  
  return center;
}

// Check if a position can support a component
export interface SupportCheck {
  canSupport: boolean;
  supportAvailable: number;
  supportNeeded: number;
  supportingComponents: string[];
}

// Component templates for quick placement
export const COMPONENT_TEMPLATES = {
  BASIC_WALL: (material: MaterialType): Partial<ComponentData> => ({
    type: ComponentType.WALL,
    material,
  }),
  
  DOOR_WALL: (material: MaterialType): Partial<ComponentData> => ({
    type: ComponentType.WALL,
    material,
    metadata: { hasDoor: true }
  }),
  
  WINDOW_WALL: (material: MaterialType): Partial<ComponentData> => ({
    type: ComponentType.WALL,
    material,
    metadata: { hasWindow: true }
  }),
  
  FLOOR_TILE: (material: MaterialType): Partial<ComponentData> => ({
    type: ComponentType.FLOOR,
    material,
  }),
  
  FOUNDATION_BLOCK: (material: MaterialType): Partial<ComponentData> => ({
    type: ComponentType.FOUNDATION,
    material,
  })
};