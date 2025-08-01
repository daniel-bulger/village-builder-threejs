import * as THREE from 'three';
import { VillagerState, VillagerMood, VillagerSkill, VillagerTask, PersonalityTrait, VillagerArchetype, GardenEvaluation, DailySchedule, VillagerAppearance } from './VillagerTypes';
import { HexCoord } from '../utils/HexUtils';

export class Villager {
  public state: VillagerState;
  public mesh: THREE.Group;
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  
  // Animation state
  private walkCycle: number = 0;
  private isMoving: boolean = false;
  private moveSpeed: number = 2; // units per second
  
  // AI state
  private thinkTimer: number = 0;
  private thinkInterval: number = 2; // Think every 2 seconds
  
  constructor(archetype: VillagerArchetype, id: string, name: string) {
    // Initialize state from archetype
    this.state = {
      id,
      name,
      age: Math.floor(Math.random() * 30) + 20, // 20-50 years old
      
      traits: [...archetype.baseTraits],
      favoriteColors: this.generateFavoriteColors(archetype.baseTraits),
      favoritePlants: this.generateFavoritePlants(archetype.baseTraits),
      
      skills: new Map(Object.entries(archetype.baseSkills) as [VillagerSkill, number][]),
      currentTask: null,
      
      mood: VillagerMood.NEUTRAL,
      happiness: 50,
      energy: 100,
      hunger: 0,
      
      position: new THREE.Vector3(),
      targetPosition: null,
      homeHex: null,
      
      isRecruited: false,
      recruitmentRequirements: archetype.recruitmentRequirements,
      lastGardenEvaluation: null,
      
      relationships: new Map(),
      
      preferredTasks: this.getPreferredTasks(archetype.baseSkills),
      dislikedTasks: [],
      
      schedule: this.generateSchedule(archetype.baseTraits)
    };
    
    // Create visual representation
    this.mesh = new THREE.Group();
    this.createVillagerMesh(archetype.appearance || {});
  }
  
  private createVillagerMesh(appearance: Partial<VillagerAppearance>): void {
    // Simple stylized villager
    const height = 1.6 * (appearance.height || 1);
    
    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, height * 0.6, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.getClothingColor(appearance.clothingStyle || 'farmer', appearance.clothingColor)
    });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = height * 0.3;
    this.mesh.add(this.bodyMesh);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 6);
    const skinColor = this.getSkinColor(appearance.skinTone);
    const headMaterial = new THREE.MeshStandardMaterial({ color: skinColor });
    this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
    this.headMesh.position.y = height * 0.75;
    this.mesh.add(this.headMesh);
    
    // Hair
    const hairGeometry = new THREE.SphereGeometry(0.28, 8, 4);
    const hairMaterial = new THREE.MeshStandardMaterial({ 
      color: appearance.hairColor || this.getRandomHairColor()
    });
    const hairMesh = new THREE.Mesh(hairGeometry, hairMaterial);
    hairMesh.position.y = height * 0.8;
    hairMesh.scale.y = 0.7;
    this.mesh.add(hairMesh);
    
    // Arms (simple cylinders)
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, height * 0.4);
    const armMaterial = new THREE.MeshStandardMaterial({ color: skinColor });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.35, height * 0.4, 0);
    leftArm.rotation.z = 0.2;
    this.mesh.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.35, height * 0.4, 0);
    rightArm.rotation.z = -0.2;
    this.mesh.add(rightArm);
    
    // Add a name tag
    this.createNameTag();
  }
  
  private createNameTag(): void {
    // This would ideally use a sprite or CSS2D renderer
    // For now, we'll skip the actual text rendering
    // In a real implementation, you'd create a floating name above the villager
  }
  
  private getClothingColor(style: string, customColor?: string): string {
    if (customColor) return customColor;
    
    const styleColors = {
      farmer: '#8B4513', // Brown
      noble: '#4B0082',  // Indigo
      merchant: '#2E8B57', // Sea green
      scholar: '#483D8B', // Dark slate blue
      artist: '#FF69B4'  // Hot pink
    };
    
    return styleColors[style] || '#888888';
  }
  
  private getSkinColor(tone?: string): string {
    const tones = ['#FFE4C4', '#F5DEB3', '#D2691E', '#8B4513', '#654321'];
    return tone || tones[Math.floor(Math.random() * tones.length)];
  }
  
  private getRandomHairColor(): string {
    const colors = ['#000000', '#654321', '#8B4513', '#D2691E', '#FFD700', '#DC143C'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  private generateFavoriteColors(traits: PersonalityTrait[]): string[] {
    const colors: string[] = [];
    
    if (traits.includes(PersonalityTrait.COLORIST)) {
      colors.push('#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF');
    }
    if (traits.includes(PersonalityTrait.NATURALIST)) {
      colors.push('#228B22', '#8B4513', '#87CEEB', '#F0E68C');
    }
    if (traits.includes(PersonalityTrait.MINIMALIST)) {
      colors.push('#FFFFFF', '#000000', '#808080');
    }
    
    return colors.length > 0 ? colors : ['#00FF00', '#FFFF00']; // Default: green and yellow
  }
  
  private generateFavoritePlants(traits: PersonalityTrait[]): string[] {
    const plants: string[] = [];
    
    if (traits.includes(PersonalityTrait.GOURMET)) {
      plants.push('truffle', 'saffron', 'rare_orchid');
    }
    if (traits.includes(PersonalityTrait.TRADITIONALIST)) {
      plants.push('tomato', 'potato', 'carrot');
    }
    if (traits.includes(PersonalityTrait.SWEET_TOOTH)) {
      plants.push('strawberry', 'glowberry', 'melon');
    }
    
    return plants.length > 0 ? plants : ['tomato']; // Default
  }
  
  private getPreferredTasks(skills: Partial<Record<VillagerSkill, number>>): VillagerSkill[] {
    return Object.entries(skills)
      .filter(([_, level]) => level! >= 4)
      .map(([skill, _]) => skill as VillagerSkill);
  }
  
  private generateSchedule(traits: PersonalityTrait[]): DailySchedule {
    const isEarlyBird = traits.includes(PersonalityTrait.TRADITIONALIST);
    const isSocial = traits.includes(PersonalityTrait.SOCIAL);
    
    return {
      wakeTime: isEarlyBird ? 5 : 7,
      workStart: isEarlyBird ? 6 : 8,
      lunchTime: 12,
      workEnd: 17,
      socialTime: isSocial ? 18 : 19,
      bedTime: isEarlyBird ? 21 : 23
    };
  }
  
  // Update villager state and behavior
  update(deltaTime: number, currentHour: number): void {
    // Update needs (energy, hunger)
    this.updateNeeds(deltaTime);
    
    // Update mood based on needs and environment
    this.updateMood();
    
    // AI thinking
    this.thinkTimer += deltaTime;
    if (this.thinkTimer >= this.thinkInterval) {
      this.think(currentHour);
      this.thinkTimer = 0;
    }
    
    // Movement
    if (this.targetPosition) {
      this.moveTowardsTarget(deltaTime);
    }
    
    // Task execution
    if (this.state.currentTask) {
      this.executeTask(deltaTime);
    }
    
    // Animation
    this.updateAnimation(deltaTime);
  }
  
  private updateNeeds(deltaTime: number): void {
    // Energy decreases over time, faster when working
    const energyDrain = this.state.currentTask ? 2 : 1;
    this.state.energy = Math.max(0, this.state.energy - energyDrain * deltaTime);
    
    // Hunger increases over time
    this.state.hunger = Math.min(100, this.state.hunger + 1.5 * deltaTime);
  }
  
  private updateMood(): void {
    const avgNeed = (this.state.energy + (100 - this.state.hunger) + this.state.happiness) / 3;
    
    if (avgNeed >= 80) this.state.mood = VillagerMood.ECSTATIC;
    else if (avgNeed >= 70) this.state.mood = VillagerMood.HAPPY;
    else if (avgNeed >= 50) this.state.mood = VillagerMood.CONTENT;
    else if (avgNeed >= 30) this.state.mood = VillagerMood.NEUTRAL;
    else if (avgNeed >= 15) this.state.mood = VillagerMood.UNHAPPY;
    else this.state.mood = VillagerMood.MISERABLE;
  }
  
  private think(currentHour: number): void {
    if (!this.state.isRecruited) return;
    
    // Check schedule
    const schedule = this.state.schedule;
    
    if (currentHour >= schedule.bedTime || currentHour < schedule.wakeTime) {
      // Go home to sleep
      this.setTask(null);
      this.goHome();
    } else if (currentHour >= schedule.workStart && currentHour < schedule.lunchTime) {
      // Morning work
      if (!this.state.currentTask) {
        this.findWork();
      }
    } else if (currentHour >= schedule.lunchTime && currentHour < schedule.lunchTime + 1) {
      // Lunch break
      this.setTask(null);
      this.state.hunger = Math.max(0, this.state.hunger - 50);
    } else if (currentHour >= schedule.lunchTime + 1 && currentHour < schedule.workEnd) {
      // Afternoon work
      if (!this.state.currentTask) {
        this.findWork();
      }
    } else if (currentHour >= schedule.socialTime) {
      // Social time
      this.socialize();
    }
  }
  
  private findWork(): void {
    // This would interface with the game's task system
    // For now, just wander around
    this.wander();
  }
  
  private socialize(): void {
    // Find other villagers to talk to
    // For now, just stand still
    this.targetPosition = null;
  }
  
  private goHome(): void {
    if (this.state.homeHex) {
      // Convert hex to world position and go there
      // For now, just go to origin
      this.targetPosition = new THREE.Vector3(0, 0, 0);
    }
  }
  
  private wander(): void {
    // Pick a random nearby location
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 10;
    this.targetPosition = new THREE.Vector3(
      this.state.position.x + Math.cos(angle) * distance,
      this.state.position.y,
      this.state.position.z + Math.sin(angle) * distance
    );
  }
  
  private moveTowardsTarget(deltaTime: number): void {
    if (!this.targetPosition) return;
    
    const direction = new THREE.Vector3()
      .subVectors(this.targetPosition, this.state.position)
      .normalize();
    
    const distance = this.state.position.distanceTo(this.targetPosition);
    const moveDistance = Math.min(this.moveSpeed * deltaTime, distance);
    
    this.state.position.add(direction.multiplyScalar(moveDistance));
    this.mesh.position.copy(this.state.position);
    
    // Face direction of movement
    if (moveDistance > 0.01) {
      this.mesh.lookAt(this.targetPosition);
      this.isMoving = true;
    }
    
    // Reached target
    if (distance < 0.1) {
      this.targetPosition = null;
      this.isMoving = false;
    }
  }
  
  private executeTask(deltaTime: number): void {
    if (!this.state.currentTask) return;
    
    // Progress task
    this.state.currentTask.progress += deltaTime * 0.1; // 10 seconds per task
    
    if (this.state.currentTask.progress >= 1) {
      // Task complete
      this.completeTask();
    }
  }
  
  private completeTask(): void {
    if (!this.state.currentTask) return;
    
    // Gain skill experience
    const skill = this.state.currentTask.type;
    const currentLevel = this.state.skills.get(skill) || 0;
    if (currentLevel < 10) {
      this.state.skills.set(skill, currentLevel + 0.1);
    }
    
    // Gain happiness from completing tasks
    this.state.happiness = Math.min(100, this.state.happiness + 5);
    
    this.state.currentTask = null;
  }
  
  private updateAnimation(deltaTime: number): void {
    if (this.isMoving) {
      // Simple walk animation
      this.walkCycle += deltaTime * 5;
      const bounce = Math.sin(this.walkCycle) * 0.05;
      this.mesh.position.y = this.state.position.y + Math.abs(bounce);
      
      // Slight body rotation
      this.bodyMesh.rotation.z = Math.sin(this.walkCycle) * 0.1;
    } else {
      // Idle animation
      this.walkCycle += deltaTime;
      const breathe = Math.sin(this.walkCycle * 0.5) * 0.02;
      this.headMesh.position.y = 0.75 + breathe;
    }
  }
  
  // Public methods
  setTask(task: VillagerTask | null): void {
    this.state.currentTask = task;
    if (task && task.targetHex) {
      // Move to task location
      // This would convert hex to world position
    }
  }
  
  evaluateGarden(garden: any): GardenEvaluation {
    // This would analyze the garden and return an evaluation
    // For now, return a mock evaluation
    return {
      overallScore: 50,
      beautyScore: 40,
      varietyScore: 60,
      organizationScore: 45,
      specialFeaturesScore: 30,
      likes: ["Nice variety of plants", "Good use of space"],
      dislikes: ["Could use more flowers", "Paths would be nice"],
      suggestions: ["Add a water feature", "Group plants by color"]
    };
  }
  
  dispose(): void {
    // Clean up Three.js resources
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}