# Phase 1 Design Document - Foundation
## Farming Sandbox Proof of Concept

### 1. Overview
Phase 1 establishes the core foundation: Three.js setup, player movement, desert environment, and hex-based soil placement system. This phase creates the base upon which all farming mechanics will be built.

### 2. Project Structure

```
village-builder-threejs/
├── src/
│   ├── main.ts              # Entry point, Three.js setup
│   ├── game/
│   │   ├── Game.ts          # Main game loop controller
│   │   ├── InputManager.ts  # Keyboard/mouse handling
│   │   └── TimeManager.ts   # Day/night cycle, delta time
│   ├── player/
│   │   ├── Player.ts        # Player entity
│   │   ├── PlayerController.ts # Movement logic
│   │   └── CameraController.ts # 3rd person/overhead camera
│   ├── world/
│   │   ├── Desert.ts        # Infinite plane generation
│   │   └── Lighting.ts      # Sun, ambient light
│   ├── farming/
│   │   ├── HexGrid.ts       # Hex coordinate system
│   │   ├── SoilManager.ts   # Soil placement/removal
│   │   └── HexRenderer.ts   # Visual hex representation
│   └── utils/
│       ├── HexUtils.ts      # Hex math utilities
│       └── Constants.ts     # Game constants
├── public/
│   └── index.html
├── package.json
└── tsconfig.json
```

### 3. Technical Architecture

#### 3.1 Core Dependencies
```json
{
  "dependencies": {
    "three": "^0.160.0",
    "vite": "^5.0.0"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "typescript": "^5.0.0"
  }
}
```

#### 3.2 Three.js Scene Setup
```typescript
// main.ts
class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private game: Game;

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xf0e6d2, 100, 1000); // Desert fog
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Initial camera (managed by CameraController)
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight,
      0.1, 
      2000
    );
    
    // Game initialization
    this.game = new Game(this.scene, this.camera, this.renderer);
  }
}
```

### 4. Desert Environment

#### 4.1 Infinite Plane Implementation
```typescript
// Desert.ts
export class Desert {
  private readonly TILE_SIZE = 100;
  private readonly TILES_PER_SIDE = 5;
  private tiles: Map<string, THREE.Mesh> = new Map();
  private playerPosition: THREE.Vector3;
  
  constructor(scene: THREE.Scene) {
    this.createDesertMaterial();
    this.generateInitialTiles();
  }
  
  private createDesertMaterial(): THREE.Material {
    const texture = new THREE.TextureLoader().load('desert_sand.jpg');
    texture.repeat.set(10, 10);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      color: 0xd4a574
    });
  }
  
  update(playerPos: THREE.Vector3) {
    // Generate new tiles as player moves
    const centerTileX = Math.floor(playerPos.x / this.TILE_SIZE);
    const centerTileZ = Math.floor(playerPos.z / this.TILE_SIZE);
    
    // Add new tiles, remove distant ones
    this.updateTiles(centerTileX, centerTileZ);
  }
}
```

#### 4.2 Lighting System
```typescript
// Lighting.ts
export class Lighting {
  private sun: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private timeOfDay: number = 0.5; // 0-1, 0.5 = noon
  
  constructor(scene: THREE.Scene) {
    // Ambient light
    this.ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(this.ambient);
    
    // Directional sun
    this.sun = new THREE.DirectionalLight(0xffffff, 0.6);
    this.sun.position.set(100, 100, 50);
    this.sun.castShadow = true;
    
    // Shadow setup
    this.sun.shadow.camera.left = -50;
    this.sun.shadow.camera.right = 50;
    this.sun.shadow.camera.top = 50;
    this.sun.shadow.camera.bottom = -50;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    
    scene.add(this.sun);
  }
  
  update(deltaTime: number) {
    // Simple day/night cycle
    this.timeOfDay += deltaTime * 0.01; // Full cycle = 100 seconds
    if (this.timeOfDay > 1) this.timeOfDay -= 1;
    
    // Update sun position and color
    const angle = this.timeOfDay * Math.PI * 2;
    this.sun.position.x = Math.cos(angle) * 100;
    this.sun.position.y = Math.sin(angle) * 100 + 50;
    
    // Adjust colors for sunrise/sunset
    const brightness = Math.max(0.2, Math.sin(angle));
    this.sun.intensity = brightness;
  }
}
```

### 5. Player System

#### 5.1 Player Entity
```typescript
// Player.ts
export class Player {
  public readonly mesh: THREE.Group;
  public readonly position: THREE.Vector3;
  public readonly rotation: THREE.Euler;
  private readonly height = 1.8;
  
  constructor() {
    this.mesh = new THREE.Group();
    this.position = this.mesh.position;
    this.rotation = this.mesh.rotation;
    
    // Simple capsule representation
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, this.height, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4488ff })
    );
    body.position.y = this.height / 2;
    this.mesh.add(body);
    
    // Add shadow
    body.castShadow = true;
  }
}
```

#### 5.2 Player Movement
```typescript
// PlayerController.ts
export class PlayerController {
  private velocity = new THREE.Vector3();
  private readonly WALK_SPEED = 5;
  private readonly RUN_SPEED = 10;
  
  update(deltaTime: number, input: InputState) {
    const speed = input.shift ? this.RUN_SPEED : this.WALK_SPEED;
    
    // Calculate movement direction
    const forward = input.w ? 1 : input.s ? -1 : 0;
    const right = input.d ? 1 : input.a ? -1 : 0;
    
    // Apply movement relative to camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
    
    // Update velocity
    this.velocity.set(0, 0, 0);
    this.velocity.addScaledVector(cameraDirection, forward * speed);
    this.velocity.addScaledVector(rightVector, right * speed);
    
    // Apply movement
    player.position.addScaledVector(this.velocity, deltaTime);
    
    // Rotate player to face movement direction
    if (this.velocity.length() > 0.1) {
      player.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
    }
  }
}
```

#### 5.3 Camera System
```typescript
// CameraController.ts
export class CameraController {
  private mode: 'third-person' | 'overhead' = 'third-person';
  private distance = 10;
  private height = 5;
  private angle = 0;
  
  constructor(private camera: THREE.PerspectiveCamera) {}
  
  update(player: Player, input: InputState) {
    if (input.toggleCamera) {
      this.mode = this.mode === 'third-person' ? 'overhead' : 'third-person';
    }
    
    if (this.mode === 'third-person') {
      // Orbit around player
      this.angle += input.mouseX * 0.01;
      this.height = Math.max(2, Math.min(20, this.height - input.mouseY * 0.1));
      
      this.camera.position.x = player.position.x + Math.sin(this.angle) * this.distance;
      this.camera.position.y = player.position.y + this.height;
      this.camera.position.z = player.position.z + Math.cos(this.angle) * this.distance;
      
      this.camera.lookAt(player.position);
    } else {
      // Overhead view
      this.camera.position.set(
        player.position.x,
        player.position.y + 50,
        player.position.z + 10
      );
      this.camera.lookAt(player.position);
    }
  }
}
```

### 6. Hexagonal Grid System

#### 6.1 Hex Mathematics
```typescript
// HexUtils.ts
export interface HexCoord {
  q: number;  // Column
  r: number;  // Row
}

export class HexUtils {
  static readonly HEX_SIZE = 1.0; // Radius in world units
  
  // Convert world position to hex coordinates
  static worldToHex(worldPos: THREE.Vector3): HexCoord {
    const x = worldPos.x;
    const z = worldPos.z;
    
    const q = (2/3 * x) / this.HEX_SIZE;
    const r = (-1/3 * x + Math.sqrt(3)/3 * z) / this.HEX_SIZE;
    
    return this.roundHex(q, r);
  }
  
  // Convert hex to world position
  static hexToWorld(hex: HexCoord): THREE.Vector3 {
    const x = this.HEX_SIZE * (3/2 * hex.q);
    const z = this.HEX_SIZE * (Math.sqrt(3)/2 * hex.q + Math.sqrt(3) * hex.r);
    
    return new THREE.Vector3(x, 0, z);
  }
  
  // Round fractional hex coordinates
  static roundHex(q: number, r: number): HexCoord {
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(-q - r);
    
    const q_diff = Math.abs(rq - q);
    const r_diff = Math.abs(rr - r);
    const s_diff = Math.abs(rs - (-q - r));
    
    if (q_diff > r_diff && q_diff > s_diff) {
      rq = -rr - rs;
    } else if (r_diff > s_diff) {
      rr = -rq - rs;
    }
    
    return { q: rq, r: rr };
  }
  
  // Get hex neighbors
  static getNeighbors(hex: HexCoord): HexCoord[] {
    return [
      { q: hex.q + 1, r: hex.r },
      { q: hex.q + 1, r: hex.r - 1 },
      { q: hex.q, r: hex.r - 1 },
      { q: hex.q - 1, r: hex.r },
      { q: hex.q - 1, r: hex.r + 1 },
      { q: hex.q, r: hex.r + 1 }
    ];
  }
}
```

#### 6.2 Hex Grid Visualization
```typescript
// HexGrid.ts
export class HexGrid {
  private gridHelper: THREE.Group;
  private readonly GRID_RADIUS = 20; // Show 20 hexes around player
  
  constructor(scene: THREE.Scene) {
    this.gridHelper = new THREE.Group();
    this.gridHelper.visible = false; // Toggle with key
    scene.add(this.gridHelper);
    
    this.createGridLines();
  }
  
  private createGridLines() {
    const material = new THREE.LineBasicMaterial({ 
      color: 0x888888, 
      opacity: 0.3,
      transparent: true 
    });
    
    // Generate hex outlines
    for (let q = -this.GRID_RADIUS; q <= this.GRID_RADIUS; q++) {
      for (let r = -this.GRID_RADIUS; r <= this.GRID_RADIUS; r++) {
        if (Math.abs(q + r) > this.GRID_RADIUS) continue;
        
        const hex = { q, r };
        const center = HexUtils.hexToWorld(hex);
        const points = this.getHexCorners(center);
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.LineLoop(geometry, material);
        this.gridHelper.add(line);
      }
    }
  }
  
  private getHexCorners(center: THREE.Vector3): THREE.Vector3[] {
    const corners: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      corners.push(new THREE.Vector3(
        center.x + HexUtils.HEX_SIZE * Math.cos(angle),
        0.01, // Slightly above ground
        center.z + HexUtils.HEX_SIZE * Math.sin(angle)
      ));
    }
    return corners;
  }
  
  toggleVisibility() {
    this.gridHelper.visible = !this.gridHelper.visible;
  }
}
```

### 7. Soil Placement System

#### 7.1 Soil Manager
```typescript
// SoilManager.ts
export class SoilManager {
  private soilHexes: Map<string, SoilHex> = new Map();
  private placementPreview: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  
  constructor(private scene: THREE.Scene) {
    this.createPreviewHex();
  }
  
  private createPreviewHex() {
    const geometry = this.createHexGeometry();
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      opacity: 0.5,
      transparent: true
    });
    
    this.placementPreview = new THREE.Mesh(geometry, material);
    this.placementPreview.visible = false;
    this.scene.add(this.placementPreview);
  }
  
  private createHexGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = HexUtils.HEX_SIZE * Math.cos(angle);
      const z = HexUtils.HEX_SIZE * Math.sin(angle);
      
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    shape.closePath();
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: false
    });
    
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }
  
  updatePreview(mousePos: THREE.Vector2, camera: THREE.Camera) {
    this.raycaster.setFromCamera(mousePos, camera);
    const intersects = this.raycaster.intersectObject(desert.plane);
    
    if (intersects.length > 0) {
      const worldPos = intersects[0].point;
      const hexCoord = HexUtils.worldToHex(worldPos);
      const hexKey = `${hexCoord.q},${hexCoord.r}`;
      
      // Show preview
      this.placementPreview.visible = true;
      const snapPos = HexUtils.hexToWorld(hexCoord);
      this.placementPreview.position.copy(snapPos);
      
      // Color based on validity
      const canPlace = !this.soilHexes.has(hexKey);
      this.placementPreview.material.color.setHex(
        canPlace ? 0x00ff00 : 0xff0000
      );
    } else {
      this.placementPreview.visible = false;
    }
  }
  
  placeSoil(hexCoord: HexCoord) {
    const hexKey = `${hexCoord.q},${hexCoord.r}`;
    
    if (this.soilHexes.has(hexKey)) {
      return false; // Already has soil
    }
    
    const soil = new SoilHex(hexCoord);
    this.soilHexes.set(hexKey, soil);
    this.scene.add(soil.mesh);
    
    return true;
  }
  
  removeSoil(hexCoord: HexCoord) {
    const hexKey = `${hexCoord.q},${hexCoord.r}`;
    const soil = this.soilHexes.get(hexKey);
    
    if (soil) {
      this.scene.remove(soil.mesh);
      this.soilHexes.delete(hexKey);
      return true;
    }
    
    return false;
  }
}

// SoilHex.ts
class SoilHex {
  public readonly mesh: THREE.Mesh;
  
  constructor(public readonly coord: HexCoord) {
    // Create soil mesh
    const geometry = this.createHexGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Position in world
    const worldPos = HexUtils.hexToWorld(coord);
    this.mesh.position.copy(worldPos);
  }
}
```

### 8. Input System

#### 8.1 Input Manager
```typescript
// InputManager.ts
export interface InputState {
  // Movement
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  shift: boolean;
  space: boolean;
  
  // Mouse
  mouseX: number;
  mouseY: number;
  mouseLeft: boolean;
  mouseRight: boolean;
  
  // Camera
  toggleCamera: boolean;
  
  // Tools
  currentTool: 'place' | 'remove';
}

export class InputManager {
  private state: InputState;
  private mouseMovement = { x: 0, y: 0 };
  
  constructor() {
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      switch(e.key.toLowerCase()) {
        case 'w': this.state.w = true; break;
        case 'a': this.state.a = true; break;
        case 's': this.state.s = true; break;
        case 'd': this.state.d = true; break;
        case 'shift': this.state.shift = true; break;
        case 'tab': 
          e.preventDefault();
          this.state.toggleCamera = true; 
          break;
      }
    });
    
    // Mouse
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.mouseMovement.x += e.movementX;
        this.mouseMovement.y += e.movementY;
      }
    });
    
    // Pointer lock
    document.addEventListener('click', () => {
      document.body.requestPointerLock();
    });
  }
  
  update() {
    // Apply and clear mouse movement
    this.state.mouseX = this.mouseMovement.x * 0.1;
    this.state.mouseY = this.mouseMovement.y * 0.1;
    this.mouseMovement.x *= 0.8; // Smoothing
    this.mouseMovement.y *= 0.8;
    
    // Clear toggle states
    this.state.toggleCamera = false;
  }
}
```

### 9. Performance Monitoring

```typescript
// Game.ts
export class Game {
  private stats: Stats; // Using three.js stats
  
  constructor() {
    // FPS counter
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);
  }
  
  update(deltaTime: number) {
    this.stats.begin();
    
    // Update all systems
    this.inputManager.update();
    this.player.update(deltaTime);
    this.camera.update(this.player);
    this.desert.update(this.player.position);
    this.lighting.update(deltaTime);
    this.soilManager.update();
    
    this.stats.end();
  }
}
```

### 10. Visual Style Guide

#### 10.1 Colors
- **Desert Sand**: #d4a574 (base terrain)
- **Soil**: #654321 (placed hexes)
- **Grid Lines**: #888888 (30% opacity)
- **Valid Placement**: #00ff00 (green preview)
- **Invalid Placement**: #ff0000 (red preview)
- **Sky**: Gradient from #87CEEB (day) to #191970 (night)

#### 10.2 Materials
- **Desert**: Rough, sandy texture with normal map
- **Soil**: Very rough, no shine, darker than sand
- **Player**: Simple colored capsule for now

### 11. Testing Checklist

- [ ] Player spawns in desert
- [ ] WASD movement works
- [ ] Camera orbits in 3rd person
- [ ] Tab switches to overhead view
- [ ] Desert extends infinitely
- [ ] Day/night cycle visible
- [ ] Hex grid can be toggled
- [ ] Soil placement preview follows mouse
- [ ] Left click places soil
- [ ] Right click removes soil
- [ ] Can't place soil on existing soil
- [ ] Performance stays at 60 FPS

### 12. Known Limitations (Phase 1)

- No water simulation yet
- No plant system
- No UI panels
- No save/load
- Basic graphics
- No sound
- Fixed soil type (loam only)
- No resource management