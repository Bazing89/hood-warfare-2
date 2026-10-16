/**
 * Hood Warfare - Shared Nuketown 3D Map Geometry, Colliders, Ramps & Spawn Points
 * Compatible with Node.js (CommonJS) and Browser (Global / Window / ES)
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MapData = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // Spawn points for Crips (West) and Bloods (East)
  // Positioned in open backyard areas with >= 3m clearance from all obstacles
  const WEST_SPAWNS = [
    { pos: [-52, 0.1, -8],  rotY: -90 },
    { pos: [-52, 0.1, -3],  rotY: -90 },
    { pos: [-50, 0.1, 0],   rotY: -90 },
    { pos: [-52, 0.1, 4],   rotY: -90 },
    { pos: [-50, 0.1, 8],   rotY: -90 },
    { pos: [-46, 0.1, 0],   rotY: -90 }
  ];

  const EAST_SPAWNS = [
    { pos: [52, 0.1, -8],  rotY: 90 },
    { pos: [52, 0.1, -3],  rotY: 90 },
    { pos: [50, 0.1, 0],   rotY: 90 },
    { pos: [52, 0.1, 4],   rotY: 90 },
    { pos: [50, 0.1, 8],   rotY: 90 },
    { pos: [46, 0.1, 0],   rotY: 90 }
  ];

  // Bot Patrol Lanes / Waypoints
  const BOT_LANES = [
    // North Car Lane (Z = -13)
    [
      { x: -50, z: -13 },
      { x: -28, z: -13 },
      { x: -10, z: -13 },
      { x: 10,  z: -13 },
      { x: 28,  z: -13 },
      { x: 50,  z: -13 }
    ],
    // Mid Bus / Truck Gap (Z = 0)
    [
      { x: -50, z: 0 },
      { x: -26, z: 0 },
      { x: -12, z: 4 },
      { x: 0,   z: -3 },
      { x: 12,  z: 4 },
      { x: 26,  z: 0 },
      { x: 50,  z: 0 }
    ],
    // South Yard Lane (Z = +13)
    [
      { x: -50, z: 13 },
      { x: -28, z: 13 },
      { x: -10, z: 13 },
      { x: 10,  z: 13 },
      { x: 28,  z: 13 },
      { x: 50,  z: 13 }
    ]
  ];

  // Ramps for staircases and truck bed
  const RAMPS = [
    // West House Interior Stairs: connects Y=0 to Y=4.0m along North wall (Z = -6), X from -35 to -28 (dir: 'x+' -> up toward mid)
    {
      id: 'west_stairs',
      x: -31.5, y: 2.0, z: -6.0,
      w: 7.0, h: 4.0, d: 2.2,
      dir: 'x+',
      color: '#4a3728',
      tag: 'stair'
    },
    // East House Interior Stairs: connects Y=0 to Y=4.0m along North wall (Z = -6), X from +35 to +28 (dir: 'x-' -> up toward mid)
    {
      id: 'east_stairs',
      x: 31.5, y: 2.0, z: -6.0,
      w: 7.0, h: 4.0, d: 2.2,
      dir: 'x-',
      color: '#4a3728',
      tag: 'stair'
    },
    // Moving Truck Rear Ramp: connects ground Y=0 to truck bed Y=1.4m, X = 4.5, Z from -5.8 to -2.6 (dir: 'z+' -> up into cargo)
    {
      id: 'truck_ramp',
      x: 4.5, y: 0.7, z: -4.2,
      w: 2.8, h: 1.4, d: 3.2,
      dir: 'z+',
      color: '#777777',
      tag: 'ramp'
    }
  ];

  // Static Box Geometry and Colliders
  const BOXES = [
    // -------------------------------------------------------------
    // 1. GROUND & TERRAIN
    // -------------------------------------------------------------
    // Central Cul-de-Sac Asphalt
    { x: 0, y: -0.25, z: 0, w: 48, h: 0.5, d: 44, color: '#22252a', collider: true, tag: 'ground' },
    // West Lot (Crips Turf - Grass)
    { x: -41, y: -0.25, z: 0, w: 34, h: 0.5, d: 44, color: '#2d4c2b', collider: true, tag: 'ground' },
    // East Lot (Bloods Turf - Grass)
    { x: 41, y: -0.25, z: 0, w: 34, h: 0.5, d: 44, color: '#2d4c2b', collider: true, tag: 'ground' },

    // Concrete Walkways
    { x: -20, y: -0.05, z: 0, w: 8, h: 0.12, d: 3.2, color: '#8c8c88', collider: false, tag: 'walkway' },
    { x: 20, y: -0.05, z: 0, w: 8, h: 0.12, d: 3.2, color: '#8c8c88', collider: false, tag: 'walkway' },
    { x: 0, y: -0.08, z: 0, w: 1.2, h: 0.05, d: 40, color: '#c4a632', collider: false, tag: 'road_line' },

    // -------------------------------------------------------------
    // 2. INVISIBLE BOUNDARY WALLS
    // -------------------------------------------------------------
    { x: -58, y: 7.5, z: 0, w: 1.0, h: 15.0, d: 48.0, color: null, collider: true, tag: 'boundary' },
    { x: 58, y: 7.5, z: 0, w: 1.0, h: 15.0, d: 48.0, color: null, collider: true, tag: 'boundary' },
    { x: 0, y: 7.5, z: -22, w: 120.0, h: 15.0, d: 1.0, color: null, collider: true, tag: 'boundary' },
    { x: 0, y: 7.5, z: 22, w: 120.0, h: 15.0, d: 1.0, color: null, collider: true, tag: 'boundary' },

    // -------------------------------------------------------------
    // 3. CENTRAL NEUTRAL ZONE COVER (MID-MAP)
    // -------------------------------------------------------------
    // Yellow School Bus: centered at (x: -3.5, y: 1.6, z: 0), w: 3.2, h: 3.2, d: 13.5
    { x: -3.5, y: 1.6, z: 0, w: 3.2, h: 3.2, d: 13.5, color: '#e5a918', collider: true, tag: 'bus' },
    // Bus Roof / Windows / Wheels
    { x: -3.5, y: 3.25, z: 0, w: 3.0, h: 0.2, d: 13.2, color: '#f3bc28', collider: false, tag: 'bus_detail' },
    { x: -3.5, y: 2.1, z: 0, w: 3.25, h: 0.9, d: 12.5, color: '#1a1f26', collider: false, tag: 'bus_window_stripe' },
    { x: -5.15, y: 0.5, z: -4.5, w: 0.3, h: 0.9, d: 0.9, color: '#111111', collider: false, tag: 'wheel' },
    { x: -1.85, y: 0.5, z: -4.5, w: 0.3, h: 0.9, d: 0.9, color: '#111111', collider: false, tag: 'wheel' },
    { x: -5.15, y: 0.5, z: 4.5, w: 0.3, h: 0.9, d: 0.9, color: '#111111', collider: false, tag: 'wheel' },
    { x: -1.85, y: 0.5, z: 4.5, w: 0.3, h: 0.9, d: 0.9, color: '#111111', collider: false, tag: 'wheel' },

    // Moving Box Truck: Cab and cargo box at (x: 4.5, y: 1.8, z: 2.5), w: 3.2, h: 3.6, d: 10.5
    // Cargo Bed Floor: walkable at Y = 1.4m
    { x: 4.5, y: 1.4, z: 0.75, w: 2.8, h: 0.2, d: 6.5, color: '#444444', collider: true, tag: 'truck_bed' },
    // Left Cargo Wall
    { x: 3.0, y: 2.4, z: 0.75, w: 0.2, h: 1.8, d: 6.5, color: '#dcdcdc', collider: true, tag: 'truck_wall' },
    // Right Cargo Wall
    { x: 6.0, y: 2.4, z: 0.75, w: 0.2, h: 1.8, d: 6.5, color: '#dcdcdc', collider: true, tag: 'truck_wall' },
    // Cargo Roof
    { x: 4.5, y: 3.35, z: 0.75, w: 3.2, h: 0.2, d: 6.5, color: '#bfbfbf', collider: true, tag: 'truck_roof' },
    // Front Cab
    { x: 4.5, y: 1.5, z: 5.5, w: 3.2, h: 3.0, d: 3.5, color: '#2b5ea8', collider: true, tag: 'truck_cab' },
    { x: 4.5, y: 2.1, z: 5.8, w: 3.0, h: 0.9, d: 2.6, color: '#151e2b', collider: false, tag: 'truck_windshield' },

    // North Sedan (chest-high cover at x: 0, y: 0.75, z: -13.5, w: 4.4, h: 1.5, d: 2.2)
    { x: 0, y: 0.75, z: -13.5, w: 4.4, h: 1.5, d: 2.2, color: '#912a2a', collider: true, tag: 'car_north' },
    { x: 0, y: 1.25, z: -13.5, w: 2.4, h: 0.65, d: 1.9, color: '#1a1a1a', collider: false, tag: 'car_cabin' },

    // South Sedan (chest-high cover at x: 0, y: 0.75, z: 13.5, w: 4.4, h: 1.5, d: 2.2)
    { x: 0, y: 0.75, z: 13.5, w: 4.4, h: 1.5, d: 2.2, color: '#225588', collider: true, tag: 'car_south' },
    { x: 0, y: 1.25, z: 13.5, w: 2.4, h: 0.65, d: 1.9, color: '#1a1a1a', collider: false, tag: 'car_cabin' },

    // Central Cul-de-Sac Road Signs / Fire Hydrants / Trash Cans
    { x: -7.5, y: 0.6, z: -8.0, w: 0.8, h: 1.2, d: 0.8, color: '#3b6e3d', collider: true, tag: 'cover' },
    { x: 7.5, y: 0.6, z: 8.0, w: 0.8, h: 1.2, d: 0.8, color: '#3b6e3d', collider: true, tag: 'cover' },
    { x: -1.0, y: 0.45, z: -6.5, w: 0.5, h: 0.9, d: 0.5, color: '#c43725', collider: true, tag: 'hydrant' },
    { x: 1.0, y: 0.45, z: 6.5, w: 0.5, h: 0.9, d: 0.5, color: '#c43725', collider: true, tag: 'hydrant' },

    // -------------------------------------------------------------
    // 4. WEST HOUSE (CRIPS TURF / BLUE TRIM #1e5aa8)
    // Footprint: X: -39 to -25 (14m), Z: -8 to +8 (16m), Center: X = -32, Z = 0
    // -------------------------------------------------------------
    // 1st Floor Slab (Y = 0)
    { x: -32, y: 0.05, z: 0, w: 14.0, h: 0.1, d: 16.0, color: '#3d342c', collider: false, tag: 'floor' },

    // 1st Floor Front Wall (X = -25): Doorway at Z = 0, width 2.4m, height 2.8m
    // South segment of front wall: Z from +1.2 to +8.0 (length 6.8, center Z = 4.6)
    { x: -25, y: 2.0, z: 4.6, w: 0.4, h: 4.0, d: 6.8, color: '#88929e', collider: true, tag: 'wall' },
    // North segment of front wall: Z from -8.0 to -1.2 (length 6.8, center Z = -4.6)
    { x: -25, y: 2.0, z: -4.6, w: 0.4, h: 4.0, d: 6.8, color: '#88929e', collider: true, tag: 'wall' },
    // Lintel above front doorway: Y: 2.8 to 4.0m
    { x: -25, y: 3.4, z: 0, w: 0.4, h: 1.2, d: 2.4, color: '#1e5aa8', collider: true, tag: 'wall' },

    // 1st Floor Back Wall (X = -39): Doorway at Z = 0, width 2.4m, height 2.8m
    // South segment: Z from +1.2 to +8.0
    { x: -39, y: 2.0, z: 4.6, w: 0.4, h: 4.0, d: 6.8, color: '#88929e', collider: true, tag: 'wall' },
    // North segment: Z from -8.0 to -1.2
    { x: -39, y: 2.0, z: -4.6, w: 0.4, h: 4.0, d: 6.8, color: '#88929e', collider: true, tag: 'wall' },
    // Lintel above rear doorway
    { x: -39, y: 3.4, z: 0, w: 0.4, h: 1.2, d: 2.4, color: '#1e5aa8', collider: true, tag: 'wall' },

    // 1st Floor North Wall (Z = -8): Solid wall
    { x: -32, y: 2.0, z: -8, w: 14.0, h: 4.0, d: 0.4, color: '#88929e', collider: true, tag: 'wall' },

    // 1st Floor South Wall (Z = +8): Side doorway at X = -32, width 2.4m, height 2.8m
    // West segment: X from -39 to -33.2 (length 5.8, center -36.1)
    { x: -36.1, y: 2.0, z: 8, w: 5.8, h: 4.0, d: 0.4, color: '#88929e', collider: true, tag: 'wall' },
    // East segment: X from -30.8 to -25 (length 5.8, center -27.9)
    { x: -27.9, y: 2.0, z: 8, w: 5.8, h: 4.0, d: 0.4, color: '#88929e', collider: true, tag: 'wall' },
    // Lintel above side doorway
    { x: -32, y: 3.4, z: 8, w: 2.4, h: 1.2, d: 0.4, color: '#1e5aa8', collider: true, tag: 'wall' },

    // 1st Floor Interior Living Room Partial Cover Wall (w: 0.4, h: 2.6, d: 4.5)
    { x: -31, y: 1.3, z: 2.2, w: 0.4, h: 2.6, d: 4.5, color: '#445163', collider: true, tag: 'interior_cover' },
    // Kitchen Counter Cover
    { x: -35.5, y: 0.55, z: 4.5, w: 1.2, h: 1.1, d: 3.2, color: '#2a2f35', collider: true, tag: 'counter' },

    // 2nd Floor Ceiling Slab (Y = 4.0m):
    // Whole floor is 14m x 16m. Stair opening is North side: X from -35 to -28 (7m), Z from -7.2 to -4.8 (2.4m).
    // Section South of stairs: Z from -4.8 to +8.0 (depth 12.8m, center Z = 1.6)
    { x: -32, y: 4.0, z: 1.6, w: 14.0, h: 0.3, d: 12.8, color: '#45382e', collider: true, tag: 'floor' },
    // Section West of stair cutout: X from -39 to -35 (width 4.0m, center X = -37), Z from -8 to -4.8
    { x: -37, y: 4.0, z: -6.4, w: 4.0, h: 0.3, d: 3.2, color: '#45382e', collider: true, tag: 'floor' },
    // Section East of stair cutout: X from -28 to -25 (width 3.0m, center X = -26.5), Z from -8 to -4.8
    { x: -26.5, y: 4.0, z: -6.4, w: 3.0, h: 0.3, d: 3.2, color: '#45382e', collider: true, tag: 'floor' },

    // 2nd Floor Walls (Y: 4.15m to 7.5m):
    // North Wall: solid (Z = -8)
    { x: -32, y: 5.75, z: -8, w: 14.0, h: 3.2, d: 0.4, color: '#88929e', collider: true, tag: 'wall' },
    // South Wall: solid (Z = +8)
    { x: -32, y: 5.75, z: 8, w: 14.0, h: 3.2, d: 0.4, color: '#88929e', collider: true, tag: 'wall' },

    // Mid-Facing Wall with Sniper Window (X = -25):
    // Waist-high crouch cover wall: Y: 4.0m to 5.0m, width 3.2m
    { x: -25, y: 4.5, z: 0, w: 0.4, h: 1.0, d: 3.2, color: '#1e5aa8', collider: true, tag: 'sniper_sill' },
    // Lintel above sniper window: Y: 6.6m to 7.5m, width 3.2m
    { x: -25, y: 7.05, z: 0, w: 0.4, h: 0.9, d: 3.2, color: '#1e5aa8', collider: true, tag: 'wall' },
    // South segment of 2nd floor front wall: Z from +1.6 to +8.0
    { x: -25, y: 5.75, z: 4.8, w: 0.4, h: 3.2, d: 6.4, color: '#88929e', collider: true, tag: 'wall' },
    // North segment of 2nd floor front wall: Z from -8.0 to -1.6
    { x: -25, y: 5.75, z: -4.8, w: 0.4, h: 3.2, d: 6.4, color: '#88929e', collider: true, tag: 'wall' },

    // 2nd Floor Back Wall with Balcony Doorway (X = -39):
    // Doorway centered at Z = 0, width 2.0m, height 2.6m
    { x: -39, y: 5.75, z: 4.5, w: 0.4, h: 3.2, d: 7.0, color: '#88929e', collider: true, tag: 'wall' },
    { x: -39, y: 5.75, z: -4.5, w: 0.4, h: 3.2, d: 7.0, color: '#88929e', collider: true, tag: 'wall' },
    { x: -39, y: 7.1, z: 0, w: 0.4, h: 0.8, d: 2.0, color: '#1e5aa8', collider: true, tag: 'wall' },

    // Backyard Balcony (West House): X: -39 to -41.5, Z: -3.0 to +3.0, Y = 4.0m
    { x: -40.25, y: 4.0, z: 0, w: 2.5, h: 0.25, d: 6.0, color: '#3d342c', collider: true, tag: 'balcony_floor' },
    // Balcony Railings:
    { x: -41.5, y: 4.65, z: 0, w: 0.15, h: 1.0, d: 6.0, color: '#1e5aa8', collider: true, tag: 'railing' },
    { x: -40.25, y: 4.65, z: -3.0, w: 2.5, h: 1.0, d: 0.15, color: '#1e5aa8', collider: true, tag: 'railing' },
    { x: -40.25, y: 4.65, z: 3.0, w: 2.5, h: 1.0, d: 0.15, color: '#1e5aa8', collider: true, tag: 'railing' },

    // Roof Slab (Y = 7.5m): X from -40 to -24, Z from -8.5 to +8.5
    { x: -32, y: 7.5, z: 0, w: 16.0, h: 0.35, d: 17.0, color: '#2b3642', collider: true, tag: 'roof' },
    { x: -32, y: 8.1, z: 0, w: 14.0, h: 0.8, d: 15.0, color: '#1c242c', collider: true, tag: 'roof_peak' },

    // -------------------------------------------------------------
    // 5. EAST HOUSE (BLOODS TURF / RED TRIM #a81e23)
    // Footprint: X: +25 to +39 (14m), Z: -8 to +8 (16m), Center: X = +32, Z = 0
    // -------------------------------------------------------------
    // 1st Floor Slab (Y = 0)
    { x: 32, y: 0.05, z: 0, w: 14.0, h: 0.1, d: 16.0, color: '#3d342c', collider: false, tag: 'floor' },

    // 1st Floor Front Wall (X = +25 facing Mid): Doorway at Z = 0, width 2.4m, height 2.8m
    { x: 25, y: 2.0, z: 4.6, w: 0.4, h: 4.0, d: 6.8, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 25, y: 2.0, z: -4.6, w: 0.4, h: 4.0, d: 6.8, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 25, y: 3.4, z: 0, w: 0.4, h: 1.2, d: 2.4, color: '#a81e23', collider: true, tag: 'wall' },

    // 1st Floor Back Wall (X = +39): Doorway at Z = 0, width 2.4m, height 2.8m
    { x: 39, y: 2.0, z: 4.6, w: 0.4, h: 4.0, d: 6.8, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 39, y: 2.0, z: -4.6, w: 0.4, h: 4.0, d: 6.8, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 39, y: 3.4, z: 0, w: 0.4, h: 1.2, d: 2.4, color: '#a81e23', collider: true, tag: 'wall' },

    // 1st Floor North Wall (Z = -8): Solid wall
    { x: 32, y: 2.0, z: -8, w: 14.0, h: 4.0, d: 0.4, color: '#9e8888', collider: true, tag: 'wall' },

    // 1st Floor South Wall (Z = +8): Side doorway at X = +32, width 2.4m, height 2.8m
    { x: 27.9, y: 2.0, z: 8, w: 5.8, h: 4.0, d: 0.4, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 36.1, y: 2.0, z: 8, w: 5.8, h: 4.0, d: 0.4, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 32, y: 3.4, z: 8, w: 2.4, h: 1.2, d: 0.4, color: '#a81e23', collider: true, tag: 'wall' },

    // 1st Floor Interior Living Room Partial Cover Wall
    { x: 31, y: 1.3, z: 2.2, w: 0.4, h: 2.6, d: 4.5, color: '#634444', collider: true, tag: 'interior_cover' },
    // Kitchen Counter Cover
    { x: 35.5, y: 0.55, z: 4.5, w: 1.2, h: 1.1, d: 3.2, color: '#352a2a', collider: true, tag: 'counter' },

    // 2nd Floor Ceiling Slab (Y = 4.0m):
    { x: 32, y: 4.0, z: 1.6, w: 14.0, h: 0.3, d: 12.8, color: '#45382e', collider: true, tag: 'floor' },
    { x: 26.5, y: 4.0, z: -6.4, w: 3.0, h: 0.3, d: 3.2, color: '#45382e', collider: true, tag: 'floor' },
    { x: 37, y: 4.0, z: -6.4, w: 4.0, h: 0.3, d: 3.2, color: '#45382e', collider: true, tag: 'floor' },

    // 2nd Floor Walls (Y: 4.15m to 7.5m):
    { x: 32, y: 5.75, z: -8, w: 14.0, h: 3.2, d: 0.4, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 32, y: 5.75, z: 8, w: 14.0, h: 3.2, d: 0.4, color: '#9e8888', collider: true, tag: 'wall' },

    // Mid-Facing Wall with Sniper Window (X = +25):
    { x: 25, y: 4.5, z: 0, w: 0.4, h: 1.0, d: 3.2, color: '#a81e23', collider: true, tag: 'sniper_sill' },
    { x: 25, y: 7.05, z: 0, w: 0.4, h: 0.9, d: 3.2, color: '#a81e23', collider: true, tag: 'wall' },
    { x: 25, y: 5.75, z: 4.8, w: 0.4, h: 3.2, d: 6.4, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 25, y: 5.75, z: -4.8, w: 0.4, h: 3.2, d: 6.4, color: '#9e8888', collider: true, tag: 'wall' },

    // 2nd Floor Back Wall with Balcony Doorway (X = +39):
    { x: 39, y: 5.75, z: 4.5, w: 0.4, h: 3.2, d: 7.0, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 39, y: 5.75, z: -4.5, w: 0.4, h: 3.2, d: 7.0, color: '#9e8888', collider: true, tag: 'wall' },
    { x: 39, y: 7.1, z: 0, w: 0.4, h: 0.8, d: 2.0, color: '#a81e23', collider: true, tag: 'wall' },

    // Backyard Balcony (East House): X: +39 to +41.5, Z: -3.0 to +3.0
    { x: 40.25, y: 4.0, z: 0, w: 2.5, h: 0.25, d: 6.0, color: '#3d342c', collider: true, tag: 'balcony_floor' },
    { x: 41.5, y: 4.65, z: 0, w: 0.15, h: 1.0, d: 6.0, color: '#a81e23', collider: true, tag: 'railing' },
    { x: 40.25, y: 4.65, z: -3.0, w: 2.5, h: 1.0, d: 0.15, color: '#a81e23', collider: true, tag: 'railing' },
    { x: 40.25, y: 4.65, z: 3.0, w: 2.5, h: 1.0, d: 0.15, color: '#a81e23', collider: true, tag: 'railing' },

    // Roof Slab (Y = 7.5m)
    { x: 32, y: 7.5, z: 0, w: 16.0, h: 0.35, d: 17.0, color: '#422b2b', collider: true, tag: 'roof' },
    { x: 32, y: 8.1, z: 0, w: 14.0, h: 0.8, d: 15.0, color: '#2c1c1c', collider: true, tag: 'roof_peak' },

    // -------------------------------------------------------------
    // 6. BACKYARDS, FENCES & COVER
    // Clear of all spawn points: props moved to outer edges
    // -------------------------------------------------------------
    // West Backyard: X: -56 to -40, Z: -18 to +18
    // Outer West Back Fence (X = -56)
    { x: -56, y: 1.2, z: 0, w: 0.3, h: 2.4, d: 36.0, color: '#5c4028', collider: true, tag: 'fence' },
    // North Fence (Z = -18)
    { x: -48, y: 1.2, z: -18, w: 16.0, h: 2.4, d: 0.3, color: '#5c4028', collider: true, tag: 'fence' },
    // South Fence (Z = +18)
    { x: -48, y: 1.2, z: 18, w: 16.0, h: 2.4, d: 0.3, color: '#5c4028', collider: true, tag: 'fence' },
    // West Backyard Shed Cover (Corner at X: -43, Z: 14)
    { x: -43, y: 1.4, z: 14, w: 3.0, h: 2.8, d: 3.0, color: '#4e3820', collider: true, tag: 'shed' },
    // West Backyard Picnic Table Cover (Corner at X: -43, Z: -14)
    { x: -43, y: 0.5, z: -14, w: 2.2, h: 1.0, d: 2.2, color: '#684a2d', collider: true, tag: 'table' },

    // East Backyard: X: +40 to +56, Z: -18 to +18
    // Outer East Back Fence (X = +56)
    { x: 56, y: 1.2, z: 0, w: 0.3, h: 2.4, d: 36.0, color: '#5c4028', collider: true, tag: 'fence' },
    // North Fence (Z = -18)
    { x: 48, y: 1.2, z: -18, w: 16.0, h: 2.4, d: 0.3, color: '#5c4028', collider: true, tag: 'fence' },
    // South Fence (Z = +18)
    { x: 48, y: 1.2, z: 18, w: 16.0, h: 2.4, d: 0.3, color: '#5c4028', collider: true, tag: 'fence' },
    // East Backyard Shed Cover (Corner at X: 43, Z: 14)
    { x: 43, y: 1.4, z: 14, w: 3.0, h: 2.8, d: 3.0, color: '#4e3820', collider: true, tag: 'shed' },
    // East Backyard Picnic Table Cover (Corner at X: 43, Z: -14)
    { x: 43, y: 0.5, z: -14, w: 2.2, h: 1.0, d: 2.2, color: '#684a2d', collider: true, tag: 'table' },

    // Front Yard Picket Fences separating yards from Cul-de-Sac:
    // Left segment: Z from -8 to -11.5 (connects to house side), leaving Z: -11.5 to -16.5 (5m wide pathway) open!
    { x: -21, y: 0.6, z: -9.8, w: 0.2, h: 1.2, d: 3.6, color: '#dddddd', collider: true, tag: 'picket_fence' },
    { x: -21, y: 0.6, z: 9.8,  w: 0.2, h: 1.2, d: 3.6, color: '#dddddd', collider: true, tag: 'picket_fence' },
    { x: 21,  y: 0.6, z: -9.8, w: 0.2, h: 1.2, d: 3.6, color: '#dddddd', collider: true, tag: 'picket_fence' },
    { x: 21,  y: 0.6, z: 9.8,  w: 0.2, h: 1.2, d: 3.6, color: '#dddddd', collider: true, tag: 'picket_fence' }
  ];

  // Helper: Ray vs AABB intersection test
  function intersectRayAABB(origin, dir, box) {
    const minX = box.x - box.w / 2;
    const maxX = box.x + box.w / 2;
    const minY = box.y - box.h / 2;
    const maxY = box.y + box.h / 2;
    const minZ = box.z - box.d / 2;
    const maxZ = box.z + box.d / 2;

    let tmin = (minX - origin[0]) / (dir[0] || 1e-9);
    let tmax = (maxX - origin[0]) / (dir[0] || 1e-9);
    if (tmin > tmax) { const temp = tmin; tmin = tmax; tmax = temp; }

    let tymin = (minY - origin[1]) / (dir[1] || 1e-9);
    let tymax = (maxY - origin[1]) / (dir[1] || 1e-9);
    if (tymin > tymax) { const temp = tymin; tymin = tymax; tymax = temp; }

    if (tmin > tymax || tymin > tmax) return Infinity;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = (minZ - origin[2]) / (dir[2] || 1e-9);
    let tzmax = (maxZ - origin[2]) / (dir[2] || 1e-9);
    if (tzmin > tzmax) { const temp = tzmin; tzmin = tzmax; tzmax = temp; }

    if (tmin > tzmax || tzmin > tmax) return Infinity;
    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    if (tmax < 0) return Infinity;
    return tmin >= 0 ? tmin : tmax;
  }

  // Pre-filter solid colliders for fast raycasting & physics
  const COLLIDERS = BOXES.filter(b => b.collider);

  // Line of Sight check
  function checkLineOfSight(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.001) return true;

    const dir = [dx / dist, dy / dist, dz / dist];
    for (let i = 0; i < COLLIDERS.length; i++) {
      const col = COLLIDERS[i];
      if (col.tag === 'ground' || col.tag === 'boundary') continue;
      const t = intersectRayAABB(p1, dir, col);
      if (t < dist - 0.2) {
        return false;
      }
    }
    return true;
  }

  return {
    GRID: { minX: -60, maxX: 60, minZ: -24, maxZ: 24 },
    WEST_SPAWNS,
    EAST_SPAWNS,
    BOT_LANES,
    RAMPS,
    BOXES,
    COLLIDERS,
    intersectRayAABB,
    checkLineOfSight
  };
}));
