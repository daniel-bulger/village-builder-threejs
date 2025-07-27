import { SubHexCoord3D } from '../utils/SubHexUtils';
import { PlantComponentType } from './PlantTypes';

// Growth point (meristem) that can produce new plant parts
export interface GrowthPoint {
  id: string;
  position: SubHexCoord3D;
  type: 'root' | 'shoot' | 'lateral';
  growthPotential: number;      // Accumulated growth energy
  age: number;                  // Age affects growth rate
  dominance: number;            // Apical dominance factor (0-1)
  lastGrowthTime: number;
  parentComponentId?: string;   // Which component this grows from
}

// Individual plant component (root, stem, leaf)
export interface PlantComponent {
  id: string;
  type: PlantComponentType;
  position: SubHexCoord3D;
  age: number;
  health: number;               // 0-1, affects appearance
  size: number;                 // Growth level of this component
  sunExposure?: number;         // For leaves - how much light received
  waterAccess?: number;         // For roots - proximity to water
  growthPoints: string[];       // IDs of growth points on this component
}

// Growth rules for different component types
export interface GrowthRules {
  // Minimum potential needed to grow
  growthThreshold: number;
  
  // How much potential accumulates per tick
  potentialRate: {
    base: number;
    waterMultiplier: number;    // Multiplied by water satisfaction
    nutrientMultiplier: number; // Multiplied by nutrient satisfaction
    lightMultiplier: number;    // Multiplied by light satisfaction
  };
  
  // Where new components can grow
  growthPatterns: {
    root: {
      directions: Array<{q: number, r: number}>;  // Horizontal spread
      depthBias: number;        // Preference for growing down vs out
      avoidLight: boolean;      // Roots grow away from light
    };
    stem: {
      verticalBias: number;     // Preference for growing up
      branchAngle: number;      // Angle for lateral branches
      minHeightForBranching: number;
    };
    leaf: {
      requiresStem: boolean;    // Must grow from stem
      spiralAngle: number;      // Phyllotaxis angle
      lightSeeking: boolean;    // Grow toward light
    };
  };
  
  // Apical dominance
  dominanceRadius: number;      // How far tip suppresses other growth
  dominanceStrength: number;    // How much suppression (0-1)
}

// Dynamic plant definition
export interface OrganicPlantType {
  id: string;
  name: string;
  
  // Starting configuration
  seedComponents: Array<{
    type: PlantComponentType;
    relativePosition: {q: number, r: number, height: number};
  }>;
  
  // Growth characteristics
  growthRules: GrowthRules;
  
  // Resource requirements per component
  resourceNeeds: {
    water: number;          // Per root
    nutrients: number;      // Per component
    light: number;          // Per leaf
  };
  
  // Maximum values
  maxHeight: number;          // Genetic height limit
  maxRoots: number;           // Maximum root components
  maxLeaves: number;          // Maximum leaf components
  
  // Special behaviors
  traits: {
    phototropism: number;     // How strongly it bends to light (0-1)
    gravitropism: number;     // How strongly roots grow down (0-1)
    drought_tolerance: number; // Survival with low water (0-1)
  };
}

// Organic plant state
export interface OrganicPlantState {
  id: string;
  typeId: string;
  position: SubHexCoord3D;      // Origin position
  
  // Components and growth points
  components: Map<string, PlantComponent>;
  growthPoints: Map<string, GrowthPoint>;
  
  // Resource state
  resources: {
    water: number;            // Current water level
    nutrients: number;        // Current nutrient level
    energy: number;           // Stored energy for growth
  };
  
  // Growth history
  age: number;                // Total age
  lastGrowthEvent: number;    // Time of last growth
  componentCount: {
    root: number;
    stem: number;
    leaf: number;
  };
  
  // Environmental factors
  lightMap: Map<string, number>;  // Component ID -> light received
  competitionMap: Map<string, string[]>; // Component ID -> competing plant IDs
}

// Example organic plant type
export const ORGANIC_TOMATO: OrganicPlantType = {
  id: 'organic_tomato',
  name: 'Tomato Plant',
  
  seedComponents: [
    { type: 'root', relativePosition: {q: 0, r: 0, height: -1} },
    { type: 'stem', relativePosition: {q: 0, r: 0, height: 0} }
  ],
  
  growthRules: {
    growthThreshold: 5,  // Reduced from 10 for faster growth
    potentialRate: {
      base: 2,  // Doubled for faster growth
      waterMultiplier: 3,
      nutrientMultiplier: 2,
      lightMultiplier: 4
    },
    growthPatterns: {
      root: {
        directions: [{q: -1, r: 0}, {q: 1, r: 0}, {q: 0, r: -1}, 
                     {q: 0, r: 1}, {q: -1, r: 1}, {q: 1, r: -1}],
        depthBias: 0.7,
        avoidLight: true
      },
      stem: {
        verticalBias: 0.4,  // Low bias to encourage spreading
        branchAngle: 45,
        minHeightForBranching: 2  // Allow branching earlier
      },
      leaf: {
        requiresStem: true,
        spiralAngle: 137.5,  // Golden angle
        lightSeeking: true
      }
    },
    dominanceRadius: 3,
    dominanceStrength: 0.6
  },
  
  resourceNeeds: {
    water: 0.2,
    nutrients: 0.1,
    light: 4
  },
  
  maxHeight: 6,
  maxRoots: 20,
  maxLeaves: 30,
  
  traits: {
    phototropism: 0.9,  // Increased from 0.7 for stronger light-seeking behavior
    gravitropism: 0.8,
    drought_tolerance: 0.4
  }
};