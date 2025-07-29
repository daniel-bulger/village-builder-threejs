/**
 * SoilItem.ts
 * 
 * Represents a stack of soil with specific nutrient properties.
 * Soil can be collected from the portal world, mixed with other soil,
 * and applied to hexes in the farm world.
 * 
 * Key behaviors:
 * - Soil from portal always has 0% moisture (portal dries it out)
 * - Quantity is measured in "hexes worth" (e.g., 2.5 = enough for 2.5 hexes)
 * - Nutrients are N-P-K percentages from 0-100
 * - Only soil with EXACT same nutrients can stack together
 */

export interface NutrientProfile {
  nitrogen: number;    // 0-100 percentage
  phosphorus: number;  // 0-100 percentage
  potassium: number;   // 0-100 percentage
}

export class SoilItem {
  public readonly id: string;
  public nutrients: NutrientProfile;
  public quantity: number;  // Hexes worth of soil (can be fractional)
  public moisture: number;  // Always 0 when from portal
  public source: string;    // Where it was found (e.g., "Ancient Forest")

  constructor(
    nutrients: NutrientProfile,
    quantity: number,
    source: string = "Unknown"
  ) {
    this.id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `soil-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.nutrients = { ...nutrients };
    this.quantity = quantity;
    this.moisture = 0; // Portal always dries soil
    this.source = source;
  }

  /**
   * Check if this soil can stack with another soil item.
   * Soils only stack if they have EXACTLY the same nutrient profile.
   */
  canStackWith(other: SoilItem): boolean {
    return (
      this.nutrients.nitrogen === other.nutrients.nitrogen &&
      this.nutrients.phosphorus === other.nutrients.phosphorus &&
      this.nutrients.potassium === other.nutrients.potassium
    );
  }

  /**
   * Create a new soil item by combining this soil with another.
   * Uses weighted average based on quantities.
   * 
   * Example: 1.0 hex of 80-20-40 + 3.0 hexes of 40-60-20 = 4.0 hexes of 50-50-25
   */
  static mix(soil1: SoilItem, soil2: SoilItem): SoilItem {
    const totalQuantity = soil1.quantity + soil2.quantity;
    
    // Calculate weighted average for each nutrient
    const mixedNutrients: NutrientProfile = {
      nitrogen: (soil1.nutrients.nitrogen * soil1.quantity + 
                 soil2.nutrients.nitrogen * soil2.quantity) / totalQuantity,
      phosphorus: (soil1.nutrients.phosphorus * soil1.quantity + 
                   soil2.nutrients.phosphorus * soil2.quantity) / totalQuantity,
      potassium: (soil1.nutrients.potassium * soil1.quantity + 
                  soil2.nutrients.potassium * soil2.quantity) / totalQuantity,
    };

    // Round to 1 decimal place to avoid floating point precision issues
    mixedNutrients.nitrogen = Math.round(mixedNutrients.nitrogen * 10) / 10;
    mixedNutrients.phosphorus = Math.round(mixedNutrients.phosphorus * 10) / 10;
    mixedNutrients.potassium = Math.round(mixedNutrients.potassium * 10) / 10;

    return new SoilItem(
      mixedNutrients,
      totalQuantity,
      `Mixed (${soil1.source} + ${soil2.source})`
    );
  }

  /**
   * Split this soil stack into two stacks.
   * Both resulting stacks have the SAME nutrient profile.
   * Cannot be used to separate nutrients.
   * 
   * @param amount Amount to split off (must be less than current quantity)
   * @returns New SoilItem with the split amount, or null if invalid
   */
  split(amount: number): SoilItem | null {
    if (amount <= 0 || amount >= this.quantity) {
      return null;
    }

    // Round to 1 decimal place
    amount = Math.round(amount * 10) / 10;
    
    // Create new stack with same nutrients
    const splitStack = new SoilItem(
      { ...this.nutrients },
      amount,
      this.source
    );

    // Reduce this stack's quantity
    this.quantity = Math.round((this.quantity - amount) * 10) / 10;

    return splitStack;
  }

  /**
   * Get a display string for the nutrient profile
   */
  getNutrientString(): string {
    return `${Math.round(this.nutrients.nitrogen)}-${Math.round(this.nutrients.phosphorus)}-${Math.round(this.nutrients.potassium)}`;
  }

  /**
   * Get display name for UI
   */
  getDisplayName(): string {
    return `Soil (${this.getNutrientString()})`;
  }

  /**
   * Clone this soil item
   */
  clone(): SoilItem {
    const clone = new SoilItem(
      { ...this.nutrients },
      this.quantity,
      this.source
    );
    return clone;
  }
}

/**
 * Predefined soil types found in different biomes
 */
export const BIOME_SOILS = {
  FERTILE_VALLEY: { nitrogen: 65, phosphorus: 65, potassium: 65 },
  ANCIENT_FOREST: { nitrogen: 80, phosphorus: 40, potassium: 40 },
  VOLCANIC_ASH: { nitrogen: 40, phosphorus: 80, potassium: 50 },
  CRYSTAL_CAVES: { nitrogen: 30, phosphorus: 40, potassium: 90 },
  DEPLETED_WASTES: { nitrogen: 10, phosphorus: 20, potassium: 15 },
} as const;