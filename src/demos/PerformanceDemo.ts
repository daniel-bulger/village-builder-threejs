import * as THREE from 'three';
import { HexCoord3D } from '../utils/HexUtils';
import { WaterSimulation } from '../farming/WaterSimulation';
import { OptimizedWaterSimulation } from '../farming/OptimizedWaterSimulation';
import { PlantRenderer } from '../farming/PlantRenderer';
import { OptimizedPlantRenderer } from '../farming/OptimizedPlantRenderer';
import { MeshPoolManager } from '../farming/MeshPool';
import { InstancedSoilRenderer } from '../farming/InstancedSoilRenderer';
import { SoilType } from '../farming/WaterSimulation';

// Performance comparison demo
export class PerformanceDemo {
  private scene: THREE.Scene;
  private standardWaterSim: WaterSimulation;
  private optimizedWaterSim: OptimizedWaterSimulation;
  private standardPlantRenderer: PlantRenderer;
  private optimizedPlantRenderer: OptimizedPlantRenderer;
  private instancedSoilRenderer: InstancedSoilRenderer;
  private meshPoolManager: MeshPoolManager;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Initialize systems
    this.standardWaterSim = new WaterSimulation();
    this.optimizedWaterSim = new OptimizedWaterSimulation();
    this.meshPoolManager = new MeshPoolManager();
    this.standardPlantRenderer = new PlantRenderer(scene);
    this.optimizedPlantRenderer = new OptimizedPlantRenderer(scene, this.meshPoolManager);
    this.instancedSoilRenderer = new InstancedSoilRenderer(scene);
  }
  
  // Create a large test world
  createTestWorld(size: number = 50): void {
    
    // Create hexagonal pattern
    for (let q = -size; q <= size; q++) {
      for (let r = -size; r <= size; r++) {
        if (Math.abs(q + r) <= size) {
          const coord: HexCoord3D = { q, r, y: 0 };
          
          // Add to both water simulations
          this.standardWaterSim.addHex(coord, SoilType.Loam);
          this.optimizedWaterSim.addHex(coord, SoilType.Loam);
          
          // Add to instanced renderer
          this.instancedSoilRenderer.addHex(coord, SoilType.Loam);
          
          // Add some water to random hexes
          if (Math.random() < 0.3) {
            const waterAmount = Math.random() * 50000; // 0-50L
            this.standardWaterSim.addWater(coord, waterAmount);
            this.optimizedWaterSim.addWater(coord, waterAmount);
          }
        }
      }
    }
    
  }
  
  // Benchmark water simulation
  benchmarkWaterSimulation(iterations: number = 100): void {
    
    // Benchmark standard simulation
    const standardStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.standardWaterSim.tick(0.016); // 60fps deltaTime
    }
    const standardTime = performance.now() - standardStart;
    
    // Benchmark optimized simulation
    const optimizedStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      this.optimizedWaterSim.tick(0.016);
    }
    const optimizedTime = performance.now() - optimizedStart;
    
    // Results
  }
  
  // Benchmark soil rendering
  benchmarkSoilRendering(): void {
    
    const hexCount = this.standardWaterSim.getAllHexes().length;
    
    // Standard rendering (individual meshes)
    const standardMeshCount = hexCount;
    const standardDrawCalls = hexCount;
    const standardMemory = hexCount * (64 + 128); // Rough estimate: geometry + material per mesh
    
    // Instanced rendering
    const instancedStats = this.instancedSoilRenderer.getStats();
    const instancedMeshCount = Object.keys(instancedStats.instancesByType).length;
    const instancedDrawCalls = instancedMeshCount;
    const instancedMemory = instancedStats.memoryUsage;
    
    
    
  }
  
  // Benchmark plant rendering
  benchmarkPlantRendering(plantCount: number = 100): void {
    
    // Create mock plants
    const mockPlants: any[] = [];
    for (let i = 0; i < plantCount; i++) {
      mockPlants.push({
        id: `plant_${i}`,
        typeId: 'tomato',
        position: { q: i % 10, r: Math.floor(i / 10), y: 0, parentQ: 0, parentR: 0 },
        currentStage: Math.floor(Math.random() * 3),
        health: { water: 1, nutrients: 1, sunlight: 1 }
      });
    }
    
    // Benchmark standard renderer
    const standardStart = performance.now();
    for (let i = 0; i < 10; i++) {
      this.standardPlantRenderer.updatePlants(mockPlants);
    }
    const standardTime = performance.now() - standardStart;
    
    // Benchmark optimized renderer
    const optimizedStart = performance.now();
    for (let i = 0; i < 10; i++) {
      this.optimizedPlantRenderer.updatePlants(mockPlants);
    }
    const optimizedTime = performance.now() - optimizedStart;
    
    // Get stats
    const poolStats = this.optimizedPlantRenderer.getStats();
    
  }
  
  // Run all benchmarks
  runAllBenchmarks(): void {
    
    // Create test world
    this.createTestWorld(30);
    
    // Run benchmarks
    this.benchmarkWaterSimulation(100);
    this.benchmarkSoilRendering();
    this.benchmarkPlantRendering(50);
    
  }
  
  dispose(): void {
    this.standardPlantRenderer.dispose();
    this.optimizedPlantRenderer.dispose();
    this.instancedSoilRenderer.dispose();
    this.meshPoolManager.dispose();
  }
}

// Auto-run demo if requested
export function runPerformanceDemoIfRequested(scene: THREE.Scene): void {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('perfDemo')) {
    const demo = new PerformanceDemo(scene);
    
    // Run benchmarks after a short delay
    setTimeout(() => {
      demo.runAllBenchmarks();
      
      // Clean up after demo
      setTimeout(() => {
        demo.dispose();
      }, 1000);
    }, 1000);
  }
}