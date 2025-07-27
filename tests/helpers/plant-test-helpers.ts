// Helper functions to make plant tests more reliable

export interface PlantTestHelpers {
  // Create a large soil area to minimize edge effects
  createLargeSoilArea(game: any, center: { q: number, r: number, y: number }, radius: number = 3): void;
  
  // Try to plant with multiple attempts and positions
  plantWithRetry(plantSim: any, worldPos: any, plantType: string, maxAttempts: number = 10): string | null;
  
  // Calculate safe plant positions that are well-spaced
  getSafePlantPositions(count: number, spacing: number = 5): Array<{ q: number, r: number, y: number }>;
  
  // Mock Math.random for predictable randomization
  mockRandomForPlants(value: number = 0.5): () => void;
}

export const plantTestHelpers: PlantTestHelpers = {
  createLargeSoilArea(game: any, center: { q: number, r: number, y: number }, radius: number = 3): void {
    const waterSim = game.soilManager.getWaterSimulation();
    
    // Create hexagonal area of soil
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const ds = -dq - dr;
        if (Math.abs(ds) <= radius) {
          const coord = { 
            q: center.q + dq, 
            r: center.r + dr, 
            y: center.y 
          };
          game.soilManager.placeSoil(coord);
          // Add some water to each hex
          waterSim.addWater(coord, 10000); // 10L per hex
        }
      }
    }
  },
  
  plantWithRetry(plantSim: any, worldPos: any, plantType: string = 'tomato', maxAttempts: number = 10): string | null {
    const gameWindow = window as any;
    let plantId = null;
    
    // Try original position first
    for (let i = 0; i < maxAttempts / 2 && !plantId; i++) {
      plantId = plantSim.plantSeed(plantType, worldPos);
      if (plantId) return plantId;
    }
    
    // Try nearby positions with small offsets
    const offsets = [
      { x: 0.1, z: 0.1 }, { x: -0.1, z: 0.1 }, 
      { x: 0.1, z: -0.1 }, { x: -0.1, z: -0.1 },
      { x: 0.2, z: 0 }, { x: -0.2, z: 0 },
      { x: 0, z: 0.2 }, { x: 0, z: -0.2 }
    ];
    
    for (const offset of offsets) {
      const offsetPos = new gameWindow.THREE.Vector3(
        worldPos.x + offset.x,
        worldPos.y,
        worldPos.z + offset.z
      );
      
      plantId = plantSim.plantSeed(plantType, offsetPos);
      if (plantId) return plantId;
    }
    
    return null;
  },
  
  getSafePlantPositions(count: number, spacing: number = 5): Array<{ q: number, r: number, y: number }> {
    const positions = [];
    
    // Create positions in a line with good spacing
    for (let i = 0; i < count; i++) {
      positions.push({
        q: i * spacing,
        r: 0,
        y: 0
      });
    }
    
    return positions;
  },
  
  mockRandomForPlants(value: number = 0.5): () => void {
    const originalRandom = Math.random;
    Math.random = () => value;
    
    // Return function to restore original
    return () => {
      Math.random = originalRandom;
    };
  }
};