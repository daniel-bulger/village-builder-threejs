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

// Potato plant definition - grows underground
export const POTATO_PLANT: PlantType = {
  id: 'potato',
  name: 'Potato Plant',
  growthStages: [
    {
      id: 0,
      name: 'Potato Sprout',
      duration: 8,
      hexPattern: [
        // Initial root system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        // Small stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        // First leaves
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.1, 
        nutrients: { N: 1, P: 1, K: 2 }, // High potassium need
        sunlight: 3 
      }
    },
    {
      id: 1,
      name: 'Growing Plant',
      duration: 15,
      hexPattern: [
        // Expanding root system with tuber sites
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        // Sturdy stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        // Bushy foliage
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.15, 
        nutrients: { N: 1.5, P: 1.5, K: 3 }, 
        sunlight: 4 
      }
    },
    {
      id: 2,
      name: 'Mature Plant',
      duration: -1,
      hexPattern: [
        // Extensive underground root/tuber system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -2 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 2 }, height: -1, type: 'root' },
        // Strong stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        // Dense foliage
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: 1 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.2, 
        nutrients: { N: 2, P: 2, K: 4 }, // Very high potassium
        sunlight: 4 
      },
      harvestYield: 8 // Produces 8 potatoes
    }
  ],
  harvestBehavior: {
    type: 'single',
    depletesPlant: true // Must dig up the whole plant
  }
};

// Lettuce plant definition - fast growing leafy green
export const LETTUCE_PLANT: PlantType = {
  id: 'lettuce',
  name: 'Lettuce',
  growthStages: [
    {
      id: 0,
      name: 'Lettuce Seedling',
      duration: 5,
      hexPattern: [
        // Small shallow roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        // Tiny leaves
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' }
      ],
      requirements: { 
        water: 0.08, 
        nutrients: { N: 2, P: 0.5, K: 1 }, // High nitrogen for leafy growth
        sunlight: 2 
      }
    },
    {
      id: 1,
      name: 'Young Lettuce',
      duration: 8,
      hexPattern: [
        // Shallow but wider root system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        // Rosette of leaves
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: -2, r: 1 }, height: 0, type: 'leaf' }
      ],
      requirements: { 
        water: 0.12, 
        nutrients: { N: 3, P: 1, K: 1.5 }, 
        sunlight: 3 
      }
    },
    {
      id: 2,
      name: 'Mature Lettuce',
      duration: -1,
      hexPattern: [
        // Full root spread
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Full lettuce head
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: 2 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: -2 }, height: 0, type: 'leaf' },
        // Some height variation
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.15, 
        nutrients: { N: 4, P: 1, K: 2 }, 
        sunlight: 3 
      },
      harvestYield: 6
    }
  ],
  harvestBehavior: {
    type: 'single',
    depletesPlant: true
  }
};

// Carrot plant definition - root vegetable
export const CARROT_PLANT: PlantType = {
  id: 'carrot',
  name: 'Carrot',
  growthStages: [
    {
      id: 0,
      name: 'Carrot Sprout',
      duration: 6,
      hexPattern: [
        // Initial taproot
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        // Feathery leaves
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 0, type: 'leaf' }
      ],
      requirements: { 
        water: 0.06, 
        nutrients: { N: 1, P: 2, K: 3 }, // High P and K for root development
        sunlight: 3 
      }
    },
    {
      id: 1,
      name: 'Growing Carrot',
      duration: 12,
      hexPattern: [
        // Developing taproot
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 0 }, height: -2, type: 'root' }, // Deep root
        // Side roots
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        // Ferny foliage
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: -2, r: 1 }, height: 0, type: 'leaf' },
        // Taller fronds
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.1, 
        nutrients: { N: 1.5, P: 3, K: 4 }, 
        sunlight: 4 
      }
    },
    {
      id: 2,
      name: 'Mature Carrot',
      duration: -1,
      hexPattern: [
        // Full taproot system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 0 }, height: -2, type: 'root' },
        { offset: { q: 0, r: 0 }, height: -3, type: 'root' }, // Very deep
        // Side roots
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        // Full foliage
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 0, type: 'leaf' },
        // Tall fronds
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -2 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 1 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.12, 
        nutrients: { N: 2, P: 4, K: 5 }, 
        sunlight: 4 
      },
      harvestYield: 12
    }
  ],
  harvestBehavior: {
    type: 'single',
    depletesPlant: true
  }
};

// Mushroom plant definition - grows in shade
export const MUSHROOM_PLANT: PlantType = {
  id: 'mushroom',
  name: 'Mushroom',
  growthStages: [
    {
      id: 0,
      name: 'Mushroom Spores',
      duration: 4,
      hexPattern: [
        // Mycelium network underground
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Tiny mushroom pins
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' }
      ],
      requirements: { 
        water: 0.15, // Needs moisture
        nutrients: { N: 0.5, P: 1, K: 0.5 }, // Low nutrient needs
        sunlight: 0.5 // Prefers shade
      }
    },
    {
      id: 1,
      name: 'Young Mushrooms',
      duration: 6,
      hexPattern: [
        // Expanding mycelium
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Small mushrooms
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'stem' },
        // Caps
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.2, 
        nutrients: { N: 0.5, P: 1.5, K: 1 }, 
        sunlight: 1 // Still prefers low light
      }
    },
    {
      id: 2,
      name: 'Mature Mushrooms',
      duration: -1,
      hexPattern: [
        // Extensive mycelium network
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        // Multiple mushroom stalks
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'stem' },
        { offset: { q: 2, r: -1 }, height: 0, type: 'stem' },
        { offset: { q: -2, r: 2 }, height: 0, type: 'stem' },
        // Large caps
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.25, 
        nutrients: { N: 1, P: 2, K: 1 }, 
        sunlight: 1 
      },
      harvestYield: 20 // Many mushrooms
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 15, // New flush every 15 seconds
    depletesPlant: false
  }
};

// Herb plant definition - aromatic herbs
export const HERB_PLANT: PlantType = {
  id: 'herbs',
  name: 'Herb Garden',
  growthStages: [
    {
      id: 0,
      name: 'Herb Seedlings',
      duration: 5,
      hexPattern: [
        // Small root system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        // Tiny shoots
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' }
      ],
      requirements: { 
        water: 0.08, 
        nutrients: { N: 1.5, P: 1, K: 1.5 }, 
        sunlight: 3 
      }
    },
    {
      id: 1,
      name: 'Growing Herbs',
      duration: 10,
      hexPattern: [
        // Spreading roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        // Multiple herb stems
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'stem' },
        // Leafy growth
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.12, 
        nutrients: { N: 2, P: 1.5, K: 2 }, 
        sunlight: 4 
      }
    },
    {
      id: 2,
      name: 'Mature Herbs',
      duration: -1,
      hexPattern: [
        // Well-established roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Dense herb patch
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'stem' },
        { offset: { q: 2, r: -1 }, height: 0, type: 'stem' },
        { offset: { q: -2, r: 1 }, height: 0, type: 'stem' },
        // Bushy foliage
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -2 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.15, 
        nutrients: { N: 2.5, P: 2, K: 2.5 }, 
        sunlight: 5 
      },
      harvestYield: 8
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 25, // Can harvest herbs regularly
    depletesPlant: false
  }
};

// Pepper plant definition - spicy hot peppers
export const PEPPER_PLANT: PlantType = {
  id: 'pepper',
  name: 'Hot Pepper Plant',
  growthStages: [
    {
      id: 0,
      name: 'Pepper Seedling',
      duration: 8,
      hexPattern: [
        // Initial roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        // Small stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        // First leaves
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.08, 
        nutrients: { N: 1, P: 2, K: 2 }, // Needs phosphorus for fruit
        sunlight: 4 // Loves heat and sun
      }
    },
    {
      id: 1,
      name: 'Young Pepper Plant',
      duration: 12,
      hexPattern: [
        // Developing root system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Branching stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        // Spreading leaves
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.12, 
        nutrients: { N: 1.5, P: 3, K: 3 }, 
        sunlight: 5 
      }
    },
    {
      id: 2,
      name: 'Mature Pepper Plant',
      duration: -1,
      hexPattern: [
        // Strong root system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        // Multi-branched stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: -1, r: 0 }, height: 1, type: 'stem' },
        // Dense foliage with peppers
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: 1 }, height: 2, type: 'leaf' },
        { offset: { q: 3, r: -2 }, height: 2, type: 'leaf' },
        { offset: { q: -3, r: 3 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.15, 
        nutrients: { N: 2, P: 4, K: 4 }, 
        sunlight: 6 // Maximum sun
      },
      harvestYield: 15
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 20, // New peppers regularly
    depletesPlant: false
  }
};

// Eggplant plant definition - purple vegetables
export const EGGPLANT_PLANT: PlantType = {
  id: 'eggplant',
  name: 'Eggplant',
  growthStages: [
    {
      id: 0,
      name: 'Eggplant Seedling',
      duration: 10,
      hexPattern: [
        // Initial roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Sturdy stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        // Large first leaves
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.1, 
        nutrients: { N: 1.5, P: 2, K: 1.5 }, 
        sunlight: 3 
      }
    },
    {
      id: 1,
      name: 'Growing Eggplant',
      duration: 15,
      hexPattern: [
        // Expanding roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        // Thick stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        // Large leaves
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.18, 
        nutrients: { N: 2, P: 3, K: 2 }, 
        sunlight: 4 
      }
    },
    {
      id: 2,
      name: 'Mature Eggplant',
      duration: -1,
      hexPattern: [
        // Deep root system
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -2 }, height: -1, type: 'root' },
        // Thick woody stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 3, type: 'stem' },
        // Very large leaves
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 3, r: -2 }, height: 1, type: 'leaf' },
        { offset: { q: -3, r: 3 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: 1 }, height: 2, type: 'leaf' },
        { offset: { q: 2, r: -2 }, height: 2, type: 'leaf' },
        { offset: { q: -2, r: 1 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.25, 
        nutrients: { N: 3, P: 4, K: 3 }, 
        sunlight: 5 
      },
      harvestYield: 8
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 30, // Slower production
    depletesPlant: false
  }
};

// Crystal flower plant definition - mystical crystal flowers
export const CRYSTAL_FLOWER_PLANT: PlantType = {
  id: 'crystal_flower',
  name: 'Crystal Flower',
  growthStages: [
    {
      id: 0,
      name: 'Crystal Seed',
      duration: 12,
      hexPattern: [
        // Crystal-infused roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        // Crystal stem forming
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' }
      ],
      requirements: { 
        water: 0.05, // Low water needs
        nutrients: { N: 0.5, P: 1, K: 3 }, // Very high potassium
        sunlight: 2 // Can grow in low light
      }
    },
    {
      id: 1,
      name: 'Growing Crystal',
      duration: 18,
      hexPattern: [
        // Spreading crystal roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        // Crystal stem growing
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        // Crystal petals forming
        { offset: { q: 1, r: 0 }, height: 2, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 2, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 2, type: 'leaf' }
      ],
      requirements: { 
        water: 0.08, 
        nutrients: { N: 1, P: 2, K: 5 }, 
        sunlight: 2 
      }
    },
    {
      id: 2,
      name: 'Blooming Crystal',
      duration: -1,
      hexPattern: [
        // Crystalline root network
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        // Tall crystal stem
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 2, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 3, type: 'stem' },
        // Beautiful crystal flower
        { offset: { q: 1, r: 0 }, height: 3, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 3, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 3, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 3, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 3, type: 'leaf' },
        { offset: { q: 0, r: 1 }, height: 3, type: 'leaf' },
        { offset: { q: 0, r: 0 }, height: 4, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 4, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 4, type: 'leaf' }
      ],
      requirements: { 
        water: 0.1, 
        nutrients: { N: 1, P: 3, K: 6 }, // Extreme potassium
        sunlight: 3 
      },
      harvestYield: 5 // Rare crystals
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 60, // Very slow production
    depletesPlant: false
  }
};

// Glowberry plant definition - luminescent berries
export const GLOWBERRY_PLANT: PlantType = {
  id: 'glowberry',
  name: 'Glowberry Bush',
  growthStages: [
    {
      id: 0,
      name: 'Glowberry Sprout',
      duration: 6,
      hexPattern: [
        // Initial roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        // Small bush start
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.12, 
        nutrients: { N: 1, P: 1.5, K: 2 }, 
        sunlight: 0 // Grows in darkness
      }
    },
    {
      id: 1,
      name: 'Young Glowberry',
      duration: 10,
      hexPattern: [
        // Spreading roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        // Bush structure
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'stem' },
        // Glowing leaves
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.15, 
        nutrients: { N: 1.5, P: 2, K: 3 }, 
        sunlight: 0 
      }
    },
    {
      id: 2,
      name: 'Mature Glowberry',
      duration: -1,
      hexPattern: [
        // Extensive roots
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        // Full bush
        { offset: { q: 0, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'stem' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'stem' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'stem' },
        { offset: { q: 2, r: -1 }, height: 0, type: 'stem' },
        { offset: { q: -2, r: 2 }, height: 0, type: 'stem' },
        // Bioluminescent foliage
        { offset: { q: 0, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: -2, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 1, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: 2 }, height: 1, type: 'leaf' },
        { offset: { q: 0, r: -2 }, height: 1, type: 'leaf' }
      ],
      requirements: { 
        water: 0.2, 
        nutrients: { N: 2, P: 3, K: 4 }, 
        sunlight: 0 
      },
      harvestYield: 25 // Many berries
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 18,
    depletesPlant: false
  }
};

// Cave moss plant definition - spreads along ground
export const CAVE_MOSS_PLANT: PlantType = {
  id: 'cave_moss',
  name: 'Cave Moss',
  growthStages: [
    {
      id: 0,
      name: 'Moss Spores',
      duration: 3,
      hexPattern: [
        // Initial attachment
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        // Tiny moss patch
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' }
      ],
      requirements: { 
        water: 0.2, // Needs high humidity
        nutrients: { N: 0.2, P: 0.2, K: 0.2 }, // Very low nutrients
        sunlight: 0 // No light needed
      }
    },
    {
      id: 1,
      name: 'Spreading Moss',
      duration: 5,
      hexPattern: [
        // Spreading base
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        // Moss coverage
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'leaf' }
      ],
      requirements: { 
        water: 0.25, 
        nutrients: { N: 0.3, P: 0.3, K: 0.3 }, 
        sunlight: 0 
      }
    },
    {
      id: 2,
      name: 'Moss Carpet',
      duration: -1,
      hexPattern: [
        // Extensive coverage
        { offset: { q: 0, r: 0 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 0 }, height: -1, type: 'root' },
        { offset: { q: 0, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 0, r: 1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -2, r: 1 }, height: -1, type: 'root' },
        { offset: { q: 2, r: -1 }, height: -1, type: 'root' },
        { offset: { q: -1, r: -1 }, height: -1, type: 'root' },
        { offset: { q: 1, r: 1 }, height: -1, type: 'root' },
        // Thick moss carpet
        { offset: { q: 0, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 0 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: -2, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: 2, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: -1, r: -1 }, height: 0, type: 'leaf' },
        { offset: { q: 1, r: 1 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: -2 }, height: 0, type: 'leaf' },
        { offset: { q: 0, r: 2 }, height: 0, type: 'leaf' }
      ],
      requirements: { 
        water: 0.3, 
        nutrients: { N: 0.5, P: 0.5, K: 0.5 }, 
        sunlight: 0 
      },
      harvestYield: 10 // Can harvest moss
    }
  ],
  harvestBehavior: {
    type: 'continuous',
    interval: 40, // Slow regrowth
    depletesPlant: false
  }
};

export const PLANT_TYPES: Map<string, PlantType> = new Map([
  ['tomato', TOMATO_PLANT],
  ['wheat', WHEAT_PLANT],
  ['beans', BEAN_PLANT],
  ['potato', POTATO_PLANT],
  ['lettuce', LETTUCE_PLANT],
  ['carrot', CARROT_PLANT],
  ['mushroom', MUSHROOM_PLANT],
  ['herbs', HERB_PLANT],
  ['pepper', PEPPER_PLANT],
  ['eggplant', EGGPLANT_PLANT],
  ['crystal_flower', CRYSTAL_FLOWER_PLANT],
  ['glowberry', GLOWBERRY_PLANT],
  ['cave_moss', CAVE_MOSS_PLANT]
]);