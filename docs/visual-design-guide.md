# Visual Design Guide: Spatial Systems

## Overall Aesthetic

The visual design for the construction, energy, and territory systems should maintain the game's existing low-poly, colorful aesthetic while adding clear visual communication for the new mechanics.

## Color Palette

### Construction Materials
```
Wood:
- Base: #8B6F47 (Burlywood)
- Highlight: #A0826D
- Shadow: #6B5637

Stone:
- Base: #8B8989 (Gray)
- Highlight: #A0A0A0
- Shadow: #6B6969

Brick:
- Base: #B22222 (Firebrick)
- Highlight: #CD5C5C
- Shadow: #8B1A1A

Crystal:
- Base: #87CEEB (Sky Blue)
- Highlight: #ADD8E6
- Shadow: #4682B4
- Emission: #FFFFFF (subtle glow)
```

### Energy System
```
Energy States:
- Full (80-100%): #00FF00 (Bright Green)
- Good (50-80%): #90EE90 (Light Green)
- Low (20-50%): #FFD700 (Gold)
- Critical (0-20%): #FF4500 (Orange Red)

Portal Energy:
- Field: #9370DB (Medium Purple) with alpha
- Particles: #DDA0DD (Plum)
- Recharge Beam: #FF00FF (Magenta)
```

### Territory System
```
Territory Overlays (with 50% opacity):
- Farming: #228B22 (Forest Green)
- Crafting: #DAA520 (Goldenrod)
- Residential: #4169E1 (Royal Blue)
- Storage: #8B4513 (Saddle Brown)
- Unassigned: #808080 (Gray)

Efficiency Indicators:
- High (80%+): #00FF00
- Medium (50-80%): #FFFF00
- Low (<50%): #FF0000
```

## Construction Visuals

### Component Design

#### Foundations
- Thick, sturdy blocks with visible texture
- Stone foundations have cobblestone pattern
- Crystal foundations have subtle geometric patterns
- Slight elevation from ground (0.1m)

#### Walls
- Clean geometric shapes
- Windows are actual holes (not textures)
- Door frames slightly recessed
- Visible thickness (0.2m)

#### Visual Feedback
```
Placement Preview:
- Ghost mesh with 50% opacity
- Green tint: Valid placement
- Red tint: Invalid placement
- Yellow tint: Unstable but possible

Structural Stress:
- Gradient from green to red
- Subtle particle effects at stress points
- Shaking animation when critical
```

### Construction Effects

#### Building Animation
1. Foundation appears with dust particles
2. Walls rise from foundation (0.5s each)
3. Roof pieces slide into place
4. Completion sparkle effect

#### Collapse Sequence
1. Warning shake (1-2 seconds)
2. Support failure sound
3. Components fall with physics
4. Dust cloud on impact
5. Rubble remains (can salvage)

## Energy System Visuals

### Portal Energy Field
```
Shader Effect:
- Spherical gradient from portal center
- Animated energy waves pulsing outward
- Hex grid overlay showing field strength
- Soft edges with noise texture
```

### Villager Energy Display
```
Energy Bar Design:
- Floating above villager head
- 3-segment bar (green/yellow/red)
- Pulsing glow when critical
- Lightning bolt icon when recharging

Work Radius Indicator:
- Dotted circle on ground
- Fades as energy depletes
- Color matches energy state
- Only visible when villager selected
```

### Recharge Effects
```
Recharge Beam:
- Particle stream from portal to villager
- Spiral motion around beam
- Intensity increases over time
- Completion flash

Queue Visualization:
- Numbered positions on ground
- Glowing footprints
- Ethereal chains connecting queue
```

## Territory System Visuals

### Territory Boundaries

#### Border Rendering
```
Ground Overlay:
- Hexes filled with territory color
- Animated border pattern
- Height: 0.05m above ground
- Soft edges between territories
```

#### 3D Visualization
```
Vertical Territories:
- Transparent walls at boundaries
- Fade with distance
- Dashed lines for upper floors
- Corner posts at vertices
```

### Efficiency Visualization

#### Heat Map Mode
```
Color Gradient:
- Red (low) -> Yellow -> Green (high)
- Smooth interpolation
- Hex-based granularity
- Optional grid lines
```

#### Icon Overlays
```
Territory Type Icons:
- Floating 3D icons at territory center
- Rotate to face camera
- Scale with zoom level
- Semi-transparent
```

## UI Design

### Construction UI

#### Component Palette
```
Layout:
[Foundations] [Walls] [Floors] [Roofs] [Stairs] [Decor]

Component Card:
┌─────────────┐
│ [3D Preview]│
│  Wood Wall  │
│  Cost: 5W   │
│  Support: 50│
└─────────────┘
```

#### Material Selector
```
Radial Menu:
     [Crystal]
[Wood]       [Brick]
     [Stone]
```

### Territory UI

#### Drawing Tools
```
Toolbar:
[✏️ Draw] [⬜ Rectangle] [⭕ Circle] [🔧 Edit]

Mode Indicators:
- Cursor changes per tool
- Preview shows territory type color
- Hex highlight on hover
```

#### Assignment Panel
```
┌─ Territory: North Farm ─────┐
│ Type: [Farming ▼]           │
│ Size: 24 hexes              │
│ Efficiency: ████████░░ 85%  │
│                             │
│ Assigned to:                │
│ • Mary the Farmer           │
│ • [Assign Villager...]      │
│                             │
│ [Rename] [Delete] [Split]   │
└─────────────────────────────┘
```

## Particle Effects

### Construction Particles
```
Dust:
- Color matches material
- Gravity affected
- Fades over 2 seconds
- More particles for larger components

Sparkles:
- On completion
- Random positions around component
- Star-shaped sprites
- Gold color
```

### Energy Particles
```
Portal Aura:
- Floating motes of light
- Orbital motion
- Size variance
- Additive blending

Recharge Particles:
- Stream from portal
- Spiral trajectory
- Accelerate toward villager
- Burst on contact
```

## Lighting Considerations

### Dynamic Shadows
- Buildings cast shadows
- Update with sun position
- Soft shadows for performance
- Shadow LOD system

### Material Response
- Wood: Matte finish
- Stone: Slight specularity
- Crystal: Subsurface scattering
- Metal: Reflective highlights

### Night Lighting
- Windows glow from interior
- Portal energy provides area light
- Crystal materials self-illuminate
- Torch/lamp placement system

## Performance Guidelines

### LOD Distances
```
LOD0 (Full Detail): 0-30m
LOD1 (Simplified): 30-60m
LOD2 (Basic): 60-100m
LOD3 (Billboard): 100m+
```

### Texture Resolutions
```
Materials: 512x512
UI Icons: 128x128
Particles: 64x64
Terrain Overlays: 256x256 per chunk
```

### Poly Counts
```
Wall Section: 12-24 triangles
Foundation: 24-36 triangles
Complex Components: <100 triangles
Villager: ~500 triangles
```

## Accessibility

### Colorblind Modes
- Patterns in addition to colors
- High contrast borders
- Shape differentiation
- Icon supplements

### Visual Clarity
- Clear silhouettes
- Consistent visual language
- Important info never color-only
- UI scaling options

## Animation Principles

### Component Animations
- Snappy placement (0.2s)
- Smooth rotations
- Bounce easing on landing
- No animation in build mode

### Villager Animations
- Energy drain: Gradual slump
- Recharging: Standing straight
- Working: Task-specific
- Walking: Energy-based speed

### UI Animations
- Subtle hover states
- Smooth transitions
- No excessive motion
- Respect reduced motion settings