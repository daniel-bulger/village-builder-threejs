import * as THREE from 'three';
import { SubHexCoord3D, SubHexUtils } from '../utils/SubHexUtils';
import { HexCoord3D, HexUtils } from '../utils/HexUtils';
import { Constants } from '../utils/Constants';
import { WaterSimulation } from './WaterSimulation';
import { 
  OrganicPlantType, 
  OrganicPlantState, 
  GrowthPoint, 
  PlantComponent
} from './OrganicGrowthSystem';
import { PlantComponentType } from './PlantTypes';

export class OrganicPlantSimulation {
  private plants: Map<string, OrganicPlantState> = new Map();
  private plantTypes: Map<string, OrganicPlantType> = new Map();
  private spatialIndex: Map<string, string> = new Map(); // subhex key -> plant component ID
  private nextId = 1;
  
  constructor(private waterSimulation: WaterSimulation) {}
  
  registerPlantType(type: OrganicPlantType): void {
    this.plantTypes.set(type.id, type);
  }
  
  plantSeed(typeId: string, worldPos: THREE.Vector3): string | null {
    const plantType = this.plantTypes.get(typeId);
    if (!plantType) return null;
    
    // Convert to sub-hex position
    const position = SubHexUtils.worldToSubHex(worldPos);
    const yLevel = Math.round(worldPos.y / Constants.HEX_HEIGHT);
    const origin: SubHexCoord3D = { ...position, y: yLevel };
    
    
    // Create plant instance
    const plantId = `plant_${this.nextId++}`;
    const plant: OrganicPlantState = {
      id: plantId,
      typeId,
      position: origin,
      components: new Map(),
      growthPoints: new Map(),
      resources: {
        water: 0.5, // Moderate starting water
        nutrients: 0.5,
        energy: 20 // Even more starting energy for balanced growth
      },
      age: 0,
      lastGrowthEvent: 0,
      componentCount: { root: 0, stem: 0, leaf: 0 },
      lightMap: new Map(),
      competitionMap: new Map()
    };
    
    // Create initial components from seed
    for (const seedComp of plantType.seedComponents) {
      const compId = `${plantId}_comp_${plant.components.size}`;
      const compPos: SubHexCoord3D = {
        q: origin.q + seedComp.relativePosition.q,
        r: origin.r + seedComp.relativePosition.r,
        y: origin.y + seedComp.relativePosition.height,
        parentQ: origin.parentQ,
        parentR: origin.parentR
      };
      
      // Check if position is valid
      if (!this.isValidGrowthPosition(compPos, seedComp.type)) {
        return null;
      }
      
      // Create component
      const component: PlantComponent = {
        id: compId,
        type: seedComp.type,
        position: compPos,
        age: 0,
        health: 1,
        size: 0.3, // Start more visible
        growthPoints: []
      };
      
      // Add growth point to component
      const growthPointId = `${compId}_gp`;
      const growthPoint: GrowthPoint = {
        id: growthPointId,
        position: compPos,
        type: seedComp.type === 'root' ? 'root' : 'shoot',
        growthPotential: 0,
        age: 0,
        dominance: 1, // Initial components have full dominance
        lastGrowthTime: 0,
        parentComponentId: compId
      };
      
      component.growthPoints.push(growthPointId);
      plant.components.set(compId, component);
      plant.growthPoints.set(growthPointId, growthPoint);
      plant.componentCount[seedComp.type]++;
      
      // Register in spatial index
      this.registerComponent(compPos, compId);
    }
    
    this.plants.set(plantId, plant);
    return plantId;
  }
  
  tick(deltaTime: number, timeOfDay: number): void {
    for (const [plantId, plant] of this.plants) {
      this.updatePlant(plantId, plant, deltaTime, timeOfDay);
    }
  }
  
  private updatePlant(plantId: string, plant: OrganicPlantState, deltaTime: number, timeOfDay: number): void {
    const plantType = this.plantTypes.get(plant.typeId);
    if (!plantType) return;
    
    plant.age += deltaTime;
    
    // Update resource levels
    this.updateResources(plant, plantType, timeOfDay);
    
    // Update light exposure for leaves
    this.updateLightExposure(plant);
    
    // Update growth points
    const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;
    
    // Debug log every 60 seconds
    if (Math.floor(plant.age) % 60 === 0 && Math.floor(plant.age - deltaTime) % 60 !== 0) {
    }
    
    for (const [gpId, growthPoint] of plant.growthPoints) {
      // Only accumulate growth potential if conditions are met
      if (this.canAccumulateGrowth(plant, growthPoint, isDaytime)) {
        const rate = this.calculateGrowthRate(plant, plantType, growthPoint);
        growthPoint.growthPotential += rate * deltaTime;
        growthPoint.age += deltaTime;
        
        // Log growth accumulation details periodically
        if (Math.floor(plant.age) % 30 === 0 && Math.floor(plant.age - deltaTime) % 30 !== 0) {
        }
        
        // Check if ready to grow
        if (growthPoint.growthPotential >= plantType.growthRules.growthThreshold) {
          this.attemptGrowth(plant, plantType, growthPoint);
        }
      } else {
        // Log why growth is blocked every 30 seconds
        if (Math.floor(plant.age) % 30 === 0 && Math.floor(plant.age - deltaTime) % 30 !== 0) {
          const hasLeaves = plant.componentCount.leaf > 0;
          const minEnergyForGrowth = hasLeaves ? 2 : 0.5;
        }
      }
    }
    
    // Update component health based on resources
    this.updateComponentHealth(plant, plantType);
    
    // Apply apical dominance
    this.applyApicalDominance(plant, plantType);
  }
  
  private canAccumulateGrowth(plant: OrganicPlantState, growthPoint: GrowthPoint, isDaytime: boolean): boolean {
    // Check if we have enough energy to grow
    // Lower threshold if plant has no leaves yet (to bootstrap growth)
    const hasLeaves = plant.componentCount.leaf > 0;
    const minEnergyForGrowth = hasLeaves ? 2 : 0.5; // Much lower threshold without leaves
    
    if (plant.resources.energy < minEnergyForGrowth) {
      return false;
    }
    
    // Roots can grow at night but need water
    if (growthPoint.type === 'root') {
      // Don't grow too many roots at night to conserve energy
      const nightGrowthPenalty = isDaytime ? 1.0 : 0.3;
      return plant.resources.water > 0.2 && Math.random() < nightGrowthPenalty;
    } else {
      // Shoots need daylight and water
      return isDaytime && plant.resources.water > 0.3 && plant.resources.energy > 0;
    }
  }
  
  private calculateGrowthRate(plant: OrganicPlantState, plantType: OrganicPlantType, growthPoint: GrowthPoint): number {
    const rules = plantType.growthRules.potentialRate;
    
    // Base rate modified by resources and dominance
    let rate = rules.base;
    rate *= Math.min(1, plant.resources.water * rules.waterMultiplier);
    rate *= Math.min(1, plant.resources.nutrients * rules.nutrientMultiplier);
    
    // Light affects shoot growth
    if (growthPoint.type !== 'root') {
      const component = plant.components.get(growthPoint.parentComponentId!);
      if (component) {
        const lightLevel = plant.lightMap.get(component.id) || 0;
        rate *= Math.min(1, lightLevel * rules.lightMultiplier);
      }
    }
    
    // Apply dominance factor
    rate *= growthPoint.dominance;
    
    // Younger growth points grow faster
    const ageFactor = Math.max(0.3, 1 - growthPoint.age / 3600); // Slow down over 1 hour
    rate *= ageFactor;
    
    return rate;
  }
  
  private attemptGrowth(plant: OrganicPlantState, plantType: OrganicPlantType, growthPoint: GrowthPoint): void {
    
    // Determine what type of component to grow
    const parentComponent = plant.components.get(growthPoint.parentComponentId!);
    if (!parentComponent) {
      return;
    }
    
    // Choose growth direction based on type
    const newPosition = this.chooseGrowthDirection(plant, plantType, growthPoint, parentComponent);
    if (!newPosition) {
      return;
    }
    
    // Determine component type
    let newType: PlantComponentType;
    if (growthPoint.type === 'root') {
      newType = 'root';
    } else if (growthPoint.type === 'lateral') {
      // Lateral growth points strongly prefer leaves (for branching)
      newType = Math.random() < 0.8 ? 'leaf' : 'stem';
    } else if (parentComponent.type === 'stem' && Math.random() < 0.5) {
      // 50% chance to grow a leaf from stem
      newType = 'leaf';
    } else {
      newType = 'stem';
    }
    
    // Check limits
    if (!this.checkGrowthLimits(plant, plantType, newType)) {
      return;
    }
    
    // Verify position is valid
    if (!this.isValidGrowthPosition(newPosition, newType)) {
      // Growth blocked - reduce potential but don't reset
      growthPoint.growthPotential *= 0.5;
      return;
    }
    
    // Create new component
    const compId = `${plant.id}_comp_${plant.components.size}`;
    const component: PlantComponent = {
      id: compId,
      type: newType,
      position: newPosition,
      age: 0,
      health: 1,
      size: 0.3,  // Start more visible
      growthPoints: []
    };
    
    // Add growth point to new component (except leaves)
    if (newType !== 'leaf') {
      const newGrowthPointId = `${compId}_gp`;
      const newGrowthPoint: GrowthPoint = {
        id: newGrowthPointId,
        position: newPosition, // Growth point is at the new component's position
        type: newType === 'root' ? 'root' : 'shoot',
        growthPotential: 0,
        age: 0,
        dominance: 0.8, // New growth points have less dominance
        lastGrowthTime: plant.age,
        parentComponentId: compId
      };
      
      component.growthPoints.push(newGrowthPointId);
      plant.growthPoints.set(newGrowthPointId, newGrowthPoint);
      
      // If this is a stem at branching height, add lateral growth points
      if (newType === 'stem' && newPosition.y >= plantType.growthRules.growthPatterns.stem.minHeightForBranching) {
        // Add 1-2 lateral growth points for branching
        const numBranches = Math.random() < 0.7 ? 1 : 2;
        for (let i = 0; i < numBranches; i++) {
          const lateralGrowthPointId = `${compId}_lateral_${i}`;
          const lateralGrowthPoint: GrowthPoint = {
            id: lateralGrowthPointId,
            position: newPosition,
            type: 'lateral',
            growthPotential: 0,
            age: 0,
            dominance: 0.5, // Lateral growth has even less dominance
            lastGrowthTime: plant.age,
            parentComponentId: compId
          };
          
          component.growthPoints.push(lateralGrowthPointId);
          plant.growthPoints.set(lateralGrowthPointId, lateralGrowthPoint);
        }
      }
    }
    
    // Handle leaf displacement if stem is growing through a leaf position
    if (newType === 'stem') {
      const existingKey = SubHexUtils.subHex3DToKey(newPosition);
      const existingComponentId = this.spatialIndex.get(existingKey);
      
      if (existingComponentId) {
        const existingComponent = plant.components.get(existingComponentId);
        if (existingComponent && existingComponent.type === 'leaf') {
          // Unregister leaf from old position
          this.unregisterComponent(existingComponent.position);
          
          // Find a nearby position for the displaced leaf
          const leafNewPos = this.findNearbyLeafPosition(newPosition, plant);
          if (leafNewPos) {
            // Move the leaf to new position
            existingComponent.position = leafNewPos;
            this.registerComponent(leafNewPos, existingComponentId);
          } else {
            // If no valid position, remove the leaf (it got crushed)
            plant.components.delete(existingComponentId);
            plant.componentCount.leaf--;
          }
        }
      }
    }
    
    // Add component
    plant.components.set(compId, component);
    plant.componentCount[newType]++;
    this.registerComponent(newPosition, compId);
    
    // Reset growth potential
    growthPoint.growthPotential = 0;
    growthPoint.lastGrowthTime = plant.age;
    
    // Consume resources (more for roots to discourage excessive root growth)
    const energyCost = newType === 'root' ? 4 : 2;
    plant.resources.energy = Math.max(0, plant.resources.energy - energyCost);
    
  }
  
  private chooseGrowthDirection(
    plant: OrganicPlantState, 
    plantType: OrganicPlantType, 
    growthPoint: GrowthPoint,
    parentComponent: PlantComponent
  ): SubHexCoord3D | null {
    // Growth happens FROM the component position, not the growth point position
    const currentPos = parentComponent.position;
    
    if (growthPoint.type === 'root') {
      // Roots grow down and out toward water
      const patterns = plantType.growthRules.growthPatterns.root;
      const candidates: SubHexCoord3D[] = [];
      
      // Try growing down first (reduced probability)
      if (Math.random() < patterns.depthBias * 0.5) { // Halved depth bias
        const down: SubHexCoord3D = { ...currentPos, y: currentPos.y - 1 };
        if (this.isValidGrowthPosition(down, 'root')) {
          candidates.push(down);
        }
      }
      
      // Try horizontal directions
      for (const dir of patterns.directions) {
        const newPos: SubHexCoord3D = {
          q: currentPos.q + dir.q,
          r: currentPos.r + dir.r,
          y: currentPos.y,
          parentQ: currentPos.parentQ,
          parentR: currentPos.parentR
        };
        
        // Adjust for crossing hex boundaries
        const worldPos = SubHexUtils.subHexToWorld(newPos);
        const actualPos = SubHexUtils.worldToSubHex(worldPos);
        const actualPos3D: SubHexCoord3D = { ...actualPos, y: newPos.y };
        
        if (this.isValidGrowthPosition(actualPos3D, 'root')) {
          candidates.push(actualPos3D);
        }
      }
      
      // Choose candidate with best water access
      return this.chooseBestRootPosition(candidates, plant);
      
    } else {
      // Stems grow up and toward light
      const patterns = plantType.growthRules.growthPatterns.stem;
      
      // Lateral growth points grow sideways
      if (growthPoint.type === 'lateral') {
        // Always branch sideways with light seeking
        return this.chooseBestLightPosition(currentPos, plant, plantType, true);
      }
      
      // Check if there's crowding above us - count stems in the column above
      let stemsAbove = 0;
      for (let y = currentPos.y + 1; y <= currentPos.y + 3; y++) {
        const posAbove: SubHexCoord3D = { ...currentPos, y };
        const key = SubHexUtils.subHex3DToKey(posAbove);
        const componentId = this.spatialIndex.get(key);
        if (componentId) {
          const component = plant.components.get(componentId);
          if (component && component.type === 'stem') {
            stemsAbove++;
          }
        }
      }
      
      // If crowded above, strongly prefer spreading outward
      const crowdingFactor = Math.min(stemsAbove / 2, 1); // 0-1 based on crowding
      const adjustedVerticalBias = patterns.verticalBias * (1 - crowdingFactor * 0.95); // Reduce bias by up to 95% when crowded
      
      if (stemsAbove > 0) {
      }
      
      // Add some randomness for natural growth
      const randomFactor = 0.1 + Math.random() * 0.1; // 10-20% randomness
      
      // ALWAYS consider both up and sideways options, then choose based on scores
      const growthOptions: Array<{pos: SubHexCoord3D, score: number, type: string}> = [];
      
      // Option 1: Try growing up
      const up: SubHexCoord3D = { ...currentPos, y: currentPos.y + 1 };
      if (this.isValidGrowthPosition(up, 'stem')) {
        // Score for growing up - reduced by crowding
        let upScore = adjustedVerticalBias * 10;
        upScore -= crowdingFactor * 5; // Penalty for crowding
        upScore += Math.random() * 2;
        growthOptions.push({pos: up, score: upScore, type: 'up'});
      }
      
      // Option 2: Try spreading sideways
      const lateralPos = this.chooseBestLightPosition(currentPos, plant, plantType, true);
      if (lateralPos) {
        // Score for growing sideways - increased by crowding
        let lateralScore = 5; // Base score for lateral
        lateralScore += crowdingFactor * 10; // Bonus for crowding
        lateralScore += Math.random() * 2;
        growthOptions.push({pos: lateralPos, score: lateralScore, type: 'lateral'});
      }
      
      // Choose best option
      if (growthOptions.length === 0) {
        return null;
      }
      
      growthOptions.sort((a, b) => b.score - a.score);
      const chosen = growthOptions[0];
      return chosen.pos;
    }
    
    return null;
  }
  
  private chooseBestRootPosition(candidates: SubHexCoord3D[], plant: OrganicPlantState): SubHexCoord3D | null {
    if (candidates.length === 0) return null;
    
    // Score each position by water availability
    let bestPos = candidates[0];
    let bestScore = -1;
    
    for (const pos of candidates) {
      // Get the actual world position to find the correct hex
      const worldPos = SubHexUtils.subHexToWorld(pos);
      worldPos.y = pos.y * Constants.HEX_HEIGHT;
      const mainHex = HexUtils.worldToHex(worldPos);
      
      const hexCoord: HexCoord3D = {
        q: mainHex.q,
        r: mainHex.r,
        y: pos.y
      };
      
      const waterLevel = this.waterSimulation.getSaturation(hexCoord);
      const score = waterLevel + Math.random() * 0.2; // Add some randomness
      
      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }
    
    return bestPos;
  }
  
  private chooseBestLightPosition(currentPos: SubHexCoord3D, plant: OrganicPlantState, plantType: OrganicPlantType, preferSideways: boolean = false): SubHexCoord3D | null {
    // Expanded set of directions including diagonals and upward diagonals
    const candidates: Array<{pos: SubHexCoord3D, score: number}> = [];
    
    // Horizontal and diagonal directions
    const horizontalDirs = [
      {q: -1, r: 0}, {q: 1, r: 0}, {q: 0, r: -1}, 
      {q: 0, r: 1}, {q: -1, r: 1}, {q: 1, r: -1}
    ];
    
    // Also consider upward diagonals for spreading growth
    const upwardDiagonalDirs = [
      {q: -1, r: 0, y: 1}, {q: 1, r: 0, y: 1}, {q: 0, r: -1, y: 1}, 
      {q: 0, r: 1, y: 1}, {q: -1, r: 1, y: 1}, {q: 1, r: -1, y: 1}
    ];
    
    // Calculate stem center for distance calculation
    const stemComponents = Array.from(plant.components.values())
      .filter(c => c.type === 'stem');
    const avgQ = stemComponents.reduce((sum, c) => sum + c.position.q, 0) / Math.max(stemComponents.length, 1);
    const avgR = stemComponents.reduce((sum, c) => sum + c.position.r, 0) / Math.max(stemComponents.length, 1);
    
    // Try horizontal directions
    for (const dir of horizontalDirs) {
      const newPos: SubHexCoord3D = {
        q: currentPos.q + dir.q,
        r: currentPos.r + dir.r,
        y: currentPos.y,
        parentQ: currentPos.parentQ,
        parentR: currentPos.parentR
      };
      
      // Handle hex boundary crossing
      const worldPos = SubHexUtils.subHexToWorld(newPos);
      const actualPos = SubHexUtils.worldToSubHex(worldPos);
      const actualPos3D: SubHexCoord3D = { ...actualPos, y: newPos.y };
      
      if (this.isValidGrowthPosition(actualPos3D, 'stem')) {
        const lightLevel = this.calculatePotentialLight(actualPos3D, plant);
        const distance = Math.sqrt(Math.pow(actualPos3D.q - avgQ, 2) + Math.pow(actualPos3D.r - avgR, 2));
        
        // Score based on light (most important), distance from center, and randomness
        let score = lightLevel * 10; // Light is most important
        score += distance * 2.0; // Strongly prefer spreading outward
        score += Math.random() * 0.5; // More randomness
        
        candidates.push({pos: actualPos3D, score});
      }
    }
    
    // Try upward diagonals if we want to spread
    if (!preferSideways || candidates.length === 0) {
      for (const dir of upwardDiagonalDirs) {
        const newPos: SubHexCoord3D = {
          q: currentPos.q + dir.q,
          r: currentPos.r + dir.r,
          y: currentPos.y + dir.y,
          parentQ: currentPos.parentQ,
          parentR: currentPos.parentR
        };
        
        // Handle hex boundary crossing
        const worldPos = SubHexUtils.subHexToWorld(newPos);
        const actualPos = SubHexUtils.worldToSubHex(worldPos);
        const actualPos3D: SubHexCoord3D = { ...actualPos, y: newPos.y };
        
        if (this.isValidGrowthPosition(actualPos3D, 'stem')) {
          const lightLevel = this.calculatePotentialLight(actualPos3D, plant);
          const distance = Math.sqrt(Math.pow(actualPos3D.q - avgQ, 2) + Math.pow(actualPos3D.r - avgR, 2));
          
          let score = lightLevel * 10;
          score += distance * 1.5; // More weight for spreading
          score += Math.random() * 0.5;
          
          // Bonus for diagonal movement when spreading
          if (preferSideways) {
            score += 2.0; // Strong bonus for diagonal when spreading
          }
          
          candidates.push({pos: actualPos3D, score});
        }
      }
    }
    
    // Sort by score and pick from top candidates with some randomness
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length === 0) return null;
    
    // Pick from top 3 candidates with weighted probability
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const totalScore = topCandidates.reduce((sum, c) => sum + c.score, 0);
    
    let random = Math.random() * totalScore;
    for (const candidate of topCandidates) {
      random -= candidate.score;
      if (random <= 0) {
        return candidate.pos;
      }
    }
    
    return topCandidates[0].pos;
  }
  
  private calculatePotentialLight(position: SubHexCoord3D, plant?: OrganicPlantState): number {
    let lightLevel = 1.0;
    
    // Check for components directly above
    for (let y = position.y + 1; y <= position.y + 10; y++) {
      const above: SubHexCoord3D = { ...position, y };
      const key = SubHexUtils.subHex3DToKey(above);
      const componentId = this.spatialIndex.get(key);
      
      if (componentId && plant) {
        const component = plant.components.get(componentId);
        if (component) {
          if (component.type === 'leaf') {
            // Leaves block more light based on their size and health
            lightLevel *= (1 - 0.7 * component.size * component.health);
          } else if (component.type === 'stem') {
            // Stems block less light
            lightLevel *= 0.85;
          }
        }
      } else if (componentId) {
        // Generic shading if we don't have plant info
        lightLevel *= 0.8;
      }
    }
    
    // Also check nearby positions for partial shading
    if (plant) {
      const nearbyDirs = [{q: -1, r: 0}, {q: 1, r: 0}, {q: 0, r: -1}, 
                         {q: 0, r: 1}, {q: -1, r: 1}, {q: 1, r: -1}];
      
      for (const dir of nearbyDirs) {
        for (let y = position.y + 1; y <= position.y + 3; y++) {
          const nearbyAbove: SubHexCoord3D = {
            q: position.q + dir.q,
            r: position.r + dir.r,
            y: y,
            parentQ: position.parentQ,
            parentR: position.parentR
          };
          
          const key = SubHexUtils.subHex3DToKey(nearbyAbove);
          const componentId = this.spatialIndex.get(key);
          
          if (componentId) {
            const component = plant.components.get(componentId);
            if (component && component.type === 'leaf') {
              // Nearby leaves provide partial shade
              lightLevel *= 0.95;
            }
          }
        }
      }
    }
    
    return Math.max(0.1, lightLevel); // Always have at least 10% light
  }
  
  private checkGrowthLimits(plant: OrganicPlantState, plantType: OrganicPlantType, componentType: PlantComponentType): boolean {
    switch (componentType) {
      case 'root':
        return plant.componentCount.root < plantType.maxRoots;
      case 'leaf':
        return plant.componentCount.leaf < plantType.maxLeaves;
      case 'stem':
        const maxY = Math.max(...Array.from(plant.components.values())
          .filter(c => c.type === 'stem')
          .map(c => c.position.y));
        return maxY < plant.position.y + plantType.maxHeight;
      default:
        return false;
    }
  }
  
  private isValidGrowthPosition(position: SubHexCoord3D, componentType: PlantComponentType): boolean {
    // Check if position is already occupied
    const key = SubHexUtils.subHex3DToKey(position);
    const existingComponentId = this.spatialIndex.get(key);
    
    if (existingComponentId) {
      // Find which plant owns this component
      for (const plant of this.plants.values()) {
        const existingComponent = plant.components.get(existingComponentId);
        if (existingComponent) {
          // Stems can grow through leaves (pushing them aside)
          if (componentType === 'stem' && existingComponent.type === 'leaf') {
            return true; // Allow stem to grow here
          }
        }
      }
      
      return false;
    }
    
    // Roots must grow in soil
    if (componentType === 'root') {
      // Get the actual world position to find the correct hex
      const worldPos = SubHexUtils.subHexToWorld(position);
      worldPos.y = position.y * Constants.HEX_HEIGHT;
      const mainHex = HexUtils.worldToHex(worldPos);
      
      const hexCoord: HexCoord3D = {
        q: mainHex.q,
        r: mainHex.r,
        y: position.y
      };
      
      // Check if there's soil at this position
      const hexes = this.waterSimulation.getAllHexes();
      const hasSoil = hexes.some(h => 
        h.coord.q === hexCoord.q && 
        h.coord.r === hexCoord.r && 
        h.coord.y === hexCoord.y
      );
      
      if (!hasSoil) {
      }
      
      return hasSoil;
    }
    
    // Stems and leaves can grow in air
    return true;
  }
  
  private updateResources(plant: OrganicPlantState, plantType: OrganicPlantType, timeOfDay: number): void {
    // Extract water from soil through roots
    let totalWaterExtracted = 0;
    const roots = Array.from(plant.components.values()).filter(c => c.type === 'root');
    
    // Track unique hexes we've checked to avoid double extraction
    const checkedHexes = new Map<string, number>(); // hex key -> number of roots in that hex
    
    // Count roots per hex
    for (const root of roots) {
      // Get the actual world position of the root
      const worldPos = SubHexUtils.subHexToWorld(root.position);
      worldPos.y = root.position.y * Constants.HEX_HEIGHT;
      
      // Find which main hex this root is in
      const mainHex = HexUtils.worldToHex(worldPos);
      const hexCoord: HexCoord3D = {
        q: mainHex.q,
        r: mainHex.r,
        y: root.position.y
      };
      
      const hexKey = HexUtils.hex3DToKey(hexCoord);
      checkedHexes.set(hexKey, (checkedHexes.get(hexKey) || 0) + 1);
    }
    
    // Extract water from each hex based on root count
    const baseExtractionRateML = 50; // Base water extraction in ML per root per tick
    
    for (const [hexKey, rootCount] of checkedHexes) {
      const coords = HexUtils.keyToHex3D(hexKey);
      if (coords) {
        // Get current water content and saturation
        const waterML = this.waterSimulation.getWaterML(coords);
        const saturation = this.waterSimulation.getSaturation(coords);
        
        // More roots in same hex have diminishing returns
        const extractionEfficiency = Math.sqrt(rootCount); // Square root for diminishing returns
        
        // Extraction rate is proportional to saturation (Darcy's law - water moves easier in saturated soil)
        const maxExtractionML = baseExtractionRateML * extractionEfficiency * saturation;
        
        // Can only extract what's available (limit to 5% of current water per tick)
        const waterToExtractML = Math.min(maxExtractionML, waterML * 0.05);
        
        // Actually remove water from the soil
        const extractedWaterML = this.waterSimulation.removeWaterML(coords, waterToExtractML);
        totalWaterExtracted += extractedWaterML;
      }
    }
    
    // Update plant water level - convert ML to plant's internal 0-1 scale
    // Assume plant can hold 1000ml = 1 liter at full capacity
    const plantCapacityML = 1000;
    plant.resources.water = Math.min(1, plant.resources.water + (totalWaterExtracted / plantCapacityML));
    
    // Photosynthesis during day
    const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;
    if (isDaytime) {
      const leaves = Array.from(plant.components.values()).filter(c => c.type === 'leaf');
      let energyProduction = 0;
      
      for (const leaf of leaves) {
        const light = plant.lightMap.get(leaf.id) || 0;
        energyProduction += light * leaf.size * leaf.health;
      }
      
      plant.resources.energy = Math.min(100, plant.resources.energy + energyProduction * 0.5); // More energy from leaves
    }
    
    // Small passive energy regeneration to prevent complete starvation
    // This represents stored energy in roots/stems
    if (plant.resources.energy < 5 && plant.resources.water > 0.3) {
      plant.resources.energy = Math.min(5, plant.resources.energy + 0.01); // Slow regen up to 5
    }
    
    // Consume water (transpiration) - water should come from soil, not plant storage
    // The plant is just a conduit for water movement from soil to air
    if (plant.resources.water > 0.1 && checkedHexes.size > 0) { // Need water and roots
      const componentCount = plant.components.size;
      const baseTranspirationML = isDaytime ? 10 : 1; // ML per component per tick
      const totalTranspirationML = baseTranspirationML * Math.sqrt(componentCount);
      
      // Distribute transpiration across all hexes with roots
      const transpirationPerHexML = totalTranspirationML / checkedHexes.size;
      
      let actualTranspiredML = 0;
      for (const [hexKey, _rootCount] of checkedHexes) {
        const coords = HexUtils.keyToHex3D(hexKey);
        if (coords) {
          // Remove water from soil (this is what actually consumes water)
          const removedML = this.waterSimulation.removeWaterML(coords, transpirationPerHexML);
          actualTranspiredML += removedML;
        }
      }
      
      // Update plant water based on actual transpiration
      // If we couldn't transpire enough, plant water drops
      const expectedTranspirationRatio = totalTranspirationML / plantCapacityML;
      const actualTranspirationRatio = actualTranspiredML / plantCapacityML;
      
      if (actualTranspirationRatio < expectedTranspirationRatio) {
        // Not enough water in soil to meet transpiration needs
        const deficit = expectedTranspirationRatio - actualTranspirationRatio;
        plant.resources.water = Math.max(0, plant.resources.water - deficit);
      }
    }
  }
  
  private updateLightExposure(plant: OrganicPlantState): void {
    // Update light levels for all components
    for (const component of plant.components.values()) {
      const lightLevel = this.calculatePotentialLight(component.position, plant);
      plant.lightMap.set(component.id, lightLevel);
      
      if (component.type === 'leaf') {
        component.sunExposure = lightLevel;
      }
    }
  }
  
  private updateComponentHealth(plant: OrganicPlantState, plantType: OrganicPlantType): void {
    for (const component of plant.components.values()) {
      let healthChange = 0;
      
      // Good conditions = health recovery
      if (plant.resources.water > 0.5 && plant.resources.energy > 10) {
        healthChange += 0.002; // Slow recovery when well-fed
      }
      
      // Stress conditions = health loss
      if (plant.resources.water < 0.3) {
        healthChange -= 0.01; // Drought stress
      } else if (plant.resources.water < 0.1) {
        healthChange -= 0.02; // Severe drought
      }
      
      if (component.type === 'leaf') {
        const sunExposure = component.sunExposure || 0;
        if (sunExposure < 0.2) {
          healthChange -= 0.005; // Severe light stress
        } else if (sunExposure > 0.7) {
          healthChange += 0.001; // Good light helps leaves
        }
      }
      
      // Very old components slowly decline
      if (component.age > 7200) { // After 2 hours
        healthChange -= 0.0005; // Slow aging
      }
      
      component.health = Math.max(0, Math.min(1, component.health + healthChange));
      
      // Size increases with age (up to a limit) if healthy
      if (component.health > 0.5 && component.size < 1) {
        component.size = Math.min(1, component.size + 0.001);
      }
      
      // Update component age
      component.age += 1; // Assuming tick is ~1 second
    }
  }
  
  private applyApicalDominance(plant: OrganicPlantState, plantType: OrganicPlantType): void {
    // Find highest stem growth points
    const stemGrowthPoints = Array.from(plant.growthPoints.values())
      .filter(gp => gp.type === 'shoot')
      .sort((a, b) => b.position.y - a.position.y);
    
    if (stemGrowthPoints.length === 0) return;
    
    const dominant = stemGrowthPoints[0];
    const radius = plantType.growthRules.dominanceRadius;
    const strength = plantType.growthRules.dominanceStrength;
    
    // Suppress nearby growth points
    for (const gp of plant.growthPoints.values()) {
      if (gp.id === dominant.id || gp.type === 'root') continue;
      
      // Lateral growth points are less affected by apical dominance
      const lateralResistance = gp.type === 'lateral' ? 0.5 : 1.0;
      
      const distance = Math.abs(dominant.position.y - gp.position.y);
      if (distance <= radius) {
        const suppression = strength * (1 - distance / radius) * lateralResistance;
        gp.dominance = Math.max(0.1, 1 - suppression);
      } else {
        gp.dominance = 1;
      }
    }
  }
  
  private registerComponent(position: SubHexCoord3D, componentId: string): void {
    const key = SubHexUtils.subHex3DToKey(position);
    this.spatialIndex.set(key, componentId);
  }
  
  private unregisterComponent(position: SubHexCoord3D): void {
    const key = SubHexUtils.subHex3DToKey(position);
    this.spatialIndex.delete(key);
  }
  
  
  private findNearbyLeafPosition(stemPosition: SubHexCoord3D, plant: OrganicPlantState): SubHexCoord3D | null {
    // Try positions around the stem at the same height
    const directions = [
      {q: -1, r: 0}, {q: 1, r: 0}, {q: 0, r: -1}, 
      {q: 0, r: 1}, {q: -1, r: 1}, {q: 1, r: -1}
    ];
    
    // Randomly shuffle directions for variety
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }
    
    // Try each direction
    for (const dir of directions) {
      const newPos: SubHexCoord3D = {
        q: stemPosition.q + dir.q,
        r: stemPosition.r + dir.r,
        y: stemPosition.y,
        parentQ: stemPosition.parentQ,
        parentR: stemPosition.parentR
      };
      
      // Check if position is free
      const key = SubHexUtils.subHex3DToKey(newPos);
      if (!this.spatialIndex.has(key)) {
        return newPos;
      }
    }
    
    // No free position found
    return null;
  }
  
  // Get all plants for rendering
  getAllPlants(): Array<{plant: OrganicPlantState, type: OrganicPlantType}> {
    const result: Array<{plant: OrganicPlantState, type: OrganicPlantType}> = [];
    
    for (const plant of this.plants.values()) {
      const type = this.plantTypes.get(plant.typeId);
      if (type) {
        result.push({ plant, type });
      }
    }
    
    return result;
  }
  
  removePlant(plantId: string): void {
    const plant = this.plants.get(plantId);
    if (!plant) return;
    
    // Unregister all components
    for (const component of plant.components.values()) {
      this.unregisterComponent(component.position);
    }
    
    this.plants.delete(plantId);
  }
  
  // Get plant type by ID
  getPlantType(typeId: string): OrganicPlantType | undefined {
    return this.plantTypes.get(typeId);
  }
  
  // Get plant at world position (for inspection/harvesting)
  getPlantAt(worldPos: THREE.Vector3): OrganicPlantState | undefined {
    const subHex = SubHexUtils.worldToSubHex(worldPos);
    const yLevel = Math.round(worldPos.y / Constants.HEX_HEIGHT);
    const subHex3D: SubHexCoord3D = { ...subHex, y: yLevel };
    
    // Check if there's a component at this position
    const key = SubHexUtils.subHex3DToKey(subHex3D);
    const componentId = this.spatialIndex.get(key);
    
    if (componentId) {
      // Find which plant owns this component
      for (const plant of this.plants.values()) {
        if (plant.components.has(componentId)) {
          return plant;
        }
      }
    }
    
    return undefined;
  }
  
  // Helper method to add random horizontal drift to a position
  private addRandomDrift(position: SubHexCoord3D, plant: OrganicPlantState): SubHexCoord3D | null {
    const directions = [
      {q: -1, r: 0}, {q: 1, r: 0}, {q: 0, r: -1}, 
      {q: 0, r: 1}, {q: -1, r: 1}, {q: 1, r: -1}
    ];
    
    // Pick a random direction
    const dir = directions[Math.floor(Math.random() * directions.length)];
    
    const driftPos: SubHexCoord3D = {
      q: position.q + dir.q,
      r: position.r + dir.r,
      y: position.y,
      parentQ: position.parentQ,
      parentR: position.parentR
    };
    
    // Adjust for crossing hex boundaries
    const worldPos = SubHexUtils.subHexToWorld(driftPos);
    const actualPos = SubHexUtils.worldToSubHex(worldPos);
    const actualPos3D: SubHexCoord3D = { ...actualPos, y: driftPos.y };
    
    return actualPos3D;
  }
}