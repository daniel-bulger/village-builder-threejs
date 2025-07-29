import { test, expect } from '@playwright/test';
import * as THREE from 'three';

test.describe('Portal System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for game initialization
    await page.waitForFunction(() => {
      const gameWindow = window as any;
      return gameWindow.game && gameWindow.game.isInitialized;
    });
  });

  test('should spawn portal with P key', async ({ page }) => {
    // Press P to spawn a test portal
    await page.keyboard.press('p');
    
    // Check that portal was created
    const portalInfo = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const portal = game.portalManager.getActivePortal();
      
      if (!portal) return null;
      
      return {
        biomeType: portal.getBiomeType(),
        position: portal.getPosition(),
        timeRemaining: portal.getTimeRemaining(),
        canEnter: portal.canEnter()
      };
    });
    
    expect(portalInfo).not.toBeNull();
    expect(['fertile_valley', 'ancient_forest', 'volcanic_ash', 'crystal_caves']).toContain(portalInfo.biomeType);
    expect(portalInfo.timeRemaining).toBeGreaterThan(0);
    expect(portalInfo.canEnter).toBe(true);
  });

  test('should show portal info in UI', async ({ page }) => {
    // Spawn a portal
    await page.keyboard.press('p');
    
    // Wait for UI update
    await page.waitForTimeout(100);
    
    // Check info panel
    const portalText = await page.locator('#info-content').textContent();
    expect(portalText).toContain('Portal:');
    expect(portalText).not.toContain('Portal: None');
    
    // Should show biome type and time remaining
    const portalMatch = portalText.match(/Portal: (\w+) \((\d+):(\d+)\)/);
    expect(portalMatch).not.toBeNull();
  });

  test('should show interaction hint when near portal', async ({ page }) => {
    // Spawn a portal near player
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      game.portalManager.forceSpawnPortal(game.player.position, 'fertile_valley');
    });
    
    // Move player very close to portal
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const portal = game.portalManager.getActivePortal();
      if (portal) {
        // Move player to portal position
        const portalPos = portal.getPosition();
        game.player.position.set(portalPos.x - 2, 0, portalPos.z - 2);
      }
    });
    
    // Wait for UI update
    await page.waitForTimeout(100);
    
    // Check for interaction hint
    const portalText = await page.locator('#info-content').innerHTML();
    expect(portalText).toContain('[E] Enter');
  });

  test('should update portal animation over time', async ({ page }) => {
    // Spawn a portal
    await page.keyboard.press('p');
    
    // Get initial animation state
    const initialState = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const portal = game.portalManager.getActivePortal();
      if (!portal) return null;
      
      // Access internal state through mesh
      const frameMesh = portal.mesh.children.find(child => child.type === 'Mesh');
      return {
        frameScale: frameMesh ? frameMesh.scale.x : 1,
        particleRotation: portal.mesh.children.find(child => child.type === 'Points')?.rotation.y || 0
      };
    });
    
    // Enable animations and wait
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(true);
    });
    
    await page.waitForTimeout(1000);
    
    // Get updated state
    const updatedState = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const portal = game.portalManager.getActivePortal();
      if (!portal) return null;
      
      const frameMesh = portal.mesh.children.find(child => child.type === 'Mesh');
      return {
        frameScale: frameMesh ? frameMesh.scale.x : 1,
        particleRotation: portal.mesh.children.find(child => child.type === 'Points')?.rotation.y || 0
      };
    });
    
    // Particle rotation should have changed
    expect(updatedState.particleRotation).not.toBe(initialState.particleRotation);
  });

  test('should handle portal expiration', async ({ page }) => {
    // Create a short-duration portal
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Remove any existing portal
      const existingPortal = game.portalManager.getActivePortal();
      if (existingPortal) {
        game.scene.remove(existingPortal.mesh);
      }
      
      // Create portal with 1 second duration
      const THREE = gameWindow.THREE;
      const Portal = gameWindow.Portal || class Portal {
        constructor(config) {
          this.config = config;
          this.timeRemaining = config.duration;
          this.mesh = new THREE.Group();
          this.isActive = true;
        }
        update(dt) { 
          this.timeRemaining -= dt;
          if (this.timeRemaining <= 0) this.isActive = false;
        }
        getTimeRemaining() { return Math.max(0, this.timeRemaining); }
        canEnter() { return this.isActive && this.timeRemaining > 5; }
        getBiomeType() { return this.config.biomeType; }
        getPosition() { return this.mesh.position; }
        isPlayerNearby() { return false; }
        dispose() {}
      };
      
      const portalConfig = {
        biomeType: 'fertile_valley',
        position: new THREE.Vector3(10, 0, 10),
        duration: 0.5 // Very short duration
      };
      
      // Manually create and set portal
      const portal = new Portal(portalConfig);
      game.scene.add(portal.mesh);
      game.portalManager.activePortal = portal;
    });
    
    // Enable animations and speed up time
    await page.evaluate(() => {
      const gameWindow = window as any;
      gameWindow.game.setAnimationsEnabled(true);
      gameWindow.game.timeScale = 10;
    });
    
    // Wait for portal to expire
    await page.waitForTimeout(1000);
    
    // Check that portal is gone
    const hasPortal = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      return game.portalManager.getActivePortal() !== null;
    });
    
    expect(hasPortal).toBe(false);
  });

  test('should prevent entering portal with insufficient time', async ({ page }) => {
    // Create a portal that's about to expire
    await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      const THREE = gameWindow.THREE;
      
      // Create portal with only 3 seconds remaining (need 5 to enter)
      const Portal = gameWindow.Portal || class Portal {
        constructor(config) {
          this.config = config;
          this.timeRemaining = 3; // Override duration
          this.mesh = new THREE.Group();
          this.isActive = true;
        }
        update(dt) { this.timeRemaining -= dt; }
        getTimeRemaining() { return Math.max(0, this.timeRemaining); }
        canEnter() { return this.isActive && this.timeRemaining > 5; }
        getBiomeType() { return this.config.biomeType; }
        getPosition() { return this.mesh.position; }
        isPlayerNearby() { return true; } // Always near
        dispose() {}
      };
      
      const portalConfig = {
        biomeType: 'fertile_valley',
        position: new THREE.Vector3(10, 0, 10),
        duration: 300
      };
      
      const portal = new Portal(portalConfig);
      game.scene.add(portal.mesh);
      game.portalManager.activePortal = portal;
    });
    
    // Check that we can't enter
    const canEnter = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      return game.portalManager.canEnterPortal();
    });
    
    expect(canEnter).toBe(false);
  });

  test('should spawn different biome types', async ({ page }) => {
    const biomeTypes = new Set();
    
    // Spawn multiple portals to get variety
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        const gameWindow = window as any;
        const game = gameWindow.game;
        game.portalManager.forceSpawnPortal(game.player.position);
      });
      
      const biomeType = await page.evaluate(() => {
        const gameWindow = window as any;
        const game = gameWindow.game;
        const portal = game.portalManager.getActivePortal();
        return portal ? portal.getBiomeType() : null;
      });
      
      if (biomeType) {
        biomeTypes.add(biomeType);
      }
    }
    
    // Should have spawned at least 2 different biome types
    expect(biomeTypes.size).toBeGreaterThanOrEqual(2);
    
    // All biome types should be valid
    const validBiomes = ['fertile_valley', 'ancient_forest', 'volcanic_ash', 'crystal_caves'];
    for (const biome of biomeTypes) {
      expect(validBiomes).toContain(biome);
    }
  });
});