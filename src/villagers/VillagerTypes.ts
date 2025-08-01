import { HexCoord } from '../utils/HexUtils';

// Personality traits that affect preferences
export enum PersonalityTrait {
  // Aesthetic preferences
  NATURALIST = 'naturalist',        // Prefers wild, natural gardens
  FORMALIST = 'formalist',          // Prefers organized, symmetrical gardens
  COLORIST = 'colorist',            // Values vibrant color combinations
  MINIMALIST = 'minimalist',        // Prefers simple, clean designs
  
  // Food preferences
  GOURMET = 'gourmet',              // Values rare/exotic foods
  TRADITIONALIST = 'traditionalist', // Prefers common, hearty foods
  VEGETARIAN = 'vegetarian',        // Only impressed by vegetables
  SWEET_TOOTH = 'sweet_tooth',      // Loves fruits and sweet plants
  
  // Social traits
  SOCIAL = 'social',                // Happier with more villagers nearby
  HERMIT = 'hermit',                // Prefers isolation
  MENTOR = 'mentor',                // Enjoys teaching others
  STUDENT = 'student'               // Eager to learn new skills
}

// Skills villagers can have
export enum VillagerSkill {
  FARMING = 'farming',
  WATERING = 'watering',
  HARVESTING = 'harvesting',
  PLANTING = 'planting',
  COMPOSTING = 'composting',
  LANDSCAPING = 'landscaping',
  COOKING = 'cooking',
  TRADING = 'trading'
}

// Villager mood/satisfaction levels
export enum VillagerMood {
  ECSTATIC = 'ecstatic',
  HAPPY = 'happy',
  CONTENT = 'content',
  NEUTRAL = 'neutral',
  UNHAPPY = 'unhappy',
  MISERABLE = 'miserable'
}

// Requirements for recruiting a villager
export interface RecruitmentRequirements {
  // Minimum food quality/rarity to get their attention
  minimumFoodQuality: number; // 1-10 scale
  requiredFoodTypes?: string[]; // Specific foods they want
  
  // Beauty requirements
  minimumBeautyScore: number; // 0-100
  requiredPlantVariety: number; // Minimum different plant types
  requiredOrnamentalPlants: number; // Minimum decorative plants
  
  // Special requirements
  specialRequirements?: string[]; // e.g., "water_feature", "flower_garden"
}

// What a villager thinks about your garden
export interface GardenEvaluation {
  overallScore: number; // 0-100
  beautyScore: number;
  varietyScore: number;
  organizationScore: number;
  specialFeaturesScore: number;
  
  likes: string[]; // Things they particularly enjoyed
  dislikes: string[]; // Things that put them off
  suggestions: string[]; // Improvements they'd like to see
}

// Core villager data
export interface VillagerState {
  id: string;
  name: string;
  age: number;
  
  // Personality
  traits: PersonalityTrait[];
  favoriteColors: string[];
  favoritePlants: string[];
  
  // Skills and abilities
  skills: Map<VillagerSkill, number>; // Skill level 0-10
  currentTask: VillagerTask | null;
  
  // Status
  mood: VillagerMood;
  happiness: number; // 0-100
  energy: number; // 0-100
  hunger: number; // 0-100
  
  // Location
  position: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  homeHex: HexCoord | null;
  
  // Recruitment
  isRecruited: boolean;
  recruitmentRequirements: RecruitmentRequirements;
  lastGardenEvaluation: GardenEvaluation | null;
  
  // Relationships
  relationships: Map<string, number>; // villagerID -> relationship strength (-100 to 100)
  
  // Work preferences
  preferredTasks: VillagerSkill[];
  dislikedTasks: VillagerSkill[];
  
  // Schedule
  schedule: DailySchedule;
}

// Tasks villagers can perform
export interface VillagerTask {
  type: VillagerSkill;
  targetHex?: HexCoord;
  targetPlantId?: string;
  progress: number; // 0-1
  priority: number; // 1-10
}

// Daily schedule for villagers
export interface DailySchedule {
  wakeTime: number; // 0-24
  workStart: number;
  lunchTime: number;
  workEnd: number;
  socialTime: number;
  bedTime: number;
}

// Villager appearance customization
export interface VillagerAppearance {
  hairColor: string;
  skinTone: string;
  clothingStyle: 'farmer' | 'noble' | 'merchant' | 'scholar' | 'artist';
  clothingColor: string;
  accessories: string[];
  height: number; // 0.8-1.2 multiplier
  build: 'slim' | 'average' | 'stocky';
}

// Dialog options when talking to villagers
export interface VillagerDialog {
  greeting: string[];
  idle: string[];
  working: string[];
  happy: string[];
  unhappy: string[];
  recruitment: string[];
  rejection: string[];
  gardenComments: string[];
}

// Configuration for different villager archetypes
export interface VillagerArchetype {
  id: string;
  name: string;
  description: string;
  
  baseTraits: PersonalityTrait[];
  baseSkills: Partial<Record<VillagerSkill, number>>;
  
  recruitmentRequirements: RecruitmentRequirements;
  
  appearance: Partial<VillagerAppearance>;
  dialog: VillagerDialog;
}

// Pre-defined villager archetypes
export const VILLAGER_ARCHETYPES: Record<string, VillagerArchetype> = {
  FARMER: {
    id: 'farmer',
    name: 'Farmer',
    description: 'A hardworking farmer who values productivity',
    baseTraits: [PersonalityTrait.TRADITIONALIST, PersonalityTrait.NATURALIST],
    baseSkills: {
      [VillagerSkill.FARMING]: 5,
      [VillagerSkill.PLANTING]: 4,
      [VillagerSkill.HARVESTING]: 4
    },
    recruitmentRequirements: {
      minimumFoodQuality: 3,
      minimumBeautyScore: 30,
      requiredPlantVariety: 5,
      requiredOrnamentalPlants: 0
    },
    appearance: {
      clothingStyle: 'farmer'
    },
    dialog: {
      greeting: ["Hello there!", "Good day for farming!"],
      idle: ["The soil looks rich today.", "Wonder if it'll rain..."],
      working: ["Almost done here.", "This'll grow nicely."],
      happy: ["Best harvest yet!", "Love what you've done with the place!"],
      unhappy: ["Could use more water here.", "Plants looking a bit sad."],
      recruitment: ["Show me what you're growing!", "Let me see your fields."],
      rejection: ["Not enough variety for my taste.", "Call me when you have a real farm."],
      gardenComments: ["Nice rows!", "Could use some organization.", "Healthy looking crops!"]
    }
  },
  
  FLORIST: {
    id: 'florist',
    name: 'Florist',
    description: 'A flower enthusiast who prizes beauty above all',
    baseTraits: [PersonalityTrait.COLORIST, PersonalityTrait.FORMALIST],
    baseSkills: {
      [VillagerSkill.LANDSCAPING]: 6,
      [VillagerSkill.PLANTING]: 3
    },
    recruitmentRequirements: {
      minimumFoodQuality: 5,
      minimumBeautyScore: 70,
      requiredPlantVariety: 8,
      requiredOrnamentalPlants: 5,
      specialRequirements: ['flower_garden']
    },
    appearance: {
      clothingStyle: 'artist'
    },
    dialog: {
      greeting: ["Oh, what lovely colors!", "Flowers make everything better!"],
      idle: ["I should arrange a bouquet.", "The morning dew on petals..."],
      working: ["Perfect spot for roses!", "This will bloom beautifully."],
      happy: ["Your garden is a masterpiece!", "Such wonderful arrangements!"],
      unhappy: ["Needs more flowers.", "The color balance is off."],
      recruitment: ["I heard you have a garden?", "Show me your flowers!"],
      rejection: ["Not enough beauty here.", "Come back when you have a real flower garden."],
      gardenComments: ["Love the color combinations!", "Try grouping by height.", "Gorgeous blooms!"]
    }
  },
  
  CHEF: {
    id: 'chef',
    name: 'Chef',
    description: 'A culinary expert seeking the finest ingredients',
    baseTraits: [PersonalityTrait.GOURMET, PersonalityTrait.SOCIAL],
    baseSkills: {
      [VillagerSkill.COOKING]: 8,
      [VillagerSkill.HARVESTING]: 3
    },
    recruitmentRequirements: {
      minimumFoodQuality: 7,
      requiredFoodTypes: ['tomato', 'herbs', 'pepper'],
      minimumBeautyScore: 40,
      requiredPlantVariety: 10,
      requiredOrnamentalPlants: 2
    },
    appearance: {
      clothingStyle: 'merchant',
      accessories: ['chef_hat']
    },
    dialog: {
      greeting: ["Ah, a fellow food lover!", "Something smells delicious!"],
      idle: ["I need fresh ingredients.", "Time to create a new recipe."],
      working: ["Selecting only the finest.", "This will be exquisite!"],
      happy: ["Your produce is exceptional!", "I can work wonders with these!"],
      unhappy: ["The quality is lacking.", "I need better ingredients."],
      recruitment: ["I hear you grow gourmet ingredients?", "Show me your best produce!"],
      rejection: ["Not impressed with the selection.", "I need higher quality ingredients."],
      gardenComments: ["Excellent variety!", "These herbs are perfect!", "Could use more exotic plants."]
    }
  }
};