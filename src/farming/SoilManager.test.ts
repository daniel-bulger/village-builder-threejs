import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SoilManager } from './SoilManager';
import { InputState } from '../game/InputManager';
import { HexUtils } from '../utils/HexUtils';

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    getObjectByName: vi.fn()
  })),
  Raycaster: vi.fn(() => ({
    setFromCamera: vi.fn(),
    intersectObjects: vi.fn(() => [])
  })),
  Vector2: vi.fn((x, y) => ({ x, y })),
  Vector3: vi.fn((x, y, z) => ({ 
    x, y, z, 
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis()
  })),
  Mesh: vi.fn(() => ({
    position: { x: 0, y: 0, z: 0 },
    visible: false,
    material: { color: { setHex: vi.fn() } },
    geometry: { dispose: vi.fn() }
  })),
  MeshBasicMaterial: vi.fn(() => ({ 
    color: { setHex: vi.fn() },
    dispose: vi.fn()
  })),
  MeshStandardMaterial: vi.fn(() => ({ 
    dispose: vi.fn()
  })),
  BufferGeometry: vi.fn(() => ({ dispose: vi.fn() })),
  PlaneGeometry: vi.fn(() => ({ 
    rotateX: vi.fn(),
    dispose: vi.fn()
  })),
  PerspectiveCamera: vi.fn(() => ({}))
}));

// Mock dependencies
vi.mock('../utils/HexUtils');
vi.mock('../utils/SubHexUtils');
vi.mock('./WaterSimulation');
vi.mock('./PlantSimulation');
vi.mock('./PlantRenderer');

describe('SoilManager Shift+Scroll', () => {
  let soilManager: SoilManager;
  let mockScene: THREE.Scene;
  let mockCamera: THREE.PerspectiveCamera;
  let inputState: InputState;

  beforeEach(() => {
    mockScene = new THREE.Scene() as any;
    mockCamera = new THREE.PerspectiveCamera() as any;
    soilManager = new SoilManager(mockScene);
    
    // Default input state
    inputState = {
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
      currentTool: 'place',
      toolSwitch: 0
    };

    // Mock raycaster to simulate hovering over a hex
    const mockIntersect = {
      point: { x: 0, y: 0, z: 0 },
      object: { name: 'soil-hex' }
    };
    
    (soilManager as any).raycaster.intersectObjects = vi.fn(() => [mockIntersect]);
    
    // Mock HexUtils to return a consistent hex coordinate
    (HexUtils.worldToHex as any) = vi.fn(() => ({ q: 0, r: 0 }));
    (HexUtils.hexToWorld as any) = vi.fn(() => ({ x: 0, y: 0, z: 0 }));
    (HexUtils.hexToKey as any) = vi.fn(() => '0,0');
    (HexUtils.hex3DToKey as any) = vi.fn(() => '0,0,0');
  });

  it('should change targetY when shift+scroll is used', () => {
    // First update to establish hoveredHex
    soilManager.update(inputState, mockCamera);
    
    // Get initial state
    const initialY = soilManager.getPlacementHeight();
    console.log('Initial placement height:', initialY);
    
    // Simulate shift+scroll up (negative delta should increase height)
    inputState.shift = true;
    inputState.scrollDelta = -1;
    
    // Access private members for testing
    const soilManagerAny = soilManager as any;
    console.log('Before shift+scroll:');
    console.log('  hoveredHex:', soilManagerAny.hoveredHex);
    console.log('  targetY:', soilManagerAny.targetY);
    console.log('  hasScrolled:', soilManagerAny.hasScrolled);
    console.log('  useManualHeight:', soilManagerAny.useManualHeight);
    
    soilManager.update(inputState, mockCamera);
    
    console.log('After shift+scroll:');
    console.log('  targetY:', soilManagerAny.targetY);
    console.log('  hoveredY:', soilManagerAny.hoveredY);
    console.log('  hasScrolled:', soilManagerAny.hasScrolled);
    console.log('  useManualHeight:', soilManagerAny.useManualHeight);
    
    const newY = soilManager.getPlacementHeight();
    console.log('New placement height:', newY);
    
    // Should have increased the height
    expect(newY).toBe(initialY + 1);
    expect(soilManagerAny.hasScrolled).toBe(true);
  });

  it('should respect height limits when shift+scrolling', () => {
    // Place some soil first
    (soilManager as any).soilColumns.set('0,0', 2); // Column has height 2
    
    // First update to establish hoveredHex
    soilManager.update(inputState, mockCamera);
    
    // Simulate shift+scroll up multiple times
    inputState.shift = true;
    
    for (let i = 0; i < 5; i++) {
      inputState.scrollDelta = -1;
      soilManager.update(inputState, mockCamera);
    }
    
    const soilManagerAny = soilManager as any;
    console.log('After multiple scrolls:');
    console.log('  targetY:', soilManagerAny.targetY);
    console.log('  hoveredY:', soilManagerAny.hoveredY);
    console.log('  Column height:', 2);
    
    // Should be capped at maxHeight + 1 (2 + 1 = 3)
    expect(soilManager.getPlacementHeight()).toBe(3);
  });

  it('should reset when moving to different hex', () => {
    // First hover and scroll
    soilManager.update(inputState, mockCamera);
    
    inputState.shift = true;
    inputState.scrollDelta = -2;
    soilManager.update(inputState, mockCamera);
    
    const soilManagerAny = soilManager as any;
    expect(soilManagerAny.hasScrolled).toBe(true);
    
    // Change hex coordinate
    (HexUtils.worldToHex as any) = vi.fn(() => ({ q: 1, r: 1 }));
    (HexUtils.hexToKey as any) = vi.fn(() => '1,1');
    
    // Update without scroll
    inputState.scrollDelta = 0;
    inputState.shift = false;
    soilManager.update(inputState, mockCamera);
    
    // Should have reset
    expect(soilManagerAny.hasScrolled).toBe(false);
    expect(soilManagerAny.useManualHeight).toBe(false);
  });

  it('should handle the full update flow correctly', () => {
    const soilManagerAny = soilManager as any;
    
    // Log initial state
    console.log('\n=== Full Flow Test ===');
    console.log('Initial state:');
    console.log('  hoveredHex:', soilManagerAny.hoveredHex);
    console.log('  targetY:', soilManagerAny.targetY);
    console.log('  hoveredY:', soilManagerAny.hoveredY);
    
    // First update to establish hover
    soilManager.update(inputState, mockCamera);
    console.log('\nAfter first update (hover):');
    console.log('  hoveredHex:', soilManagerAny.hoveredHex);
    console.log('  targetY:', soilManagerAny.targetY);
    console.log('  hoveredY:', soilManagerAny.hoveredY);
    
    // Shift+scroll
    inputState.shift = true;
    inputState.scrollDelta = -1;
    
    // Check the condition that should trigger
    const condition = inputState.scrollDelta !== 0 && soilManagerAny.hoveredHex && inputState.shift;
    console.log('\nShift+scroll condition check:');
    console.log('  scrollDelta !== 0:', inputState.scrollDelta !== 0);
    console.log('  hoveredHex exists:', !!soilManagerAny.hoveredHex);
    console.log('  shift pressed:', inputState.shift);
    console.log('  Condition result:', condition);
    
    soilManager.update(inputState, mockCamera);
    console.log('\nAfter shift+scroll update:');
    console.log('  targetY:', soilManagerAny.targetY);
    console.log('  hoveredY:', soilManagerAny.hoveredY);
    console.log('  hasScrolled:', soilManagerAny.hasScrolled);
    
    // The key assertion
    expect(soilManagerAny.hoveredY).toBe(1);
  });
});