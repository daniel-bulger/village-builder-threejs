import * as THREE from 'three';
import { BuildingManager } from './BuildingManager';
import { BuildingComponent } from './BuildingComponent';
import { 
  ComponentData, 
  ComponentType, 
  MaterialType,
  WallAlignment,
  COMPONENT_TEMPLATES,
  ROTATABLE_COMPONENTS
} from './BuildingTypes';
import { HexGrid } from '../farming/HexGrid';
import { HexCoord, HexCoord3D, HexUtils } from '../utils/HexUtils';

export enum PlacementMode {
  SINGLE = 'single',
  WALL_LINE = 'wall_line',
  FLOOR_FILL = 'floor_fill',
  ROOM = 'room'
}

export class BuildingPlacer {
  private buildingManager: BuildingManager;
  private hexGrid: HexGrid;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  
  // Placement state
  private isPlacing: boolean = false;
  private currentComponentType: ComponentType = ComponentType.WALL;
  private currentMaterial: MaterialType = MaterialType.WOOD;
  private currentLevel: number = 0;
  private placementMode: PlacementMode = PlacementMode.SINGLE;
  private currentRotation: number = 0; // 0, 90, 180, 270 degrees
  
  // Mouse state
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private hoveredHex: HexCoord3D | null = null;
  private hoveredWallEdge: WallAlignment | null = null;
  private hoveredVertexIndex: number | null = null;
  
  // Multi-placement state
  private placementStart: HexCoord3D | null = null;
  private placementPath: HexCoord3D[] = [];
  
  // Visual helpers
  private edgeHighlights: THREE.LineSegments[] = [];
  private vertexHighlights: THREE.Mesh[] = [];
  private placementGuides: THREE.Group = new THREE.Group();
  
  // Performance optimization
  private lastUpdateTime: number = 0;
  private updateThrottle: number = 16; // ~60fps
  private lastHoveredHex: HexCoord3D | null = null;
  private pathPreviews: { mesh: THREE.Mesh; data: ComponentData }[] = [];
  
  // Visual indicators
  private startMarker: THREE.Mesh | null = null;
  private gridHelper: THREE.Group = new THREE.Group();
  private alignmentGuides: THREE.LineSegments[] = [];
  private showGrid: boolean = true;
  
  constructor(
    buildingManager: BuildingManager, 
    hexGrid: HexGrid,
    scene: THREE.Scene
  ) {
    this.buildingManager = buildingManager;
    this.hexGrid = hexGrid;
    this.scene = scene;
    
    scene.add(this.placementGuides);
    scene.add(this.gridHelper);
    this.createVisualHelpers();
    this.createGridHelper();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  // Start placing a component type
  startPlacement(componentType: ComponentType, material: MaterialType): void {
    // Clear any existing placement state
    if (this.isPlacing) {
      this.stopPlacement();
    }
    
    this.isPlacing = true;
    this.currentComponentType = componentType;
    this.currentMaterial = material;
    
    // Set appropriate placement mode
    switch (componentType) {
      case ComponentType.WALL:
        this.placementMode = PlacementMode.SINGLE;  // Changed to single placement
        break;
      case ComponentType.FLOOR:
        this.placementMode = PlacementMode.FLOOR_FILL;
        break;
      case ComponentType.FOUNDATION:
        this.placementMode = PlacementMode.SINGLE; // Foundations place one at a time
        break;
      default:
        this.placementMode = PlacementMode.SINGLE;
    }
    
    // Reset rotation for new component
    this.currentRotation = 0;
    
    // Force initial update
    this.lastHoveredHex = null;
    this.updatePreview();
    this.gridHelper.visible = this.showGrid;
    this.updateGridLevel();
  }
  
  // Stop placement mode
  stopPlacement(): void {
    this.isPlacing = false;
    this.buildingManager.clearPreview();
    this.clearHighlights();
    this.placementStart = null;
    this.placementPath = [];
    this.lastHoveredHex = null;
    this.removeStartMarker();
  }
  
  // Update with current camera
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  // Handle mouse move
  onMouseMove(event: MouseEvent): void {
    if (!this.isPlacing || !this.camera) return;
    
    // Throttle updates for performance
    const now = performance.now();
    if (now - this.lastUpdateTime < this.updateThrottle) return;
    this.lastUpdateTime = now;
    
    // Update mouse position
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast to find hex position
    this.raycaster.setFromCamera(this.mousePosition, this.camera);
    
    // Create a plane at the current building level
    const HEX_HEIGHT = 0.15;
    const levelHeight = this.currentLevel * 3;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -levelHeight);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);
    
    // Convert to hex coordinates
    const worldPos = new THREE.Vector3(intersection.x, 0, intersection.z);
    const hex2D = HexUtils.worldToHex(worldPos);
    const hexCoord: HexCoord3D = {
      q: hex2D.q,
      r: hex2D.r,
      y: this.currentLevel // Use the current building level
    };
    
    // Only update if hex changed
    const hexChanged = !this.lastHoveredHex || 
      hexCoord.q !== this.lastHoveredHex.q || 
      hexCoord.r !== this.lastHoveredHex.r || 
      hexCoord.y !== this.lastHoveredHex.y;
    
    if (hexCoord) {
      this.hoveredHex = hexCoord;
      
      // For walls in single placement mode, use keyboard rotation
      if (this.currentComponentType === ComponentType.WALL) {
        if (this.placementMode === PlacementMode.SINGLE) {
          // Initialize wall edge if not set
          if (this.hoveredWallEdge === null) {
            this.hoveredWallEdge = 0; // Default to edge 0
          }
          // Update highlights based on current rotation
          if (hexChanged) {
            this.updateEdgeHighlights(hexCoord);
          }
        } else {
          // For line mode, find nearest edge
          const newEdge = this.findNearestEdge(intersection, hexCoord);
          if (newEdge !== this.hoveredWallEdge || hexChanged) {
            this.hoveredWallEdge = newEdge;
            this.updateEdgeHighlights(hexCoord);
          }
        }
      } else {
        this.clearEdgeHighlights();
        this.hoveredWallEdge = null;
      }
      
      // For pillars, find nearest vertex
      if (this.currentComponentType === ComponentType.PILLAR) {
        const newVertex = this.findNearestVertex(intersection, hexCoord);
        if (newVertex !== this.hoveredVertexIndex || hexChanged) {
          this.hoveredVertexIndex = newVertex;
          this.updateVertexHighlights(hexCoord);
        }
      } else {
        this.clearVertexHighlights();
      }
      
      // Only update preview if position changed
      if (hexChanged) {
        this.updatePreview();
        this.updateGridLevel();
        this.updateAlignmentGuides();
        this.lastHoveredHex = { ...hexCoord };
      }
      
      // Update placement path for multi-placement modes
      if (this.placementStart && this.placementMode !== PlacementMode.SINGLE) {
        this.updatePlacementPath();
        this.updatePathPreviews();
      }
    }
  }
  
  // Handle mouse click
  onMouseClick(event: MouseEvent): void {
    if (!this.isPlacing || !this.hoveredHex) return;
    
    if (event.button === 0) { // Left click
      if (this.placementMode === PlacementMode.SINGLE) {
        this.placeCurrentComponent();
      } else {
        if (!this.placementStart) {
          // Start multi-placement
          this.placementStart = { ...this.hoveredHex };
          this.createStartMarker();
        } else {
          // Complete multi-placement
          this.placeMultipleComponents();
          this.placementStart = null;
          this.placementPath = [];
          this.removeStartMarker();
        }
      }
    } else if (event.button === 2) { // Right click
      // Cancel multi-placement
      if (this.placementStart) {
        this.placementStart = null;
        this.placementPath = [];
        this.removeStartMarker();
      } else {
        this.stopPlacement();
      }
    }
  }
  
  // Handle keyboard input
  onKeyPress(key: string, event?: KeyboardEvent): void {
    if (!this.isPlacing) return;
    
    switch (key) {
      case 'r':
      case 'R':
        // Rotate component (for applicable types)
        this.rotateComponent();
        break;
      case 'q':
      case 'Q':
        // Rotate counter-clockwise
        this.rotateComponent(true);
        break;
      case 'Escape':
        this.stopPlacement();
        break;
      case 'PageUp':
        this.currentLevel++;
        this.updatePreview();
        break;
      case 'PageDown':
        if (this.currentLevel > 0) {
          this.currentLevel--;
          this.updatePreview();
        }
        break;
      case 'g':
      case 'G':
        this.toggleGrid();
        break;
      case 'z':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.buildingManager.undo();
        }
        break;
      case 'y':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.buildingManager.redo();
        }
        break;
    }
  }
  
  // Place a single component
  private placeCurrentComponent(): void {
    if (!this.hoveredHex) return;
    
    const componentData: Partial<ComponentData> = {
      type: this.currentComponentType,
      material: this.currentMaterial,
      position: this.hoveredHex,
      level: this.currentLevel,
      rotation: ROTATABLE_COMPONENTS.includes(this.currentComponentType) ? this.currentRotation : undefined,
      wallAlignment: this.hoveredWallEdge,
      vertexIndex: this.hoveredVertexIndex
    };
    
    const component = this.buildingManager.placeComponent(componentData);
    if (component) {
      // Success feedback
      this.createPlacementEffect(component.mesh.position);
    }
  }
  
  // Place multiple components
  private placeMultipleComponents(): void {
    this.placementPath.forEach((hex, index) => {
      const componentData: Partial<ComponentData> = {
        type: this.currentComponentType,
        material: this.currentMaterial,
        position: hex,
        level: this.currentLevel
      };
      
      // For walls along a path, calculate appropriate edge alignment
      if (this.currentComponentType === ComponentType.WALL) {
        componentData.wallAlignment = this.calculateWallAlignment(index);
      }
      
      this.buildingManager.placeComponent(componentData);
    });
    
    this.clearPathPreviews();
  }
  
  // Update the placement preview
  private updatePreview(): void {
    if (!this.hoveredHex) return;
    
    const previewData: Partial<ComponentData> = {
      type: this.currentComponentType,
      material: this.currentMaterial,
      position: this.hoveredHex,
      level: this.currentLevel,
      rotation: ROTATABLE_COMPONENTS.includes(this.currentComponentType) ? this.currentRotation : undefined,
      wallAlignment: this.hoveredWallEdge,
      vertexIndex: this.hoveredVertexIndex
    };
    
    // Use update instead of recreate if possible
    if (this.buildingManager.previewComponent) {
      this.buildingManager.updatePreview(
        this.hoveredHex,
        this.hoveredWallEdge,
        this.hoveredVertexIndex
      );
    } else {
      this.buildingManager.createPreview(previewData);
    }
  }
  
  // Find nearest hex edge to mouse position
  private findNearestEdge(worldPos: THREE.Vector3, hexCoord: HexCoord3D): WallAlignment {
    const hexCenter = this.hexToWorld(hexCoord);
    const localPos = new THREE.Vector3().subVectors(worldPos, hexCenter);
    
    // Convert to angle
    // Floor hex is rotated 90°, so edge midpoints are at 90°, 150°, 210°, 270°, 330°, 30°
    let angle = Math.atan2(localPos.z, localPos.x) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    
    // Subtract 90° to account for the hex rotation, then find nearest 60° segment
    angle = (angle - 90 + 360) % 360;
    const segment = Math.round(angle / 60);
    const normalizedSegment = segment % 6;
    
    return normalizedSegment as WallAlignment;
  }
  
  // Find nearest hex vertex to mouse position
  private findNearestVertex(worldPos: THREE.Vector3, hexCoord: HexCoord3D): number {
    const hexCenter = this.hexToWorld(hexCoord);
    const localPos = new THREE.Vector3().subVectors(worldPos, hexCenter);
    
    // Convert to angle
    // Floor hex is rotated 90°, so vertices are at 60°, 120°, 180°, 240°, 300°, 0°
    let angle = Math.atan2(localPos.z, localPos.x) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    
    // Subtract 60° to align with first vertex at 60°, then find nearest 60° segment
    angle = (angle - 60 + 360) % 360;
    const segment = Math.round(angle / 60);
    const normalizedSegment = segment % 6;
    
    return normalizedSegment;
  }
  
  // Update placement path for multi-placement
  private updatePlacementPath(): void {
    if (!this.placementStart || !this.hoveredHex) return;
    
    switch (this.placementMode) {
      case PlacementMode.WALL_LINE:
        this.placementPath = this.getLinePath(this.placementStart, this.hoveredHex);
        break;
      case PlacementMode.FLOOR_FILL:
        this.placementPath = this.getRectanglePath(this.placementStart, this.hoveredHex);
        break;
      case PlacementMode.ROOM:
        this.placementPath = this.getRoomPath(this.placementStart, this.hoveredHex);
        break;
    }
  }
  
  // Get hex path for a line
  private getLinePath(start: HexCoord3D, end: HexCoord3D): HexCoord3D[] {
    const path: HexCoord3D[] = [];
    
    // Use hex distance to determine steps
    const dq = end.q - start.q;
    const dr = end.r - start.r;
    const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
    
    if (distance === 0) return [start];
    
    // Interpolate along the line
    for (let i = 0; i <= distance; i++) {
      const t = i / distance;
      const q = Math.round(start.q + dq * t);
      const r = Math.round(start.r + dr * t);
      path.push({ q, r, y: start.y });
    }
    
    return path;
  }
  
  // Get hex path for a filled rectangle
  private getRectanglePath(start: HexCoord3D, end: HexCoord3D): HexCoord3D[] {
    const path: HexCoord3D[] = [];
    const minQ = Math.min(start.q, end.q);
    const maxQ = Math.max(start.q, end.q);
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    
    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        path.push({ q, r, y: start.y });
      }
    }
    
    return path;
  }
  
  // Get hex path for room walls
  private getRoomPath(start: HexCoord3D, end: HexCoord3D): HexCoord3D[] {
    // Would return just the perimeter hexes
    const rect = this.getRectanglePath(start, end);
    // Filter to only edge hexes
    return rect; // Simplified
  }
  
  // Create visual helpers
  private createVisualHelpers(): void {
    // Create edge highlight geometry
    const edgeGeometry = new THREE.BufferGeometry();
    const edgeVertices = new Float32Array(6); // 2 points * 3 coordinates
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgeVertices, 3));
    
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff00,
      linewidth: 5,
      depthTest: false,
      depthWrite: false
    });
    
    for (let i = 0; i < 6; i++) {
      const edge = new THREE.LineSegments(edgeGeometry.clone(), edgeMaterial);
      edge.visible = false;
      this.edgeHighlights.push(edge);
      this.placementGuides.add(edge);
    }
    
    // Create vertex highlight spheres
    const vertexGeometry = new THREE.SphereGeometry(0.2, 12, 12);
    const vertexMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.8,
      depthTest: false,
      depthWrite: false
    });
    
    for (let i = 0; i < 6; i++) {
      const vertex = new THREE.Mesh(vertexGeometry, vertexMaterial);
      vertex.visible = false;
      this.vertexHighlights.push(vertex);
      this.placementGuides.add(vertex);
    }
  }
  
  // Update edge highlights
  private updateEdgeHighlights(hexCoord: HexCoord3D): void {
    // Hide all highlights
    this.edgeHighlights.forEach(e => e.visible = false);
    
    if (this.hoveredWallEdge === null) return;
    
    // Show and position the relevant edge
    const edge = this.edgeHighlights[this.hoveredWallEdge];
    if (edge) {
      const hexCenter = this.hexToWorld(hexCoord);
      
      // Floor hex is rotated 90°, so vertices are at 60°, 120°, 180°, 240°, 300°, 0°
      // Edge connects two adjacent vertices
      const angle1 = (this.hoveredWallEdge * Math.PI) / 3 + Math.PI / 3; // First vertex (60° for edge 0)
      const angle2 = angle1 + Math.PI / 3; // Next vertex
      
      const HEX_SIZE = 1;
      const positions = edge.geometry.attributes.position.array as Float32Array;
      positions[0] = hexCenter.x + Math.cos(angle1) * HEX_SIZE;
      positions[1] = hexCenter.y;
      positions[2] = hexCenter.z + Math.sin(angle1) * HEX_SIZE;
      positions[3] = hexCenter.x + Math.cos(angle2) * HEX_SIZE;
      positions[4] = hexCenter.y;
      positions[5] = hexCenter.z + Math.sin(angle2) * HEX_SIZE;
      
      edge.geometry.attributes.position.needsUpdate = true;
      edge.visible = true;
    }
  }
  
  // Update vertex highlights
  private updateVertexHighlights(hexCoord: HexCoord3D): void {
    // Hide all highlights
    this.vertexHighlights.forEach(v => v.visible = false);
    
    if (this.hoveredVertexIndex === null) return;
    
    // Show and position the relevant vertex
    const vertex = this.vertexHighlights[this.hoveredVertexIndex];
    if (vertex) {
      const hexCenter = this.hexToWorld(hexCoord);
      
      // Floor hex is rotated 90°, so vertices are at 60°, 120°, 180°, 240°, 300°, 0°
      const angle = (this.hoveredVertexIndex * Math.PI) / 3 + Math.PI / 3; // First vertex at 60°
      
      const HEX_SIZE = 1;
      vertex.position.set(
        hexCenter.x + Math.cos(angle) * HEX_SIZE,
        hexCenter.y,
        hexCenter.z + Math.sin(angle) * HEX_SIZE
      );
      vertex.visible = true;
    }
  }
  
  // Clear all highlights
  private clearHighlights(): void {
    this.clearEdgeHighlights();
    this.clearVertexHighlights();
    this.clearPathPreviews();
  }
  
  private clearEdgeHighlights(): void {
    this.edgeHighlights.forEach(e => e.visible = false);
  }
  
  private clearVertexHighlights(): void {
    this.vertexHighlights.forEach(v => v.visible = false);
  }
  
  // Update path previews for multi-placement
  private updatePathPreviews(): void {
    this.clearPathPreviews();
    
    if (this.placementPath.length <= 1) return;
    
    // Create semi-transparent previews for the path
    this.placementPath.forEach((hex, index) => {
      if (index === this.placementPath.length - 1) return; // Skip last (cursor position)
      
      const previewData: ComponentData = {
        id: `path_preview_${index}`,
        type: this.currentComponentType,
        material: this.currentMaterial,
        position: hex,
        level: this.currentLevel,
        wallAlignment: this.currentComponentType === ComponentType.WALL ? 
          this.calculateWallAlignment(index) : undefined,
        vertexIndex: undefined,
        metadata: {}
      };
      
      // Create a simple preview mesh instead of full component
      const geometry = this.createPreviewGeometry(this.currentComponentType, previewData);
      const material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.25,
        emissive: 0x00ff00,
        emissiveIntensity: 0.05,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      let worldPos: THREE.Vector3;
      
      if (this.currentComponentType === ComponentType.WALL && previewData.wallAlignment !== undefined) {
        // Position wall at edge midpoint
        const hexCenter = this.hexToWorld(hex);
        const angle = (previewData.wallAlignment * Math.PI) / 3 + Math.PI / 2; // Add 90° for rotated hex
        const edgeDistance = Math.sqrt(3) / 2; // Distance to edge midpoint
        worldPos = new THREE.Vector3(
          hexCenter.x + Math.cos(angle) * edgeDistance,
          hexCenter.y + 1.5, // Wall height / 2
          hexCenter.z + Math.sin(angle) * edgeDistance
        );
        // Match the rotation used in BuildingComponent
        mesh.rotation.y = -(previewData.wallAlignment * Math.PI) / 3 + Math.PI / 2;
      } else {
        worldPos = this.hexToWorld(hex);
      }
      
      mesh.position.copy(worldPos);
      
      this.scene.add(mesh);
      this.pathPreviews.push({ mesh, data: previewData });
    });
  }
  
  private clearPathPreviews(): void {
    this.pathPreviews.forEach(preview => {
      this.scene.remove(preview.mesh);
      preview.mesh.geometry.dispose();
      if (preview.mesh.material instanceof THREE.Material) {
        preview.mesh.material.dispose();
      }
    });
    this.pathPreviews = [];
  }
  
  // Calculate wall alignment based on path direction
  private calculateWallAlignment(index: number): WallAlignment {
    if (index >= this.placementPath.length - 1) return 0;
    
    const current = this.placementPath[index];
    const next = this.placementPath[index + 1];
    
    const dq = next.q - current.q;
    const dr = next.r - current.r;
    
    // Determine direction and map to wall edge
    if (dq === 1 && dr === 0) return 0;
    if (dq === 0 && dr === 1) return 1;
    if (dq === -1 && dr === 1) return 2;
    if (dq === -1 && dr === 0) return 3;
    if (dq === 0 && dr === -1) return 4;
    if (dq === 1 && dr === -1) return 5;
    
    return 0; // Default
  }
  
  // Create preview geometry for path visualization
  private createPreviewGeometry(type: ComponentType, data: ComponentData): THREE.BufferGeometry {
    const HEX_SIZE = 1;
    
    switch (type) {
      case ComponentType.WALL:
        const wallHeight = 3.0;
        const wallThickness = 0.2;
        const wallLength = HEX_SIZE * 1.0; // Edge length for unit hex
        // Match BuildingComponent wall geometry: thickness along X, length along Z
        return new THREE.BoxGeometry(wallThickness, wallHeight, wallLength);
        
      case ComponentType.FLOOR:
      case ComponentType.FOUNDATION:
        // Hexagonal floor
        const floorShape = new THREE.Shape();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          const x = Math.cos(angle) * HEX_SIZE;
          const y = Math.sin(angle) * HEX_SIZE;
          if (i === 0) {
            floorShape.moveTo(x, y);
          } else {
            floorShape.lineTo(x, y);
          }
        }
        floorShape.closePath();
        const thickness = type === ComponentType.FOUNDATION ? 0.5 : 0.3;
        return new THREE.ExtrudeGeometry(floorShape, {
          depth: thickness,
          bevelEnabled: false
        });
        
      case ComponentType.PILLAR:
        return new THREE.CylinderGeometry(0.2, 0.2, 3.0, 8);
        
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }
  
  // Create start marker for multi-placement
  private createStartMarker(): void {
    if (!this.placementStart) return;
    
    this.removeStartMarker();
    
    const geometry = new THREE.RingGeometry(0.3, 0.4, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
      depthWrite: false
    });
    
    this.startMarker = new THREE.Mesh(geometry, material);
    const markerPos = this.hexToWorld(this.placementStart);
    this.startMarker.position.copy(markerPos);
    this.startMarker.position.y += 0.05;
    this.startMarker.rotation.x = -Math.PI / 2;
    
    this.scene.add(this.startMarker);
  }
  
  private removeStartMarker(): void {
    if (this.startMarker) {
      this.scene.remove(this.startMarker);
      this.startMarker.geometry.dispose();
      (this.startMarker.material as THREE.Material).dispose();
      this.startMarker = null;
    }
  }
  
  // Create grid helper for current level
  private createGridHelper(): void {
    const gridSize = 20;
    const HEX_SIZE = 1;
    
    // Create hex grid lines
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    
    for (let q = -gridSize; q <= gridSize; q++) {
      for (let r = -gridSize; r <= gridSize; r++) {
        // Skip if outside reasonable bounds
        if (Math.abs(q + r) > gridSize) continue;
        
        const hex = { q, r, y: 0 };
        const center = this.hexToWorld(hex);
        
        // Draw hex edges
        for (let i = 0; i < 6; i++) {
          const angle1 = (i * Math.PI) / 3 - Math.PI / 6;
          const angle2 = ((i + 1) * Math.PI) / 3 - Math.PI / 6;
          
          vertices.push(
            center.x + Math.cos(angle1) * HEX_SIZE,
            0,
            center.z + Math.sin(angle1) * HEX_SIZE,
            center.x + Math.cos(angle2) * HEX_SIZE,
            0,
            center.z + Math.sin(angle2) * HEX_SIZE
          );
        }
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.2,
      depthTest: false,
      depthWrite: false
    });
    
    const grid = new THREE.LineSegments(geometry, material);
    this.gridHelper.add(grid);
  }
  
  private updateGridLevel(): void {
    this.gridHelper.position.y = this.currentLevel * 3;
  }
  
  private toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.gridHelper.visible = this.showGrid;
  }
  
  // Create alignment guides for structured building
  private updateAlignmentGuides(): void {
    // Clear existing guides
    this.alignmentGuides.forEach(guide => {
      this.placementGuides.remove(guide);
      guide.geometry.dispose();
    });
    this.alignmentGuides = [];
    
    if (!this.hoveredHex || !this.showGrid) return;
    
    // Create alignment lines from hovered hex
    const directions = [
      { q: 1, r: 0 },   // East
      { q: 0, r: 1 },   // Southeast
      { q: -1, r: 1 },  // Southwest
      { q: -1, r: 0 },  // West
      { q: 0, r: -1 },  // Northwest
      { q: 1, r: -1 }   // Northeast
    ];
    
    const lineLength = 5;
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(6);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      depthTest: false,
      depthWrite: false
    });
    
    directions.forEach(dir => {
      const line = new THREE.LineSegments(geometry.clone(), material);
      const start = this.hexToWorld(this.hoveredHex);
      const end = this.hexToWorld({
        q: this.hoveredHex.q + dir.q * lineLength,
        r: this.hoveredHex.r + dir.r * lineLength,
        y: this.hoveredHex.y
      });
      
      const positions = line.geometry.attributes.position.array as Float32Array;
      positions[0] = start.x;
      positions[1] = start.y;
      positions[2] = start.z;
      positions[3] = end.x;
      positions[4] = end.y;
      positions[5] = end.z;
      
      line.geometry.attributes.position.needsUpdate = true;
      this.alignmentGuides.push(line);
      this.placementGuides.add(line);
    });
  }
  
  // Create placement effect
  private createPlacementEffect(position: THREE.Vector3): void {
    // Would create particle effect or other feedback
    // For now, just a console log
  }
  
  // Rotate component (if applicable)
  private rotateComponent(counterClockwise: boolean = false): void {
    // For walls, cycle through edge alignments
    if (this.currentComponentType === ComponentType.WALL) {
      // Initialize if null
      if (this.hoveredWallEdge === null) {
        this.hoveredWallEdge = 0;
      }
      
      if (counterClockwise) {
        this.hoveredWallEdge = ((this.hoveredWallEdge + 5) % 6) as WallAlignment;
      } else {
        this.hoveredWallEdge = ((this.hoveredWallEdge + 1) % 6) as WallAlignment;
      }
      
      // Update edge highlights to show new orientation
      if (this.hoveredHex) {
        this.updateEdgeHighlights(this.hoveredHex);
      }
      this.updatePreview();
    }
    
    // For rotatable components, change rotation angle
    if (ROTATABLE_COMPONENTS.includes(this.currentComponentType)) {
      if (counterClockwise) {
        this.currentRotation = (this.currentRotation - 90 + 360) % 360;
      } else {
        this.currentRotation = (this.currentRotation + 90) % 360;
      }
      this.updatePreview();
    }
  }
  
  // Convert hex to world coordinates
  private hexToWorld(coord: HexCoord3D): THREE.Vector3 {
    const HEX_SIZE = 1;
    return new THREE.Vector3(
      coord.q * HEX_SIZE * 1.5,
      coord.y * 3.0,
      (coord.r + coord.q * 0.5) * HEX_SIZE * Math.sqrt(3)
    );
  }
  
  // Get current placement info
  getPlacementInfo(): {
    isPlacing: boolean;
    componentType: ComponentType;
    material: MaterialType;
    level: number;
    mode: PlacementMode;
    hasStartPoint?: boolean;
    placementPathLength?: number;
    pathPreviewCount?: number;
    hasStartMarker?: boolean;
    hoveredWallEdge?: number | null;
    hoveredVertexIndex?: number | null;
  } {
    return {
      isPlacing: this.isPlacing,
      componentType: this.currentComponentType,
      material: this.currentMaterial,
      level: this.currentLevel,
      mode: this.placementMode,
      hasStartPoint: this.placementStart !== null,
      placementPathLength: this.placementPath.length,
      pathPreviewCount: this.pathPreviews.length,
      hasStartMarker: this.startMarker !== null,
      hoveredWallEdge: this.hoveredWallEdge,
      hoveredVertexIndex: this.hoveredVertexIndex
    };
  }
  
  // Get highlight visibility info for testing
  getHighlightInfo(): {
    visibleEdges: number;
    visibleVertices: number;
  } {
    return {
      visibleEdges: this.edgeHighlights.filter(e => e.visible).length,
      visibleVertices: this.vertexHighlights.filter(v => v.visible).length
    };
  }
  
  // Set up event listeners
  private setupEventListeners(): void {
    // Mouse move
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // Mouse click
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('contextmenu', (e) => {
      if (this.isPlacing) {
        e.preventDefault();
      }
    });
    
    // Keyboard
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  private handleMouseMove(event: MouseEvent): void {
    // Don't handle placement when camera is being controlled
    if (this.isPlacing && !event.buttons) {
      this.onMouseMove(event);
    }
  }
  
  private handleMouseDown(event: MouseEvent): void {
    if (this.isPlacing) {
      this.onMouseClick(event);
    }
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isPlacing) {
      this.onKeyPress(event.key, event);
    }
  }
}