# Testing the Construction System

## Quick Start

1. **Launch the game** and press `T` to add test materials to your inventory
2. **Select the Construction Tool** (🔨) from your hotbar
3. The Construction UI will appear at the bottom of the screen

## Basic Controls

- **Left Click**: Place component
- **Right Click**: Cancel placement
- **R**: Rotate component (for walls)
- **PageUp/PageDown**: Change building level
- **ESC**: Exit construction mode

## Placement Modes

The construction system uses different placement modes for different components:

### Single Placement Mode
- **Used for**: Foundations, Pillars, Doors, Windows, Stairs
- **How it works**: Each click places one component
- **Visual feedback**: Green preview at cursor position

### Line Placement Mode  
- **Used for**: Walls
- **How it works**: First click sets start point, second click sets end point
- **Visual feedback**: Line preview between start and cursor
- **Cancel**: Right-click to cancel and start over

### Fill Placement Mode
- **Used for**: Floors
- **How it works**: First click sets one corner, second click fills rectangle
- **Visual feedback**: Rectangle preview showing area to fill
- **Cancel**: Right-click to cancel and start over

## Building Your First Structure

### 1. Place a Foundation
- Select "Foundation" from the component types
- Choose your material (Wood is cheapest)
- Click on a hex to place the foundation (single placement mode)
- Each click places one foundation

### 2. Add Walls
- Select "Wall" from the component types
- Walls snap to hex edges - move your mouse to see the green highlight
- Uses Line Mode: Click start point, then click end point
- The system will place walls along the line between points
- Press R to rotate if needed

### 3. Add a Floor/Ceiling
- Select "Floor" from the component types
- Press PageUp to go to level 1
- Uses Fill Mode: Click two opposite corners to fill the area
- Make sure you have adequate support (walls/pillars) first

### 4. Test Structural Integrity
- Try removing a wall that's supporting a floor
- The system should prevent removal if it would cause collapse
- Notice how components turn red when stressed

## Component Types

- **Foundation**: Base of any building, provides maximum support
- **Wall**: Vertical structure, can have doors/windows
- **Floor**: Horizontal platform, creates multiple levels
- **Pillar**: Alternative to walls for open spaces
- **Door**: Wall with door opening (coming soon)
- **Window**: Wall with window opening (coming soon)
- **Stairs**: Connect different levels (coming soon)
- **Roof**: Top of building (coming soon)

## Material Properties

- **Wood**: Basic, supports 2 levels
- **Stone**: Sturdy, supports 4 levels
- **Brick**: Refined, supports 5 levels
- **Crystal**: Advanced, supports 6 levels
- **Metal**: Ultimate, supports 8 levels

## Tips

- Start with foundations - they don't need support
- Walls must be supported by floors/foundations below
- Floors need walls or pillars for support
- Build vertically to save space
- Mix materials for aesthetic variety

## Known Issues

- Mouse input may conflict with camera controls
- Some component types (doors, windows, stairs) not fully implemented
- No material cost deduction yet
- Buildings don't persist across sessions yet

## Debug Commands

- Press `T`: Add test materials
- Click "Stress" button (if visible): Toggle structural stress visualization