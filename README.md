# Hood Warfare 2 (3D Web Multiplayer FPS)

A complete, playable 3D multiplayer first-person shooter inspired by Call of Duty, featuring a block-by-block procedural recreation of the Nuketown map, high-speed kinematic AABB physics, server-side AI bot fill, and authoritative 20Hz Node.js/Socket.io backend.

## Key Features

1. **Pure Engine-Only PlayCanvas Architecture:**
   * 100% code-driven without requiring the PlayCanvas cloud editor.
   * Built-in local offline PlayCanvas engine bundle (`public/lib/playcanvas.min.js`) with CDN fallback.
   * Procedural PBR materials and primitive meshes (`box`, `cylinder`, `sphere`) with dynamic lighting and shadows.

2. **Accurate Procedural Nuketown Map:**
   * Dual enterable 2-story houses: West House (Crips / Blue Trim `#1e5aa8`) and East House (Bloods / Red Trim `#a81e23`).
   * Ground floor living rooms, interior stairs ramps, 2nd-floor sniper windows with crouch cover sills, backyard balconies with railings.
   * Central yellow school bus, climbable moving box truck with rear ramp and interior cargo bed, flanking sedans, cul-de-sac asphalt, grass lawns, and wooden backyard fences.
   * Wide 5-meter flanking side pathways at `Z = ±14`.

3. **Authoritative Multiplayer Backend (`server.js`):**
   * 4 persistent dedicated server rooms:
     * `server-1`: "Server 1 - Nuketown 24/7 [US-East]" (Bot Fill: ON)
     * `server-2`: "Server 2 - Turf War TDM [US-West]" (Bot Fill: ON)
     * `server-3`: "Server 3 - Hood Classic [US-East]" (Bot Fill: ON)
     * `server-4`: "Server 4 - Competitive Scrims [Global]" (Bot Fill: OFF)
   * Real-time 20Hz state synchronization.
   * Team auto-balancing (prevents joining a team with >= 2 more players).
   * Server-side AI Bot fill maintaining 4v4 matches across 3 patrol lanes (North Car Lane, Mid Bus/Truck Gap, South Yard Lane).
   * Raycast line-of-sight checks, weapon recoil, falloff calculations, and hitbox multipliers (Head 1.5x, Torso 1.0x, Limbs 0.8x).
   * 5.0s cooldown health regeneration (25 HP/sec).
   * Dynamic backyard spawn-flip detection (triggers when >= 2 attackers cross past X = ±38).

4. **Combat & Weapons:**
   * **Street AK-47**: Full-Auto, 620 RPM, 30 DMG.
   * **MAC-10 SMG**: Full-Auto, 900 RPM, 22 DMG.
   * **Trench 12G**: Pump-Action, 8 Pellets, 18 DMG per pellet.
   * **Glock 19**: Semi-Auto secondary pistol, 400 RPM, 26 DMG.
   * 3D iron-sight viewmodels with ADS lerp, procedural sway/bobbing, recoil kick, bullet tracers, and muzzle flashes.

5. **Procedural Web Audio API Sound Synthesizer:**
   * Zero external audio files required.
   * Procedural gunshots (filtered noise + pitch-decay sub punches).
   * Hitmarkers (2200Hz tick for torso, 3100Hz + 1550Hz metallic chime for headshots).
   * Two-stage mechanical reload sounds and low-frequency footstep thumps.

## Getting Started

```bash
# Clone the repository
git clone git@github.com:Bazing89/hood-warfare-2.git
cd hood-warfare-2

# Install dependencies
npm install

# Start the game server
npm start
```

Open `http://localhost:3000` in your web browser.

### Controls
* **WASD / Arrow Keys**: Movement
* **Mouse**: Look / Aim (click to engage Pointer Lock)
* **Shift**: Tactical Sprint
* **C / Ctrl**: Crouch / Tactical Slide (when sprinting)
* **Space**: Jump
* **Left Click**: Fire
* **Right Click (Hold)**: Aim Down Sights (ADS)
* **1 / 2 / Q / Scroll Wheel**: Switch Weapon
* **R**: Reload
* **M**: Change Faction / Loadout
* **TAB (Hold)**: View Match Scoreboard
