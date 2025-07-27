import { HexCoord3D, HexUtils } from '../utils/HexUtils';
import { Constants } from '../utils/Constants';

export enum SoilType {
  Desert = 'desert',
  Loam = 'loam',
  Clay = 'clay',
  Rock = 'rock',
  Tilled = 'tilled',
  Barrier = 'barrier' // Impermeable material to prevent water loss
}

export interface SoilProperties {
  waterML: number;         // Actual water content in milliliters
  capacityML: number;      // Max water holding in milliliters
  saturation: number;      // 0.0-1.0 current water content ratio (derived)
  capacity: number;        // 0.0-1.0 max water holding ratio (for compatibility)
  permeability: number;    // 0.0-1.0 how fast water moves through
  soilType: SoilType;
  hasPlant: boolean;
  temperature: number;     // 0.0-1.0 affects evaporation
}

export interface WaterHex extends SoilProperties {
  coord: HexCoord3D;
}

// Soil type configurations
// Water capacity in liters per cubic meter (field capacity)
export const SOIL_CONFIGS: Record<SoilType, { waterCapacityLPerM3: number; permeability: number }> = {
  [SoilType.Desert]: {
    waterCapacityLPerM3: 50,    // Sand holds very little water
    permeability: 1.0,          // Infinite permeability (instant drainage)
  },
  [SoilType.Loam]: {
    waterCapacityLPerM3: 290,   // Loam soil field capacity ~290 L/m³
    permeability: 0.5,
  },
  [SoilType.Clay]: {
    waterCapacityLPerM3: 390,   // Clay soil field capacity ~390 L/m³
    permeability: 0.2,
  },
  [SoilType.Rock]: {
    waterCapacityLPerM3: 0,     // Rock holds no water
    permeability: 0.0,
  },
  [SoilType.Tilled]: {
    // These are modifiers added to base soil type
    waterCapacityLPerM3: 50,    // Additional capacity from tilling
    permeability: 0.2,
  },
  [SoilType.Barrier]: {
    waterCapacityLPerM3: 0,     // Cannot hold water
    permeability: 0.0,          // Completely impermeable
  }
};

export class WaterSimulation {
  private hexes: Map<string, WaterHex> = new Map();
  private edgeBarriers: Set<string> = new Set(); // Set of edge barrier keys
  private flowRate = 0.1; // Base flow rate per tick
  private evaporationRate = 0.001; // Base evaporation per tick (10x slower)
  private gravityFactor = 0.3; // Multiplier for elevation differences
  
  constructor() {}
  
  // Add a hex to the simulation
  addHex(coord: HexCoord3D, soilType: SoilType = SoilType.Loam): void {
    const key = HexUtils.hex3DToKey(coord);
    if (this.hexes.has(key)) return;
    
    const config = SOIL_CONFIGS[soilType];
    // Calculate water capacity: hex volume (m³) × water capacity (L/m³) × 1000 (mL/L)
    const capacityML = Constants.HEX_VOLUME_M3 * config.waterCapacityLPerM3 * 1000;
    
    const hex: WaterHex = {
      coord,
      waterML: 0,
      capacityML,
      saturation: 0,
      capacity: config.waterCapacityLPerM3 / 1000, // Legacy ratio for compatibility (as fraction of 1000 L/m³)
      permeability: config.permeability,
      soilType,
      hasPlant: false,
      temperature: 0.5 // Default to medium temperature
    };
    
    this.hexes.set(key, hex);
  }
  
  // Remove a hex from the simulation
  removeHex(coord: HexCoord3D): void {
    const key = HexUtils.hex3DToKey(coord);
    this.hexes.delete(key);
  }
  
  // Add water to a specific hex (e.g., from watering can) - amount in ML
  addWater(coord: HexCoord3D, amountML: number): boolean {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return false;
    
    // Add water up to capacity
    const spaceAvailableML = hex.capacityML - hex.waterML;
    const waterAddedML = Math.min(amountML, spaceAvailableML);
    hex.waterML += waterAddedML;
    
    // Update saturation ratio
    hex.saturation = hex.capacityML > 0 ? hex.waterML / hex.capacityML : 0;
    
    return waterAddedML > 0;
  }
  
  // Get water saturation level for a hex
  getSaturation(coord: HexCoord3D): number {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    return hex ? hex.saturation : 0;
  }
  
  // Get actual water content in milliliters
  getWaterML(coord: HexCoord3D): number {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    return hex ? hex.waterML : 0;
  }
  
  // Get water capacity in milliliters
  getCapacityML(coord: HexCoord3D): number {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    return hex ? hex.capacityML : 0;
  }
  
  // Get detailed water info for a hex
  getWaterInfo(coord: HexCoord3D): { waterML: number; capacityML: number; saturation: number; soilType: SoilType } | null {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return null;
    
    return {
      waterML: hex.waterML,
      capacityML: hex.capacityML,
      saturation: hex.saturation,
      soilType: hex.soilType
    };
  }
  
  // Remove water from a hex (for plant consumption) - amount in ML
  removeWaterML(coord: HexCoord3D, amountML: number): number {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return 0;
    
    const actualRemovedML = Math.min(amountML, hex.waterML);
    hex.waterML -= actualRemovedML;
    
    // Update saturation ratio
    hex.saturation = hex.capacityML > 0 ? hex.waterML / hex.capacityML : 0;
    
    return actualRemovedML;
  }
  
  // Legacy method for backward compatibility - removes by saturation ratio
  removeWater(coord: HexCoord3D, saturationAmount: number): number {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return 0;
    
    // Convert saturation amount to ML
    const mlToRemove = saturationAmount * hex.capacityML;
    const actualRemovedML = this.removeWaterML(coord, mlToRemove);
    
    // Return the saturation amount that was actually removed
    return hex.capacityML > 0 ? actualRemovedML / hex.capacityML : 0;
  }
  
  // Calculate flow between two hexes - returns ML to transfer
  private calculateFlow(source: WaterHex, target: WaterHex): number {
    // No flow if source is empty or target is full
    if (source.waterML <= 0 || target.waterML >= target.capacityML) {
      return 0;
    }
    
    // Calculate saturation difference
    const saturationDiff = source.saturation - target.saturation;
    if (saturationDiff <= 0) return 0;
    
    // Average permeability
    const avgPermeability = (source.permeability + target.permeability) / 2;
    
    // Gravity effect based on elevation
    const elevationDiff = source.coord.y - target.coord.y;
    let gravityMultiplier: number;
    
    if (elevationDiff > 0) {
      // Downward flow - gravity assists
      gravityMultiplier = 1.0 + (elevationDiff * this.gravityFactor);
    } else if (elevationDiff < 0) {
      // Upward flow (capillary action) - gravity opposes
      // Reduce flow rate but don't stop it completely
      gravityMultiplier = 1.0 / (1.0 + Math.abs(elevationDiff) * this.gravityFactor);
    } else {
      // Horizontal flow - no gravity effect
      gravityMultiplier = 1.0;
    }
    
    // Calculate flow in ML
    // Base flow rate should be reasonable (e.g., 1L/sec max for horizontal flow)
    const maxFlowRateML = 1000; // 1 liter per second maximum
    let flowML = saturationDiff * avgPermeability * gravityMultiplier * this.flowRate * maxFlowRateML;
    
    // Limit flow to available water and target capacity
    flowML = Math.min(flowML, source.waterML);
    flowML = Math.min(flowML, target.capacityML - target.waterML);
    
    return Math.max(0, flowML);
  }
  
  // Main simulation tick
  tick(deltaTime: number): void {
    // Store all flows to apply them simultaneously (in ML)
    const flows: Array<{from: string, to: string, amountML: number}> = [];
    
    // Calculate flows for each hex
    for (const [key, hex] of this.hexes) {
      // Get neighbors at same level and below
      const neighbors = this.getWaterNeighbors(hex.coord);
      
      for (const neighborCoord of neighbors) {
        const neighborKey = HexUtils.hex3DToKey(neighborCoord);
        const neighbor = this.hexes.get(neighborKey);
        
        if (neighbor) {
          // Check if flow is blocked by an edge barrier
          if (!this.isFlowBlocked(hex.coord, neighborCoord)) {
            const flowML = this.calculateFlow(hex, neighbor);
            if (flowML > 0) {
              flows.push({ from: key, to: neighborKey, amountML: flowML });
            }
          }
        } else {
          // Neighbor doesn't exist - it's empty space (desert at y=0, air at y>0)
          if (!this.isFlowBlocked(hex.coord, neighborCoord)) {
            // Water drainage rules:
            // - Always drain downward (gravity pulls water down into sand/desert)
            // - Only drain horizontally if oversaturated (water is absorbed by soil)
            // - Never drain upward (water doesn't flow up into air)
            const elevationDiff = neighborCoord.y - hex.coord.y;
            
            if (elevationDiff < 0) {
              // Downward drainage - always allowed (gravity effect)
              // Water drains into sand/desert below
              const maxDrainRateML = 500; // 0.5L/sec max drainage
              const drainFlowML = Math.min(hex.waterML * this.flowRate, maxDrainRateML);
              flows.push({ from: key, to: 'empty', amountML: drainFlowML });
            } else if (elevationDiff === 0) {
              // Horizontal drainage - only if oversaturated (saturation > 1.0)
              // This represents water pooling on surface that can't be absorbed
              if (hex.saturation > 1.0) {
                // Only drain the excess water that can't be absorbed
                const excessWaterML = hex.waterML - hex.capacityML;
                const drainFlowML = excessWaterML * this.flowRate;
                flows.push({ from: key, to: 'empty', amountML: drainFlowML });
              }
            }
            // upward flow (elevationDiff > 0) is not allowed into empty space
          }
        }
      }
      
      // Apply evaporation only to top layer (exposed to air)
      if (hex.waterML > 0 && this.isTopLayer(hex.coord)) {
        // Evaporation rate based on surface area, not volume
        const baseEvaporationML = 10; // 10mL/sec at full temperature
        const evaporationML = this.evaporationRate * hex.temperature * deltaTime * baseEvaporationML;
        hex.waterML = Math.max(0, hex.waterML - evaporationML);
        hex.saturation = hex.capacityML > 0 ? hex.waterML / hex.capacityML : 0;
      }
    }
    
    // Apply all flows
    for (const flow of flows) {
      if (flow.to === 'empty') {
        // Water lost to empty space (desert or air)
        const source = this.hexes.get(flow.from);
        if (source) {
          source.waterML = Math.max(0, source.waterML - flow.amountML);
          source.saturation = source.capacityML > 0 ? source.waterML / source.capacityML : 0;
        }
      } else {
        // Normal flow between hexes
        const source = this.hexes.get(flow.from);
        const target = this.hexes.get(flow.to);
        if (source && target) {
          source.waterML -= flow.amountML;
          target.waterML += flow.amountML;
          // Update saturation ratios
          source.saturation = source.capacityML > 0 ? source.waterML / source.capacityML : 0;
          target.saturation = target.capacityML > 0 ? target.waterML / target.capacityML : 0;
        }
      }
    }
  }
  
  // Get neighbors that can receive water
  private getWaterNeighbors(coord: HexCoord3D): HexCoord3D[] {
    const neighbors: HexCoord3D[] = [];
    
    // Same level neighbors
    const horizontalNeighbors = HexUtils.getNeighbors(coord);
    for (const n of horizontalNeighbors) {
      neighbors.push({ ...n, y: coord.y });
    }
    
    // Check hex directly below (gravity flow)
    neighbors.push({ q: coord.q, r: coord.r, y: coord.y - 1 });
    
    // Check hex directly above (capillary action)
    neighbors.push({ q: coord.q, r: coord.r, y: coord.y + 1 });
    
    return neighbors;
  }
  
  // Get all water hexes (for rendering)
  getAllHexes(): WaterHex[] {
    return Array.from(this.hexes.values());
  }
  
  // Check if a hex is the top layer (exposed to air)
  private isTopLayer(coord: HexCoord3D): boolean {
    // Check if there's a hex directly above this one
    const aboveKey = HexUtils.hex3DToKey({ 
      q: coord.q, 
      r: coord.r, 
      y: coord.y + 1 
    });
    return !this.hexes.has(aboveKey);
  }
  
  // Add edge barrier between two hexes
  addEdgeBarrier(hex1: HexCoord3D, hex2: HexCoord3D): void {
    const key = HexUtils.sharedEdgeKey(hex1, hex2);
    this.edgeBarriers.add(key);
  }
  
  // Remove edge barrier between two hexes
  removeEdgeBarrier(hex1: HexCoord3D, hex2: HexCoord3D): void {
    const key = HexUtils.sharedEdgeKey(hex1, hex2);
    this.edgeBarriers.delete(key);
  }
  
  // Legacy single-hex edge barrier methods (for compatibility)
  addEdgeBarrierLegacy(hex: HexCoord3D, direction: number): void {
    const key = HexUtils.edgeBarrierKey(hex, direction);
    this.edgeBarriers.add(key);
  }
  
  removeEdgeBarrierLegacy(hex: HexCoord3D, direction: number): void {
    const key = HexUtils.edgeBarrierKey(hex, direction);
    this.edgeBarriers.delete(key);
  }
  
  // Check if there's a barrier blocking flow between two hexes
  private isFlowBlocked(from: HexCoord3D, to: HexCoord3D): boolean {
    // First check the new shared edge system
    const sharedKey = HexUtils.sharedEdgeKey(from, to);
    if (this.edgeBarriers.has(sharedKey)) return true;
    
    // Legacy check for backward compatibility
    // Find which direction the flow is going
    const dirQ = to.q - from.q;
    const dirR = to.r - from.r;
    const dirY = to.y - from.y;
    
    // Check if it's vertical flow
    if (dirQ === 0 && dirR === 0 && dirY !== 0) {
      // Vertical flow - check top/bottom barriers
      if (dirY < 0) {
        // Flow going down - check bottom barrier of source
        const bottomBarrierKey = HexUtils.edgeBarrierKey(from, 6);
        if (this.edgeBarriers.has(bottomBarrierKey)) return true;
        
        // Also check top barrier of target
        const topBarrierKey = HexUtils.edgeBarrierKey(to, 7);
        if (this.edgeBarriers.has(topBarrierKey)) return true;
      } else {
        // Flow going up - check top barrier of source
        const topBarrierKey = HexUtils.edgeBarrierKey(from, 7);
        if (this.edgeBarriers.has(topBarrierKey)) return true;
        
        // Also check bottom barrier of target
        const bottomBarrierKey = HexUtils.edgeBarrierKey(to, 6);
        if (this.edgeBarriers.has(bottomBarrierKey)) return true;
      }
      return false;
    }
    
    // Find the edge direction
    let direction = -1;
    for (let i = 0; i < 6; i++) {
      const dir = HexUtils.EDGE_DIRECTIONS[i];
      if (dir.q === dirQ && dir.r === dirR) {
        direction = i;
        break;
      }
    }
    
    if (direction === -1) return false; // Not a valid neighbor direction
    
    // Check if there's a barrier on the source hex's edge
    const sourceBarrierKey = HexUtils.edgeBarrierKey(from, direction);
    if (this.edgeBarriers.has(sourceBarrierKey)) return true;
    
    // Check if there's a barrier on the target hex's opposite edge
    const oppositeDir = HexUtils.getOppositeDirection(direction);
    const targetBarrierKey = HexUtils.edgeBarrierKey(to, oppositeDir);
    return this.edgeBarriers.has(targetBarrierKey);
  }
  
  // Get all edge barriers (for rendering)
  getAllEdgeBarriers(): string[] {
    return Array.from(this.edgeBarriers);
  }
  
  // Get the highest soil hex at a given q,r coordinate
  private getHighestSoilAt(coord: HexCoord3D): HexCoord3D | null {
    let highestHex: HexCoord3D | null = null;
    let highestY = -1;
    
    // Check all hexes in this column below the given y coordinate
    for (const [key, hex] of this.hexes) {
      if (hex.coord.q === coord.q && 
          hex.coord.r === coord.r && 
          hex.coord.y < coord.y && 
          hex.coord.y > highestY) {
        highestY = hex.coord.y;
        highestHex = hex.coord;
      }
    }
    
    return highestHex;
  }
}