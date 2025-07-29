import * as THREE from 'three';
import { Portal, PortalConfig } from './Portal';

// Mock Three.js
jest.mock('three');

describe('Portal', () => {
  let portal: Portal;
  let config: PortalConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Three.js constructors
    (THREE.Group as any).mockImplementation(() => ({
      position: new THREE.Vector3(),
      add: jest.fn(),
      children: []
    }));
    
    (THREE.Mesh as any).mockImplementation(() => ({
      rotation: { x: 0, y: 0, z: 0 },
      scale: { set: jest.fn() },
      material: { opacity: 1 }
    }));
    
    (THREE.Points as any).mockImplementation(() => ({
      rotation: { x: 0, y: 0, z: 0 },
      material: { opacity: 0.8 }
    }));
    
    (THREE.PointLight as any).mockImplementation(() => ({
      position: { set: jest.fn() },
      intensity: 2
    }));
    
    (THREE.Vector3 as any).mockImplementation((x = 0, y = 0, z = 0) => ({
      x, y, z,
      copy: jest.fn().mockReturnThis(),
      distanceTo: jest.fn().mockReturnValue(5),
      clone: jest.fn().mockReturnThis()
    }));

    config = {
      biomeType: 'fertile_valley',
      position: new THREE.Vector3(10, 0, 10),
      duration: 300
    };

    portal = new Portal(config);
  });

  describe('constructor', () => {
    it('should create portal with correct properties', () => {
      expect(portal.mesh).toBeDefined();
      expect(portal.mesh.position.copy).toHaveBeenCalledWith(config.position);
      expect(portal.canEnter()).toBe(true);
      expect(portal.getBiomeType()).toBe('fertile_valley');
    });

    it('should create all visual components', () => {
      // Should have created 4 components
      expect(portal.mesh.add).toHaveBeenCalledTimes(4);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // Mock the portal surface material
      const surfaceMaterial = { uniforms: { time: { value: 0 } } };
      (portal as any).portalSurface = { material: surfaceMaterial };
      
      // Mock particle system
      (portal as any).particleSystem = { rotation: { y: 0 } };
      
      // Mock frame mesh
      (portal as any).frameMesh = { scale: { set: jest.fn() } };
      
      // Mock glow light
      (portal as any).glowLight = { intensity: 2 };
    });

    it('should decrease time remaining', () => {
      const initialTime = portal.getTimeRemaining();
      portal.update(1.0);
      expect(portal.getTimeRemaining()).toBe(initialTime - 1.0);
    });

    it('should update animation time', () => {
      portal.update(1.0);
      expect((portal as any).portalSurface.material.uniforms.time.value).toBe(1.0);
    });

    it('should rotate particles', () => {
      portal.update(2.0);
      expect((portal as any).particleSystem.rotation.y).toBe(1.0); // 2.0 * 0.5
    });

    it('should start fading when time is low', () => {
      // Set time to 8 seconds remaining
      (portal as any).timeRemaining = 8;
      
      const frameMaterial = { opacity: 1 };
      const surfaceMaterial = { opacity: 1, uniforms: { time: { value: 0 } } };
      const particleMaterial = { opacity: 0.8 };
      
      (portal as any).frameMesh = { material: frameMaterial, scale: { set: jest.fn() } };
      (portal as any).portalSurface = { material: surfaceMaterial };
      (portal as any).particleSystem = { material: particleMaterial, rotation: { y: 0 } };
      
      portal.update(0.1);
      
      // Should fade based on time remaining
      const fadeRatio = 7.9 / 10; // (8 - 0.1) / 10
      expect(frameMaterial.opacity).toBeCloseTo(fadeRatio);
      expect(surfaceMaterial.opacity).toBeCloseTo(fadeRatio);
      expect(particleMaterial.opacity).toBeCloseTo(0.8 * fadeRatio);
    });

    it('should deactivate when time runs out', () => {
      (portal as any).timeRemaining = 0.5;
      
      // Mock materials to avoid opacity error
      (portal as any).frameMesh.material = { opacity: 1 };
      (portal as any).portalSurface.material = { opacity: 1, uniforms: { time: { value: 0 } } };
      (portal as any).particleSystem.material = { opacity: 0.8 };
      
      portal.update(1.0);
      
      expect(portal.canEnter()).toBe(false);
      expect(portal.getTimeRemaining()).toBe(0);
    });
  });

  describe('isPlayerNearby', () => {
    it('should return true when player is within range', () => {
      const playerPos = new THREE.Vector3(12, 0, 10);
      
      // Mock the portal position's distanceTo method
      portal.mesh.position.distanceTo = jest.fn().mockReturnValue(2);
      
      expect(portal.isPlayerNearby(playerPos)).toBe(true);
    });

    it('should return false when player is outside range', () => {
      const playerPos = new THREE.Vector3(20, 0, 20);
      
      // Mock the portal position's distanceTo method
      portal.mesh.position.distanceTo = jest.fn().mockReturnValue(15);
      
      expect(portal.isPlayerNearby(playerPos)).toBe(false);
    });

    it('should use custom range', () => {
      const playerPos = new THREE.Vector3(15, 0, 10);
      
      // Mock the portal position's distanceTo method
      portal.mesh.position.distanceTo = jest.fn().mockReturnValue(5);
      
      expect(portal.isPlayerNearby(playerPos, 4)).toBe(false);
      expect(portal.isPlayerNearby(playerPos, 6)).toBe(true);
    });
  });

  describe('canEnter', () => {
    it('should allow entry with sufficient time', () => {
      expect(portal.canEnter()).toBe(true);
    });

    it('should prevent entry with insufficient time', () => {
      (portal as any).timeRemaining = 4;
      expect(portal.canEnter()).toBe(false);
    });

    it('should prevent entry when inactive', () => {
      (portal as any).isActive = false;
      expect(portal.canEnter()).toBe(false);
    });
  });

  describe('biome colors', () => {
    const testCases = [
      { biome: 'fertile_valley', color: 0x4CAF50, accent: 0x8BC34A },
      { biome: 'ancient_forest', color: 0x2E7D32, accent: 0x43A047 },
      { biome: 'volcanic_ash', color: 0xFF5722, accent: 0xFFC107 },
      { biome: 'crystal_caves', color: 0x9C27B0, accent: 0xE91E63 }
    ];

    testCases.forEach(({ biome, color, accent }) => {
      it(`should use correct colors for ${biome}`, () => {
        const testConfig: PortalConfig = {
          biomeType: biome as any,
          position: new THREE.Vector3(),
          duration: 300
        };
        
        const testPortal = new Portal(testConfig);
        expect((testPortal as any).getBiomeColor()).toBe(color);
        expect((testPortal as any).getBiomeAccentColor()).toBe(accent);
      });
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      const mockDispose = jest.fn();
      const mockGeometry = { dispose: mockDispose };
      const mockMaterial = { dispose: mockDispose };
      
      (portal as any).frameMesh = { 
        geometry: mockGeometry, 
        material: mockMaterial 
      };
      (portal as any).portalSurface = { 
        geometry: mockGeometry, 
        material: mockMaterial 
      };
      (portal as any).particleSystem = { 
        geometry: mockGeometry, 
        material: mockMaterial 
      };
      
      portal.mesh.clear = jest.fn();
      
      portal.dispose();
      
      expect(mockDispose).toHaveBeenCalledTimes(6); // 3 geometries + 3 materials
      expect(portal.mesh.clear).toHaveBeenCalled();
    });
  });
});