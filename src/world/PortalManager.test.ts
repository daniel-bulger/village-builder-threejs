import * as THREE from 'three';
import { PortalManager } from './PortalManager';
import { Portal } from './Portal';

// Mock Portal class
jest.mock('./Portal');

describe('PortalManager', () => {
  let portalManager: PortalManager;
  let mockScene: THREE.Scene;
  let mockPortal: jest.Mocked<Portal>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    } as any;
    
    // Mock portal
    mockPortal = {
      mesh: { position: new THREE.Vector3() },
      update: jest.fn(),
      getTimeRemaining: jest.fn().mockReturnValue(100),
      isPlayerNearby: jest.fn().mockReturnValue(false),
      canEnter: jest.fn().mockReturnValue(true),
      getBiomeType: jest.fn().mockReturnValue('fertile_valley'),
      getPosition: jest.fn().mockReturnValue(new THREE.Vector3(10, 0, 10)),
      dispose: jest.fn()
    } as any;
    
    (Portal as jest.MockedClass<typeof Portal>).mockImplementation(() => mockPortal);
    
    portalManager = new PortalManager(mockScene);
  });

  describe('update', () => {
    it('should update active portal', () => {
      // Force spawn a portal
      portalManager.forceSpawnPortal(new THREE.Vector3());
      
      // Update
      portalManager.update(1.0, 0.25, 1, new THREE.Vector3());
      
      expect(mockPortal.update).toHaveBeenCalledWith(1.0);
    });

    it('should remove expired portal', () => {
      // Force spawn a portal
      portalManager.forceSpawnPortal(new THREE.Vector3());
      
      // Make portal expired
      mockPortal.getTimeRemaining.mockReturnValue(0);
      
      // Update - this should trigger removal
      portalManager.update(1.0, 0.25, 1, new THREE.Vector3());
      
      expect(mockScene.remove).toHaveBeenCalledWith(mockPortal.mesh);
      expect(mockPortal.dispose).toHaveBeenCalled();
      
      // The removal happens in update, so activePortal should be null
      expect(portalManager.getActivePortal()).toBeNull();
    });

    it('should spawn portal at correct time of day', () => {
      const playerPos = new THREE.Vector3(0, 0, 0);
      
      // Set time to 6 AM (0.25)
      portalManager.update(1.0, 0.25, 1, playerPos);
      
      expect(Portal).toHaveBeenCalled();
      expect(mockScene.add).toHaveBeenCalled();
    });

    it('should not spawn multiple portals on same day', () => {
      const playerPos = new THREE.Vector3(0, 0, 0);
      
      // First spawn
      portalManager.update(1.0, 0.25, 1, playerPos);
      expect(Portal).toHaveBeenCalledTimes(1);
      
      // Try to spawn again on same day
      jest.clearAllMocks();
      portalManager.update(1.0, 0.25, 1, playerPos);
      expect(Portal).not.toHaveBeenCalled();
    });

    it('should spawn portal on new day', () => {
      const playerPos = new THREE.Vector3(0, 0, 0);
      
      // Day 1
      portalManager.update(1.0, 0.25, 1, playerPos);
      expect(Portal).toHaveBeenCalledTimes(1);
      
      // Remove the portal to allow spawning on day 2
      (portalManager as any).activePortal = null;
      
      // Day 2
      jest.clearAllMocks();
      portalManager.update(1.0, 0.25, 2, playerPos);
      expect(Portal).toHaveBeenCalledTimes(1);
    });
  });

  describe('portal spawning', () => {
    it('should spawn portal at correct distance from player', () => {
      const playerPos = new THREE.Vector3(10, 0, 10);
      
      portalManager.forceSpawnPortal(playerPos);
      
      const portalConfig = (Portal as jest.MockedClass<typeof Portal>).mock.calls[0][0];
      
      // forceSpawnPortal uses a fixed offset of (10, 0, 10)
      const expectedPos = new THREE.Vector3(20, 0, 20);
      expect(portalConfig.position.x).toBe(expectedPos.x);
      expect(portalConfig.position.y).toBe(expectedPos.y);
      expect(portalConfig.position.z).toBe(expectedPos.z);
    });

    it('should spawn portal at ground level', () => {
      const playerPos = new THREE.Vector3(0, 5, 0);
      
      portalManager.forceSpawnPortal(playerPos);
      
      const portalConfig = (Portal as jest.MockedClass<typeof Portal>).mock.calls[0][0];
      expect(portalConfig.position.y).toBe(0);
    });

    it('should choose random biome type', () => {
      const biomeTypes = new Set<string>();
      
      // Spawn multiple portals to test randomization
      for (let i = 0; i < 20; i++) {
        jest.clearAllMocks();
        portalManager.forceSpawnPortal(new THREE.Vector3());
        
        const portalConfig = (Portal as jest.MockedClass<typeof Portal>).mock.calls[0][0];
        biomeTypes.add(portalConfig.biomeType);
      }
      
      // Should have at least 2 different biome types
      expect(biomeTypes.size).toBeGreaterThanOrEqual(2);
    });

    it('should allow forced biome type', () => {
      portalManager.forceSpawnPortal(new THREE.Vector3(), 'volcanic_ash');
      
      const portalConfig = (Portal as jest.MockedClass<typeof Portal>).mock.calls[0][0];
      expect(portalConfig.biomeType).toBe('volcanic_ash');
    });
  });

  describe('portal interaction', () => {
    beforeEach(() => {
      portalManager.forceSpawnPortal(new THREE.Vector3());
    });

    it('should detect when player is near portal', () => {
      mockPortal.isPlayerNearby.mockReturnValue(true);
      
      const playerPos = new THREE.Vector3();
      expect(portalManager.isPlayerNearPortal(playerPos)).toBe(true);
      expect(mockPortal.isPlayerNearby).toHaveBeenCalledWith(playerPos);
    });

    it('should check if portal can be entered', () => {
      mockPortal.canEnter.mockReturnValue(true);
      expect(portalManager.canEnterPortal()).toBe(true);
      
      mockPortal.canEnter.mockReturnValue(false);
      expect(portalManager.canEnterPortal()).toBe(false);
    });

    it('should return false when no active portal', () => {
      // Remove portal
      (portalManager as any).activePortal = null;
      
      expect(portalManager.isPlayerNearPortal(new THREE.Vector3())).toBe(false);
      expect(portalManager.canEnterPortal()).toBe(false);
    });
  });

  describe('getActivePortal', () => {
    it('should return active portal', () => {
      portalManager.forceSpawnPortal(new THREE.Vector3());
      expect(portalManager.getActivePortal()).toBe(mockPortal);
    });

    it('should return null when no portal', () => {
      expect(portalManager.getActivePortal()).toBeNull();
    });
  });
});