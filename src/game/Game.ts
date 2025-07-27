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
import { InventorySystem } from '../inventory/InventorySystem';
import { FarmingActionWheel } from '../inventory/FarmingActions';
import { InventoryUI } from '../ui/InventoryUI';
import { SoilInventory } from '../inventory/SoilInventory';
import { SoilInventoryUI } from '../ui/SoilInventoryUI';
import { SoilItem, BIOME_SOILS } from '../items/SoilItem';
import { SoilPlacerTool } from '../tools/SoilPlacerTool';

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
  
  // Farming
  public readonly hexGrid: HexGrid;
  public readonly soilManager: SoilManager;
  
  // Inventory
  public readonly inventorySystem: InventorySystem;
  public readonly actionWheel: FarmingActionWheel;
  private inventoryUI: InventoryUI;
  public readonly soilInventory: SoilInventory;
  private soilInventoryUI: SoilInventoryUI;
  public readonly soilPlacerTool: SoilPlacerTool;
  
  // State
  public isInitialized = false;
  private animationsEnabled = true;
  public timeScale = 1;
  
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
    
    // Initialize player
    this.player = new Player();
    this.scene.add(this.player.mesh);
    this.playerController = new PlayerController(this.player);
    this.cameraController = new CameraController(camera);
    
    // Initialize farming
    this.hexGrid = new HexGrid(scene);
    this.soilManager = new SoilManager(scene);
    
    // Initialize inventory system
    this.inventorySystem = new InventorySystem();
    this.actionWheel = new FarmingActionWheel();
    this.inventoryUI = new InventoryUI(this.inventorySystem, this.actionWheel);
    
    // Initialize soil inventory
    this.soilInventory = new SoilInventory(8); // 8 slots for soil
    this.soilInventoryUI = new SoilInventoryUI(this.soilInventory);
    
    // Initialize soil placer tool
    this.soilPlacerTool = new SoilPlacerTool(
      this.soilInventory, 
      this.soilManager.getNutrientSystem()
    );
    
    // Connect soil placer tool to soil manager and UI
    this.soilPlacerTool.setSoilManager(this.soilManager);
    this.soilManager.setSoilPlacerTool(this.soilPlacerTool);
    this.soilInventoryUI.setSoilPlacerTool(this.soilPlacerTool);
    
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
    this.desert.update(this.player.position);
    if (this.animationsEnabled) {
      this.lighting.update(deltaTime);
    }
    perfEnd('world', worldStart);
    
    // Update farming
    const farmingStart = perfStart('farming');
    if (inputState.toggleGrid) {
      this.hexGrid.toggleVisibility();
    }
    
    // Handle inventory input
    this.handleInventoryInput(inputState);
    
    // Convert inventory/action to current tool for SoilManager
    const currentTool = this.getCurrentToolFromInventory();
    const activeAction = this.actionWheel.getActiveAction();
    const modifiedInputState = { 
      ...inputState, 
      currentTool,
      activeAction: activeAction ? activeAction.id : null
    };
    
    this.soilManager.update(modifiedInputState, this.camera);
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
    this.inventoryUI.update();
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
      <strong>Camera:</strong> ${this.cameraController.getMode()}
    `;
  }
  
  setAnimationsEnabled(enabled: boolean): void {
    this.animationsEnabled = enabled;
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
        // Add variety of test soils
        this.soilInventory.addSoil(new SoilItem(BIOME_SOILS.FERTILE_VALLEY, 2.5, "Test Valley"));
        this.soilInventory.addSoil(new SoilItem(BIOME_SOILS.ANCIENT_FOREST, 1.8, "Test Forest"));
        this.soilInventory.addSoil(new SoilItem(BIOME_SOILS.VOLCANIC_ASH, 3.2, "Test Volcano"));
        this.soilInventory.addSoil(new SoilItem(BIOME_SOILS.CRYSTAL_CAVES, 1.5, "Test Caves"));
        
        // Update UI
        this.soilInventoryUI.update();
        console.log('Added test soil to inventory!');
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
    // Number keys for inventory slots
    if (inputState.inventorySlot >= 0) {
      this.inventorySystem.setActiveSlot(inputState.inventorySlot);
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
    const activeItem = this.inventorySystem.getActiveItem();
    if (activeItem) {
      // Map item IDs to old tool system
      const itemToTool: { [key: string]: string } = {
        'watering_can': 'water',
        'shovel': 'place',
        'tomato_seeds': 'plant',
        'inspector': 'inspect',
        'barrier_tool': 'barrier',
        'soil_placer': 'soil_place'
      };
      
      // Handle uprooted plants
      if (activeItem.type === 'plant' && activeItem.id.startsWith('uprooted_')) {
        return 'plant'; // Use plant tool to replant
      }
      
      return itemToTool[activeItem.id] || 'place';
    }
    
    return 'place'; // Default tool
  }
}