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
  mousePosition: { x: number; y: number };
  mouseLeft: boolean;
  mouseRight: boolean;
  mouseMiddle: boolean;
  scrollDelta: number;
  
  // Camera
  toggleCamera: boolean;
  
  // Grid
  toggleGrid: boolean;
  
  // View options
  toggleSoilVisibility: boolean;
  toggleOrganicGrowth: boolean;
  
  // Inventory
  inventorySlot: number; // 0-9 keys (0 = slot 10)
  
  // Interaction
  interact: boolean; // E key
}

export class InputManager {
  private state: InputState;
  private mouseMovement = { x: 0, y: 0 };
  public keys = new Set<string>(); // Made public for debugging
  private mouseButtons = new Set<number>();
  private toggleStates = {
    camera: false,
    grid: false,
    soilVisibility: false,
    interact: false
  };
  private scrollAccumulator = 0;
  private scrollWithShift = false;
  
  constructor() {
    this.state = this.createDefaultState();
    this.setupEventListeners();
  }
  
  private createDefaultState(): InputState {
    return {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
      mouseX: 0,
      mouseY: 0,
      mousePosition: { x: 0, y: 0 },
      mouseLeft: false,
      mouseRight: false,
      mouseMiddle: false,
      scrollDelta: 0,
      toggleCamera: false,
      toggleGrid: false,
      toggleSoilVisibility: false,
      toggleOrganicGrowth: false,
      inventorySlot: -1,
      interact: false
    };
  }
  
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    
    // Mouse events
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    document.addEventListener('wheel', (e) => this.onMouseWheel(e), { passive: false });
    
    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // No pointer lock - we'll use mouse movement directly
  }
  
  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    
    // Prevent key repeat
    if (this.keys.has(key)) return;
    this.keys.add(key);
    
    // Handle toggle keys
    switch(key) {
      case 'tab':
        e.preventDefault();
        this.toggleStates.camera = true;
        break;
      case 'g':
        this.toggleStates.grid = true;
        break;
      case 'h':
        this.toggleStates.soilVisibility = true;
        break;
      case 'e':
        this.toggleStates.interact = true;
        break;
    }
  }
  
  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keys.delete(key);
  }
  
  private onMouseMove(e: MouseEvent): void {
    // Store normalized mouse position for raycasting
    this.state.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.state.mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    // Accumulate mouse movement for camera control when middle mouse is held
    if (this.mouseButtons.has(1)) { // Middle mouse button
      this.mouseMovement.x += e.movementX;
      this.mouseMovement.y += e.movementY;
    }
  }
  
  private onMouseDown(e: MouseEvent): void {
    this.mouseButtons.add(e.button);
    // Also update mouse position on click
    this.state.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.state.mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }
  
  private onMouseUp(e: MouseEvent): void {
    this.mouseButtons.delete(e.button);
  }
  
  private onMouseWheel(e: WheelEvent): void {
    e.preventDefault();
    // Normalize scroll direction across browsers
    // When shift is held, some systems convert deltaY to deltaX
    let delta = 0;
    
    // Check vertical scroll first
    if (Math.abs(e.deltaY) > 0.01) {
      delta = e.deltaY > 0 ? 1 : -1;
    }
    // If no vertical scroll but shift is held, check horizontal scroll
    else if (e.shiftKey && Math.abs(e.deltaX) > 0.01) {
      // Convert horizontal scroll back to vertical when shift is held
      delta = e.deltaX > 0 ? 1 : -1;
    }
    
    // Only accumulate if there's actual scrolling
    if (delta !== 0) {
      this.scrollAccumulator += delta;
      // Store whether shift was held during this scroll
      this.scrollWithShift = e.shiftKey;
    }
    
  }
  
  update(): void {
    // Update movement keys
    this.state.w = this.keys.has('w');
    this.state.a = this.keys.has('a');
    this.state.s = this.keys.has('s');
    this.state.d = this.keys.has('d');
    this.state.shift = this.keys.has('shift') || this.keys.has('shiftleft') || this.keys.has('shiftright');
    this.state.space = this.keys.has(' ');
    
    // Update mouse buttons
    this.state.mouseLeft = this.mouseButtons.has(0);
    this.state.mouseRight = this.mouseButtons.has(2);
    this.state.mouseMiddle = this.mouseButtons.has(1);
    
    // Apply and smooth mouse movement
    this.state.mouseX = this.mouseMovement.x * 0.1;
    this.state.mouseY = this.mouseMovement.y * 0.1;
    this.mouseMovement.x *= 0.8;
    this.mouseMovement.y *= 0.8;
    
    // Update scroll
    this.state.scrollDelta = this.scrollAccumulator;
    
    // Use the shift state from the wheel event if we're scrolling
    if (this.scrollAccumulator !== 0) {
      this.state.shift = this.scrollWithShift;
    }
    
    this.scrollAccumulator = 0;
    
    // Update toggle states
    this.state.toggleCamera = this.toggleStates.camera;
    this.state.toggleGrid = this.toggleStates.grid;
    this.state.toggleSoilVisibility = this.toggleStates.soilVisibility;
    this.state.interact = this.toggleStates.interact;
    
    // Clear toggle states for next frame
    this.toggleStates.camera = false;
    this.toggleStates.grid = false;
    this.toggleStates.soilVisibility = false;
    this.toggleStates.interact = false;
    
    // Check for inventory slot switching with number keys
    if (this.keys.has('1')) {
      this.state.inventorySlot = 0;
    } else if (this.keys.has('2')) {
      this.state.inventorySlot = 1;
    } else if (this.keys.has('3')) {
      this.state.inventorySlot = 2;
    } else if (this.keys.has('4')) {
      this.state.inventorySlot = 3;
    } else if (this.keys.has('5')) {
      this.state.inventorySlot = 4;
    } else if (this.keys.has('6')) {
      this.state.inventorySlot = 5;
    } else if (this.keys.has('7')) {
      this.state.inventorySlot = 6;
    } else if (this.keys.has('8')) {
      this.state.inventorySlot = 7;
    } else if (this.keys.has('9')) {
      this.state.inventorySlot = 8;
    } else if (this.keys.has('0')) {
      this.state.inventorySlot = 9;
    } else {
      this.state.inventorySlot = -1;
    }
  }
  
  getState(): InputState {
    return this.state;
  }
}