/**
 * Plant Configuration
 * Provides configuration options for the plant simulation system
 */

export class PlantConfig {
  private static instance: PlantConfig;
  
  // Configuration options
  private deterministicMode: boolean = false;
  private randomSeed: number = 12345;
  private seedCounter: number = 0;
  
  private constructor() {}
  
  static getInstance(): PlantConfig {
    if (!PlantConfig.instance) {
      PlantConfig.instance = new PlantConfig();
    }
    return PlantConfig.instance;
  }
  
  /**
   * Enable deterministic mode for testing
   * When enabled, all randomization uses a seeded random number generator
   */
  setDeterministicMode(enabled: boolean, seed: number = 12345): void {
    this.deterministicMode = enabled;
    this.randomSeed = seed;
    this.seedCounter = 0;
  }
  
  /**
   * Get a random number (0-1) that is deterministic in test mode
   */
  getRandom(): number {
    if (!this.deterministicMode) {
      return Math.random();
    }
    
    // Simple deterministic pseudo-random number generator
    // Using a linear congruential generator
    this.seedCounter++;
    const x = Math.sin(this.seedCounter + this.randomSeed) * 10000;
    return x - Math.floor(x);
  }
  
  /**
   * Get a random integer between min (inclusive) and max (exclusive)
   */
  getRandomInt(min: number, max: number): number {
    return Math.floor(this.getRandom() * (max - min)) + min;
  }
  
  /**
   * Get a random boolean with given probability
   */
  getRandomBool(probability: number = 0.5): boolean {
    return this.getRandom() < probability;
  }
  
  /**
   * Pick a random element from an array
   */
  pickRandom<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.getRandomInt(0, array.length)];
  }
  
  /**
   * Shuffle an array (Fisher-Yates algorithm)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.getRandomInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  /**
   * Check if we're in deterministic mode
   */
  isDeterministic(): boolean {
    return this.deterministicMode;
  }
  
  /**
   * Reset the seed counter (useful for consistent test runs)
   */
  resetSeed(): void {
    this.seedCounter = 0;
  }
}

// Export singleton instance
export const plantConfig = PlantConfig.getInstance();