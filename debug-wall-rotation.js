// Debug script to test wall rotation in the browser console

// Get the game object
const game = window.game;
if (!game) {
  console.error('Game not found!');
} else {
  console.log('Debugging wall rotation...');
  
  // Find the building manager
  const buildingManager = game.constructionManager?.buildingManager;
  if (!buildingManager) {
    console.error('Building manager not found!');
  } else {
    // Check preview component
    const preview = buildingManager.previewComponent;
    if (preview) {
      console.log('Preview component found:');
      console.log('  Type:', preview.data.type);
      console.log('  Wall alignment:', preview.data.wallAlignment);
      console.log('  Position:', preview.data.position);
      console.log('  Mesh rotation.y (radians):', preview.mesh.rotation.y);
      console.log('  Mesh rotation.y (degrees):', preview.mesh.rotation.y * 180 / Math.PI);
      
      // Expected rotation
      if (preview.data.wallAlignment !== undefined) {
        const expected = (preview.data.wallAlignment * 60 + 90);
        console.log('  Expected rotation (degrees):', expected);
        console.log('  Match:', Math.abs((preview.mesh.rotation.y * 180 / Math.PI) - expected) < 1);
      }
    } else {
      console.log('No preview component active');
    }
    
    // Check building placer
    const placer = game.constructionManager?.buildingPlacer;
    if (placer) {
      console.log('\nBuilding placer:');
      console.log('  Hovered wall edge:', placer.hoveredWallEdge);
      console.log('  Current component type:', placer.currentComponentType);
      
      // Check edge highlights
      if (placer.edgeHighlights && placer.hoveredWallEdge !== null) {
        const edge = placer.edgeHighlights[placer.hoveredWallEdge];
        if (edge && edge.visible) {
          console.log('  Edge highlight visible for edge', placer.hoveredWallEdge);
          const positions = edge.geometry.attributes.position.array;
          console.log('  Edge line from:', positions[0], positions[2], 'to:', positions[3], positions[5]);
        }
      }
    }
  }
}

console.log('\nTo test: Press R to rotate and run this script again to see the values change');