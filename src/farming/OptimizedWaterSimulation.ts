import { HexCoord3D, HexUtils } from '../utils/HexUtils';
import { Constants } from '../utils/Constants';
import { SoilType, SOIL_CONFIGS, WaterHex } from './WaterSimulation';

// Optimized water simulation with performance improvements
export class OptimizedWaterSimulation {
  private hexes: Map<string, WaterHex> = new Map();
  private edgeBarriers: Set<string> = new Set();
  private flowRate = 0.1;
  private evaporationRate = 0.001;
  private gravityFactor = 0.3;
  
  // Performance optimization: track active hexes (those with water)
  private activeHexes: Set<string> = new Set();
  // Cache neighbor relationships
  private neighborCache: Map<string, HexCoord3D[]> = new Map();
  // Batch updates for better performance
  private pendingFlows: Map<string, number> = new Map();
  
  constructor() {}
  
  addHex(coord: HexCoord3D, soilType: SoilType = SoilType.Loam): void {
    const key = HexUtils.hex3DToKey(coord);
    if (this.hexes.has(key)) return;
    
    const config = SOIL_CONFIGS[soilType];
    const capacityML = Constants.HEX_VOLUME_M3 * config.waterCapacityLPerM3 * 1000;
    
    const hex: WaterHex = {
      coord,
      waterML: 0,
      capacityML,
      saturation: 0,
      capacity: config.waterCapacityLPerM3 / 1000,
      permeability: config.permeability,
      soilType,
      hasPlant: false,
      temperature: 0.5
    };
    
    this.hexes.set(key, hex);
    // Clear neighbor cache for affected hexes
    this.invalidateNeighborCache(coord);
  }
  
  removeHex(coord: HexCoord3D): void {
    const key = HexUtils.hex3DToKey(coord);
    this.hexes.delete(key);
    this.activeHexes.delete(key);
    this.neighborCache.delete(key);
    this.invalidateNeighborCache(coord);
  }
  
  addWater(coord: HexCoord3D, amountML: number): boolean {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    
    if (!hex || hex.soilType === SoilType.Barrier) return false;
    
    const oldWaterML = hex.waterML;
    hex.waterML = Math.min(hex.waterML + amountML, hex.capacityML * 2);
    hex.saturation = hex.capacityML > 0 ? hex.waterML / hex.capacityML : 0;
    
    // Mark as active if it now has water
    if (hex.waterML > 0.1) {
      this.activeHexes.add(key);
    }
    
    return hex.waterML > oldWaterML;
  }
  
  tick(deltaTime: number): void {
    // Clear pending flows
    this.pendingFlows.clear();
    
    // Only process hexes that have water (major optimization)
    const activeHexArray = Array.from(this.activeHexes);
    
    // Process in batches for better cache locality
    const batchSize = 100;
    for (let i = 0; i < activeHexArray.length; i += batchSize) {
      const batch = activeHexArray.slice(i, i + batchSize);
      this.processBatch(batch, deltaTime);
    }
    
    // Apply all pending flows at once
    this.applyPendingFlows();
    
    // Update active hex list
    this.updateActiveHexes();
  }
  
  private processBatch(hexKeys: string[], deltaTime: number): void {
    for (const key of hexKeys) {
      const hex = this.hexes.get(key);
      if (!hex || hex.waterML < 0.1) continue;
      
      // Get cached neighbors
      const neighbors = this.getCachedNeighbors(hex.coord);
      
      // Calculate outflow to each neighbor
      let totalOutflow = 0;
      const outflows: Array<{key: string, flow: number}> = [];
      
      for (const neighborCoord of neighbors) {
        const neighborKey = HexUtils.hex3DToKey(neighborCoord);
        const neighbor = this.hexes.get(neighborKey);
        
        if (neighbor && !this.isFlowBlocked(hex.coord, neighborCoord)) {
          const flow = this.calculateFlow(hex, neighbor);
          if (flow > 0) {
            outflows.push({ key: neighborKey, flow });
            totalOutflow += flow;
          }
        } else if (!neighbor && !this.isFlowBlocked(hex.coord, neighborCoord)) {
          // Drainage to empty space
          const elevationDiff = neighborCoord.y - hex.coord.y;
          if (elevationDiff < 0) {
            const drainFlow = Math.min(hex.waterML * this.flowRate, 500);
            totalOutflow += drainFlow;
          } else if (elevationDiff === 0 && hex.saturation > 1.0) {
            const excessWater = hex.waterML - hex.capacityML;
            const drainFlow = excessWater * this.flowRate;
            totalOutflow += drainFlow;
          }
        }
      }
      
      // Apply evaporation for top layer
      if (this.isTopLayer(hex.coord)) {
        const evaporationML = this.evaporationRate * hex.temperature * deltaTime * 10;
        totalOutflow += evaporationML;
      }
      
      // Cap total outflow to available water
      if (totalOutflow > hex.waterML) {
        const scale = hex.waterML / totalOutflow;
        totalOutflow = hex.waterML;
        outflows.forEach(o => o.flow *= scale);
      }
      
      // Record flows
      this.addPendingFlow(key, -totalOutflow);
      for (const outflow of outflows) {
        this.addPendingFlow(outflow.key, outflow.flow);
      }
    }
  }
  
  private getCachedNeighbors(coord: HexCoord3D): HexCoord3D[] {
    const key = HexUtils.hex3DToKey(coord);
    let neighbors = this.neighborCache.get(key);
    
    if (!neighbors) {
      neighbors = this.getWaterNeighbors(coord);
      this.neighborCache.set(key, neighbors);
    }
    
    return neighbors;
  }
  
  private getWaterNeighbors(coord: HexCoord3D): HexCoord3D[] {
    const neighbors: HexCoord3D[] = [];
    
    // Same level neighbors
    const horizontalNeighbors = HexUtils.getNeighbors(coord);
    for (const n of horizontalNeighbors) {
      neighbors.push({ ...n, y: coord.y });
    }
    
    // Vertical neighbors
    neighbors.push({ q: coord.q, r: coord.r, y: coord.y - 1 });
    neighbors.push({ q: coord.q, r: coord.r, y: coord.y + 1 });
    
    return neighbors;
  }
  
  private invalidateNeighborCache(coord: HexCoord3D): void {
    // Clear cache for this hex and all its potential neighbors
    const key = HexUtils.hex3DToKey(coord);
    this.neighborCache.delete(key);
    
    const neighbors = this.getWaterNeighbors(coord);
    for (const n of neighbors) {
      this.neighborCache.delete(HexUtils.hex3DToKey(n));
    }
  }
  
  private addPendingFlow(hexKey: string, amountML: number): void {
    const current = this.pendingFlows.get(hexKey) || 0;
    this.pendingFlows.set(hexKey, current + amountML);
  }
  
  private applyPendingFlows(): void {
    for (const [key, flowML] of this.pendingFlows) {
      const hex = this.hexes.get(key);
      if (hex) {
        hex.waterML = Math.max(0, hex.waterML + flowML);
        hex.saturation = hex.capacityML > 0 ? hex.waterML / hex.capacityML : 0;
      }
    }
  }
  
  private updateActiveHexes(): void {
    // Remove hexes with no water from active list
    const toRemove: string[] = [];
    for (const key of this.activeHexes) {
      const hex = this.hexes.get(key);
      if (!hex || hex.waterML < 0.1) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(key => this.activeHexes.delete(key));
  }
  
  private calculateFlow(from: WaterHex, to: WaterHex): number {
    if (from.soilType === SoilType.Barrier || to.soilType === SoilType.Barrier) {
      return 0;
    }
    
    const saturationDiff = from.saturation - to.saturation;
    const elevationDiff = from.coord.y - to.coord.y;
    const avgPermeability = (from.permeability + to.permeability) / 2;
    
    let flowML = 0;
    
    if (elevationDiff > 0) {
      // Downward flow (gravity)
      flowML = Math.min(from.waterML, 1000) * this.flowRate * (1 + this.gravityFactor);
    } else if (elevationDiff < 0) {
      // Upward flow (capillary action) - only if source is very saturated
      if (from.saturation > 0.8) {
        flowML = saturationDiff * avgPermeability * this.flowRate * 0.1 * 1000;
      }
    } else {
      // Horizontal flow
      if (saturationDiff > 0) {
        flowML = saturationDiff * avgPermeability * this.flowRate * 1000;
      }
    }
    
    return Math.max(0, flowML);
  }
  
  private isFlowBlocked(from: HexCoord3D, to: HexCoord3D): boolean {
    const key = HexUtils.sharedEdgeKey(from, to);
    return this.edgeBarriers.has(key);
  }
  
  private isTopLayer(coord: HexCoord3D): boolean {
    const aboveKey = HexUtils.hex3DToKey({ 
      q: coord.q, 
      r: coord.r, 
      y: coord.y + 1 
    });
    return !this.hexes.has(aboveKey);
  }
  
  // Public API matching original WaterSimulation
  getAllHexes(): WaterHex[] {
    return Array.from(this.hexes.values());
  }
  
  getSaturation(coord: HexCoord3D): number {
    const hex = this.hexes.get(HexUtils.hex3DToKey(coord));
    return hex ? hex.saturation : 0;
  }
  
  getWaterML(coord: HexCoord3D): number {
    const hex = this.hexes.get(HexUtils.hex3DToKey(coord));
    return hex ? hex.waterML : 0;
  }
  
  getWaterInfo(coord: HexCoord3D): { waterML: number; capacityML: number; saturation: number; soilType: string } | null {
    const hex = this.hexes.get(HexUtils.hex3DToKey(coord));
    if (!hex) return null;
    
    return {
      waterML: hex.waterML,
      capacityML: hex.capacityML,
      saturation: hex.saturation,
      soilType: hex.soilType
    };
  }
  
  setHasPlant(coord: HexCoord3D, hasPlant: boolean): void {
    const hex = this.hexes.get(HexUtils.hex3DToKey(coord));
    if (hex) {
      hex.hasPlant = hasPlant;
    }
  }
  
  consumeWater(coord: HexCoord3D, amountML: number): number {
    const hex = this.hexes.get(HexUtils.hex3DToKey(coord));
    if (!hex) return 0;
    
    const consumed = Math.min(hex.waterML, amountML);
    hex.waterML -= consumed;
    hex.saturation = hex.capacityML > 0 ? hex.waterML / hex.capacityML : 0;
    
    if (hex.waterML < 0.1) {
      this.activeHexes.delete(HexUtils.hex3DToKey(coord));
    }
    
    return consumed;
  }
  
  addEdgeBarrier(hex1: HexCoord3D, hex2: HexCoord3D): void {
    const key = HexUtils.sharedEdgeKey(hex1, hex2);
    this.edgeBarriers.add(key);
  }
  
  removeEdgeBarrier(hex1: HexCoord3D, hex2: HexCoord3D): void {
    const key = HexUtils.sharedEdgeKey(hex1, hex2);
    this.edgeBarriers.delete(key);
  }
}