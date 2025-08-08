// Debug script to check highlight positions

const game = window.game;
if (!game) {
  console.error('Game not found!');
} else {
  const placer = game.constructionManager?.buildingPlacer;
  if (placer) {
    console.log('Building Placer state:');
    console.log('  Current level:', placer.currentLevel);
    console.log('  Hovered hex:', placer.hoveredHex);
    
    if (placer.hoveredHex) {
      console.log('  Hex Y coordinate:', placer.hoveredHex.y);
      console.log('  Expected height:', placer.hoveredHex.y * 3.0, 'units');
    }
    
    // Check edge highlight positions
    if (placer.edgeHighlights && placer.hoveredWallEdge !== null) {
      const edge = placer.edgeHighlights[placer.hoveredWallEdge];
      if (edge && edge.visible) {
        const positions = edge.geometry.attributes.position.array;
        console.log('\nEdge highlight Y positions:');
        console.log('  Vertex 1 Y:', positions[1]);
        console.log('  Vertex 2 Y:', positions[4]);
      }
    }
    
    // Check for any other visible edge highlights
    if (placer.edgeHighlights) {
      placer.edgeHighlights.forEach((edge, index) => {
        if (edge.visible && index !== placer.hoveredWallEdge) {
          console.log(`\nWARNING: Edge ${index} is also visible!`);
        }
      });
    }
  }
}

console.log('\nRun this after pressing PageUp to check if highlights are at the correct level');