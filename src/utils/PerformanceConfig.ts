// Performance configuration settings
export interface PerformanceSettings {
  // Water simulation
  useOptimizedWaterSim: boolean;
  waterBatchSize: number;
  
  // Plant rendering
  useMeshPooling: boolean;
  plantLODEnabled: boolean;
  plantLODDistances: {
    high: number;
    medium: number;
    low: number;
  };
  
  // Soil rendering
  useInstancedSoilRendering: boolean;
  maxSoilInstancesPerType: number;
  
  // General
  enablePerformanceStats: boolean;
  performanceLogInterval: number; // ms
}

// Default performance settings
export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  // Water simulation
  useOptimizedWaterSim: true,
  waterBatchSize: 100,
  
  // Plant rendering
  useMeshPooling: true,
  plantLODEnabled: true,
  plantLODDistances: {
    high: 20,
    medium: 50,
    low: 100
  },
  
  // Soil rendering
  useInstancedSoilRendering: true,
  maxSoilInstancesPerType: 10000,
  
  // General
  enablePerformanceStats: true,
  performanceLogInterval: 5000
};

// Performance monitor class
export class PerformanceMonitor {
  private lastLogTime = 0;
  private frameCount = 0;
  private frameTimes: number[] = [];
  private maxFrameSamples = 60;
  
  constructor(private settings: PerformanceSettings) {}
  
  startFrame(): number {
    return performance.now();
  }
  
  endFrame(startTime: number): void {
    const frameTime = performance.now() - startTime;
    this.frameTimes.push(frameTime);
    
    if (this.frameTimes.length > this.maxFrameSamples) {
      this.frameTimes.shift();
    }
    
    this.frameCount++;
    
    const now = performance.now();
    if (now - this.lastLogTime > this.settings.performanceLogInterval) {
      this.logStats();
      this.lastLogTime = now;
    }
  }
  
  private logStats(): void {
    if (!this.settings.enablePerformanceStats) return;
    
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const maxFrameTime = Math.max(...this.frameTimes);
    const minFrameTime = Math.min(...this.frameTimes);
    const fps = 1000 / avgFrameTime;
    
  }
  
  reset(): void {
    this.frameCount = 0;
    this.frameTimes = [];
    this.lastLogTime = performance.now();
  }
}