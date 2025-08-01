import * as THREE from 'three';
import { Villager } from './Villager';
import { VILLAGER_ARCHETYPES, VillagerArchetype, RecruitmentRequirements, GardenEvaluation } from './VillagerTypes';

export interface RecruitmentAttempt {
  villager: Villager;
  foodOffered: string;
  foodQuality: number;
  evaluation: GardenEvaluation;
  success: boolean;
  reason?: string;
}

export class VillagerManager {
  private scene: THREE.Scene;
  private villagers: Map<string, Villager> = new Map();
  private availableVillagers: Villager[] = []; // Villagers available for recruitment
  private nextVillagerId: number = 1;
  
  // Recruitment state
  private visitingVillager: Villager | null = null;
  private recruitmentInProgress: boolean = false;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.generateAvailableVillagers();
  }
  
  private generateAvailableVillagers(): void {
    // Generate a pool of potential villagers
    const archetypeKeys = Object.keys(VILLAGER_ARCHETYPES);
    
    // Create 2-3 of each archetype with variations
    archetypeKeys.forEach(key => {
      const archetype = VILLAGER_ARCHETYPES[key];
      const count = 2 + Math.floor(Math.random() * 2); // 2-3 of each
      
      for (let i = 0; i < count; i++) {
        const villager = this.createVillagerFromArchetype(archetype);
        this.availableVillagers.push(villager);
      }
    });
    
    console.log(`Generated ${this.availableVillagers.length} potential villagers`);
  }
  
  private createVillagerFromArchetype(archetype: VillagerArchetype): Villager {
    const id = `villager_${this.nextVillagerId++}`;
    const name = this.generateVillagerName(archetype);
    
    const villager = new Villager(archetype, id, name);
    
    // Add some random variations
    this.addPersonalityVariations(villager);
    
    // Position off-screen initially
    villager.state.position.set(1000, 0, 1000);
    villager.mesh.position.copy(villager.state.position);
    
    return villager;
  }
  
  private generateVillagerName(archetype: VillagerArchetype): string {
    const firstNames = {
      farmer: ['John', 'Mary', 'Tom', 'Sarah', 'Bob', 'Jane'],
      florist: ['Rose', 'Lily', 'Iris', 'Violet', 'Daisy', 'Flora'],
      chef: ['Gordon', 'Julia', 'Pierre', 'Maria', 'Wolfgang', 'Alice']
    };
    
    const lastNames = ['Smith', 'Johnson', 'Green', 'Baker', 'Miller', 'Gardner'];
    
    const firstNameList = firstNames[archetype.id] || firstNames.farmer;
    const firstName = firstNameList[Math.floor(Math.random() * firstNameList.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }
  
  private addPersonalityVariations(villager: Villager): void {
    // Randomly adjust requirements
    const requirements = villager.state.recruitmentRequirements;
    requirements.minimumFoodQuality += Math.floor(Math.random() * 3) - 1; // -1 to +1
    requirements.minimumBeautyScore += Math.floor(Math.random() * 20) - 10; // -10 to +10
    
    // Clamp values
    requirements.minimumFoodQuality = Math.max(1, Math.min(10, requirements.minimumFoodQuality));
    requirements.minimumBeautyScore = Math.max(0, Math.min(100, requirements.minimumBeautyScore));
    
    // Add random skill variations
    villager.state.skills.forEach((level, skill) => {
      const variation = Math.random() * 2 - 1; // -1 to +1
      villager.state.skills.set(skill, Math.max(0, Math.min(10, level + variation)));
    });
  }
  
  // Get list of villagers that might be interested in a specific food
  getInterestedVillagers(foodType: string, foodQuality: number): Villager[] {
    return this.availableVillagers.filter(villager => {
      const requirements = villager.state.recruitmentRequirements;
      
      // Check if food quality meets minimum
      if (foodQuality < requirements.minimumFoodQuality) {
        return false;
      }
      
      // Check if they have specific food requirements
      if (requirements.requiredFoodTypes && !requirements.requiredFoodTypes.includes(foodType)) {
        return false;
      }
      
      // Check if it's one of their favorite foods (bonus interest)
      if (villager.state.favoritePlants.includes(foodType)) {
        return true;
      }
      
      // General interest based on quality
      return foodQuality >= requirements.minimumFoodQuality + 2;
    });
  }
  
  // Start a recruitment attempt
  startRecruitment(foodType: string, foodQuality: number, garden: any): RecruitmentAttempt | null {
    if (this.recruitmentInProgress) {
      console.log("Recruitment already in progress!");
      return null;
    }
    
    const interestedVillagers = this.getInterestedVillagers(foodType, foodQuality);
    
    if (interestedVillagers.length === 0) {
      console.log("No villagers interested in this food");
      return null;
    }
    
    // Pick a random interested villager
    const villager = interestedVillagers[Math.floor(Math.random() * interestedVillagers.length)];
    
    console.log(`${villager.state.name} is interested in your ${foodType}!`);
    
    // Bring villager to the garden
    this.visitingVillager = villager;
    this.recruitmentInProgress = true;
    
    // Add villager to scene
    this.scene.add(villager.mesh);
    
    // Position at garden entrance
    villager.state.position.set(0, 0, 10);
    villager.mesh.position.copy(villager.state.position);
    
    // Evaluate the garden
    const evaluation = this.evaluateGarden(garden, villager);
    villager.state.lastGardenEvaluation = evaluation;
    
    // Determine success
    const requirements = villager.state.recruitmentRequirements;
    let success = true;
    let reason = "";
    
    if (evaluation.beautyScore < requirements.minimumBeautyScore) {
      success = false;
      reason = "Garden isn't beautiful enough";
    } else if (evaluation.varietyScore < requirements.requiredPlantVariety * 10) {
      success = false;
      reason = "Not enough plant variety";
    } else if (requirements.specialRequirements) {
      // Check special requirements
      // This would need to be implemented based on garden features
      const hasSpecialFeatures = false; // Placeholder
      if (!hasSpecialFeatures) {
        success = false;
        reason = "Missing special features: " + requirements.specialRequirements.join(", ");
      }
    }
    
    const attempt: RecruitmentAttempt = {
      villager,
      foodOffered: foodType,
      foodQuality,
      evaluation,
      success,
      reason
    };
    
    if (success) {
      this.recruitVillager(villager);
    } else {
      // Schedule villager to leave
      setTimeout(() => this.endRecruitment(), 5000);
    }
    
    return attempt;
  }
  
  private evaluateGarden(garden: any, villager: Villager): GardenEvaluation {
    // This would actually analyze the garden
    // For now, generate mock scores based on villager preferences
    
    const traits = villager.state.traits;
    let beautyScore = 50;
    let varietyScore = 50;
    let organizationScore = 50;
    let specialFeaturesScore = 30;
    
    // Adjust scores based on traits
    if (traits.includes('colorist')) {
      beautyScore += 20;
    }
    if (traits.includes('formalist')) {
      organizationScore += 20;
    }
    if (traits.includes('naturalist')) {
      beautyScore += 10;
      organizationScore -= 10;
    }
    
    // Random variations
    beautyScore += Math.random() * 20 - 10;
    varietyScore += Math.random() * 20 - 10;
    organizationScore += Math.random() * 20 - 10;
    
    // Clamp scores
    beautyScore = Math.max(0, Math.min(100, beautyScore));
    varietyScore = Math.max(0, Math.min(100, varietyScore));
    organizationScore = Math.max(0, Math.min(100, organizationScore));
    
    const overallScore = (beautyScore + varietyScore + organizationScore + specialFeaturesScore) / 4;
    
    return {
      overallScore,
      beautyScore,
      varietyScore,
      organizationScore,
      specialFeaturesScore,
      likes: this.generateLikes(villager, overallScore),
      dislikes: this.generateDislikes(villager, overallScore),
      suggestions: this.generateSuggestions(villager, beautyScore, varietyScore, organizationScore)
    };
  }
  
  private generateLikes(villager: Villager, score: number): string[] {
    const likes: string[] = [];
    
    if (score > 70) {
      likes.push("Overall very impressive!");
    }
    if (villager.state.traits.includes('colorist')) {
      likes.push("Love the color combinations");
    }
    if (villager.state.traits.includes('naturalist')) {
      likes.push("Nice natural feel");
    }
    
    return likes.length > 0 ? likes : ["It's a good start"];
  }
  
  private generateDislikes(villager: Villager, score: number): string[] {
    const dislikes: string[] = [];
    
    if (score < 30) {
      dislikes.push("Needs a lot of work");
    }
    if (villager.state.traits.includes('formalist')) {
      dislikes.push("Too chaotic for my taste");
    }
    if (villager.state.traits.includes('minimalist')) {
      dislikes.push("Too cluttered");
    }
    
    return dislikes;
  }
  
  private generateSuggestions(villager: Villager, beauty: number, variety: number, organization: number): string[] {
    const suggestions: string[] = [];
    
    if (beauty < 50) {
      suggestions.push("Add more flowers for color");
    }
    if (variety < 50) {
      suggestions.push("Try growing more plant varieties");
    }
    if (organization < 50) {
      suggestions.push("Organize plants in rows or patterns");
    }
    if (villager.state.traits.includes('colorist')) {
      suggestions.push("Group plants by color for impact");
    }
    
    return suggestions;
  }
  
  private recruitVillager(villager: Villager): void {
    console.log(`${villager.state.name} has joined your village!`);
    
    // Remove from available pool
    const index = this.availableVillagers.indexOf(villager);
    if (index > -1) {
      this.availableVillagers.splice(index, 1);
    }
    
    // Add to active villagers
    villager.state.isRecruited = true;
    this.villagers.set(villager.state.id, villager);
    
    // Assign a home location
    // This would find an available house or living space
    villager.state.homeHex = { q: 0, r: 0 }; // Placeholder
    
    // Set initial happiness boost
    villager.state.happiness = 75;
    
    this.endRecruitment();
  }
  
  private endRecruitment(): void {
    if (this.visitingVillager && !this.visitingVillager.state.isRecruited) {
      // Remove non-recruited villager from scene
      this.scene.remove(this.visitingVillager.mesh);
    }
    
    this.visitingVillager = null;
    this.recruitmentInProgress = false;
  }
  
  // Update all villagers
  update(deltaTime: number, timeOfDay: number): void {
    const currentHour = Math.floor(timeOfDay * 24);
    
    this.villagers.forEach(villager => {
      villager.update(deltaTime, currentHour);
    });
    
    // Update visiting villager if any
    if (this.visitingVillager && !this.visitingVillager.state.isRecruited) {
      this.visitingVillager.update(deltaTime, currentHour);
    }
  }
  
  // Get all active villagers
  getVillagers(): Villager[] {
    return Array.from(this.villagers.values());
  }
  
  // Get villager by ID
  getVillager(id: string): Villager | undefined {
    return this.villagers.get(id);
  }
  
  // Get recruitment status
  getRecruitmentStatus(): {
    inProgress: boolean;
    visitingVillager: Villager | null;
    availableCount: number;
    recruitedCount: number;
  } {
    return {
      inProgress: this.recruitmentInProgress,
      visitingVillager: this.visitingVillager,
      availableCount: this.availableVillagers.length,
      recruitedCount: this.villagers.size
    };
  }
  
  dispose(): void {
    this.villagers.forEach(villager => {
      this.scene.remove(villager.mesh);
      villager.dispose();
    });
    
    this.availableVillagers.forEach(villager => {
      villager.dispose();
    });
    
    if (this.visitingVillager) {
      this.scene.remove(this.visitingVillager.mesh);
      this.visitingVillager.dispose();
    }
  }
}