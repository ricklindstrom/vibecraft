# Voxel World

A browser-based voxel world generator inspired by Minecraft, built with Three.js. Features infinite procedurally generated terrain with realistic water depth effects.

## Features

### World Generation
- Infinite procedurally generated terrain using multi-octave noise
- Dynamic chunk-based loading (16x16 blocks per chunk)
- Varied terrain with hills, mountains, and oceans
- Realistic water with depth-based transparency
- Randomly distributed trees across the landscape

### Controls
- **Movement**:
  - W/S or Up/Down Arrows: Move forward/backward
  - A/D: Strafe left/right
  - Left/Right Arrows: Turn left/right
  - Spacebar: Jump
- **Camera**:
  - Mouse: Click to lock pointer for looking around
  - Alternative: Drag mouse when pointer isn't locked
- **Debug**:
  - F: Toggle FPS counter
  - ~: Open Debug panel

### Graphics
- Dynamic lighting with shadows
- Depth-based water transparency
- Distance fog for atmosphere
- Responsive window resizing

### Block Types
- Grass-covered surface
- Dirt layers
- Stone base
- Sandy ocean floor
- Wood and leaf blocks for trees

## Technical Requirements
- Modern web browser with WebGL support
- Three.js r128 (loaded from CDN)

## TO DO
 - [ ] Make two types of water layers. Make water surface shiny. Aligm subsurface water layers with blocks.
 - [ ] Add shadows back.
 - [ ] Add detail to blocks.
 - [X] Allow jumping even if not on the ground to allow 'flying'.
 - [ ] Rotate minimap to align with direction of player.
 - [ ] Create houses.
 - [ ] Add proper smoothing to spline function.
 - [ ] Add houses.
 - [ ] Create house building L-System?
 - [ ] Add terrain rating score for home building. 
 - [ ] Add cloud layer
 - [ ] Improve perlin noise function to make more natural terrain.

## Quick Start
1. Open index.html in a browser
2. Enjoy

The game displays control hints in the top-left corner during gameplay. 