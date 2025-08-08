import * as THREE from 'three';
import { HexCoord3D, HexUtils } from '../utils/HexUtils';
import { SubHexCoord3D, SubHexUtils } from '../utils/SubHexUtils';
import { Constants } from '../utils/Constants';
import { WaterSimulation } from './WaterSimulation';
import { plantConfig } from './PlantConfig';
import { 
  PlantType, 
  PlantState, 
  SubHexOccupation, 
  PLANT_TYPES 
} from './PlantTypes';

// Spatial index for tracking sub-hex occupancy
class PlantSpatialIndex {
  private subHexOccupancy: Map<string, string> = new Map(); // sub-hex key -> plant ID
  
  claimSubHex(coord: SubHexCoord3D, plantId: string): boolean {
    const key = SubHexUtils.subHex3DToKey(coord);
    const currentOccupant = this.subHexOccupancy.get(key);
    if (currentOccupant) {
      if (currentOccupant === plantId) {
        // Already owned by this plant, that's OK
        return true;
      }
      return false; // Occupied by another plant
    }
    this.subHexOccupancy.set(key, plantId);
    return true;
  }
  
  releaseSubHex(coord: SubHexCoord3D): void {
    const key = SubHexUtils.subHex3DToKey(coord);
    this.subHexOccupancy.delete(key);
  }
  
  isOccupied(coord: SubHexCoord3D): boolean {
    const key = SubHexUtils.subHex3DToKey(coord);
    return this.subHexOccupancy.has(key);
  }
  
  getOccupant(coord: SubHexCoord3D): string | undefined {
    const key = SubHexUtils.subHex3DToKey(coord);
    return this.subHexOccupancy.get(key);
  }
  
  releaseAllSubHexes(plantId: string): void {
    // Remove all sub-hexes occupied by this plant
    for (const [key, occupant] of this.subHexOccupancy) {
      if (occupant === plantId) {
        this.subHexOccupancy.delete(key);
      }
    }
  }
}

export class PlantSimulation {
  private plants: Map<string, PlantState> = new Map();
  private spatialIndex = new PlantSpatialIndex();
  private nextPlantId = 1;
  private timeScale = 1; // For debugging - speed up growth
  private nutrientSystem: any; // Will be set by SoilManager
  private onNutrientsChanged?: () => void; // Callback for when nutrients change
  
  constructor(private waterSimulation: WaterSimulation) {}
  
  // Set nutrient system reference
  setNutrientSystem(nutrientSystem: any): void {
    this.nutrientSystem = nutrientSystem;
  }
  
  // Set callback for when nutrients change
  setOnNutrientsChanged(callback: () => void): void {
    this.onNutrientsChanged = callback;
  }
  
  // Plant a new plant at the specified location (world position)
  plantSeed(typeId: string, worldPos: THREE.Vector3): string | null {
    // Convert world position to sub-hex coordinates
    const position = SubHexUtils.worldToSubHex(worldPos);
    // Calculate Y level from world position
    // worldPos is already at the top of the soil hex from SoilManager
    const yLevel = Math.round(worldPos.y / Constants.HEX_HEIGHT);
    const subHex3D: SubHexCoord3D = { ...position, y: yLevel };
    const plantType = PLANT_TYPES.get(typeId);
    if (!plantType) {
      console.error(`Unknown plant type: ${typeId}`);
      return null;
    }
    
    // Check if there's soil at this position (check parent hex at plant level)
    const soilYLevel = yLevel - 1; // Soil is one level below plant position
    const parentHex: HexCoord3D = { 
      q: subHex3D.parentQ, 
      r: subHex3D.parentR, 
      y: soilYLevel 
    };
    const soilKey = HexUtils.hex3DToKey(parentHex);
    const allHexes = this.waterSimulation.getAllHexes();
    const hasSoil = allHexes.some(h => HexUtils.hex3DToKey(h.coord) === soilKey);
    if (!hasSoil) {
      return null;
    }
    
    // Check if initial stage sub-hexes are available
    const stage0 = plantType.growthStages[0];
    // Use the base pattern for checking - randomization happens after
    if (!this.canOccupyPattern(subHex3D, stage0.hexPattern)) {
      return null;
    }
    
    // Create plant instance with randomized initial pattern
    const plantId = `plant_${this.nextPlantId++}`;
    const randomizedStage0 = this.randomizePattern(stage0.hexPattern, subHex3D);
    
    const plant: PlantState = {
      id: plantId,
      typeId,
      position: subHex3D,
      currentStage: 0,
      growthTimer: 0,
      isStunted: false,
      health: {
        water: 1,
        nutrients: 1,
        sunlight: 1
      },
      resourceConsumption: {
        waterMultiplier: 1,
        nutrientMultiplier: 1
      },
      plantedTime: Date.now(),
      customPatterns: [randomizedStage0], // Store custom patterns per stage
      accumulatedYield: 0 // Start with no accumulated yield
    };
    
    // Claim initial sub-hexes using randomized pattern
    const claimed = this.claimPattern(plantId, subHex3D, randomizedStage0);
    if (!claimed) {
      console.error('Failed to claim initial sub-hexes');
      return null;
    }
    
    this.plants.set(plantId, plant);
    return plantId;
  }
  
  // Remove a plant
  removePlant(plantId: string): boolean {
    const plant = this.plants.get(plantId);
    if (!plant) return false;
    
    // Release all occupied sub-hexes
    this.spatialIndex.releaseAllSubHexes(plantId);
    this.plants.delete(plantId);
    
    return true;
  }
  
  // Update all plants
  tick(deltaTime: number, timeOfDay: number = 0.5): void {
    const scaledDelta = deltaTime * this.timeScale;
    
    for (const [plantId, plant] of this.plants) {
      this.updatePlant(plantId, plant, scaledDelta, timeOfDay);
    }
  }
  
  private updatePlant(plantId: string, plant: PlantState, deltaTime: number, timeOfDay: number): void {
    const plantType = PLANT_TYPES.get(plant.typeId);
    if (!plantType) return;
    
    const currentStage = plantType.growthStages[plant.currentStage];
    
    // Update resource satisfaction
    this.updateResourceSatisfaction(plant, plantType);
    
    // Determine if it's daytime for photosynthesis (roughly 6 AM to 6 PM)
    const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;
    
    // Check if requirements are met AND stomata are open (water > 30%)
    const stomataOpen = plant.health.water > 0.3;
    const requirementsMet = this.checkRequirements(plant, currentStage);
    const canGrow = requirementsMet && stomataOpen && isDaytime; // Only grow during day
    
    
    if (canGrow && !plant.isStunted) {
      // Advance growth timer only when actively photosynthesizing
      plant.growthTimer += deltaTime;
      
      
      // Check if ready to advance stage
      if (currentStage.duration > 0 && plant.growthTimer >= currentStage.duration) {
        // Throttle growth attempts to once per second to prevent performance issues
        const now = Date.now();
        const timeSinceLastAttempt = plant.lastGrowthAttempt ? now - plant.lastGrowthAttempt : Infinity;
        
        if (timeSinceLastAttempt > 1000) { // Only try once per second
          plant.lastGrowthAttempt = now;
          this.tryAdvanceStage(plantId, plant, plantType);
        }
      }
    } else if (plant.isStunted) {
      // For stunted plants, periodically check if space has freed up
      const now = Date.now();
      const timeSinceLastAttempt = plant.lastGrowthAttempt ? now - plant.lastGrowthAttempt : Infinity;
      
      if (timeSinceLastAttempt > 5000) { // Check every 5 seconds
        plant.lastGrowthAttempt = now;
        // Reset stunted state and let normal growth logic try again
        plant.isStunted = false;
        plant.resourceConsumption.waterMultiplier = 1;
        plant.resourceConsumption.nutrientMultiplier = 1;
      }
    }
    
    // Consume resources (will check stomata state internally)
    this.consumeResources(plant, currentStage, deltaTime, timeOfDay);
  }
  
  private updateResourceSatisfaction(plant: PlantState, plantType: PlantType): void {
    const stage = plantType.growthStages[plant.currentStage];
    
    // Calculate water satisfaction
    const waterAbsorbed = this.calculateWaterAbsorption(plant, plantType);
    plant.health.water = Math.min(1, waterAbsorbed / stage.requirements.water);
    
    // Calculate nutrient satisfaction
    if (this.nutrientSystem) {
      const hexCoord = { q: plant.position.parentQ, r: plant.position.parentR };
      const soilY = Math.floor(plant.position.y) - 1;
      const hex3D = { q: hexCoord.q, r: hexCoord.r, y: soilY };
      
      const nutrients = this.nutrientSystem.getNutrients(hex3D);
      if (nutrients) {
        // Average satisfaction across all three nutrients
        // For nitrogen fixers, ignore nitrogen requirement
        const needs = this.nutrientSystem.getCropNeeds(plant.typeId);
        let totalSatisfaction = 0;
        let nutrientCount = 0;
        
        if (!needs || needs.nitrogen > 0) {
          // Not a nitrogen fixer, check nitrogen
          totalSatisfaction += nutrients.nitrogen;
          nutrientCount++;
        }
        
        totalSatisfaction += nutrients.phosphorus;
        totalSatisfaction += nutrients.potassium;
        nutrientCount += 2;
        
        plant.health.nutrients = totalSatisfaction / nutrientCount;
      } else {
        plant.health.nutrients = 0;
      }
    } else {
      plant.health.nutrients = 1; // No nutrient system, assume satisfied
    }
    
    // Calculate sunlight satisfaction
    const sunlight = this.calculateSunlight(plant, plantType);
    plant.health.sunlight = Math.min(1, sunlight / stage.requirements.sunlight);
  }
  
  private calculateWaterAbsorption(plant: PlantState, plantType: PlantType): number {
    const pattern = this.getPlantPattern(plant, plantType);
    const rootHexes = pattern.filter(h => h.type === 'root');
    
    let totalAbsorption = 0;
    const checkedMainHexes = new Set<string>();
    
    for (const hex of rootHexes) {
      // Calculate absolute sub-hex position
      const absoluteSubHex: SubHexCoord3D = {
        q: plant.position.q + hex.offset.q,
        r: plant.position.r + hex.offset.r,
        y: plant.position.y + hex.height,
        parentQ: plant.position.parentQ,
        parentR: plant.position.parentR
      };
      
      // Get actual sub-hex position (handles crossing boundaries)
      const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
      const actualSubHex = SubHexUtils.worldToSubHex(worldPos);
      const actualSubHex3D: SubHexCoord3D = { ...actualSubHex, y: absoluteSubHex.y };
      
      // Find which main hexes this root sub-hex overlaps
      const overlappingMainHexes = SubHexUtils.getOverlappingMainHexes(actualSubHex);
      
      for (const mainHex of overlappingMainHexes) {
        const mainHex3D: HexCoord3D = { ...mainHex, y: actualSubHex3D.y };
        const key = HexUtils.hex3DToKey(mainHex3D);
        
        // Only count each main hex once
        if (!checkedMainHexes.has(key)) {
          checkedMainHexes.add(key);
          const saturation = this.waterSimulation.getSaturation(mainHex3D);
          const depthMultiplier = 1 + (Math.abs(hex.height) * 0.2); // Deeper roots absorb more
          totalAbsorption += saturation * depthMultiplier * 0.1; // Scale factor
        }
      }
    }
    
    return totalAbsorption * plant.resourceConsumption.waterMultiplier;
  }
  
  private calculateSunlight(plant: PlantState, plantType: PlantType): number {
    const pattern = this.getPlantPattern(plant, plantType);
    const leafHexes = pattern.filter(h => h.type === 'leaf');
    
    let totalSunlight = 0;
    for (const hex of leafHexes) {
      // Calculate absolute sub-hex position
      const absoluteSubHex: SubHexCoord3D = {
        q: plant.position.q + hex.offset.q,
        r: plant.position.r + hex.offset.r,
        y: plant.position.y + hex.height,
        parentQ: plant.position.parentQ,
        parentR: plant.position.parentR
      };
      
      // Get actual sub-hex position
      const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
      const actualSubHex = SubHexUtils.worldToSubHex(worldPos);
      const actualSubHex3D: SubHexCoord3D = { ...actualSubHex, y: absoluteSubHex.y };
      
      const shading = this.calculateShading(actualSubHex3D);
      const baseSunlight = 8; // Base hours of sunlight
      totalSunlight += (1 - shading) * baseSunlight;
    }
    
    return totalSunlight;
  }
  
  private calculateShading(position: SubHexCoord3D): number {
    let shading = 0;
    
    // Check each layer above this position
    for (let h = position.y + 1; h <= position.y + 5; h++) {
      const above: SubHexCoord3D = { ...position, y: h };
      if (this.spatialIndex.isOccupied(above)) {
        shading += 0.5; // Each layer blocks 50% of light
      }
    }
    
    return Math.min(shading, 0.95); // Always some ambient light
  }
  
  private checkRequirements(plant: PlantState, _stage: any): boolean {
    // Different minimum satisfaction levels for different factors
    // Water is critical - plants need at least 30% to keep stomata open
    const minWaterSatisfaction = 0.3;
    // Nutrients can be lower - plants can grow slowly in poor soil
    const minNutrientSatisfaction = 0.2; // 20% nutrients allows growth
    // Sunlight is important for photosynthesis
    const minSunlightSatisfaction = 0.3;
    
    const satisfied = plant.health.water >= minWaterSatisfaction &&
                     plant.health.nutrients >= minNutrientSatisfaction &&
                     plant.health.sunlight >= minSunlightSatisfaction;
    
    // Only log if in debug mode or first failure
    // if (!satisfied && plant.growthTimer === 0) {
    //   console.log(`Plant ${plant.id} requirements not met:`, plant.health);
    // }
    
    return satisfied;
  }
  
  private consumeResources(plant: PlantState, stage: any, deltaTime: number, timeOfDay: number): void {
    // Only consume resources if:
    // 1. Plant has sufficient water to keep stomata open (>30% water satisfaction)
    // 2. It's daytime OR minimal night consumption
    // 3. Plant hasn't reached maximum harvest yield (for mature plants)
    // If stomata are closed due to water stress, no consumption OR growth occurs
    
    const plantType = PLANT_TYPES.get(plant.typeId);
    if (!plantType) return;
    
    // Check if plant has reached max harvest
    if (stage.harvestYield && plant.accumulatedYield !== undefined) {
      if (plant.accumulatedYield >= stage.harvestYield) {
        // Stop consuming resources when at max yield
        return;
      }
    }
    
    // Check if stomata would be open (need minimum water to function)
    const stomataOpen = plant.health.water > 0.3;
    if (!stomataOpen) {
      // No water consumption when stomata are closed
      return;
    }
    
    // Calculate day/night factor for transpiration
    // Peak transpiration during midday, minimal at night
    
    // Create a smooth curve for water consumption:
    // - Minimal (10%) at night
    // - Ramps up after sunrise
    // - Peak (100%) from 10 AM to 2 PM
    // - Ramps down before sunset
    let timeOfDayMultiplier: number;
    if (timeOfDay < 0.25 || timeOfDay > 0.75) {
      // Night time (6 PM to 6 AM): minimal transpiration
      timeOfDayMultiplier = 0.1;
    } else if (timeOfDay >= 0.4 && timeOfDay <= 0.6) {
      // Peak hours (10 AM to 2 PM): maximum transpiration
      timeOfDayMultiplier = 1.0;
    } else if (timeOfDay < 0.4) {
      // Morning ramp up (6 AM to 10 AM)
      const morningProgress = (timeOfDay - 0.25) / 0.15;
      timeOfDayMultiplier = 0.1 + (0.9 * morningProgress);
    } else {
      // Evening ramp down (2 PM to 6 PM)
      const eveningProgress = (0.75 - timeOfDay) / 0.15;
      timeOfDayMultiplier = 0.1 + (0.9 * eveningProgress);
    }
    
    const pattern = this.getPlantPattern(plant, plantType);
    const rootHexes = pattern.filter((h: SubHexOccupation) => h.type === 'root');
    if (rootHexes.length === 0) return;
    
    // Track which main hexes we've already consumed from
    const consumedMainHexes = new Map<string, number>(); // key -> amount to consume
    
    for (const hex of rootHexes) {
      // Calculate absolute sub-hex position
      const absoluteSubHex: SubHexCoord3D = {
        q: plant.position.q + hex.offset.q,
        r: plant.position.r + hex.offset.r,
        y: plant.position.y + hex.height,
        parentQ: plant.position.parentQ,
        parentR: plant.position.parentR
      };
      
      // Get actual sub-hex position
      const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
      const actualSubHex = SubHexUtils.worldToSubHex(worldPos);
      const actualSubHex3D: SubHexCoord3D = { ...actualSubHex, y: absoluteSubHex.y };
      
      // Find overlapping main hexes
      const overlappingMainHexes = SubHexUtils.getOverlappingMainHexes(actualSubHex);
      
      // Distribute water consumption across overlapping main hexes
      // Apply time of day multiplier and growth-based consumption
      const baseWaterConsumption = stage.requirements.water * deltaTime * plant.resourceConsumption.waterMultiplier;
      const waterPerMainHex = (baseWaterConsumption * timeOfDayMultiplier) / 
                              (rootHexes.length * overlappingMainHexes.length);
      
      for (const mainHex of overlappingMainHexes) {
        const mainHex3D: HexCoord3D = { ...mainHex, y: actualSubHex3D.y };
        const key = HexUtils.hex3DToKey(mainHex3D);
        
        const currentAmount = consumedMainHexes.get(key) || 0;
        consumedMainHexes.set(key, currentAmount + waterPerMainHex);
      }
    }
    
    // Actually consume water from main hexes
    let totalWaterConsumed = 0;
    for (const [key, amount] of consumedMainHexes) {
      const mainHex = HexUtils.keyToHex3D(key);
      this.waterSimulation.removeWater(mainHex, amount);
      totalWaterConsumed += amount;
    }
    
    // Consume nutrients continuously alongside water (if nutrient system is available)
    // But only consume nutrients when the plant is actually growing (during daytime)
    const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;
    if (this.nutrientSystem && totalWaterConsumed > 0 && isDaytime) {
      // Get the hex coordinate where the plant is rooted
      const hexCoord = { q: plant.position.parentQ, r: plant.position.parentR };
      const soilY = Math.floor(plant.position.y) - 1;
      const hex3D = { q: hexCoord.q, r: hexCoord.r, y: soilY };
      
      // Scale nutrient consumption by the same factors as water consumption
      // This ensures they deplete at proportional rates
      const consumptionRatio = totalWaterConsumed / (stage.requirements.water * deltaTime);
      
      // Apply additional scaling factor to slow down nutrient consumption
      // With the reduced nutrient requirements, we want nutrients to last longer
      const NUTRIENT_CONSUMPTION_SCALE = 0.1; // Use only 10% of the water-based rate
      
      // Use the depleteNutrientsContinuous method for gradual consumption
      this.nutrientSystem.depleteNutrientsContinuous(hex3D, plant.typeId, deltaTime * consumptionRatio * NUTRIENT_CONSUMPTION_SCALE);
      
      // Notify that nutrients changed
      if (this.onNutrientsChanged) {
        this.onNutrientsChanged();
      }
    }
    
    // If this is a mature plant with harvest yield, accumulate yield based on resources consumed
    if (stage.harvestYield && plant.accumulatedYield !== undefined) {
      // Convert consumed resources to yield
      // Higher resource consumption = more yield accumulation
      // Only accumulate during daytime when photosynthesis is active
      const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;
      if (isDaytime && totalWaterConsumed > 0) {
        // Scale yield accumulation by health and water consumed
        const healthMultiplier = Math.min(
          plant.health.water,
          plant.health.nutrients,
          plant.health.sunlight
        );
        
        // Accumulate ~1 yield per second of healthy growth
        const yieldRate = 1.0 * deltaTime * healthMultiplier;
        plant.accumulatedYield = Math.min(
          stage.harvestYield,
          plant.accumulatedYield + yieldRate
        );
      }
    }
  }
  
  private tryAdvanceStage(plantId: string, plant: PlantState, plantType: PlantType): void {
    const nextStageIndex = plant.currentStage + 1;
    if (nextStageIndex >= plantType.growthStages.length) {
      return; // Already at final stage
    }
    
    const nextStage = plantType.growthStages[nextStageIndex];
    
    // Use cached pattern if available (for stunted plants retrying)
    let randomizedNextPattern: SubHexOccupation[];
    if (plant.customPatterns && plant.customPatterns[nextStageIndex]) {
      randomizedNextPattern = plant.customPatterns[nextStageIndex];
    } else {
      // Generate randomized pattern for next stage (only once)
      randomizedNextPattern = this.randomizePattern(nextStage.hexPattern, plant.position);
      // Cache it even if we can't grow yet
      if (!plant.customPatterns) plant.customPatterns = [];
      plant.customPatterns[nextStageIndex] = randomizedNextPattern;
    }
    
    // Check if next stage hexes are available
    const canOccupy = this.canOccupyPattern(plant.position, randomizedNextPattern, plantId);
    if (canOccupy) {
      // Simple fix: Don't release sub-hexes, just try to claim the new pattern
      // The spatial index should handle overlaps properly
      
      // First, let's just try claiming without releasing
      const testClaim = this.claimPattern(plantId, plant.position, randomizedNextPattern);
      
      if (!testClaim) {
        // If that fails, release all and try again
        this.spatialIndex.releaseAllSubHexes(plantId);
        const claimed = this.claimPattern(plantId, plant.position, randomizedNextPattern);
        
        if (!claimed) {
          // Try to reclaim the old pattern
          const currentPattern = this.getPlantPattern(plant, plantType);
          this.claimPattern(plantId, plant.position, currentPattern);
        } else {
          // Pattern already stored above
          plant.currentStage = nextStageIndex;
          plant.growthTimer = 0;
          plant.isStunted = false;
          
          // Initialize accumulated yield when entering mature stage
          if (nextStage.harvestYield && plant.accumulatedYield === undefined) {
            plant.accumulatedYield = 0;
          }
          
          // Deplete nutrients on growth
          this.depleteNutrientsForGrowth(plant, plantType);
          
        }
      } else {
        // Direct claim succeeded
        plant.currentStage = nextStageIndex;
        plant.growthTimer = 0;
        plant.isStunted = false;
        
        // Initialize accumulated yield when entering mature stage
        if (nextStage.harvestYield && plant.accumulatedYield === undefined) {
          plant.accumulatedYield = 0;
        }
        
        // Deplete nutrients on growth
        this.depleteNutrientsForGrowth(plant, plantType);
        
      }
    } else {
      // Enter stunted state
      plant.isStunted = true;
      plant.resourceConsumption.waterMultiplier = 0.1;
      plant.resourceConsumption.nutrientMultiplier = 0.1;
      
      // Find what's blocking
      const blockers = this.findBlockingPlants(plant.position, randomizedNextPattern, plantId);
      plant.stuntedBy = blockers;
    }
  }
  
  private canOccupyPattern(origin: SubHexCoord3D, pattern: SubHexOccupation[], excludePlant?: string): boolean {
    for (const hex of pattern) {
      // Calculate absolute sub-hex position
      const absoluteSubHex: SubHexCoord3D = {
        q: origin.q + hex.offset.q,
        r: origin.r + hex.offset.r,
        y: origin.y + hex.height,
        parentQ: origin.parentQ,
        parentR: origin.parentR
      };
      
      // Need to handle sub-hexes that might cross into neighboring main hexes
      const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
      const actualSubHex = SubHexUtils.worldToSubHex(worldPos);
      const actualSubHex3D: SubHexCoord3D = { ...actualSubHex, y: absoluteSubHex.y };
      
      const occupant = this.spatialIndex.getOccupant(actualSubHex3D);
      if (occupant && occupant !== excludePlant) {
        return false;
      }
      
      // Check if soil exists for root components
      if (hex.type === 'root') {
        const overlappingHexes = SubHexUtils.getOverlappingMainHexes(actualSubHex);
        let hasAnySoil = false;
        
        for (const mainHex of overlappingHexes) {
          const mainHex3D: HexCoord3D = { ...mainHex, y: actualSubHex3D.y };
          const hexKey = HexUtils.hex3DToKey(mainHex3D);
          const allHexes = this.waterSimulation.getAllHexes();
          if (allHexes.some(h => HexUtils.hex3DToKey(h.coord) === hexKey)) {
            hasAnySoil = true;
            break;
          }
        }
        
        if (!hasAnySoil) {
          // Debug: show what hexes exist at this y level
          const allHexesAtY = this.waterSimulation.getAllHexes()
            .filter(h => h.coord.y === actualSubHex3D.y);
          return false;
        }
      }
    }
    return true;
  }
  
  private claimPattern(plantId: string, origin: SubHexCoord3D, pattern: SubHexOccupation[]): boolean {
    const claimed: SubHexCoord3D[] = [];
    
    // Try to claim all sub-hexes
    for (const hex of pattern) {
      // Calculate absolute sub-hex position
      const absoluteSubHex: SubHexCoord3D = {
        q: origin.q + hex.offset.q,
        r: origin.r + hex.offset.r,
        y: origin.y + hex.height,
        parentQ: origin.parentQ,
        parentR: origin.parentR
      };
      
      // Handle sub-hexes that might cross into neighboring main hexes
      const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
      const actualSubHex = SubHexUtils.worldToSubHex(worldPos);
      const actualSubHex3D: SubHexCoord3D = { ...actualSubHex, y: absoluteSubHex.y };
      
      if (!this.spatialIndex.claimSubHex(actualSubHex3D, plantId)) {
        // Rollback on failure
        const currentOccupant = this.spatialIndex.getOccupant(actualSubHex3D);
        for (const pos of claimed) {
          this.spatialIndex.releaseSubHex(pos);
        }
        return false;
      }
      claimed.push(actualSubHex3D);
    }
    
    return true;
  }
  
  private findBlockingPlants(origin: SubHexCoord3D, pattern: SubHexOccupation[], excludePlant: string): string[] {
    const blockers = new Set<string>();
    
    for (const hex of pattern) {
      // Calculate absolute sub-hex position
      const absoluteSubHex: SubHexCoord3D = {
        q: origin.q + hex.offset.q,
        r: origin.r + hex.offset.r,
        y: origin.y + hex.height,
        parentQ: origin.parentQ,
        parentR: origin.parentR
      };
      
      // Handle sub-hexes that might cross into neighboring main hexes
      const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
      const actualSubHex = SubHexUtils.worldToSubHex(worldPos);
      const actualSubHex3D: SubHexCoord3D = { ...actualSubHex, y: absoluteSubHex.y };
      
      const occupant = this.spatialIndex.getOccupant(actualSubHex3D);
      if (occupant && occupant !== excludePlant) {
        blockers.add(occupant);
      }
    }
    
    return Array.from(blockers);
  }
  
  // Get all plants for rendering
  getAllPlants(): Array<{plant: PlantState, type: PlantType}> {
    const result: Array<{plant: PlantState, type: PlantType}> = [];
    
    for (const plant of this.plants.values()) {
      const type = PLANT_TYPES.get(plant.typeId);
      if (type) {
        result.push({ plant, type });
      }
    }
    
    return result;
  }
  
  // Deplete nutrients when plant grows to next stage
  private depleteNutrientsForGrowth(plant: PlantState, plantType: PlantType): void {
    if (!this.nutrientSystem) return;
    
    // Get the hex coordinate where the plant is rooted
    // plant.position is a SubHexCoord, use parentQ and parentR for the main hex
    const hexCoord = { q: plant.position.parentQ, r: plant.position.parentR };
    // Plants are placed at y=1 on soil at y=0, so nutrients are at y=0
    const soilY = Math.floor(plant.position.y) - 1;
    const hex3D = { 
      q: hexCoord.q, 
      r: hexCoord.r, 
      y: soilY
    };
    
    // Deplete based on crop type and growth stage
    const depleted = this.nutrientSystem.depleteNutrients(hex3D, plant.typeId, plant.currentStage);
    
    // Notify that nutrients changed
    if (depleted && this.onNutrientsChanged) {
      this.onNutrientsChanged();
    }
    
    // Record this crop was planted here for rotation tracking
    if (plant.currentStage === 0) { // Only record on first planting
      this.nutrientSystem.recordCropPlanting(hex3D, plant.typeId);
    }
  }
  
  // Check if a world position can be planted
  canPlantAt(worldPos: THREE.Vector3, typeId: string): boolean {
    const plantType = PLANT_TYPES.get(typeId);
    if (!plantType) return false;
    
    const subHex = SubHexUtils.worldToSubHex(worldPos);
    // worldPos is already at the top of the soil hex from SoilManager
    const yLevel = Math.round(worldPos.y / Constants.HEX_HEIGHT);
    const subHex3D: SubHexCoord3D = { ...subHex, y: yLevel };
    
    const stage0 = plantType.growthStages[0];
    return this.canOccupyPattern(subHex3D, stage0.hexPattern);
  }
  
  // Get plant at world position (for harvesting)
  getPlantAt(worldPos: THREE.Vector3): PlantState | undefined {
    const subHex = SubHexUtils.worldToSubHex(worldPos);
    const yLevel = Math.round(worldPos.y / Constants.HEX_HEIGHT);
    const subHex3D: SubHexCoord3D = { ...subHex, y: yLevel };
    
    const occupant = this.spatialIndex.getOccupant(subHex3D);
    if (occupant) {
      return this.plants.get(occupant);
    }
    return undefined;
  }
  
  // Harvest a plant
  harvestPlant(plantId: string): number {
    const plant = this.plants.get(plantId);
    if (!plant) return 0;
    
    const plantType = PLANT_TYPES.get(plant.typeId);
    if (!plantType) return 0;
    
    const currentStage = plantType.growthStages[plant.currentStage];
    const baseYield = currentStage.harvestYield || 0;
    
    if (baseYield === 0) {
      return 0;
    }
    
    // Use accumulated yield if available, otherwise fall back to health-based calculation
    const actualYield = plant.accumulatedYield !== undefined 
      ? Math.floor(plant.accumulatedYield)
      : Math.floor(baseYield * Math.min(
          plant.health.water,
          plant.health.nutrients,
          plant.health.sunlight
        ));
    
    // Handle harvest behavior
    if (plantType.harvestBehavior.depletesPlant) {
      this.removePlant(plantId);
    } else if (plantType.harvestBehavior.type === 'continuous') {
      plant.lastHarvest = Date.now();
    }
    
    return actualYield;
  }
  
  // Uproot a plant (for replanting)
  uprootPlant(plantId: string): any | null {
    const plant = this.plants.get(plantId);
    if (!plant) return null;
    
    const plantType = PLANT_TYPES.get(plant.typeId);
    if (!plantType) return null;
    
    // Create plant data for inventory
    const uprootedData = {
      id: plantId,
      typeId: plant.typeId,
      typeName: plantType.name,
      currentStage: plant.currentStage,
      growthTimer: plant.growthTimer,
      health: { ...plant.health },
      resourceConsumption: { ...plant.resourceConsumption },
      accumulatedYield: plant.accumulatedYield,
      customPatterns: plant.customPatterns ? [...plant.customPatterns] : undefined,
      plantedTime: plant.plantedTime
    };
    
    // Remove from world
    this.removePlant(plantId);
    
    return uprootedData;
  }
  
  // Replant an uprooted plant
  replantPlant(uprootedData: any, worldPos: THREE.Vector3): string | null {
    const plantType = PLANT_TYPES.get(uprootedData.typeId);
    if (!plantType) return null;
    
    // Convert world position to sub-hex
    const subHexPos = SubHexUtils.worldToSubHex(worldPos);
    const yLevel = Math.round(worldPos.y / Constants.HEX_HEIGHT);
    const subHex3D: SubHexCoord3D = { ...subHexPos, y: yLevel };
    
    // Create plant with preserved data
    const plantId = `plant_${this.nextPlantId++}`;
    const plant: PlantState = {
      id: plantId,
      typeId: uprootedData.typeId,
      position: subHex3D,
      currentStage: uprootedData.currentStage,
      growthTimer: uprootedData.growthTimer,
      isStunted: false,
      health: uprootedData.health,
      resourceConsumption: uprootedData.resourceConsumption,
      plantedTime: uprootedData.plantedTime,
      customPatterns: uprootedData.customPatterns,
      accumulatedYield: uprootedData.accumulatedYield
    };
    
    // Try to claim the pattern for current stage
    const pattern = plant.customPatterns?.[plant.currentStage] || 
                   plantType.growthStages[plant.currentStage].hexPattern;
    
    const claimed = this.claimPattern(plantId, subHex3D, pattern);
    if (!claimed) {
      console.error('Failed to replant - space occupied');
      return null;
    }
    
    this.plants.set(plantId, plant);
    return plantId;
  }
  
  // Set time scale for debugging
  setTimeScale(scale: number): void {
    this.timeScale = scale;
  }
  
  // Get the pattern for a plant's current stage (custom or default)
  private getPlantPattern(plant: PlantState, plantType: PlantType): SubHexOccupation[] {
    if (plant.customPatterns && plant.customPatterns[plant.currentStage]) {
      return plant.customPatterns[plant.currentStage];
    }
    return plantType.growthStages[plant.currentStage].hexPattern;
  }
  
  // Randomize a plant pattern for visual variety
  private randomizePattern(basePattern: SubHexOccupation[], origin?: SubHexCoord3D): SubHexOccupation[] {
    // If we have an origin, we can check if randomized positions will be in soil
    if (origin) {
      // Try up to 10 different randomizations to find one that fits in soil
      for (let attempt = 0; attempt < 10; attempt++) {
        const randomized = this.attemptRandomization(basePattern);
        
        // Check if all sub-hexes would be in soil
        let allInSoil = true;
        for (const component of randomized) {
          // Calculate the absolute position
          const absoluteSubHex: SubHexCoord3D = {
            q: origin.q + component.offset.q,
            r: origin.r + component.offset.r,
            y: origin.y + component.height,
            parentQ: origin.parentQ,
            parentR: origin.parentR
          };
          
          // Get the main hex this would be in
          const worldPos = SubHexUtils.subHexToWorld(absoluteSubHex);
          const actualSubHex = SubHexUtils.worldToSubHex(worldPos);
          const overlappingHexes = SubHexUtils.getOverlappingMainHexes(actualSubHex);
          
          // Check if at least one overlapping hex has soil
          let hasAnySoil = false;
          for (const mainHex of overlappingHexes) {
            const mainHex3D: HexCoord3D = { ...mainHex, y: absoluteSubHex.y };
            const hexKey = HexUtils.hex3DToKey(mainHex3D);
            const allHexes = this.waterSimulation.getAllHexes();
            if (allHexes.some(h => HexUtils.hex3DToKey(h.coord) === hexKey)) {
              hasAnySoil = true;
              break;
            }
          }
          
          if (!hasAnySoil) {
            allInSoil = false;
            break;
          }
        }
        
        if (allInSoil) {
          return randomized;
        }
      }
      
      // If no valid randomization found after 10 attempts, return base pattern
      return basePattern;
    }
    
    // No origin provided, do simple randomization
    return this.attemptRandomization(basePattern);
  }
  
  private attemptRandomization(basePattern: SubHexOccupation[]): SubHexOccupation[] {
    return basePattern.map(component => {
      // Keep stems centered for stability
      if (component.type === 'stem') {
        return component;
      }
      
      // Add slight random offset to other components
      const maxOffset = 1; // Max offset in sub-hex units
      const qOffset = Math.floor(plantConfig.getRandom() * (maxOffset * 2 + 1)) - maxOffset;
      const rOffset = Math.floor(plantConfig.getRandom() * (maxOffset * 2 + 1)) - maxOffset;
      
      return {
        offset: {
          q: component.offset.q + qOffset,
          r: component.offset.r + rOffset
        },
        height: component.height,
        type: component.type
      };
    });
  }
}