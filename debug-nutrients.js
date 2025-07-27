// Debug script for testing nutrient depletion
// Run this in the browser console while the game is running

window.debugNutrients = {
  // Test nutrient depletion manually
  testDepletion: function() {
    const game = window.game;
    const coord = { q: 0, r: 0, y: 0 };
    
    console.log('=== NUTRIENT DEBUG TEST ===');
    
    // Check if soil exists
    const soilKey = `${coord.q},${coord.r},${coord.y}`;
    const soilManager = game.soilManager;
    const hasSoil = soilManager.soilHexes.has(soilKey);
    console.log('1. Soil exists at (0,0,0)?', hasSoil);
    
    if (!hasSoil) {
      console.log('   -> Placing soil...');
      soilManager.placeSoil(coord);
    }
    
    // Get nutrient system
    const nutrientSystem = soilManager.getNutrientSystem();
    console.log('2. Nutrient system exists?', !!nutrientSystem);
    
    // Check initial nutrients
    const nutrients1 = nutrientSystem.getNutrients(coord);
    console.log('3. Initial nutrients:', nutrients1);
    
    // Test depletion directly
    console.log('4. Testing direct depletion for tomato...');
    const result = nutrientSystem.depleteNutrients(coord, 'tomato', 0);
    console.log('   -> Depletion result:', result);
    
    // Check nutrients after
    const nutrients2 = nutrientSystem.getNutrients(coord);
    console.log('5. Nutrients after depletion:', nutrients2);
    
    // Check if changed
    if (nutrients1 && nutrients2) {
      console.log('6. Nutrients changed?', 
        nutrients1.nitrogen !== nutrients2.nitrogen ? 'YES' : 'NO');
    }
    
    // Force color update
    console.log('7. Forcing soil color update...');
    soilManager.updateSoilColors();
    
    // Check hover info
    soilManager.hoveredHex = coord;
    soilManager.hoveredY = 0;
    const info = soilManager.getHoveredHexNutrientInfo();
    console.log('8. Hover nutrient info:', info);
    
    console.log('=== END DEBUG TEST ===');
  },
  
  // Force plant growth
  forcePlantGrowth: function() {
    const game = window.game;
    const plantSim = game.soilManager.getPlantSimulation();
    const plants = plantSim.getAllPlants();
    
    console.log('=== FORCE PLANT GROWTH ===');
    console.log('Total plants:', plants.length);
    
    plants.forEach((p, index) => {
      const plant = p.plant;
      const oldStage = plant.currentStage;
      
      // Force advance stage
      if (plant.currentStage < 2) {
        plant.currentStage++;
        plant.growthTimer = 0;
        
        // Manually call nutrient depletion
        const hexCoord = { q: 0, r: 0 }; // Assuming plant at origin
        const soilY = Math.floor(plant.position.y) - 1;
        const hex3D = { q: hexCoord.q, r: hexCoord.r, y: soilY };
        
        console.log(`Plant ${index}: Advanced from stage ${oldStage} to ${plant.currentStage}`);
        console.log(`  -> Depleting nutrients at hex:`, hex3D);
        
        const nutrientSystem = game.soilManager.getNutrientSystem();
        nutrientSystem.depleteNutrients(hex3D, plant.typeId, plant.currentStage);
      }
    });
    
    // Force color update
    game.soilManager.updateSoilColors();
    
    console.log('=== END FORCE GROWTH ===');
  },
  
  // Check all nutrient hexes
  checkAllHexes: function() {
    const game = window.game;
    const nutrientSystem = game.soilManager.getNutrientSystem();
    const allHexes = nutrientSystem.getAllHexes();
    
    console.log('=== ALL NUTRIENT HEXES ===');
    allHexes.forEach(hex => {
      console.log(`Hex at (${hex.coord.q},${hex.coord.r},${hex.coord.y}):`,
        `N:${(hex.nitrogen*100).toFixed(0)}%`,
        `P:${(hex.phosphorus*100).toFixed(0)}%`, 
        `K:${(hex.potassium*100).toFixed(0)}%`);
    });
    console.log('Total hexes:', allHexes.length);
  }
};

console.log('Nutrient debug commands loaded. Available commands:');
console.log('- debugNutrients.testDepletion() - Test nutrient depletion');
console.log('- debugNutrients.forcePlantGrowth() - Force plants to grow');
console.log('- debugNutrients.checkAllHexes() - List all nutrient hexes');