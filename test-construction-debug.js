// Debug construction floor placement issue
async function debugConstruction() {
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  const result = await page.evaluate(() => {
    const gameWindow = window;
    const game = gameWindow.game;
    const manager = game.buildingManager;
    
    // Clear existing
    manager.components.forEach((comp) => manager.removeComponent(comp.id));
    
    const debug = { steps: [] };
    
    // Place foundation
    const foundation = manager.placeComponent({
      type: 'foundation',
      material: 'stone',
      position: { q: 0, r: 0, y: 0 },
      level: 0
    });
    debug.steps.push({ 
      action: 'foundation', 
      success: foundation !== null,
      componentCount: manager.components.size 
    });
    
    // Place 6 walls at level 0
    let wallsPlaced = 0;
    for (let edge = 0; edge < 6; edge++) {
      const wall = manager.placeComponent({
        type: 'wall',
        material: 'stone',
        position: { q: 0, r: 0, y: 0 },
        level: 0,
        wallAlignment: edge
      });
      if (wall) wallsPlaced++;
    }
    debug.steps.push({ 
      action: 'walls_level_0', 
      wallsPlaced,
      componentCount: manager.components.size 
    });
    
    // Check what components are at level 0
    const componentsAtLevel0 = [];
    manager.components.forEach(comp => {
      if (comp.data.level === 0) {
        componentsAtLevel0.push({
          type: comp.data.type,
          supportProvided: comp.supportProvided
        });
      }
    });
    debug.componentsAtLevel0 = componentsAtLevel0;
    
    // Check support for floor at level 1
    const floorSupportCheck = manager.checkSupport({
      type: 'floor',
      material: 'stone',
      position: { q: 0, r: 0, y: 0 },
      level: 1
    });
    debug.floorSupportCheck = floorSupportCheck;
    
    // Try to place floor at level 1
    const floor1 = manager.placeComponent({
      type: 'floor',
      material: 'stone',
      position: { q: 0, r: 0, y: 0 },
      level: 1
    });
    debug.steps.push({ 
      action: 'floor_level_1', 
      success: floor1 !== null,
      componentCount: manager.components.size
    });
    
    return debug;
  });
  
  console.log('Debug result:', JSON.stringify(result, null, 2));
  await page.close();
}