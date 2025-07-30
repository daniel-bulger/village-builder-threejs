import * as THREE from 'three';
import { InputManager } from './InputManager';
import { TimeManager } from './TimeManager';
import { Player } from '../player/Player';
import { PlayerController } from '../player/PlayerController';
import { CameraController } from '../player/CameraController';
import { Desert } from '../world/Desert';
import { Lighting } from '../world/Lighting';
import { HexGrid } from '../farming/HexGrid';
import { SoilManager } from '../farming/SoilManager';
import { UnifiedInventorySystem } from '../inventory/UnifiedInventorySystem';
import { FarmingActionWheel } from '../inventory/FarmingActions';
import { UnifiedInventoryUI } from '../ui/UnifiedInventoryUI';
import { SoilItem, BIOME_SOILS } from '../items/SoilItem';
import { PortalWorld, BiomeType } from '../world/PortalWorld';
import { PortalManager } from '../world/PortalManager';
import { ItemType } from '../inventory/InventorySystem';

export class Game {
  // Core
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  
  // Managers
  public readonly inputManager: InputManager;
  private timeManager: TimeManager;
  
  // Player
  public readonly player: Player;
  private playerController: PlayerController;
  public readonly cameraController: CameraController;
  
  // World
  public readonly desert: Desert;
  public readonly lighting: Lighting;
  public readonly portalManager: PortalManager;
  
  // Farming
  public readonly hexGrid: HexGrid;
  public readonly soilManager: SoilManager;
  
  // Inventory
  public readonly unifiedInventorySystem: UnifiedInventorySystem;
  public readonly inventorySystem: UnifiedInventorySystem; // Alias for compatibility
  public readonly actionWheel: FarmingActionWheel;
  public readonly unifiedInventoryUI: UnifiedInventoryUI;
  
  // State
  public isInitialized = false;
  private animationsEnabled = true;
  public timeScale = 1;
  private isInPortalWorld = false;
  private portalWorld: PortalWorld | null = null;
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Initialize managers
    this.inputManager = new InputManager();
    this.timeManager = new TimeManager();
    
    // Initialize world
    this.desert = new Desert(scene);
    this.lighting = new Lighting(scene);
    this.portalManager = new PortalManager(scene);
    
    // Initialize player
    this.player = new Player();
    this.scene.add(this.player.mesh);
    this.playerController = new PlayerController(this.player);
    this.cameraController = new CameraController(camera);
    
    // Initialize farming
    this.hexGrid = new HexGrid(scene);
    this.soilManager = new SoilManager(scene);
    
    // Initialize inventory system
    this.unifiedInventorySystem = new UnifiedInventorySystem();
    this.inventorySystem = this.unifiedInventorySystem; // Alias for compatibility
    this.actionWheel = new FarmingActionWheel();
    this.unifiedInventoryUI = new UnifiedInventoryUI(this.unifiedInventorySystem);
    
    // Setup time controls
    this.setupTimeControls();
    
    this.isInitialized = true;
  }
  
  private performanceTimers: { [key: string]: number[] } = {};
  private performanceFrame = 0;
  
  update(): void {
    const perfStart = (name: string) => performance.now();
    const perfEnd = (name: string, start: number) => {
      const elapsed = performance.now() - start;
      if (!this.performanceTimers[name]) this.performanceTimers[name] = [];
      this.performanceTimers[name].push(elapsed);
    };
    
    // Update time
    const timeStart = perfStart('time');
    const deltaTime = this.timeManager.update() * this.timeScale;
    perfEnd('time', timeStart);
    
    // Update input
    const inputStart = perfStart('input');
    this.inputManager.update();
    const inputState = this.inputManager.getState();
    perfEnd('input', inputStart);
    
    // Update player
    const playerStart = perfStart('player');
    this.playerController.update(deltaTime, inputState, this.camera);
    perfEnd('player', playerStart);
    
    // Update camera
    const cameraStart = perfStart('camera');
    this.cameraController.update(this.player, inputState);
    perfEnd('camera', cameraStart);
    
    // Update world
    const worldStart = perfStart('world');
    
    if (this.isInPortalWorld && this.portalWorld) {
      // Update portal world
      this.portalWorld.update(deltaTime);
      
      // Check for interact key (E)
      if (inputState.interact) {
        // Check for exit portal first
        if (this.portalWorld.isNearExitPortal(this.player.position)) {
          this.exitPortalWorld();
        } else {
          // Try collections in order: soil, wild plants, seed pods
          let collected = false;
          
          // Check for soil collection
          const soilResult = this.portalWorld.collectSoilAt(this.player.position);
          if (soilResult.collected && soilResult.amount) {
            // Add soil to inventory
            const nutrients = this.portalWorld.getSoilNutrients();
            const soil = new SoilItem(nutrients, soilResult.amount, this.portalWorld.biomeType);
            const added = this.unifiedInventorySystem.addSoil(soil);
            if (added) {
              console.log(`Collected ${soilResult.amount} hexes of soil from ${this.portalWorld.biomeType}`);
            } else {
              console.log('Inventory full! Could not collect soil.');
            }
            collected = true;
          }
          
          // Check for wild plant seeds
          if (!collected) {
            const plantResult = this.portalWorld.collectSeedsFromPlant(this.player.position);
            if (plantResult.collected && plantResult.seedType && plantResult.seedCount) {
              const added = this.unifiedInventorySystem.addSeeds(plantResult.seedType, plantResult.seedCount);
              if (added) {
                console.log(`Collected ${plantResult.seedCount} ${plantResult.seedType}`);
              } else {
                console.log('Inventory full! Could not collect seeds.');
              }
              collected = true;
            }
          }
          
          // Check for seed pods
          if (!collected) {
            const podResult = this.portalWorld.collectSeedPod(this.player.position);
            if (podResult.collected && podResult.seedType && podResult.seedCount) {
              const added = this.unifiedInventorySystem.addSeeds(podResult.seedType, podResult.seedCount);
              if (added) {
                console.log(`Found ${podResult.seedCount} ${podResult.seedType} in seed pod`);
              } else {
                console.log('Inventory full! Could not collect seeds.');
              }
            }
          }
        }
      }
      
      // Check proximity for UI hints
      if (this.portalWorld.isNearSoilDeposit(this.player.position)) {
        console.log('[E] to collect soil');
      } else if (this.portalWorld.isNearWildPlant(this.player.position)) {
        console.log('[E] to collect seeds from plant');
      } else if (this.portalWorld.isNearSeedPod(this.player.position)) {
        console.log('[E] to pick up seed pod');
      }
      
      // Check if near water source
      const waterCheck = this.portalWorld.isNearWaterSource(this.player.position);
      if (waterCheck.isNear) {
        const activeItem = this.unifiedInventorySystem.getActiveItem();
        const isWateringCan = activeItem && activeItem.id === 'watering_can';
        
        if (isWateringCan) {
          const currentWater = activeItem.metadata?.waterAmount || 0;
          const maxCapacity = activeItem.metadata?.maxCapacity || 100000;
          
          // Show hint if can be refilled
          if (currentWater < maxCapacity) {
            console.log('[Right-click] to refill watering can');
            
            // Handle refill on right click
            if (inputState.mouseRight) {
              activeItem.metadata.waterAmount = maxCapacity;
              console.log('Watering can refilled to maximum capacity!');
              this.unifiedInventoryUI.update();
            }
          } else if (inputState.mouseRight) {
            console.log('Watering can is already full.');
          }
        } else if (inputState.mouseRight) {
          console.log('Equip watering can to collect water.');
        }
      }
    } else {
      // Update main world
      this.desert.update(this.player.position);
      if (this.animationsEnabled) {
        this.lighting.update(deltaTime);
      }
      
      // Update portals
      const currentDay = Math.floor(this.timeManager.getElapsedTime() / 86400); // 24 hours in seconds
      this.portalManager.update(deltaTime, this.lighting.getTimeOfDay(), currentDay, this.player.position);
      
      // Check for portal interaction
      if (inputState.interact && this.portalManager.isPlayerNearPortal(this.player.position)) {
        if (this.portalManager.canEnterPortal()) {
          this.enterPortal();
        }
      }
    }
    
    perfEnd('world', worldStart);
    
    // Handle inventory input (in both main world and portal worlds)
    this.handleInventoryInput(inputState);
    
    // Update farming (only in main world)
    const farmingStart = perfStart('farming');
    if (!this.isInPortalWorld) {
      if (inputState.toggleGrid) {
        this.hexGrid.toggleVisibility();
      }
      
      // Convert inventory/action to current tool for SoilManager
      const currentTool = this.getCurrentToolFromInventory();
      const activeAction = this.actionWheel.getActiveAction();
      const modifiedInputState = { 
        ...inputState, 
        currentTool,
        activeAction: activeAction ? activeAction.id : null
      };
      
      this.soilManager.update(modifiedInputState, this.camera);
    }
    perfEnd('farming', farmingStart);
    
    // Update water simulation
    if (this.animationsEnabled) {
      const waterStart = perfStart('water');
      const timeOfDay = this.lighting.getTimeOfDay();
      this.soilManager.setTimeOfDay(timeOfDay);
      this.soilManager.tickWater(deltaTime, timeOfDay);
      perfEnd('water', waterStart);
    }
    
    // Update UI
    const uiStart = perfStart('ui');
    this.updateInfoPanel();
    this.unifiedInventoryUI.update();
    perfEnd('ui', uiStart);
    
    // Log detailed performance every 120 frames
    this.performanceFrame++;
    if (this.performanceFrame % 120 === 0) {
      const report: { [key: string]: number } = {};
      let total = 0;
      
      for (const [name, times] of Object.entries(this.performanceTimers)) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        report[name] = avg;
        total += avg;
      }
      
      if (total > 16) { // Only log if slow
        console.log('Game subsystem performance:');
        for (const [name, avg] of Object.entries(report)) {
          if (avg > 1) { // Only show subsystems taking > 1ms
            console.log(`  ${name}: ${avg.toFixed(2)}ms`);
          }
        }
        console.log(`  Total: ${total.toFixed(2)}ms`);
      }
      
      // Reset
      this.performanceTimers = {};
    }
  }
  
  private updateInfoPanel(): void {
    const infoContent = document.getElementById('info-content');
    if (!infoContent) return;
    
    const time = this.lighting.getTimeOfDay();
    const hours = Math.floor(time * 24);
    const minutes = Math.floor((time * 24 - hours) * 60);
    
    // Get current tool/item
    const activeItem = this.inventorySystem.getActiveItem();
    const activeAction = this.actionWheel.getActiveAction();
    let toolDisplay = 'None';
    
    if (activeAction) {
      toolDisplay = activeAction.name;
    } else if (activeItem) {
      toolDisplay = activeItem.name;
      if (activeItem.stackable && activeItem.quantity > 1) {
        toolDisplay += ` (${activeItem.quantity})`;
      }
    }
    
    // Get water info
    const waterLevel = this.soilManager.getHoveredHexWaterLevel();
    const waterPercent = Math.round(waterLevel * 100);
    
    // Get nutrient info
    const nutrientInfo = this.soilManager.getHoveredHexNutrientInfo() || 'No soil';
    
    // Get portal info
    let portalInfo = 'None';
    
    if (this.isInPortalWorld && this.portalWorld) {
      // In portal world - show exit hint
      portalInfo = `<span style="color: #FF6B6B">In ${this.portalWorld.biomeType.replace('_', ' ')}</span>`;
      if (this.portalWorld.isNearExitPortal(this.player.position)) {
        portalInfo += ' <span style="color: #4CAF50">[E] Exit</span>';
      } else {
        portalInfo += ' <span style="color: #87CEEB">(Find blue portal)</span>';
      }
    } else {
      // In main world - show portal status
      const portal = this.portalManager.getActivePortal();
      if (portal) {
        const timeRemaining = Math.ceil(portal.getTimeRemaining());
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        portalInfo = `${portal.getBiomeType()} (${minutes}:${seconds.toString().padStart(2, '0')})`;
        
        // Add interaction hint if near portal
        if (this.portalManager.isPlayerNearPortal(this.player.position)) {
          portalInfo += ' <span style="color: #4CAF50">[E] Enter</span>';
        }
      }
    }
    
    infoContent.innerHTML = `
      <strong>Active:</strong> ${toolDisplay}<br>
      <strong>Time:</strong> ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}<br>
      <strong>Position:</strong> ${this.player.position.x.toFixed(1)}, ${this.player.position.z.toFixed(1)}<br>
      <strong>Soil Placed:</strong> ${this.soilManager.getSoilCount()}<br>
      <strong>Max Depth:</strong> ${this.soilManager.getMaxSoilDepth()} layers<br>
      <strong>Column Depth:</strong> ${this.soilManager.getHoveredDepth()} layers<br>
      <strong>Place at Y:</strong> ${this.soilManager.getPlacementHeight()}<br>
      <strong>Water Level:</strong> ${waterPercent}%<br>
      <strong>Nutrients:</strong> ${nutrientInfo}<br>
      <strong>Portal:</strong> ${portalInfo}<br>
      <strong>Camera:</strong> ${this.cameraController.getMode()}
    `;
  }
  
  setAnimationsEnabled(enabled: boolean): void {
    this.animationsEnabled = enabled;
  }
  
  getCurrentScene(): THREE.Scene {
    return this.isInPortalWorld && this.portalWorld ? this.portalWorld.scene : this.scene;
  }
  
  private setupTimeControls(): void {
    const jumpButton = document.getElementById('jump-to-morning');
    if (jumpButton) {
      jumpButton.addEventListener('click', () => {
        this.jumpToMorning();
      });
    }
    
    // Debug: Add test soil with 'T' key
    document.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') {
        // Add variety of test soils to unified inventory
        this.unifiedInventorySystem.addSoil(new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 2.5, "Test Valley"));
        this.unifiedInventorySystem.addSoil(new SoilItem(BIOME_SOILS.ANCIENT_FOREST, 1.8, "Test Forest"));
        this.unifiedInventorySystem.addSoil(new SoilItem(BIOME_SOILS.VOLCANIC_ASH, 3.2, "Test Volcano"));
        this.unifiedInventorySystem.addSoil(new SoilItem(BIOME_SOILS.CRYSTAL_CAVES, 1.5, "Test Caves"));
        
        // Update UI
        this.unifiedInventoryUI.update();
        console.log('Added test soil to inventory!');
      }
      
      // Debug: Spawn portal with 'P' key
      if (e.key === 'p' || e.key === 'P') {
        this.portalManager.forceSpawnPortal(this.player.position);
        console.log('Spawned test portal!');
      }
    });
  }
  
  private jumpToMorning(): void {
    // 6 AM is 0.25 (6/24) of the day
    const targetTime = 0.25;
    const currentTime = this.lighting.getTimeOfDay();
    
    // Calculate the shortest path to 6 AM
    // If we're past 6 AM, advance to tomorrow's 6 AM
    if (currentTime > targetTime) {
      // Advance to next day's 6 AM
      const timeToAdvance = 1 - currentTime + targetTime;
      this.lighting.setTimeOfDay(targetTime);
    } else {
      // Jump directly to 6 AM today
      this.lighting.setTimeOfDay(targetTime);
    }
    
    // Update the info panel immediately
    this.updateInfoPanel();
  }
  
  private handleInventoryInput(inputState: any): void {
    // Number keys for hotbar slots
    if (inputState.inventorySlot >= 0) {
      this.inventorySystem.setActiveHotbarSlot(inputState.inventorySlot);
    }
    
    // Tab to open action wheel
    if (inputState.toggleCamera) { // Reuse tab key
      this.actionWheel.toggle();
    }
    
    // Handle action hotkeys
    const actionKeys = ['R', 'H', 'U', 'B', 'G', 'V'];
    // This would need to be added to InputManager to check individual keys
  }
  
  private getCurrentToolFromInventory(): string {
    // First check if action wheel has an active action
    const activeAction = this.actionWheel.getActiveAction();
    if (activeAction) {
      // Map action IDs to old tool system
      const actionToTool: { [key: string]: string } = {
        'remove_soil': 'remove',
        'harvest': 'harvest',
        'uproot': 'harvest' // Use harvest tool for now
      };
      if (actionToTool[activeAction.id]) {
        return actionToTool[activeAction.id];
      }
    }
    
    // Otherwise check active inventory item
    const activeItem = this.unifiedInventorySystem.getActiveItem();
    if (activeItem) {
      // Handle soil items
      if (activeItem.type === ItemType.RESOURCE && activeItem.id.startsWith('soil_')) {
        return 'place_soil'; // New tool type for placing soil from inventory
      }
      
      // Handle seed items - check type instead of specific IDs
      if (activeItem.type === ItemType.SEED) {
        return 'plant'; // All seeds use the plant tool
      }
      
      // Map item IDs to old tool system
      const itemToTool: { [key: string]: string } = {
        'watering_can': 'water',
        'shovel': 'place',
        'inspector': 'inspect',
        'barrier_tool': 'barrier',
        'soil_placer': 'soil_place'
      };
      
      // Handle uprooted plants
      if (activeItem.type === ItemType.PLANT && activeItem.id.startsWith('uprooted_')) {
        return 'plant'; // Use plant tool to replant
      }
      
      return itemToTool[activeItem.id] || 'place';
    }
    
    return 'place'; // Default tool
  }
  
  private enterPortal(): void {
    const portal = this.portalManager.getActivePortal();
    if (!portal) return;
    
    const biomeType = portal.getBiomeType() as BiomeType;
    console.log(`Entering ${biomeType} portal...`);
    
    // Create portal world with its own scene
    this.portalWorld = new PortalWorld(biomeType);
    this.isInPortalWorld = true;
    
    // Move player to portal world spawn point
    this.player.position.set(0, 2, 5);
    
    // Add player mesh to portal world scene
    this.portalWorld.scene.add(this.player.mesh);
    
    // Move camera's parent group to portal world
    const cameraParent = this.camera.parent;
    if (cameraParent) {
      this.portalWorld.scene.add(cameraParent);
    }
  }
  
  private exitPortalWorld(): void {
    if (!this.portalWorld) return;
    
    console.log('Exiting portal world...');
    
    // Move player mesh back to main scene
    this.scene.add(this.player.mesh);
    
    // Move camera parent back to main scene
    const cameraParent = this.camera.parent;
    if (cameraParent) {
      this.scene.add(cameraParent);
    }
    
    // Return player to main world near portal
    const portal = this.portalManager.getActivePortal();
    if (portal) {
      const portalPos = portal.getPosition();
      this.player.position.set(portalPos.x + 3, 1, portalPos.z);
    } else {
      this.player.position.set(0, 1, 0);
    }
    
    // Clean up portal world
    this.portalWorld.dispose();
    this.portalWorld = null;
    this.isInPortalWorld = false;
  }
}