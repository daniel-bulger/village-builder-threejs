# Village Builder - Phase 1 Complete

A 3D farming sandbox game built with Three.js and TypeScript.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

## Controls

- **WASD** - Move player
- **Shift** - Run
- **Mouse** - Look around (click to capture pointer)
- **Tab** - Toggle between 3rd person and overhead camera
- **G** - Toggle hex grid overlay
- **I** - Open inventory
- **1-9, 0** - Select hotbar slot
- **Left Click** - Use selected item/tool
- **Right Click** - Remove soil
- **E** - Enter nearby portal
- **P** - Spawn test portal (debug)
- **T** - Add test soil to inventory (debug)

## Phase 1 Features Implemented

✅ Three.js scene with TypeScript
✅ Player movement with WASD controls
✅ 3rd person and overhead camera modes
✅ Infinite desert environment
✅ Day/night cycle with dynamic lighting
✅ Hexagonal grid system
✅ Soil placement/removal on hex grid
✅ Visual placement preview
✅ FPS counter
✅ Info panel showing time, position, and soil count

## Running Tests

First install Playwright:
```bash
npm run test:install
```

Then run the tests:
```bash
npm run test:phase1
```

## Next Steps

Phase 2 will add:
- Water simulation with hex-based flow
- Soil moisture visualization
- Watering tools
- Evaporation mechanics