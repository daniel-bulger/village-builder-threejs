export const Constants = {
  // Hex grid
  HEX_SIZE: 1.0, // Radius in world units
  HEX_HEIGHT: 0.2, // Thickness of soil hex
  
  // Player
  PLAYER_HEIGHT: 1.8,
  PLAYER_RADIUS: 0.4,
  WALK_SPEED: 5,
  RUN_SPEED: 10,
  
  // Camera
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 2000,
  THIRD_PERSON_DISTANCE: 10,
  THIRD_PERSON_HEIGHT: 5,
  OVERHEAD_HEIGHT: 50,
  OVERHEAD_ANGLE: 10, // Slight angle for depth perception
  
  // Desert
  TILE_SIZE: 100,
  TILES_PER_SIDE: 5, // 5x5 grid of tiles
  DESERT_COLOR: 0xd4a574,
  
  // Lighting
  AMBIENT_INTENSITY: 0.4,
  SUN_INTENSITY: 0.6,
  DAY_DURATION: 100, // Seconds for full day/night cycle
  
  // Soil
  SOIL_COLOR: 0xC19A6B, // Much lighter brown for dry soil (tan/sandy)
  BARRIER_COLOR: 0x505050, // Dark gray for impermeable barriers
  PREVIEW_VALID_COLOR: 0x00ff00,
  PREVIEW_INVALID_COLOR: 0xff0000,
  PREVIEW_OPACITY: 0.5,
  
  // Water physics
  // Hex volume = (3√3/2) * r² * h = 2.598 * 1² * 0.2 = 0.52 m³
  HEX_VOLUME_M3: 0.52, // Volume of one hex in cubic meters
  
  // Grid
  GRID_COLOR: 0x888888,
  GRID_OPACITY: 0.3,
  GRID_RADIUS: 50, // Show 50 hexes around player
} as const;