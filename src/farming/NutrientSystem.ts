import { HexCoord3D, HexUtils } from '../utils/HexUtils';
import * as THREE from 'three';

export interface NutrientLevels {
  nitrogen: number;     // 0.0-1.0 (0% - 100%)
  phosphorus: number;   // 0.0-1.0 (0% - 100%)
  potassium: number;    // 0.0-1.0 (0% - 100%)
}

export interface NutrientHex extends NutrientLevels {
  coord: HexCoord3D;
  lastCrop?: string;          // Track last crop for rotation benefits
  cropHistory: string[];      // Last 3 crops for soil memory
}

// Nutrient requirements by crop type
// Values represent total nutrient consumption over the plant's lifetime (0.0-1.0)
export const CROP_NUTRIENT_NEEDS: Record<string, NutrientLevels> = {
  // Tier 1 - Light feeders (use ~5-10% of nutrients per full growth cycle)
  lettuce: { nitrogen: 0.05, phosphorus: 0.03, potassium: 0.03 },
  radish: { nitrogen: 0.04, phosphorus: 0.03, potassium: 0.04 },
  
  // Tier 2 - Heavy feeders (use ~10-15% of nutrients per full growth cycle)
  tomato: { nitrogen: 0.10, phosphorus: 0.12, potassium: 0.08 },
  corn: { nitrogen: 0.15, phosphorus: 0.08, potassium: 0.08 },
  squash: { nitrogen: 0.10, phosphorus: 0.10, potassium: 0.12 },
  
  // Nitrogen fixers (negative = adds nutrients, up to ~10%)
  beans: { nitrogen: -0.10, phosphorus: 0.04, potassium: 0.05 },
  peas: { nitrogen: -0.08, phosphorus: 0.03, potassium: 0.04 },
  
  // Future crops can be added here
};

// Nutrient depletion rate per growth stage
export const DEPLETION_PER_STAGE = 0.33; // Use 1/3 of total needs per growth stage

export class NutrientSystem {
  private hexes: Map<string, NutrientHex> = new Map();
  
  constructor() {}
  
  // Add a hex to the nutrient system with initial values
  addHex(coord: HexCoord3D, initialNutrients?: Partial<NutrientLevels>): void {
    const key = HexUtils.hex3DToKey(coord);
    if (this.hexes.has(key)) return;
    
    const hex: NutrientHex = {
      coord,
      nitrogen: initialNutrients?.nitrogen ?? 0.5,      // Start at 50%
      phosphorus: initialNutrients?.phosphorus ?? 0.5,
      potassium: initialNutrients?.potassium ?? 0.5,
      cropHistory: []
    };
    
    this.hexes.set(key, hex);
  }
  
  // Remove a hex from the system
  removeHex(coord: HexCoord3D): void {
    const key = HexUtils.hex3DToKey(coord);
    this.hexes.delete(key);
  }
  
  // Get nutrient levels for a hex
  getNutrients(coord: HexCoord3D): NutrientLevels | null {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return null;
    
    return {
      nitrogen: hex.nitrogen,
      phosphorus: hex.phosphorus,
      potassium: hex.potassium
    };
  }
  
  // Get crop nutrient needs
  getCropNeeds(cropType: string): NutrientLevels | null {
    return CROP_NUTRIENT_NEEDS[cropType] || null;
  }
  
  // Deplete nutrients based on crop growth
  depleteNutrients(coord: HexCoord3D, cropType: string, growthStage: number): boolean {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) {
      return false;
    }
    
    const needs = CROP_NUTRIENT_NEEDS[cropType];
    if (!needs) {
      return false;
    }
    
    // Calculate depletion for this growth stage
    const stageMultiplier = DEPLETION_PER_STAGE;
    
    // For nitrogen fixers, add instead of deplete
    if (needs.nitrogen < 0) {
      hex.nitrogen = Math.min(1.0, hex.nitrogen - needs.nitrogen * stageMultiplier);
    } else {
      hex.nitrogen = Math.max(0, hex.nitrogen - needs.nitrogen * stageMultiplier);
    }
    
    // P and K are always depleted
    hex.phosphorus = Math.max(0, hex.phosphorus - needs.phosphorus * stageMultiplier);
    hex.potassium = Math.max(0, hex.potassium - needs.potassium * stageMultiplier);
    
    return true;
  }
  
  // Deplete nutrients continuously (called every frame with deltaTime)
  depleteNutrientsContinuous(coord: HexCoord3D, cropType: string, deltaTime: number): boolean {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return false;
    
    const needs = CROP_NUTRIENT_NEEDS[cropType];
    if (!needs) return false;
    
    // Scale consumption by deltaTime to make it gradual
    // The consumption rate is already pre-scaled by the caller based on water consumption
    const consumptionRate = deltaTime;
    
    // For nitrogen fixers (negative values), add nutrients
    if (needs.nitrogen < 0) {
      hex.nitrogen = Math.min(1, hex.nitrogen + (-needs.nitrogen * consumptionRate));
    } else {
      hex.nitrogen = Math.max(0, hex.nitrogen - (needs.nitrogen * consumptionRate));
    }
    
    // Deplete P and K normally
    hex.phosphorus = Math.max(0, hex.phosphorus - (needs.phosphorus * consumptionRate));
    hex.potassium = Math.max(0, hex.potassium - (needs.potassium * consumptionRate));
    
    return true;
  }
  
  // Add nutrients (from fertilizer, compost, etc)
  addNutrients(coord: HexCoord3D, nutrients: Partial<NutrientLevels>): boolean {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return false;
    
    if (nutrients.nitrogen !== undefined) {
      hex.nitrogen = Math.min(1.0, hex.nitrogen + nutrients.nitrogen);
    }
    if (nutrients.phosphorus !== undefined) {
      hex.phosphorus = Math.min(1.0, hex.phosphorus + nutrients.phosphorus);
    }
    if (nutrients.potassium !== undefined) {
      hex.potassium = Math.min(1.0, hex.potassium + nutrients.potassium);
    }
    
    return true;
  }
  
  // Record crop planting for rotation tracking
  recordCropPlanting(coord: HexCoord3D, cropType: string): void {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return;
    
    hex.lastCrop = cropType;
    hex.cropHistory.unshift(cropType);
    if (hex.cropHistory.length > 3) {
      hex.cropHistory.pop(); // Keep only last 3 crops
    }
  }
  
  // Check if nutrients are sufficient for a crop
  hasEnoughNutrients(coord: HexCoord3D, cropType: string): boolean {
    const nutrients = this.getNutrients(coord);
    if (!nutrients) return false;
    
    const needs = CROP_NUTRIENT_NEEDS[cropType];
    if (!needs) return true; // Unknown crop, allow planting
    
    // Only check positive nutrient needs (nitrogen fixers don't need N to plant)
    const minRequired = 0.1; // Need at least 10% to plant
    
    if (needs.nitrogen > 0 && nutrients.nitrogen < minRequired) return false;
    if (needs.phosphorus > 0 && nutrients.phosphorus < minRequired) return false;
    if (needs.potassium > 0 && nutrients.potassium < minRequired) return false;
    
    return true;
  }
  
  // Get rotation penalty/bonus
  getRotationMultiplier(coord: HexCoord3D, cropType: string): number {
    const key = HexUtils.hex3DToKey(coord);
    const hex = this.hexes.get(key);
    if (!hex) return 1.0;
    
    // Count how many times this crop appears in history
    const repeatCount = hex.cropHistory.filter(c => c === cropType).length;
    
    // Apply penalty for repeats: -10% per repeat
    const repeatPenalty = repeatCount * 0.1;
    
    // Bonus for diversity: +5% for each different crop in history
    const uniqueCrops = new Set(hex.cropHistory).size;
    const diversityBonus = uniqueCrops * 0.05;
    
    return Math.max(0.5, 1.0 - repeatPenalty + diversityBonus);
  }
  
  // Get visual color for nutrient levels (for RGB visualization)
  getNutrientColor(coord: HexCoord3D): THREE.Color {
    const hex = this.hexes.get(HexUtils.hex3DToKey(coord));
    if (!hex) return new THREE.Color(0x654321); // Default soil color
    
    // Map N-P-K to R-G-B with more visible color changes
    // Base brown color
    const baseR = 0.4;
    const baseG = 0.3; 
    const baseB = 0.2;
    
    // Add nutrient contributions with stronger effects
    const r = baseR + hex.nitrogen * 0.4;      // More green for nitrogen
    const g = baseG + hex.phosphorus * 0.3;    // Purple/red tint for phosphorus  
    const b = baseB + hex.potassium * 0.4;     // Blue/orange tint for potassium
    
    // Clamp values to valid range
    const color = new THREE.Color(
      Math.min(1, Math.max(0, r)),
      Math.min(1, Math.max(0, g)),
      Math.min(1, Math.max(0, b))
    );
    
    return color;
  }
  
  // Natural recovery (very slow)
  naturalRecovery(deltaTime: number): void {
    const recoveryRate = 0.001 * deltaTime; // 0.1% per second
    
    for (const hex of this.hexes.values()) {
      // Slight natural recovery toward 20% (poor soil baseline)
      const target = 0.2;
      
      if (hex.nitrogen < target) {
        hex.nitrogen = Math.min(target, hex.nitrogen + recoveryRate);
      }
      if (hex.phosphorus < target) {
        hex.phosphorus = Math.min(target, hex.phosphorus + recoveryRate);
      }
      if (hex.potassium < target) {
        hex.potassium = Math.min(target, hex.potassium + recoveryRate);
      }
    }
  }
  
  // Get all nutrient hexes (for visualization)
  getAllHexes(): NutrientHex[] {
    return Array.from(this.hexes.values());
  }
}