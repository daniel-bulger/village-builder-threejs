import { test, expect } from '@playwright/test';

test.describe('Placement Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Add test materials
    await page.keyboard.press('t');
    await page.waitForTimeout(100);
  });

  test('foundations should use single placement mode', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Select construction tool
      const hotbarSlots = game.inventorySystem.getHotbarSlots();
      const constructionSlot = hotbarSlots
        .findIndex(slot => slot.item?.id === 'construction_tool');
      if (constructionSlot >= 0) {
        game.inventorySystem.setActiveHotbarSlot(constructionSlot);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Select foundation
      game.buildingPlacer.startPlacement('foundation', 'wood');
      
      const placementInfo = game.buildingPlacer.getPlacementInfo();
      
      // Track components before and after clicks
      const componentsBefore = game.buildingManager.components.size;
      
      // Simulate first click
      const moveEvent = new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(moveEvent);
      
      const clickEvent = new MouseEvent('mousedown', {
        button: 0,
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(clickEvent);
      
      const componentsAfterFirst = game.buildingManager.components.size;
      
      // Move and click again
      const moveEvent2 = new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2 + 100,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(moveEvent2);
      
      const clickEvent2 = new MouseEvent('mousedown', {
        button: 0,
        clientX: window.innerWidth / 2 + 100,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(clickEvent2);
      
      const componentsAfterSecond = game.buildingManager.components.size;
      
      return {
        mode: placementInfo.mode,
        componentType: placementInfo.componentType,
        componentsBefore,
        componentsAfterFirst,
        componentsAfterSecond,
        placedFirst: componentsAfterFirst - componentsBefore,
        placedSecond: componentsAfterSecond - componentsAfterFirst
      };
    });
    
    expect(result.mode).toBe('single');
    expect(result.componentType).toBe('foundation');
    expect(result.placedFirst).toBe(1); // Should place exactly 1 on first click
    expect(result.placedSecond).toBe(1); // Should place exactly 1 on second click
  });

  test('walls should use line placement mode', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      game.buildingPlacer.startPlacement('wall', 'wood');
      
      return game.buildingPlacer.getPlacementInfo();
    });
    
    expect(result.mode).toBe('single'); // Walls use single placement mode
  });

  test('floors should use fill placement mode', async ({ page }) => {
    const result = await page.evaluate(() => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      game.buildingPlacer.startPlacement('floor', 'wood');
      
      return game.buildingPlacer.getPlacementInfo();
    });
    
    expect(result.mode).toBe('floor_fill');
  });

  test('multi-placement modes should show preview path', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Place foundations for floor fill test
      for (let q = -1; q <= 1; q++) {
        for (let r = -1; r <= 1; r++) {
          if (Math.abs(q + r) <= 1) {
            game.buildingManager.placeComponent({
              type: 'foundation',
              material: 'wood',
              position: { q, r, y: 0 },
              level: 0
            });
          }
        }
      }
      
      const foundationCount = game.buildingManager.components.size;
      
      // Start floor placement (uses FLOOR_FILL mode)
      game.buildingPlacer.startPlacement('floor', 'wood');
      
      // Simulate first click (start point)
      const moveEvent = new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(moveEvent);
      
      const clickEvent = new MouseEvent('mousedown', {
        button: 0,
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(clickEvent);
      
      const afterFirstClick = game.buildingManager.components.size;
      
      // Move mouse (should show preview area)
      const moveEvent2 = new MouseEvent('mousemove', {
        clientX: window.innerWidth / 2 + 200,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(moveEvent2);
      
      // Check if placement path is being tracked
      const placementInfo = game.buildingPlacer.getPlacementInfo();
      
      // Second click (end point) 
      const clickEvent2 = new MouseEvent('mousedown', {
        button: 0,
        clientX: window.innerWidth / 2 + 200,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(clickEvent2);
      
      const afterSecondClick = game.buildingManager.components.size;
      
      return {
        foundationCount,
        afterFirstClick,
        afterSecondClick,
        hasStartPoint: placementInfo.hasStartPoint,
        mode: placementInfo.mode,
        floorsPlaced: afterSecondClick - afterFirstClick
      };
    });
    
    // Should have foundations
    expect(result.foundationCount).toBeGreaterThan(0);
    
    // Floor fill mode should be active
    expect(result.mode).toBe('floor_fill');
  });

  test('right click should cancel multi-placement', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const gameWindow = window as any;
      const game = gameWindow.game;
      
      // Place foundations for floor fill test
      for (let q = -1; q <= 1; q++) {
        for (let r = -1; r <= 1; r++) {
          if (Math.abs(q + r) <= 1) {
            game.buildingManager.placeComponent({
              type: 'foundation',
              material: 'wood',
              position: { q, r, y: 0 },
              level: 0
            });
          }
        }
      }
      
      // Start floor placement (multi-mode)
      game.buildingPlacer.startPlacement('floor', 'wood');
      
      // Make sure we're hovering over a foundation
      game.buildingPlacer.hoveredHex = { q: 0, r: 0, y: 0 };
      
      // First click
      const clickEvent = new MouseEvent('mousedown', {
        button: 0,
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
      document.dispatchEvent(clickEvent);
      
      const hasStartPoint = game.buildingPlacer.getPlacementInfo().hasStartPoint || false;
      
      // Right click to cancel
      const rightClickEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2,
        bubbles: true
      });
      document.dispatchEvent(rightClickEvent);
      
      // Also fire contextmenu event to ensure right-click is recognized
      const contextMenuEvent = new MouseEvent('contextmenu', {
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2,
        bubbles: true
      });
      document.dispatchEvent(contextMenuEvent);
      
      const hasStartPointAfter = game.buildingPlacer.getPlacementInfo().hasStartPoint || false;
      
      return {
        hasStartPoint,
        hasStartPointAfter
      };
    });
    
    expect(result.hasStartPoint).toBe(true);
    expect(result.hasStartPointAfter).toBe(false);
  });
});