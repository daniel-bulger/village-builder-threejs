import * as THREE from 'three';
import { HexUtils, HexCoord, HexCoord3D } from '../utils/HexUtils';
import { SubHexUtils } from '../utils/SubHexUtils';
import { Constants } from '../utils/Constants';
import { InputState } from '../game/InputManager';
import { WaterSimulation, SoilType } from './WaterSimulation';
import { PlantSimulation } from './PlantSimulation';
import { PlantRenderer } from './PlantRenderer';
import { PlantInspectorUI } from '../ui/PlantInspectorUI';
import { PLANT_TYPES } from './PlantTypes';
import { OrganicPlantSimulation } from './OrganicPlantSimulation';
import { OrganicPlantRenderer } from './OrganicPlantRenderer';
import { OrganicPlantInspectorUI } from '../ui/OrganicPlantInspectorUI';
import { ORGANIC_TOMATO } from './OrganicGrowthSystem';
import { NutrientSystem } from './NutrientSystem';
import { SoilInspectorUI } from '../ui/SoilInspectorUI';

class SoilHex {
  public readonly mesh: THREE.Mesh;
  
  constructor(public readonly coord: HexCoord3D, public readonly soilType: SoilType = SoilType.Loam) {
    // Create soil mesh using shared geometry
    const geometry = HexUtils.createHexGeometry(Constants.HEX_HEIGHT);
    const color = soilType === SoilType.Barrier ? Constants.BARRIER_COLOR : Constants.SOIL_COLOR;
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: soilType === SoilType.Barrier ? 0.3 : 0.95, // Barriers are smoother
      metalness: soilType === SoilType.Barrier ? 0.1 : 0
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Position in world with height
    const worldPos = HexUtils.hexToWorld(coord);
    this.mesh.position.copy(worldPos);
    this.mesh.position.y = coord.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT / 2;
  }
  
  dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}

export class SoilManager {
  private soilHexes: Map<string, SoilHex> = new Map(); // key is "q,r,y"
  private soilColumns: Map<string, number> = new Map(); // key is "q,r", value is max height
  private edgeBarrierMeshes: Map<string, THREE.Mesh> = new Map(); // key is edge barrier key
  private placementPreview!: THREE.Mesh;
  private subHexPreview!: THREE.Mesh; // Preview for sub-hex placement
  private edgePreview: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private hoveredHex: HexCoord | null = null;
  private hoveredWorldPos: THREE.Vector3 | null = null; // Store actual world position for sub-hex placement
  private hoveredEdge: {hex1: HexCoord3D, hex2: HexCoord3D} | null = null; // Edge between two hexes
  private lastHoveredKey: string | null = null;
  private lastInspectedHex: string | null = null; // Track last inspected hex to avoid redundant updates
  private hoveredY: number = 0;
  private targetY: number = 0; // Manual height override
  private useManualHeight: boolean = false;
  private hasScrolled: boolean = false;
  private mouseWasDown = false;
  private mouseRightWasDown = false;
  private waterSimulation: WaterSimulation;
  private nutrientSystem: NutrientSystem;
  private plantSimulation: PlantSimulation;
  private plantRenderer: PlantRenderer;
  private organicPlantSimulation: OrganicPlantSimulation;
  private organicPlantRenderer: OrganicPlantRenderer;
  private selectedPlantType: string = 'tomato'; // Default plant type
  private plantInspectorUI: PlantInspectorUI;
  private organicPlantInspectorUI: OrganicPlantInspectorUI;
  private soilInspectorUI: SoilInspectorUI;
  private inspectedPlantId: string | null = null;
  private inspectedPlantType: 'regular' | 'organic' | null = null;
  private tempInspectorPos: THREE.Vector3 = new THREE.Vector3(); // Reusable vector for inspector
  private soilVisible: boolean = true;
  private soilPlacerTool: any = null; // Reference to soil placer tool
  
  constructor(private scene: THREE.Scene) {
    this.createPreviewHex();
    this.createSubHexPreview();
    this.waterSimulation = new WaterSimulation();
    this.nutrientSystem = new NutrientSystem();
    this.plantSimulation = new PlantSimulation(this.waterSimulation);
    this.plantSimulation.setNutrientSystem(this.nutrientSystem);
    this.plantSimulation.setOnNutrientsChanged(() => this.updateSoilColors());
    this.plantRenderer = new PlantRenderer(this.scene);
    this.organicPlantSimulation = new OrganicPlantSimulation(this.waterSimulation);
    this.organicPlantRenderer = new OrganicPlantRenderer(this.scene);
    this.plantInspectorUI = new PlantInspectorUI();
    this.organicPlantInspectorUI = new OrganicPlantInspectorUI();
    this.soilInspectorUI = new SoilInspectorUI();
    
    // Register organic plant types
    this.organicPlantSimulation.registerPlantType(ORGANIC_TOMATO);
  }
  
  private createPreviewHex(): void {
    const geometry = HexUtils.createHexGeometry(Constants.HEX_HEIGHT);
    const material = new THREE.MeshBasicMaterial({
      color: Constants.PREVIEW_VALID_COLOR,
      opacity: Constants.PREVIEW_OPACITY,
      transparent: true,
      depthWrite: false
    });
    
    this.placementPreview = new THREE.Mesh(geometry, material);
    this.placementPreview.visible = false;
    this.placementPreview.position.y = Constants.HEX_HEIGHT / 2 + 0.01; // Slightly above
    this.scene.add(this.placementPreview);
  }
  
  private createSubHexPreview(): void {
    const geometry = SubHexUtils.createSubHexGeometry(Constants.HEX_HEIGHT);
    const material = new THREE.MeshBasicMaterial({
      color: Constants.PREVIEW_VALID_COLOR,
      opacity: Constants.PREVIEW_OPACITY,
      transparent: true,
      depthWrite: false
    });
    
    this.subHexPreview = new THREE.Mesh(geometry, material);
    this.subHexPreview.visible = false;
    this.scene.add(this.subHexPreview);
  }
  
  update(input: InputState, camera: THREE.Camera): void {
    // Handle soil visibility toggle
    if (input.toggleSoilVisibility) {
      this.toggleSoilVisibility();
    }
    
    // Update nutrient system
    const deltaTime = 1/60; // Assume 60 FPS for now
    this.nutrientSystem.naturalRecovery(deltaTime);
    
    // Update soil colors based on nutrients
    this.updateSoilColors();
    
    
    // Handle scroll wheel for height adjustment ONLY when shift is held
    if (input.scrollDelta !== 0 && this.hoveredHex && input.shift) {
      const columnKey = HexUtils.hexToKey(this.hoveredHex);
      const columnHeight = this.soilColumns.get(columnKey);
      const maxHeight = columnHeight === undefined ? -1 : columnHeight;
      
      // Shift + scroll adjusts relative to current column (old behavior)
      // For barriers, allow going to -1 to place bottom barriers
      const minY = input.currentTool === 'barrier' ? -1 : 0;
      const oldTargetY = this.targetY;
      this.targetY = Math.max(minY, Math.min(maxHeight + 1, this.targetY - input.scrollDelta));
      this.useManualHeight = false;
      this.hasScrolled = true; // Mark that user has scrolled
      
    }
    
    // Update preview position
    this.updatePreview(input.mousePosition, camera, input);
    
    // Update soil placer preview if in soil place mode
    if (input.currentTool === 'soil_place' && this.hoveredWorldPos && this.hoveredHex && this.soilPlacerTool) {
      const hex3D: HexCoord3D = { ...this.hoveredHex, y: this.hoveredY };
      // Convert normalized mouse position to screen coordinates
      const screenX = (input.mousePosition.x + 1) * 0.5 * window.innerWidth;
      const screenY = (-input.mousePosition.y + 1) * 0.5 * window.innerHeight;
      this.soilPlacerTool.showPreview(hex3D, screenX, screenY);
    } else if (this.soilPlacerTool) {
      this.soilPlacerTool.hidePreview();
    }
    
    // Update plant/soil inspector if in inspect mode
    if (input.currentTool === 'inspect' && this.hoveredWorldPos && this.hoveredHex) {
      const hex3D: HexCoord3D = { ...this.hoveredHex, y: this.hoveredY };
      const hex3DKey = HexUtils.hex3DToKey(hex3D);
      
      // Always update inspector to catch different plants in same hex
      this.updateInspector(hex3D, this.hoveredWorldPos, input.mousePosition);
    } else {
      if (this.inspectedPlantId !== null || this.lastInspectedHex !== null) {
        this.plantInspectorUI.hide();
        this.organicPlantInspectorUI.hide();
        this.soilInspectorUI.hide();
        this.inspectedPlantId = null;
        this.inspectedPlantType = null;
        this.lastInspectedHex = null;
      }
    }
    
    // Handle placement/removal - only on initial mouse press
    if (this.hoveredHex) {
      const hex3D: HexCoord3D = { ...this.hoveredHex, y: this.hoveredY };
      
      // Handle tool actions on left click (only if inventory/action wheel is not open)
      const game = (window as any).game;
      const inventoryOpen = game?.unifiedInventoryUI?.isInventoryOpen?.() || false;
      const actionWheelOpen = game?.actionWheel?.isActionWheelVisible?.() || false;
      if (input.mouseLeft && !this.mouseWasDown && !inventoryOpen && !actionWheelOpen) {
        if (input.currentTool === 'place') {
          this.placeSoil(hex3D);
        } else if (input.currentTool === 'remove') {
          this.removeSoil(hex3D);
        } else if (input.currentTool === 'water') {
          this.waterSoil(hex3D);
        } else if (input.currentTool === 'plant') {
          this.plantSeed(hex3D, this.hoveredWorldPos!);
        } else if (input.currentTool === 'harvest') {
          // Check if we're uprooting or harvesting based on the active action
          const activeAction = input.activeAction;
          if (activeAction === 'uproot') {
            this.uprootPlant(hex3D, this.hoveredWorldPos!);
          } else {
            this.harvestPlant(hex3D, this.hoveredWorldPos!);
          }
        } else if (input.currentTool === 'inspect') {
          this.inspectPlant(hex3D, this.hoveredWorldPos!);
        } else if (input.currentTool === 'organic') {
          this.plantOrganicSeed(hex3D, this.hoveredWorldPos!);
        } else if (input.currentTool === 'soil_place') {
          this.handleSoilPlacement(hex3D, input);
        } else if (input.currentTool === 'place_soil') {
          this.placeSoilFromInventory(hex3D);
        }
      }
      
      // Also handle right click for quick remove (regardless of selected tool)
      if (input.mouseRight && !this.mouseRightWasDown) {
        this.removeSoil(hex3D);
      }
    }
    
    // Handle edge barrier placement separately (only if inventory/action wheel is not open)
    const game = (window as any).game;
    const inventoryOpen = game?.unifiedInventoryUI?.isInventoryOpen?.() || false;
    const actionWheelOpen = game?.actionWheel?.isActionWheelVisible?.() || false;
    if (input.currentTool === 'barrier' && this.hoveredEdge && input.mouseLeft && !this.mouseWasDown && !inventoryOpen && !actionWheelOpen) {
      this.toggleEdgeBarrier(this.hoveredEdge);
    }
    
    // Track mouse button states for next frame
    this.mouseWasDown = input.mouseLeft;
    this.mouseRightWasDown = input.mouseRight;
  }
  
  private updatePreview(mousePos: { x: number; y: number }, camera: THREE.Camera, input: InputState): void {
    // Cast ray from camera through mouse position
    this.raycaster.setFromCamera(
      new THREE.Vector2(mousePos.x, mousePos.y),
      camera
    );
    
    // Find intersections with ground plane and existing soil
    const soilMeshes = Array.from(this.soilHexes.values()).map(hex => hex.mesh);
    const targets = [
      this.scene.getObjectByName('ground-plane') || this.createGroundPlane(),
      ...soilMeshes
    ];
    
    const intersects = this.raycaster.intersectObjects(targets, false);
    
    if (intersects.length > 0) {
      const worldPos = intersects[0].point;
      let hexCoord = HexUtils.worldToHex(worldPos);
      
      // Store the actual world position for sub-hex placement
      this.hoveredWorldPos = worldPos.clone();
      
      // For barrier tool, determine the Y level
      if (input.currentTool === 'barrier') {
        // Let the normal scroll logic below handle the Y level
        // This allows barrier placement to use scroll wheel like other tools
      }
      
      this.hoveredHex = hexCoord;
      
      // Determine Y level based on what we hit
      const columnKey = HexUtils.hexToKey(hexCoord);
      
      // Reset scroll state when moving to a different hex
      if (columnKey !== this.lastHoveredKey) {
        if (this.hasScrolled) {
        }
        this.hasScrolled = false;
        this.useManualHeight = false;
        this.lastHoveredKey = columnKey;
      }
      
      const currentHeight = this.soilColumns.get(columnKey);
      const actualHeight = currentHeight === undefined ? -1 : currentHeight;
      
      // Auto-update target height based on what we're pointing at
      // But only if user hasn't scrolled or isn't in manual mode
      if (!this.useManualHeight && !this.hasScrolled) {
        const hitSoil = intersects[0].object !== this.scene.getObjectByName('ground-plane');
        
        if (hitSoil) {
          // For place tool, go on top. For remove/water/barrier, stay at current level
          if (input.currentTool === 'place') {
            this.targetY = actualHeight + 1;
          } else {
            // For remove/water/barrier tools, target the actual soil level
            this.targetY = actualHeight;
          }
        } else {
          // Place at ground when pointing at ground
          // For barriers, default to 0 but allow scrolling to -1
          this.targetY = 0;
        }
      }
      
      // Now apply the target height (whether from scroll or auto-detect)
      if (this.useManualHeight) {
        // Manual mode: can place anywhere up to limit
        this.hoveredY = this.targetY;
      } else {
        // Normal mode: can only place on ground or adjacent to existing soil
        // But if user has scrolled, respect their targetY choice
        if (this.hasScrolled) {
          this.hoveredY = this.targetY;
        } else if (input.currentTool === 'barrier' && this.targetY === -1) {
          this.hoveredY = -1;
        } else {
          this.hoveredY = Math.min(this.targetY, actualHeight + 1);
        }
      }
      
      // For edge barriers, detect shared edge between hexes AFTER targetY is set
      if (input.currentTool === 'barrier') {
        this.hoveredEdge = this.detectSharedEdge(worldPos, hexCoord);
      } else {
        this.hoveredEdge = null;
      }
      
      // Update preview position
      const snapPos = HexUtils.hexToWorld(hexCoord);
      
      
      // For plant tools, show sub-hex preview instead
      if (input.currentTool === 'plant' || input.currentTool === 'organic') {
        // Convert world position to sub-hex
        const subHex = SubHexUtils.worldToSubHex(worldPos);
        const subHexWorldPos = SubHexUtils.subHexToWorld(subHex);
        
        this.subHexPreview.position.x = subHexWorldPos.x;
        this.subHexPreview.position.z = subHexWorldPos.z;
        this.subHexPreview.position.y = this.hoveredY * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT / 2 + 0.01;
        
        this.placementPreview.visible = false;
        this.subHexPreview.visible = true;
      } else {
        this.placementPreview.position.x = snapPos.x;
        this.placementPreview.position.z = snapPos.z;
        this.placementPreview.position.y = this.hoveredY * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT / 2 + 0.01;
        
        this.placementPreview.visible = true;
        this.subHexPreview.visible = false;
      }
      
      // For edge barriers, show edge preview instead of hex preview
      if (input.currentTool === 'barrier' && this.hoveredEdge) {
        this.placementPreview.visible = false;
        this.subHexPreview.visible = false;
        this.updateEdgePreview(this.hoveredEdge);
      } else if (input.currentTool === 'barrier') {
        // Hide all previews when no edge is detected
        this.placementPreview.visible = false;
        this.subHexPreview.visible = false;
        if (this.edgePreview) {
          this.edgePreview.visible = false;
        }
      } else if (input.currentTool === 'plant') {
        // Plant tool is handled above
        if (this.edgePreview) {
          this.edgePreview.visible = false;
        }
      } else {
        this.placementPreview.visible = true;
        this.subHexPreview.visible = false;
        if (this.edgePreview) {
          this.edgePreview.visible = false;
        }
      }
      
      // Update preview color based on tool and validity
      const hex3DKey = HexUtils.hex3DToKey({ ...hexCoord, y: this.hoveredY });
      const hexExists = this.soilHexes.has(hex3DKey);
      
      if (input.currentTool === 'plant' || input.currentTool === 'organic') {
        // Update sub-hex preview color
        if (this.subHexPreview.material instanceof THREE.MeshBasicMaterial) {
          let canPlant = false;
          let color = Constants.PREVIEW_INVALID_COLOR;
          
          if (input.currentTool === 'plant') {
            canPlant = hexExists && this.plantSimulation.canPlantAt(worldPos, this.selectedPlantType);
            color = canPlant ? 0x00ff00 : Constants.PREVIEW_INVALID_COLOR; // Green for valid plant spot
          } else if (input.currentTool === 'organic') {
            // For organic plants, just check if there's soil
            canPlant = hexExists;
            color = canPlant ? 0x00ff88 : Constants.PREVIEW_INVALID_COLOR; // Teal for organic
          }
          
          this.subHexPreview.material.color.setHex(color);
        }
      } else if (this.placementPreview.material instanceof THREE.MeshBasicMaterial) {
        let color: number = Constants.PREVIEW_VALID_COLOR;
        
        if (input.currentTool === 'place') {
          color = hexExists ? Constants.PREVIEW_INVALID_COLOR : Constants.PREVIEW_VALID_COLOR;
        } else if (input.currentTool === 'remove') {
          color = hexExists ? 0xff0000 : Constants.PREVIEW_INVALID_COLOR; // Red for remove
        } else if (input.currentTool === 'water') {
          color = hexExists ? 0x0099ff : Constants.PREVIEW_INVALID_COLOR; // Blue for water
        } else if (input.currentTool === 'harvest') {
          color = hexExists ? 0xffa500 : Constants.PREVIEW_INVALID_COLOR; // Orange for harvest
        } else if (input.currentTool === 'barrier') {
          // Edge barriers don't use hex preview
          color = 0x808080;
        } else if (input.currentTool === 'inspect') {
          color = hexExists ? 0x9400d3 : Constants.PREVIEW_INVALID_COLOR; // Purple for inspect
        } else if (input.currentTool === 'organic') {
          color = hexExists ? 0x00ff88 : Constants.PREVIEW_INVALID_COLOR; // Teal for organic
        } else if (input.currentTool === 'soil_place') {
          color = hexExists ? 0x8B4513 : Constants.PREVIEW_INVALID_COLOR; // Brown for soil placement
        } else if (input.currentTool === 'place_soil') {
          color = !hexExists ? 0x8B4513 : Constants.PREVIEW_INVALID_COLOR; // Brown for soil from inventory
        }
        
        this.placementPreview.material.color.setHex(color);
      }
    } else {
      this.placementPreview.visible = false;
      this.subHexPreview.visible = false;
      this.hoveredHex = null;
      this.hoveredWorldPos = null;
      this.hoveredY = 0;
    }
  }
  
  private createGroundPlane(): THREE.Mesh {
    // Create an invisible ground plane for raycasting
    const geometry = new THREE.PlaneGeometry(10000, 10000);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ 
      visible: false,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.name = 'ground-plane';
    this.scene.add(plane);
    return plane;
  }
  
  // Detect which edge between hexes the mouse is hovering over
  private detectSharedEdge(worldPos: THREE.Vector3, centerHex: HexCoord): {hex1: HexCoord3D, hex2: HexCoord3D} | null {
    // Get all 6 neighbors
    const neighbors = HexUtils.getNeighbors(centerHex);
    
    let closestEdge: {hex1: HexCoord3D, hex2: HexCoord3D} | null = null;
    let closestDistance = Infinity;
    
    // Check each neighboring hex
    for (let i = 0; i < 6; i++) {
      const neighbor = neighbors[i];
      
      // Get world positions
      const centerPos = HexUtils.hexToWorld(centerHex);
      const neighborPos = HexUtils.hexToWorld(neighbor);
      
      // Calculate edge midpoint
      const edgeMidpoint = new THREE.Vector3(
        (centerPos.x + neighborPos.x) / 2,
        worldPos.y,
        (centerPos.z + neighborPos.z) / 2
      );
      
      // Distance from mouse to edge midpoint
      const distance = new THREE.Vector2(
        worldPos.x - edgeMidpoint.x,
        worldPos.z - edgeMidpoint.z
      ).length();
      
      if (distance < closestDistance) {
        closestDistance = distance;
        
        // Use the scrolled Y level (targetY) for barrier placement
        const centerY = this.targetY;
        const neighborY = this.targetY; // Barriers are placed at the same Y level
        
        closestEdge = {
          hex1: { ...centerHex, y: centerY },
          hex2: { ...neighbor, y: neighborY }
        };
      }
    }
    
    // Also check vertical edges (top/bottom)
    const hexY = this.targetY; // Use scrolled height
    const hexCenter = HexUtils.hexToWorld(centerHex);
    const centerDist = new THREE.Vector2(
      worldPos.x - hexCenter.x,
      worldPos.z - hexCenter.z
    ).length();
    
    // If close to center, consider vertical edges
    if (centerDist < Constants.HEX_SIZE * 0.5) {
      // Use shift key to determine top vs bottom
      // Or use mouse Y position relative to the target Y level
      const targetWorldY = hexY * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT / 2;
      const worldY = worldPos.y;
      
      if (worldY < targetWorldY) {
        // Bottom edge
        closestEdge = {
          hex1: { ...centerHex, y: hexY },
          hex2: { ...centerHex, y: hexY - 1 }
        };
        closestDistance = centerDist; // Update distance for vertical edge
      } else {
        // Top edge
        closestEdge = {
          hex1: { ...centerHex, y: hexY },
          hex2: { ...centerHex, y: hexY + 1 }
        };
        closestDistance = centerDist; // Update distance for vertical edge
      }
    }
    
    // Only return an edge if we're close enough
    // For horizontal edges: within 40% of hex size
    // For vertical edges: within 50% of hex size (already checked above)
    if (closestEdge) {
      // Check if it's a vertical edge
      const isVertical = closestEdge.hex1.q === closestEdge.hex2.q && 
                        closestEdge.hex1.r === closestEdge.hex2.r;
      if (isVertical) {
        return closestEdge; // Already checked distance for vertical edges
      } else {
        return closestDistance < Constants.HEX_SIZE * 0.4 ? closestEdge : null;
      }
    }
    return null;
  }
  
  // Get the highest hex at a given q,r coordinate
  private getHighestHexAt(coord: HexCoord): number {
    const columnKey = HexUtils.hexToKey(coord);
    const height = this.soilColumns.get(columnKey);
    // Return 0 for ground level instead of -1 when no soil exists
    // This allows barriers to be placed on empty sand
    return height !== undefined ? height : 0;
  }
  
  placeSoil(hexCoord: HexCoord3D): boolean {
    const hex3DKey = HexUtils.hex3DToKey(hexCoord);
    
    if (this.soilHexes.has(hex3DKey)) {
      return false; // Already has soil at this position
    }
    
    // Check if we can place here (must be on ground or on top of existing soil)
    const columnKey = HexUtils.hexToKey(hexCoord);
    const currentHeight = this.soilColumns.get(columnKey);
    
    const expectedHeight = currentHeight === undefined ? 0 : currentHeight + 1;
    if (hexCoord.y !== expectedHeight) {
      return false; // Can't place in mid-air
    }
    
    const soil = new SoilHex(hexCoord);
    this.soilHexes.set(hex3DKey, soil);
    this.scene.add(soil.mesh);
    
    // Update column height
    this.soilColumns.set(columnKey, hexCoord.y);
    
    // Add to water simulation (default to loam soil)
    this.waterSimulation.addHex(hexCoord, SoilType.Loam);
    
    // Add to nutrient system with default 50% N-P-K
    this.nutrientSystem.addHex(hexCoord);
    
    // Set initial color based on nutrients (dry soil)
    if (soil.mesh.material instanceof THREE.MeshStandardMaterial) {
      const nutrientColor = this.nutrientSystem.getNutrientColor(hexCoord);
      soil.mesh.material.color = nutrientColor;
      soil.mesh.material.needsUpdate = true;
    }
    
    return true;
  }
  
  removeSoil(hexCoord: HexCoord3D): boolean {
    const hex3DKey = HexUtils.hex3DToKey(hexCoord);
    const soil = this.soilHexes.get(hex3DKey);
    
    if (!soil) {
      // If no soil at exact position, try to remove top of column
      const columnKey = HexUtils.hexToKey(hexCoord);
      const topHeight = this.soilColumns.get(columnKey);
      
      if (topHeight !== undefined && topHeight >= 0) {
        const topHex: HexCoord3D = { ...hexCoord, y: topHeight };
        const topKey = HexUtils.hex3DToKey(topHex);
        const topSoil = this.soilHexes.get(topKey);
        
        if (topSoil) {
          this.scene.remove(topSoil.mesh);
          topSoil.dispose();
          this.soilHexes.delete(topKey);
          
          // Update column height
          if (topHeight === 0) {
            this.soilColumns.delete(columnKey);
          } else {
            this.soilColumns.set(columnKey, topHeight - 1);
          }
          
          // Remove from water and nutrient systems
          this.waterSimulation.removeHex(topHex);
          this.nutrientSystem.removeHex(topHex);
          
          return true;
        }
      }
      
      return false;
    }
    
    // Can only remove if it's the top of the column
    const columnKey = HexUtils.hexToKey(hexCoord);
    const topHeight = this.soilColumns.get(columnKey);
    
    if (topHeight !== hexCoord.y) {
      return false; // Can't remove soil with soil above it
    }
    
    this.scene.remove(soil.mesh);
    soil.dispose();
    this.soilHexes.delete(hex3DKey);
    
    // Remove from water and nutrient systems
    this.waterSimulation.removeHex(hexCoord);
    this.nutrientSystem.removeHex(hexCoord);
    
    // Update column height
    if (hexCoord.y === 0) {
      this.soilColumns.delete(columnKey);
    } else {
      this.soilColumns.set(columnKey, hexCoord.y - 1);
    }
    
    return true;
  }
  
  placeSoilAt(hexCoord: HexCoord): boolean {
    // For compatibility, place at ground level
    return this.placeSoil({ ...hexCoord, y: 0 });
  }
  
  canPlaceSoilAt(coord: HexCoord3D): boolean {
    const hex3DKey = HexUtils.hex3DToKey(coord);
    
    // Check if soil already exists at this position
    if (this.soilHexes.has(hex3DKey)) {
      return false;
    }
    
    // Check if we can place here (must be on ground or on top of existing soil)
    const columnKey = HexUtils.hexToKey(coord);
    const currentHeight = this.soilColumns.get(columnKey);
    
    const expectedHeight = currentHeight === undefined ? 0 : currentHeight + 1;
    return coord.y === expectedHeight;
  }
  
  getSoilCount(): number {
    return this.soilHexes.size;
  }
  
  getMaxSoilDepth(): number {
    let maxDepth = 0;
    for (const height of this.soilColumns.values()) {
      maxDepth = Math.max(maxDepth, height + 1);
    }
    return maxDepth;
  }
  
  getHoveredDepth(): number {
    if (!this.hoveredHex) return 0;
    const columnKey = HexUtils.hexToKey(this.hoveredHex);
    const height = this.soilColumns.get(columnKey);
    return height === undefined ? 0 : height + 1;
  }
  
  getPlacementHeight(): number {
    return this.hoveredY;
  }
  
  getHoveredHexWaterLevel(): number {
    if (!this.hoveredHex) return 0;
    const coord3D = { ...this.hoveredHex, y: this.hoveredY };
    return this.waterSimulation.getSaturation(coord3D);
  }
  
  getHoveredHexWaterInfo(): string | null {
    if (!this.hoveredHex) return null;
    const coord3D = { ...this.hoveredHex, y: this.hoveredY };
    const info = this.waterSimulation.getWaterInfo(coord3D);
    if (!info) return null;
    
    const waterL = info.waterML / 1000;
    const capacityL = info.capacityML / 1000;
    const percentage = (info.saturation * 100).toFixed(1);
    
    return `${info.soilType}: ${waterL.toFixed(1)}/${capacityL.toFixed(1)}L (${percentage}%)`;
  }
  
  isPreviewVisible(): boolean {
    return this.placementPreview.visible;
  }
  
  getPreviewPosition(): THREE.Vector3 {
    return this.placementPreview.position.clone();
  }
  
  getPreviewColor(): number {
    if (this.placementPreview.material instanceof THREE.MeshBasicMaterial) {
      return this.placementPreview.material.color.getHex();
    }
    return 0;
  }
  
  // Update visual representation based on water saturation
  public updateWaterVisuals(): void {
    for (const [, soilHex] of this.soilHexes) {
      // Skip barriers - they don't change appearance when wet
      if (soilHex.soilType === SoilType.Barrier) {
        continue;
      }
      
      const saturation = this.waterSimulation.getSaturation(soilHex.coord);
      
      // Update soil appearance based on saturation
      if (soilHex.mesh.material instanceof THREE.MeshStandardMaterial) {
        // Get the base color from nutrients
        const baseColor = this.nutrientSystem.getNutrientColor(soilHex.coord);
        
        // Create wet version of the nutrient color (darker)
        const wetColor = baseColor.clone();
        wetColor.multiplyScalar(0.3); // Make it much darker when wet
        
        // Interpolate between nutrient color and wet version
        soilHex.mesh.material.color.lerpColors(baseColor, wetColor, saturation);
        soilHex.mesh.material.roughness = 0.95 - (saturation * 0.5); // Less rough when wet
      }
    }
  }
  
  // Get water simulation for external access
  // Update soil colors based on nutrient levels
  public updateSoilColors(): void {
    // Don't update colors directly anymore - let updateWaterVisuals handle the combined effect
    // Just trigger a water visual update which will incorporate nutrient colors
    this.updateWaterVisuals();
  }
  
  getWaterSimulation(): WaterSimulation {
    return this.waterSimulation;
  }
  
  getNutrientSystem(): NutrientSystem {
    return this.nutrientSystem;
  }
  
  // Tick the water simulation and plants
  tickWater(deltaTime: number, timeOfDay: number = 0.5): void {
    const perfStart = performance.now();
    
    // Water simulation
    const waterStart = performance.now();
    this.waterSimulation.tick(deltaTime);
    const waterTime = performance.now() - waterStart;
    
    // Update water visuals
    const waterVisualStart = performance.now();
    this.updateWaterVisuals();
    const waterVisualTime = performance.now() - waterVisualStart;
    
    // Update plant simulation with time of day for realistic water consumption
    const plantSimStart = performance.now();
    this.plantSimulation.tick(deltaTime, timeOfDay);
    const plantSimTime = performance.now() - plantSimStart;
    
    // Update plant visuals
    const plantRenderStart = performance.now();
    const plants = this.plantSimulation.getAllPlants();
    this.plantRenderer.updatePlants(plants);
    const plantRenderTime = performance.now() - plantRenderStart;
    
    // Update organic plant simulation
    const organicSimStart = performance.now();
    this.organicPlantSimulation.tick(deltaTime, timeOfDay);
    const organicSimTime = performance.now() - organicSimStart;
    
    // Update organic plant visuals
    const organicRenderStart = performance.now();
    const organicPlants = this.organicPlantSimulation.getAllPlants();
    this.organicPlantRenderer.updatePlants(organicPlants);
    const organicRenderTime = performance.now() - organicRenderStart;
    
    const totalTime = performance.now() - perfStart;
    
    // Log if slow (every ~100 calls to avoid spam)
    if (totalTime > 10 && Math.random() < 0.01) {
      console.log('Water/Plant tick performance:');
      console.log(`  Water sim: ${waterTime.toFixed(2)}ms`);
      console.log(`  Water visuals: ${waterVisualTime.toFixed(2)}ms`);
      console.log(`  Plant sim: ${plantSimTime.toFixed(2)}ms (${plants.length} plants)`);
      console.log(`  Plant render: ${plantRenderTime.toFixed(2)}ms`);
      console.log(`  Organic sim: ${organicSimTime.toFixed(2)}ms (${organicPlants.length} plants)`);
      console.log(`  Organic render: ${organicRenderTime.toFixed(2)}ms`);
      console.log(`  Total: ${totalTime.toFixed(2)}ms`);
    }
  }
  
  // Water a hex with the watering can
  public waterSoil(hexCoord: HexCoord3D): boolean {
    const hex3DKey = HexUtils.hex3DToKey(hexCoord);
    
    // Check if there's soil at this position
    if (!this.soilHexes.has(hex3DKey)) {
      return false;
    }
    
    // Get the active watering can
    const game = (window as any).game;
    const activeItem = game?.unifiedInventorySystem?.getActiveItem();
    
    if (!activeItem || activeItem.id !== 'watering_can') {
      console.log('No watering can equipped');
      return false;
    }
    
    // Check if watering can has water
    const waterInCan = activeItem.metadata?.waterAmount || 0;
    if (waterInCan < 1000) { // Need at least 1L to water
      console.log('Watering can is empty!');
      return false;
    }
    
    // Use up to 10L per click, or whatever is left in the can
    const waterToUse = Math.min(10000, waterInCan);
    
    // Add water to soil
    const waterAdded = this.waterSimulation.addWater(hexCoord, waterToUse);
    
    if (waterAdded) {
      // Reduce water in can
      activeItem.metadata.waterAmount -= waterToUse;
      console.log(`Used ${waterToUse/1000}L of water. ${activeItem.metadata.waterAmount/1000}L remaining in can.`);
      
      // Update visuals
      this.updateWaterVisuals();
      
      // Update UI to show new water amount
      game?.unifiedInventoryUI?.update();
    }
    
    return waterAdded;
  }
  
  // Update edge barrier preview
  private updateEdgePreview(edge: {hex1: HexCoord3D, hex2: HexCoord3D}): void {
    if (!this.edgePreview) {
      // Create initial preview mesh
      const material = new THREE.MeshBasicMaterial({
        color: 0x808080,
        opacity: 0.7,
        transparent: true,
        depthWrite: false
      });
      this.edgePreview = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      this.scene.add(this.edgePreview);
    }
    
    // Create barrier between the two hexes
    const barrierMesh = this.createBarrierBetweenHexes(edge.hex1, edge.hex2, true);
    
    // Copy geometry and transform from the created barrier
    if (this.edgePreview.geometry) {
      this.edgePreview.geometry.dispose();
    }
    this.edgePreview.geometry = barrierMesh.geometry;
    this.edgePreview.position.copy(barrierMesh.position);
    this.edgePreview.rotation.copy(barrierMesh.rotation);
    this.edgePreview.scale.copy(barrierMesh.scale);
    
    this.edgePreview.visible = true;
    
    // Check if barrier already exists
    const barrierKey = HexUtils.sharedEdgeKey(edge.hex1, edge.hex2);
    const exists = this.edgeBarrierMeshes.has(barrierKey);
    
    if (this.edgePreview.material instanceof THREE.MeshBasicMaterial) {
      this.edgePreview.material.color.setHex(exists ? 0xff0000 : 0x808080);
    }
  }
  
  // Create a barrier mesh between two hexes
  private createBarrierBetweenHexes(hex1: HexCoord3D, hex2: HexCoord3D, isPreview: boolean = false): THREE.Mesh {
    const barrierThickness = Constants.HEX_HEIGHT * 0.05;
    const barrierWidth = Constants.HEX_SIZE * 1.1;
    const barrierHeight = Constants.HEX_HEIGHT * 0.8;
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x505050,
      roughness: 0.3,
      metalness: 0.1
    });
    
    // Check if vertical barrier (same q,r but different y)
    if (hex1.q === hex2.q && hex1.r === hex2.r) {
      // Vertical barrier - create horizontal hex plate
      const geometry = HexUtils.createHexGeometry(barrierThickness);
      const mesh = new THREE.Mesh(geometry, isPreview ? undefined : material);
      
      // Position between the two Y levels
      const pos1 = HexUtils.hexToWorld(hex1);
      pos1.y = hex1.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT / 2;
      
      mesh.position.set(
        pos1.x,
        Math.min(hex1.y, hex2.y) * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT,
        pos1.z
      );
      mesh.scale.set(1.1, 1, 1.1);
      
      if (!isPreview) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      
      return mesh;
    } else {
      // Horizontal barrier - create vertical wall
      const geometry = new THREE.BoxGeometry(barrierThickness, barrierHeight, barrierWidth);
      const mesh = new THREE.Mesh(geometry, isPreview ? undefined : material);
      
      // Find which hex is which by checking coordinates
      // We need to know the actual neighbor relationship to orient correctly
      const dirQ = hex2.q - hex1.q;
      const dirR = hex2.r - hex1.r;
      
      // Check if hex2 is a valid neighbor of hex1
      let edgeIndex = -1;
      for (let i = 0; i < 6; i++) {
        const dir = HexUtils.EDGE_DIRECTIONS[i];
        if (dir.q === dirQ && dir.r === dirR) {
          edgeIndex = i;
          break;
        }
      }
      
      const pos1 = HexUtils.hexToWorld(hex1);
      const pos2 = HexUtils.hexToWorld(hex2);
      
      // Position at midpoint between hex centers
      mesh.position.set(
        (pos1.x + pos2.x) / 2,
        Math.max(hex1.y, hex2.y) * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT / 2,
        (pos1.z + pos2.z) / 2
      );
      
      if (edgeIndex >= 0) {
        // Use the fixed angle for this edge
        // Subtract PI/3 (60 degrees) for clockwise rotation
        const edgeAngle = (Math.PI / 3) * edgeIndex - Math.PI / 6;
        mesh.rotation.y = edgeAngle;
      } else {
        // hex1 might actually be the neighbor of hex2, try reverse
        const reverseDirQ = hex1.q - hex2.q;
        const reverseDirR = hex1.r - hex2.r;
        
        for (let i = 0; i < 6; i++) {
          const dir = HexUtils.EDGE_DIRECTIONS[i];
          if (dir.q === reverseDirQ && dir.r === reverseDirR) {
            edgeIndex = i;
            const edgeAngle = (Math.PI / 3) * edgeIndex - Math.PI / 6;
            mesh.rotation.y = edgeAngle;
            break;
          }
        }
      }
      
      if (!isPreview) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      
      return mesh;
    }
  }
  
  // Toggle edge barrier on/off
  private toggleEdgeBarrier(edge: {hex1: HexCoord3D, hex2: HexCoord3D}): void {
    // For barriers on sand, we allow placement even if no soil exists
    // The barrier will prevent water from flowing into that empty space
    
    const barrierKey = HexUtils.sharedEdgeKey(edge.hex1, edge.hex2);
    
    if (this.edgeBarrierMeshes.has(barrierKey)) {
      // Remove existing barrier
      const mesh = this.edgeBarrierMeshes.get(barrierKey)!;
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
      this.edgeBarrierMeshes.delete(barrierKey);
      this.waterSimulation.removeEdgeBarrier(edge.hex1, edge.hex2);
    } else {
      // Add new barrier
      const mesh = this.createBarrierBetweenHexes(edge.hex1, edge.hex2);
      this.scene.add(mesh);
      this.edgeBarrierMeshes.set(barrierKey, mesh);
      this.waterSimulation.addEdgeBarrier(edge.hex1, edge.hex2);
    }
  }
  
  // Plant a seed at the specified location
  private plantSeed(hexCoord: HexCoord3D, worldPos: THREE.Vector3): boolean {
    // Check if there's soil at this position
    const hex3DKey = HexUtils.hex3DToKey(hexCoord);
    if (!this.soilHexes.has(hex3DKey)) {
      console.log('Cannot plant - no soil here');
      return false;
    }
    
    // Check if there are enough nutrients for this plant type
    if (!this.nutrientSystem.hasEnoughNutrients(hexCoord, this.selectedPlantType)) {
      console.log('Cannot plant - insufficient nutrients in soil');
      return false;
    }
    
    // Use the actual world position for sub-hex placement
    const plantWorldPos = worldPos.clone();
    // Set y to the TOP of the soil hex (not the bottom)
    plantWorldPos.y = hexCoord.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT;
    
    // Check if we're replanting an uprooted plant
    const game = (window as any).game;
    const activeItem = game?.inventorySystem?.getActiveItem();
    
    if (activeItem && activeItem.type === 'plant' && activeItem.plantData) {
      // Replant uprooted plant
      if (!this.plantSimulation.canReplantAt(plantWorldPos, activeItem.plantData.typeId)) {
        console.log('Cannot replant - space occupied');
        return false;
      }
      
      const success = this.plantSimulation.replantUprooted(activeItem.plantData, plantWorldPos);
      if (success) {
        // Remove from inventory
        game.inventorySystem.consumeActiveItem();
        console.log(`Replanted ${activeItem.name}`);
        return true;
      }
    } else {
      // Plant new seed
      if (!this.plantSimulation.canPlantAt(plantWorldPos, this.selectedPlantType)) {
        console.log('Cannot plant - space occupied');
        return false;
      }
      
      const plantId = this.plantSimulation.plantSeed(this.selectedPlantType, plantWorldPos);
      if (plantId) {
        console.log(`Planted ${this.selectedPlantType} at sub-hex position`);
        return true;
      }
    }
    
    return false;
  }
  
  // Harvest a plant at the specified location
  private harvestPlant(hexCoord: HexCoord3D, worldPos: THREE.Vector3): boolean {
    // Use the actual world position for sub-hex precision
    const harvestWorldPos = worldPos.clone();
    // Set y to the TOP of the soil hex where plants are positioned
    harvestWorldPos.y = hexCoord.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT;
    
    const plant = this.plantSimulation.getPlantAt(harvestWorldPos);
    if (!plant) {
      console.log('No plant to harvest here');
      return false;
    }
    
    const harvestYield = this.plantSimulation.harvestPlant(plant.id);
    if (harvestYield > 0) {
      console.log(`Harvested ${harvestYield} items`);
      return true;
    }
    
    return false;
  }
  
  // Uproot a plant at the specified location
  private uprootPlant(hexCoord: HexCoord3D, worldPos: THREE.Vector3): boolean {
    // Use the actual world position for sub-hex precision
    const uprootWorldPos = worldPos.clone();
    // Set y to the TOP of the soil hex where plants are positioned
    uprootWorldPos.y = hexCoord.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT;
    
    const plant = this.plantSimulation.getPlantAt(uprootWorldPos);
    if (!plant) {
      console.log('No plant to uproot here');
      return false;
    }
    
    const uprootedData = this.plantSimulation.uprootPlant(plant.id);
    if (uprootedData) {
      // Get the inventory system from the parent game
      const game = (window as any).game;
      if (game && game.inventorySystem) {
        const success = game.inventorySystem.addUprootedPlant(uprootedData);
        if (success) {
          console.log(`Uprooted ${uprootedData.typeName} and added to inventory`);
          return true;
        } else {
          console.log('Failed to add uprooted plant to inventory - no empty slots');
          // Still uprooted, but couldn't add to inventory
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Set the selected plant type
  setSelectedPlantType(typeId: string): void {
    this.selectedPlantType = typeId;
  }
  
  // Get plant simulation for external access
  getPlantSimulation(): PlantSimulation {
    return this.plantSimulation;
  }
  
  // Get nutrient information for hovered hex
  getHoveredHexNutrientInfo(): string | null {
    if (!this.hoveredHex) return null;
    const coord3D = { ...this.hoveredHex, y: this.hoveredY };
    const nutrients = this.nutrientSystem.getNutrients(coord3D);
    if (!nutrients) return null;
    
    const n = Math.round(nutrients.nitrogen * 100);
    const p = Math.round(nutrients.phosphorus * 100);
    const k = Math.round(nutrients.potassium * 100);
    
    return `N:${n}% P:${p}% K:${k}%`;
  }
  
  private updateInspector(hexCoord: HexCoord3D, worldPos: THREE.Vector3, mousePos: { x: number; y: number }): void {
    // Convert normalized mouse position to screen coordinates
    const screenX = (mousePos.x + 1) * 0.5 * window.innerWidth;
    const screenY = (-mousePos.y + 1) * 0.5 * window.innerHeight;
    
    // Calculate adjusted Y position for plant detection
    const adjustedY = hexCoord.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT;
    
    // Use reusable vector for plant detection (avoid creating objects every frame)
    this.tempInspectorPos.set(worldPos.x, adjustedY, worldPos.z);
    
    // Check regular plants first
    const plant = this.plantSimulation.getPlantAt(this.tempInspectorPos);
    
    if (plant) {
      // Show inspector for regular plant (always update content)
      this.inspectedPlantId = plant.id;
      this.inspectedPlantType = 'regular';
      this.lastInspectedHex = null; // Clear soil inspection state
      const plantType = PLANT_TYPES.get(plant.typeId);
      if (plantType) {
        this.plantInspectorUI.show(plant, plantType, screenX, screenY);
        this.organicPlantInspectorUI.hide();
        this.soilInspectorUI.hide();
      }
    } else {
      // Check organic plants
      const organicPlant = this.organicPlantSimulation.getPlantAt(this.tempInspectorPos);
      
      if (organicPlant) {
        // Show inspector for organic plant (always update content)
        this.inspectedPlantId = organicPlant.id;
        this.inspectedPlantType = 'organic';
        this.lastInspectedHex = null; // Clear soil inspection state
        const plantType = this.organicPlantSimulation.getPlantType(organicPlant.typeId);
        if (plantType) {
          this.organicPlantInspectorUI.show(organicPlant, plantType, screenX, screenY);
          this.plantInspectorUI.hide();
          this.soilInspectorUI.hide();
        }
      } else {
        // No plant found - clear plant inspection state first
        this.inspectedPlantId = null;
        this.inspectedPlantType = null;
        
        // Hide plant inspectors
        this.plantInspectorUI.hide();
        this.organicPlantInspectorUI.hide();
        
        // Now handle soil inspection
        const hex3DKey = HexUtils.hex3DToKey(hexCoord);
        
        // Check if there's soil at this position
        if (this.soilHexes.has(hex3DKey)) {
          // Check if we're already inspecting this hex
          if (this.lastInspectedHex === hex3DKey) {
            // Just update position
            this.soilInspectorUI.updatePosition(screenX, screenY);
            return;
          }
          
          // Get nutrient and water info
          const nutrients = this.nutrientSystem.getNutrients(hexCoord);
          const waterInfo = this.waterSimulation.getWaterInfo(hexCoord);
          
          this.soilInspectorUI.show(hexCoord, nutrients, waterInfo, screenX, screenY);
          this.lastInspectedHex = hex3DKey;
        } else {
          // No soil either - hide everything
          this.soilInspectorUI.hide();
          this.lastInspectedHex = null;
        }
      }
    }
  }
  
  // Update time of day for plant inspector
  setTimeOfDay(timeOfDay: number): void {
    this.plantInspectorUI.setTimeOfDay(timeOfDay);
  }
  
  private inspectPlant(hexCoord: HexCoord3D, worldPos: THREE.Vector3): void {
    // Just clicking in inspect mode doesn't do anything special
    // The hover handling already shows the inspector
    const adjustedWorldPos = worldPos.clone();
    // Adjust y to the TOP of the soil hex where plants are positioned
    adjustedWorldPos.y = hexCoord.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT;
    
    const plant = this.plantSimulation.getPlantAt(adjustedWorldPos);
    if (plant) {
      console.log('Inspecting plant:', plant);
    }
  }
  
  dispose(): void {
    // Clean up the plant inspector UI
    this.plantInspectorUI.dispose();
    this.organicPlantInspectorUI.dispose();
    // Clean up organic plant renderer
    this.organicPlantRenderer.dispose();
  }
  
  // Plant an organic seed
  private plantOrganicSeed(hexCoord: HexCoord3D, worldPos: THREE.Vector3): boolean {
    const hex3DKey = HexUtils.hex3DToKey(hexCoord);
    const hex = this.soilHexes.get(hex3DKey);
    
    if (!hex || hex.soilType === SoilType.Barrier) {
      return false;
    }
    
    // Use adjusted world position for planting (at top of clicked hex)
    const adjustedWorldPos = new THREE.Vector3(
      worldPos.x,
      hexCoord.y * Constants.HEX_HEIGHT + Constants.HEX_HEIGHT,
      worldPos.z
    );
    
    const plantId = this.organicPlantSimulation.plantSeed('organic_tomato', adjustedWorldPos);
    if (plantId) {
      console.log(`Planted organic tomato: ${plantId}`);
      return true;
    }
    
    return false;
  }
  
  private toggleSoilVisibility(): void {
    this.soilVisible = !this.soilVisible;
    this.updateVisibility();
  }
  
  public setVisible(visible: boolean): void {
    this.soilVisible = visible;
    this.updateVisibility();
  }
  
  private updateVisibility(): void {
    // Toggle visibility of all soil hex meshes
    for (const hex of this.soilHexes.values()) {
      hex.mesh.visible = this.soilVisible;
    }
    
    // Also toggle edge barriers visibility
    for (const barrier of this.edgeBarrierMeshes.values()) {
      barrier.visible = this.soilVisible;
    }
    
    // Hide/show preview hexes
    if (this.placementPreview) {
      this.placementPreview.visible = this.soilVisible && this.placementPreview.visible;
    }
    if (this.subHexPreview) {
      this.subHexPreview.visible = this.soilVisible && this.subHexPreview.visible;
    }
    if (this.edgePreview) {
      this.edgePreview.visible = this.soilVisible && this.edgePreview.visible;
    }
    
    // Hide/show plant renderers
    this.plantRenderer.setVisible(this.soilVisible);
    this.organicPlantRenderer.setVisible(this.soilVisible);
    
    console.log(`Soil visibility: ${this.soilVisible ? 'ON' : 'OFF'}`);
  }

  setSoilPlacerTool(tool: any): void {
    this.soilPlacerTool = tool;
  }

  private handleSoilPlacement(hex3D: HexCoord3D, input: InputState): void {
    console.log('handleSoilPlacement called', hex3D);
    
    if (!this.soilPlacerTool) {
      console.warn('Soil placer tool not set');
      return;
    }

    // No need to check if hex exists - we want to create new hexes
    // The SoilPlacerTool will use canPlaceSoilAt to validate placement
    
    // Determine amount based on shift key (for future use)
    const amount = input.shift ? 0.1 : 1.0;
    console.log('Placing amount:', amount, 'shift:', input.shift);
    
    // Place soil
    const success = this.soilPlacerTool.placeSoil(hex3D, amount);
    console.log('Placement success:', success);
    
    if (success) {
      // Update visual immediately
      this.updateSoilColors();
    }
  }
  
  private placeSoilFromInventory(hexCoord: HexCoord3D): void {
    // Get the game instance to access inventory
    const game = (window as any).game;
    if (!game || !game.unifiedInventorySystem) {
      console.warn('Cannot access unified inventory system');
      return;
    }
    
    // Check if we can place soil here
    if (!this.canPlaceSoilAt(hexCoord)) {
      console.log('Cannot place soil at this location');
      return;
    }
    
    // Get active item from inventory
    const activeItem = game.unifiedInventorySystem.getActiveItem();
    if (!activeItem || activeItem.type !== 'resource' || !activeItem.id.startsWith('soil_')) {
      console.log('No soil selected in inventory');
      return;
    }
    
    // Check if we have at least 1 unit of soil
    const quantity = game.unifiedInventorySystem.getActiveItemQuantity();
    if (quantity < 1) {
      console.log('Not enough soil to place (need at least 1 unit)');
      return;
    }
    
    // Create custom soil hex with nutrient data
    const hex3DKey = HexUtils.hex3DToKey(hexCoord);
    const columnKey = HexUtils.hexToKey(hexCoord);
    
    const soil = new SoilHex(hexCoord);
    this.soilHexes.set(hex3DKey, soil);
    this.scene.add(soil.mesh);
    
    // Update column height
    this.soilColumns.set(columnKey, hexCoord.y);
    
    // Add to water simulation (default to loam soil)
    this.waterSimulation.addHex(hexCoord, SoilType.Loam);
    
    // Add to nutrient system with nutrients from inventory item
    if (activeItem.metadata?.nutrients) {
      const nutrients = activeItem.metadata.nutrients;
      console.log('Applying nutrients from inventory:', nutrients);
      this.nutrientSystem.addHex(hexCoord, {
        nitrogen: nutrients.nitrogen / 100, // Convert from percentage to 0-1
        phosphorus: nutrients.phosphorus / 100,
        potassium: nutrients.potassium / 100
      });
    } else {
      // Default nutrients if none specified
      this.nutrientSystem.addHex(hexCoord);
    }
    
    // Set initial color based on nutrients (dry soil)
    if (soil.mesh.material instanceof THREE.MeshStandardMaterial) {
      const nutrientColor = this.nutrientSystem.getNutrientColor(hexCoord);
      soil.mesh.material.color = nutrientColor;
      soil.mesh.material.needsUpdate = true;
    }
    
    // Use one unit of soil from inventory
    const used = game.unifiedInventorySystem.useActiveItem(1);
    if (used) {
      console.log('Placed soil from inventory');
      // Update UI
      game.unifiedInventoryUI.update();
      // Update soil colors to reflect new nutrients
      this.updateSoilColors();
    }
  }
}