import { Page } from '@playwright/test';
import { GameWindow } from './helpers';

// More reliable soil placement that doesn't depend on mouse position
export async function placeSoilDirectly(page: Page, q: number, r: number, y: number = 0): Promise<boolean> {
  return await page.evaluate(({ q, r, y }) => {
    const gameWindow = window as any;
    return gameWindow.game.soilManager.placeSoil({ q, r, y });
  }, { q, r, y });
}

// Place soil at center of screen, which should reliably hit the ground
export async function placeSoilAtCenter(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('No viewport size');
  
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  
  await page.mouse.move(centerX, centerY);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(16);
  await page.mouse.up();
  await page.waitForTimeout(100);
}

// Get the hex coordinate at center of screen
export async function getHexAtCenter(page: Page): Promise<{ q: number; r: number } | null> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('No viewport size');
  
  return await page.evaluate((viewport) => {
    const gameWindow = window as any;
    const raycaster = new gameWindow.THREE.Raycaster();
    const mouse = new gameWindow.THREE.Vector2(0, 0); // Center is (0,0) in normalized coords
    
    raycaster.setFromCamera(mouse, gameWindow.game.camera);
    const groundPlane = gameWindow.game.scene.getObjectByName('ground-plane') || 
                       gameWindow.game.scene.children.find((child: any) => 
                         child.geometry?.type === 'PlaneGeometry');
    
    if (groundPlane) {
      const intersects = raycaster.intersectObject(groundPlane);
      if (intersects.length > 0) {
        const worldPos = intersects[0].point;
        return gameWindow.HexUtils.worldToHex(worldPos);
      }
    }
    return null;
  }, viewport);
}

// Wait for soil placement preview to be visible
export async function waitForPreview(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const gameWindow = window as any;
    return gameWindow.game.soilManager.isPreviewVisible();
  }, { timeout: 2000 });
}