import { SubHexCoord3D } from '../utils/SubHexUtils';

// Component types for plant growth
export type PlantComponentType = 'root' | 'stem' | 'leaf';

// Sub-hex occupation pattern for plant growth
export interface SubHexOccupation {
  offset: { q: number; r: number };  // Relative sub-hex offset from plant origin
  height: number;                    // Vertical layer (-2 to 3+)
  type: PlantComponentType;          // What type of component
}

// Growth stage definition
export interface GrowthStage {
  id: number;
  name: string;
  duration: number;         // Seconds to next stage (-1 for final)
  hexPattern: SubHexOccupation[];  // Using sub-hex pattern
  requirements: {
    water: number;          // Water units per tick
    nutrients: {
      N: number;            // Nitrogen
      P: number;            // Phosphorus  
      K: number;            // Potassium
    };
    sunlight: number;       // Sunlight hours needed
  };
  harvestYield?: number;    // Amount produced (0 for non-final stages)
}

// Harvest behavior configuration
export interface HarvestBehavior {
  type: 'single' | 'continuous';
  interval?: number;        // For continuous producers (seconds)
  depletesPlant: boolean;   // Does harvest kill the plant?
  seasonalYield?: number[]; // Optional seasonal variation
}

// Plant type definition
export interface PlantType {
  id: string;
  name: string;
  growthStages: GrowthStage[];
  harvestBehavior: HarvestBehavior;
  companions?: string[];    // Plant IDs that grow well together
  antagonists?: string[];   // Plant IDs that inhibit each other
  companionBonus?: {
    growthRate: number;     // Multiplier (e.g., 1.1 = 10% faster)
    pestResistance: number;
    yieldBonus: number;
  };
}

// Plant instance state
export interface PlantState {
  id: string;               // Unique instance ID
  typeId: string;           // References PlantType
  position: SubHexCoord3D;  // Root position in sub-hex coordinates
  currentStage: number;     // Current growth stage index
  growthTimer: number;      // Time in current stage
  isStunted: boolean;       // Growth blocked by competition
  stuntedBy?: string[];     // IDs of blocking plants
  lastGrowthAttempt?: number; // Time of last growth attempt (for throttling)
  health: {
    water: number;          // 0-1 satisfaction level
    nutrients: number;      // 0-1 satisfaction level
    sunlight: number;       // 0-1 satisfaction level
  };
  resourceConsumption: {
    waterMultiplier: number;     // Reduced when stunted
    nutrientMultiplier: number;  // Reduced when stunted
  };
  plantedTime: number;      // Timestamp when planted
  lastHarvest?: number;     // For continuous producers
  customPatterns?: SubHexOccupation[][]; // Custom patterns for each stage
  accumulatedYield?: number; // Resources converted to harvest yield
}

// Tomato plant definition
export const TOMATO_PLANT: PlantType = {
  id: 'tomato',
  name: 'Tomato Plant',
  growthStages: [
    {
      id: 0,
      name: 'Seedling',
      duration: 10, // 10 seconds for testing
      hexPattern: [
        // Small root cluster with more organic shape
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        // Central stem (thinner with finer grid)
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        // Small leaves with slight spread
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.1, 
        nutrients: { N: 1, P: 1, K: 1 }, 
        sunlight: 2 
      }
    },
    {
      id: 1,
      name: 'Young Plant',
      duration: 15, // 15 seconds for testing
      hexPattern: [
        // Main root layer with natural branching (all at -1 level)
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -2 }, height: -1, type: 'root' },
        // Slightly curved stem using multiple sub-hexes
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'stem' }, // Slight bulge
        // More organic leaf arrangement
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 3, r: -2 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: -3, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 1, type: 'leaf' },
        // Upper leaves in natural clusters
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 2, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: -2, r: 1 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -2 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.2, 
        nutrients: { N: 2, P: 1, K: 2 }, 
        sunlight: 4 
      }
    },
    {
      id: 2,
      name: 'Mature',
      duration: -1, // Final stage
      hexPattern: [
        // Extensive root system (all at -1 level for single-layer soil)
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        // Thick main stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 3, type: 'stem' },
        // Bushy leaf canopy
        { offset: { q: 1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -2 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: 1 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 2, type: 'leaf' },
        { offset: { q: 2, r: -2 }, height: 2, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 3, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 3, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 3, type: 'leaf' }
      ],
      requirements: { 
        water: 0.3, 
        nutrients: { N: 3, P: 2, K: 3 }, 
        sunlight: 6 
      },
      harvestYield: 10 // Produces 10 tomatoes
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 300, // New tomatoes every 5 minutes
    depletesPlant: false
  }
};

// Wheat plant - simple vertical growth
export const WHEAT_PLANT: PlantType = {
  id: 'wheat',
  name: 'Wheat',
  growthStages: [
    {
      id: 0,
      name: 'Sprout',
      duration: 5, // 5 seconds for testing
      hexPattern: [
        // Simple root system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        // Thin sprout
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        // Small blade
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.05, 
        nutrients: { N: 1, P: 0.5, K: 1 }, 
        sunlight: 2 
      }
    },
    {
      id: 1,
      name: 'Mature',
      duration: -1,
      hexPattern: [
        // Deeper roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Tall wheat stalks
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        // Grain head at top
        { offset: { q: 0, r: 0 }, height: 3, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.1, 
        nutrients: { N: 2, P: 1, K: 1.5 }, 
        sunlight: 4 
      },
      harvestYield: 5 // Produces 5 wheat
    }
  ],
  harvestBehavior: {
    type: 'single',
    depletesPlant: true // Harvest removes the plant
  }
};

// All available plant types
// Bean plant definition - nitrogen fixer
export const BEAN_PLANT: PlantType = {
  id: 'beans',
  name: 'Bean Plant',
  growthStages: [
    {
      id: 0,
      name: 'Bean Sprout',
      duration: 8,
      hexPattern: [
        // Small root with nitrogen-fixing nodules
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Thin stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        // First leaves
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.08, 
        nutrients: { N: 0.5, P: 1, K: 1 }, 
        sunlight: 2 
      }
    },
    {
      id: 1,
      name: 'Climbing Vine',
      duration: 12,
      hexPattern: [
        // Expanded root system with more nodules
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Climbing stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 3, type: 'stem' },
        // Leaves spreading out
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 3, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 3, type: 'leaf' }
      ],
      requirements: { 
        water: 0.12, 
        nutrients: { N: 0.3, P: 1.5, K: 1.5 }, 
        sunlight: 3 
      }
    },
    {
      id: 2,
      name: 'Bean Producer',
      duration: -1,
      hexPattern: [
        // Mature root system actively fixing nitrogen
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        // Full vine structure
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 3, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 4, type: 'stem' },
        // Dense foliage
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 3, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 3, type: 'leaf' },
        { offset: { q: 3, r: -2 }, height: 3, type: 'leaf' },
        { offset: { q: -3, r: 3 }, height: 3, type: 'leaf' },
        { offset: { q: 0, r: 1 }, height: 4, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 4, type: 'leaf' }
      ],
      requirements: { 
        water: 0.15, 
        nutrients: { N: 0, P: 2, K: 2 }, // No N requirement when mature
        sunlight: 4 
      },
      harvestYield: 15
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 20, // Beans every 20 seconds
    depletesPlant: false
  }
};

export const PLANT_TYPES: Map<string, PlantType> = new Map([
  ['tomato', TOMATO_PLANT],
  ['wheat', WHEAT_PLANT],
  ['beans', BEAN_PLANT]
]);