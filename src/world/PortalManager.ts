import * as THREE from 'three';
import { Portal, PortalConfig } from './Portal';

export class PortalManager {
  private scene: THREE.Scene;
  private activePortal: Portal | null = null;
  private lastPortalDay: number = -1;
  private portalSpawnTime: number = 0.25; // 6 AM (0.25 of a day)
  private portalDuration: number = 300; // 5 minutes in seconds
  
  // Portal spawn configuration
  private minSpawnDistance: number = 20;
  private maxSpawnDistance: number = 50;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  public setVisible(visible: boolean): void {
    if (this.activePortal) {
      this.activePortal.mesh.visible = visible;
    }
  }
  
  update(deltaTime: number, timeOfDay: number, currentDay: number, playerPosition: THREE.Vector3): void {
    // Update active portal
    if (this.activePortal) {
      this.activePortal.update(deltaTime);
      
      // Remove portal if it's no longer active
      if (this.activePortal.getTimeRemaining() <= 0) {
        this.removeActivePortal();
      }
    }
    
    // Check if we should spawn a new portal
    if (this.shouldSpawnPortal(timeOfDay, currentDay)) {
      this.spawnDailyPortal(playerPosition);
    }
  }
  
  private shouldSpawnPortal(timeOfDay: number, currentDay: number): boolean {
    // Only spawn one portal per day at the designated time
    if (currentDay <= this.lastPortalDay) return false;
    if (this.activePortal !== null) return false;
    
    // Check if we're within spawn window (6 AM ± 15 minutes)
    const spawnWindow = 0.01; // ~15 minutes in day units
    return Math.abs(timeOfDay - this.portalSpawnTime) < spawnWindow;
  }
  
  private spawnDailyPortal(playerPosition: THREE.Vector3): void {
    // Remove any existing portal
    this.removeActivePortal();
    
    // Choose random biome type
    const biomeTypes: PortalConfig['biomeType'][] = [
      'fertile_valley',
      'ancient_forest', 
      'volcanic_ash',
      'crystal_caves'
    ];
    const biomeType = biomeTypes[Math.floor(Math.random() * biomeTypes.length)];
    
    // Calculate spawn position
    const angle = Math.random() * Math.PI * 2;
    const distance = this.minSpawnDistance + Math.random() * (this.maxSpawnDistance - this.minSpawnDistance);
    
    const spawnPosition = new THREE.Vector3(
      playerPosition.x + Math.cos(angle) * distance,
      0, // Always spawn at ground level
      playerPosition.z + Math.sin(angle) * distance
    );
    
    // Create portal configuration
    const config: PortalConfig = {
      biomeType,
      position: spawnPosition,
      duration: this.portalDuration
    };
    
    // Create and add portal
    this.activePortal = new Portal(config);
    this.scene.add(this.activePortal.mesh);
    
    // Update last portal day
    this.lastPortalDay = Math.floor(this.getCurrentDay());
    
    console.log(`Portal spawned: ${biomeType} at (${spawnPosition.x.toFixed(1)}, ${spawnPosition.z.toFixed(1)})`);
  }
  
  private removeActivePortal(): void {
    if (this.activePortal) {
      this.scene.remove(this.activePortal.mesh);
      this.activePortal.dispose();
      this.activePortal = null;
    }
  }
  
  getActivePortal(): Portal | null {
    return this.activePortal;
  }
  
  isPlayerNearPortal(playerPosition: THREE.Vector3): boolean {
    if (!this.activePortal) return false;
    return this.activePortal.isPlayerNearby(playerPosition);
  }
  
  canEnterPortal(): boolean {
    if (!this.activePortal) return false;
    return this.activePortal.canEnter();
  }
  
  // Helper to calculate current day from time
  private getCurrentDay(): number {
    // This would typically come from a time manager
    // For now, return 0
    return 0;
  }
  
  // Force spawn a portal for testing
  forceSpawnPortal(playerPosition: THREE.Vector3, biomeType?: PortalConfig['biomeType']): void {
    const types: PortalConfig['biomeType'][] = [
      'fertile_valley',
      'ancient_forest', 
      'volcanic_ash',
      'crystal_caves'
    ];
    
    const selectedBiome = biomeType || types[Math.floor(Math.random() * types.length)];
    
    const config: PortalConfig = {
      biomeType: selectedBiome,
      position: new THREE.Vector3(
        playerPosition.x + 10,
        0,
        playerPosition.z + 10
      ),
      duration: this.portalDuration
    };
    
    this.removeActivePortal();
    this.activePortal = new Portal(config);
    this.scene.add(this.activePortal.mesh);
    
    console.log(`Force spawned portal: ${selectedBiome}`);
  }
}