import { Page, expect } from '@playwright/test';

// Game interface for type safety
export interface GameWindow extends Window {
  game: {
    scene: any;
    camera: any;
    player: {
      position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void };
    };
    cameraController: {
      mode: 'third-person' | 'overhead';
      getMode: () => 'third-person' | 'overhead';
      angle?: number;
    };
    desert: {
      getTileCount: () => number;
    };
    lighting: {
      sun: {
        position: { x: number; y: number; z: number };
        intensity: number;
      };
      getTimeOfDay: () => number;
      setTimeOfDay: (time: number) => void;
    };
    soilManager: {
      isPreviewVisible: () => boolean;
      getPreviewPosition: () => { x: number; y: number; z: number };
      getPreviewColor: () => number;
      getSoilCount: () => number;
      getMaxSoilDepth: () => number;
      getHoveredDepth: () => number;
      getPlacementHeight: () => number;
      placeSoilAt: (hex: { q: number; r: number }) => boolean;
      placeSoil: (hex: { q: number; r: number; y: number }) => boolean;
    };
    hexGrid: {
      isVisible: () => boolean;
    };
    inventorySystem: {
      getActiveItem: () => any | null;
      setActiveSlot: (index: number) => void;
      getSlots: () => Array<{ item: any | null; hotkey?: string }>;
    };
    actionWheel: {
      getActiveAction: () => any | null;
      setActiveAction: (actionId: string | null) => void;
      isActionWheelVisible: () => boolean;
      toggle: () => void;
    };
    isInitialized: boolean;
    setAnimationsEnabled: (enabled: boolean) => void;
    timeScale: number;
  };
  HexUtils: {
    worldToHex: (pos: any) => { q: number; r: number };
    hexToWorld: (hex: { q: number; r: number }) => any;
    getNeighbors: (hex: { q: number; r: number }) => Array<{ q: number; r: number }>;
  };
  THREE: any;
}

// Wait for game initialization
export async function waitForGame(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const gameWindow = window as any;
    return gameWindow.game && gameWindow.game.isInitialized;
  }, { timeout: 5000 });
}

// Type-safe game evaluation
export async function gameEval<T>(page: Page, fn: (game: GameWindow) => T): Promise<T> {
  return await page.evaluate(fn);
}

// Common test actions
export async function movePlayer(page: Page, direction: 'w' | 'a' | 's' | 'd', duration: number = 1000): Promise<void> {
  await page.keyboard.down(direction);
  await page.waitForTimeout(duration);
  await page.keyboard.up(direction);
}

export async function placeSoilAt(page: Page, screenX: number, screenY: number): Promise<void> {
  await page.mouse.move(screenX, screenY);
  await page.waitForTimeout(200); // Let preview update and settle
  await page.mouse.down();
  await page.waitForTimeout(16); // One frame
  await page.mouse.up();
  await page.waitForTimeout(100); // Let game process the click
}

export async function removeSoilAt(page: Page, screenX: number, screenY: number): Promise<void> {
  await page.mouse.move(screenX, screenY);
  await page.waitForTimeout(200); // Let preview update and settle
  await page.mouse.down({ button: 'right' });
  await page.waitForTimeout(16); // One frame
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(100); // Let game process the click
}

export async function applyToolAt(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(x, y);
  await page.waitForTimeout(50);
  
  // Ensure the game processes the mouse position and mouseWasDown is false
  await page.evaluate(() => {
    const gameWindow = window as any;
    const soilManager = gameWindow.game.soilManager as any;
    
    // Force reset mouseWasDown to ensure click will register
    soilManager.mouseWasDown = false;
    soilManager.mouseRightWasDown = false;
    
    gameWindow.game.update();
  });
  
  await page.mouse.down({ button: 'left' });
  await page.waitForTimeout(50); // Give time for the browser to register the event
  
  // Process the mouse down - this is where the action should happen
  const clickResult = await page.evaluate(() => {
    const gameWindow = window as any;
    const soilManager = gameWindow.game.soilManager as any;
    const beforeMouseWasDown = soilManager.mouseWasDown;
    
    gameWindow.game.update();
    
    return {
      beforeMouseWasDown,
      afterMouseWasDown: soilManager.mouseWasDown,
      hoveredHex: soilManager.hoveredHex,
      currentTool: gameWindow.game.getCurrentToolFromInventory()
    };
  });
  
  console.log('Click processing:', clickResult);
  
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(50);
  
  // Process the mouse up
  await page.evaluate(() => {
    const gameWindow = window as any;
    gameWindow.game.update();
  });
}

// Performance monitoring
export async function measureFPS(page: Page, duration: number = 1000): Promise<number> {
  return await page.evaluate((duration) => {
    return new Promise((resolve) => {
      const samples: number[] = [];
      let frameCount = 0;
      let lastTime = performance.now();
      const startTime = performance.now();
      
      function collectSample() {
        frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - lastTime;
        
        if (elapsed >= 100) { // Sample every 100ms
          const fps = (frameCount * 1000) / elapsed;
          samples.push(fps);
          frameCount = 0;
          lastTime = currentTime;
        }
        
        if (currentTime - startTime < duration) {
          requestAnimationFrame(collectSample);
        } else {
          if (samples.length === 0) {
            resolve(60); // Default if no samples
          } else {
            const avgFPS = samples.reduce((a, b) => a + b, 0) / samples.length;
            resolve(avgFPS);
          }
        }
      }
      
      requestAnimationFrame(collectSample);
    });
  }, duration);
}

// Visual regression helpers
export async function hideUIElements(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Hide FPS counter and other UI elements for consistent screenshots
    const stats = document.querySelector('.stats');
    if (stats) stats.style.display = 'none';
  });
}

export async function setFixedTimeOfDay(page: Page, time: number): Promise<void> {
  await page.evaluate((time) => {
    const gameWindow = window as any;
    gameWindow.game.lighting.setTimeOfDay(time);
    gameWindow.game.lighting.pauseDayCycle();
  }, time);
}

// Inventory system helpers
export async function selectInventorySlot(page: Page, slot: number): Promise<void> {
  await page.evaluate((slot) => {
    const gameWindow = window as any;
    gameWindow.game.inventorySystem.setActiveSlot(slot);
  }, slot);
}

export async function getActiveItem(page: Page): Promise<any | null> {
  return await page.evaluate(() => {
    const gameWindow = window as any;
    return gameWindow.game.inventorySystem.getActiveItem();
  });
}

export async function selectToolByName(page: Page, toolName: string): Promise<boolean> {
  return await page.evaluate((name) => {
    const gameWindow = window as any;
    const slots = gameWindow.game.inventorySystem.getSlots();
    
    // Find the tool in inventory
    for (let i = 0; i < slots.length; i++) {
      const item = slots[i].item;
      if (item && (item.name === name || item.id === name)) {
        gameWindow.game.inventorySystem.setActiveSlot(i);
        return true;
      }
    }
    return false;
  }, toolName);
}

export async function selectActionByName(page: Page, actionName: string): Promise<boolean> {
  return await page.evaluate((name) => {
    const gameWindow = window as any;
    const actionWheel = gameWindow.game.actionWheel;
    
    // Find the action
    const actions = actionWheel.getActions ? actionWheel.getActions() : [];
    const action = actions.find((a: any) => a.name === name || a.id === name);
    
    if (action) {
      actionWheel.setActiveAction(action.id);
      return true;
    }
    return false;
  }, actionName);
}

export async function getCurrentToolType(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const gameWindow = window as any;
    
    // Check action first
    const activeAction = gameWindow.game.actionWheel.getActiveAction();
    if (activeAction) {
      const actionToTool: { [key: string]: string } = {
        'remove_soil': 'remove',
        'harvest': 'harvest',
        'uproot': 'harvest'
      };
      if (actionToTool[activeAction.id]) {
        return actionToTool[activeAction.id];
      }
    }
    
    // Check inventory item
    const activeItem = gameWindow.game.inventorySystem.getActiveItem();
    if (activeItem) {
      const itemToTool: { [key: string]: string } = {
        'watering_can': 'water',
        'shovel': 'place',
        'tomato_seeds': 'plant',
        'inspector': 'inspect',
        'barrier_tool': 'barrier'
      };
      return itemToTool[activeItem.id] || 'place';
    }
    
    return 'place';
  });
}

// Helper to place soil at hex coordinates by converting to screen position
export async function placeSoilAtHex(page: Page, hexCoord: { q: number; r: number }): Promise<void> {
  // First select the shovel tool
  await selectToolByName(page, 'shovel');
  
  // Get the screen position for the hex
  const screenPos = await page.evaluate((coord) => {
    const gameWindow = window as any;
    const HEX_SIZE = 1;
    const worldPos = new gameWindow.THREE.Vector3(
      coord.q * HEX_SIZE * 1.5,
      0.15,
      (coord.r + coord.q * 0.5) * HEX_SIZE * Math.sqrt(3)
    );
    
    // Project to screen coordinates
    const camera = gameWindow.game.camera;
    const canvas = gameWindow.game.renderer.domElement;
    
    worldPos.project(camera);
    
    const x = (worldPos.x * 0.5 + 0.5) * canvas.width;
    const y = (worldPos.y * -0.5 + 0.5) * canvas.height;
    
    return { x, y };
  }, hexCoord);
  
  // Use the existing placeSoilAt function with screen coordinates
  await placeSoilAt(page, screenPos.x, screenPos.y);
}