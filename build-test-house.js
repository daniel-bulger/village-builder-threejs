// Test script to build a small house programmatically
// Run this in the browser console after game loads

function buildTestHouse() {
  const game = window.game;
  if (!game) {
    console.error('Game not found! Make sure the game is loaded.');
    return;
  }

  const manager = game.buildingManager;
  
  // Clear existing components
  console.log('Clearing existing components...');
  Array.from(manager.components.values()).forEach(comp => {
    manager.removeComponent(comp.id);
  });
  
  const results = {
    placed: [],
    failed: []
  };
  
  // Build house
  console.log('Building test house...');
  
  // === FOUNDATION LAYER ===
  console.log('Step 1: Placing foundations...');
  const foundationPositions = [
    { q: 0, r: 0, y: 0 },
    { q: 1, r: 0, y: 0 },
    { q: 0, r: 1, y: 0 },
    { q: -1, r: 1, y: 0 }
  ];
  
  foundationPositions.forEach(pos => {
    const foundation = manager.placeComponent({
      type: 'foundation',
      material: 'stone',
      position: pos,
      level: 0
    });
    
    if (foundation) {
      results.placed.push(`Foundation at (${pos.q}, ${pos.r})`);
    } else {
      results.failed.push(`Foundation at (${pos.q}, ${pos.r})`);
    }
  });
  
  // === WALLS ===
  console.log('Step 2: Placing walls...');
  
  // Center hex walls
  [0, 1, 3, 4].forEach(edge => {
    const wall = manager.placeComponent({
      type: 'wall',
      material: 'wood',
      position: { q: 0, r: 0, y: 0 },
      level: 0,
      wallAlignment: edge
    });
    
    if (wall) {
      results.placed.push(`Wall at (0, 0) edge ${edge}`);
    } else {
      results.failed.push(`Wall at (0, 0) edge ${edge}`);
    }
  });
  
  // Door
  console.log('Step 3: Adding door...');
  const door = manager.placeComponent({
    type: 'wall',
    material: 'wood',
    position: { q: 0, r: 0, y: 0 },
    level: 0,
    wallAlignment: 5,
    metadata: { hasDoor: true }
  });
  
  if (door) {
    results.placed.push('Door');
  } else {
    results.failed.push('Door');
  }
  
  // Window
  console.log('Step 4: Adding window...');
  const windowWall = manager.placeComponent({
    type: 'wall',
    material: 'wood',
    position: { q: 0, r: 0, y: 0 },
    level: 0,
    wallAlignment: 2,
    metadata: { hasWindow: true }
  });
  
  if (windowWall) {
    results.placed.push('Window');
  } else {
    results.failed.push('Window');
  }
  
  // Outer walls
  const outerWalls = [
    { pos: { q: 1, r: 0, y: 0 }, edges: [0, 1, 2] },
    { pos: { q: 0, r: 1, y: 0 }, edges: [2, 3] },
    { pos: { q: -1, r: 1, y: 0 }, edges: [3, 4] }
  ];
  
  outerWalls.forEach(config => {
    config.edges.forEach(edge => {
      const wall = manager.placeComponent({
        type: 'wall',
        material: 'wood',
        position: config.pos,
        level: 0,
        wallAlignment: edge
      });
      
      if (wall) {
        results.placed.push(`Wall at (${config.pos.q}, ${config.pos.r}) edge ${edge}`);
      } else {
        results.failed.push(`Wall at (${config.pos.q}, ${config.pos.r}) edge ${edge}`);
      }
    });
  });
  
  // === SUPPORT PILLARS ===
  console.log('Step 5: Adding support pillars...');
  const pillarConfigs = [
    { pos: { q: 0, r: 0, y: 0 }, vertex: 0 },
    { pos: { q: 0, r: 0, y: 0 }, vertex: 3 },
    { pos: { q: 1, r: 0, y: 0 }, vertex: 1 },
    { pos: { q: 0, r: 1, y: 0 }, vertex: 2 }
  ];
  
  pillarConfigs.forEach(config => {
    const pillar = manager.placeComponent({
      type: 'pillar',
      material: 'stone',
      position: config.pos,
      level: 0,
      vertexIndex: config.vertex
    });
    
    if (pillar) {
      results.placed.push(`Pillar at (${config.pos.q}, ${config.pos.r}) vertex ${config.vertex}`);
    } else {
      results.failed.push(`Pillar at (${config.pos.q}, ${config.pos.r}) vertex ${config.vertex}`);
    }
  });
  
  // === SECOND FLOOR ===
  console.log('Step 6: Adding second floor...');
  foundationPositions.forEach(pos => {
    const floor = manager.placeComponent({
      type: 'floor',
      material: 'wood',
      position: { q: pos.q, r: pos.r, y: 1 },
      level: 1
    });
    
    if (floor) {
      results.placed.push(`Floor at (${pos.q}, ${pos.r}, 1)`);
    } else {
      results.failed.push(`Floor at (${pos.q}, ${pos.r}, 1)`);
    }
  });
  
  // === ROOF ===
  console.log('Step 7: Adding roof...');
  const centerRoof = manager.placeComponent({
    type: 'roof',
    material: 'wood',
    position: { q: 0, r: 0, y: 2 },
    level: 2
  });
  
  if (centerRoof) {
    results.placed.push('Roof');
  } else {
    results.failed.push('Roof');
  }
  
  // Print results
  console.log('\n===== BUILD RESULTS =====');
  console.log(`Successfully placed: ${results.placed.length} components`);
  console.log(`Failed: ${results.failed.length} components`);
  
  if (results.failed.length > 0) {
    console.log('\nFailed components:');
    results.failed.forEach(f => console.log(`  - ${f}`));
  }
  
  // Get statistics
  const stats = {
    totalComponents: manager.components.size,
    buildings: manager.getBuildings().length
  };
  
  console.log('\n===== STATISTICS =====');
  console.log(`Total components: ${stats.totalComponents}`);
  console.log(`Buildings formed: ${stats.buildings}`);
  
  // Position camera for good view
  console.log('\n===== POSITIONING CAMERA =====');
  game.cameraController.angle = Math.PI / 4;
  game.cameraController.pitch = 0.5;
  game.cameraController.targetDistance = 15;
  
  console.log('\nHouse build complete!');
  console.log('Press F12 or Ctrl+P to take a screenshot');
  console.log('Press F3 to toggle debug info');
  
  return results;
}

// Instructions
console.log('%c=== TEST HOUSE BUILDER ===', 'color: green; font-size: 16px; font-weight: bold');
console.log('Run buildTestHouse() to build a test house');
console.log('Make sure you have pressed "T" first to add test materials');

// Make function globally available
window.buildTestHouse = buildTestHouse;