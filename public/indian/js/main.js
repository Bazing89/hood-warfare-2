/**
 * Indian Simulator: Village Mud Wars
 * Main Game Bootstrap & Orchestrator
 */

(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('application-canvas');
    if (!canvas) {
      console.error('[Indian Simulator] Canvas #application-canvas not found!');
      return;
    }

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Handle Window Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 2. Instantiate Subsystems
    const world = new VillageWorld(scene);
    world.build();

    const weaponSystem = new WeaponSystem(scene);
    const player = new PlayerController(camera, scene, canvas);
    const ui = new UIManager();

    // 3. Populate Sacred Cows
    const cows = [
      new DesiCow(scene, { id: 'cow_1', name: 'Kamadhenu', colorType: 'white', x: -6, z: -8 }),
      new DesiCow(scene, { id: 'cow_2', name: 'Gauri', colorType: 'brown', x: -28, z: 8 }),
      new DesiCow(scene, { id: 'cow_3', name: 'Nandi', colorType: 'white', x: -32, z: 18 }),
      new DesiCow(scene, { id: 'cow_4', name: 'Surabhi', colorType: 'spotted', x: 18, z: 12 }),
      new DesiCow(scene, { id: 'cow_5', name: 'Lakshmi', colorType: 'brown', x: 26, z: -10 }),
      new DesiCow(scene, { id: 'cow_6', name: 'Bhavani', colorType: 'spotted', x: -18, z: -15 })
    ];

    // 4. Populate AI Villagers
    const villagers = [
      new Villager(scene, { id: 'v1', name: 'Ramu', kurtaColor: 0xff6f00, turbanColor: 0xd81b60, x: -8, z: 4 }),
      new Villager(scene, { id: 'v2', name: 'Chacha Chaudhry', kurtaColor: 0xeeeeee, turbanColor: 0xb71c1c, x: 8, z: -12 }),
      new Villager(scene, { id: 'v3', name: 'Priya', kurtaColor: 0xfbc02d, turbanColor: 0x8e24aa, x: 16, z: 2 }),
      new Villager(scene, { id: 'v4', name: 'Babloo', kurtaColor: 0x00897b, turbanColor: 0xff5722, x: 2, z: -20 }),
      new Villager(scene, { id: 'v5', name: 'Panditji', kurtaColor: 0xff9800, turbanColor: 0xffffff, x: 20, z: -16 }),
      new Villager(scene, { id: 'v6', name: 'Uncleji', kurtaColor: 0x1976d2, turbanColor: 0xf57c00, x: -18, z: 10 })
    ];

    // Game Match State
    const gameState = {
      mode: 'championship', // 'championship' or 'sandbox'
      timeLeft: 180, // 3 minutes
      isGameOver: false,
      stats: {
        cowsBlessed: 0,
        villagersSplatted: 0,
        bellsRung: 0,
        potsSmashed: 0,
        mudThrown: 0
      }
    };

    // 5. Connect Weapon Projectile Callbacks
    player.onThrowCallback = (config) => {
      gameState.stats.mudThrown++;
      weaponSystem.spawnProjectile(config);
    };

    // Event Handler for Projectile Hits
    const onGameEvent = (type, data) => {
      if (type === 'cow_hit') {
        gameState.stats.cowsBlessed++;
        const pts = ui.addScore(data.points);
        ui.spawnPopup(`+${pts} HOLY COW BLESSING! 🐮✨`, true);
      } else if (type === 'villager_hit') {
        gameState.stats.villagersSplatted++;
        const pts = ui.addScore(data.points);
        ui.spawnPopup(`+${pts} ${data.villager.name} SPLATTED! 🎯<br><small>"${data.quote}"</small>`, true);
      } else if (type === 'bell_hit') {
        gameState.stats.bellsRung++;
        const pts = ui.addScore(data.points);
        ui.spawnPopup(`+${pts} TEMPLE BELL RUNG! 🔔🕉️`, true);
      } else if (type === 'matka_broken') {
        gameState.stats.potsSmashed++;
        const pts = ui.addScore(data.points);
        ui.spawnPopup(`+${pts} CLAY MATKA SMASHED! 🏺`, true);
      } else if (type === 'player_hit') {
        ui.spawnPopup(`MUD SPLAT FROM ${data.thrower}! 💥<br><small>Press [C] to Clean Face</small>`, false);
      }
    };

    // 6. UI Interaction & Button Listeners
    const btnPlayChampionship = document.getElementById('btn-play-championship');
    const btnPlaySandbox = document.getElementById('btn-play-sandbox');
    const menuModal = document.getElementById('screen-menu');
    const gameOverModal = document.getElementById('screen-game-over');
    const btnRestart = document.getElementById('btn-restart');
    const btnMute = document.getElementById('btn-mute');

    function startGame(mode) {
      gameState.mode = mode;
      gameState.timeLeft = mode === 'championship' ? 180 : 999999;
      gameState.isGameOver = false;
      ui.score = 0;
      ui.displayScore = 0;
      gameState.stats = { cowsBlessed: 0, villagersSplatted: 0, bellsRung: 0, potsSmashed: 0, mudThrown: 0 };

      if (menuModal) menuModal.style.display = 'none';
      if (gameOverModal) gameOverModal.style.display = 'none';

      canvas.requestPointerLock();
      if (window.soundEngine) {
        window.soundEngine.init();
      }
    }

    if (btnPlayChampionship) {
      btnPlayChampionship.addEventListener('click', () => startGame('championship'));
    }
    if (btnPlaySandbox) {
      btnPlaySandbox.addEventListener('click', () => startGame('sandbox'));
    }
    if (btnRestart) {
      btnRestart.addEventListener('click', () => startGame('championship'));
    }

    // Mute Toggle Button
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        if (window.soundEngine) {
          const muted = window.soundEngine.toggleMute();
          btnMute.textContent = muted ? '🔇 UNMUTE' : '🔊 MUTE';
        }
      });
    }

    // Keyboard 'M' key for mute
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        if (window.soundEngine) {
          const muted = window.soundEngine.toggleMute();
          if (btnMute) btnMute.textContent = muted ? '🔇 UNMUTE' : '🔊 MUTE';
        }
      }
    });

    function triggerGameOver() {
      gameState.isGameOver = true;
      document.exitPointerLock();

      if (gameOverModal) {
        gameOverModal.style.display = 'flex';
        document.getElementById('final-score-val').textContent = ui.score;
        document.getElementById('stat-cows').textContent = gameState.stats.cowsBlessed;
        document.getElementById('stat-villagers').textContent = gameState.stats.villagersSplatted;
        document.getElementById('stat-bells').textContent = gameState.stats.bellsRung;
        document.getElementById('stat-pots').textContent = gameState.stats.potsSmashed;

        // Honorary Village Titles based on performance
        let title = "VILLAGE NOVICE MUD-THROWER 🌾";
        if (ui.score > 8000) {
          title = "👑 MAHA SARPANCH OF SHANTIPURA 👑";
        } else if (ui.score > 5000) {
          title = "🏆 LEGENDARY GOREHABBA CHAMPION 🏆";
        } else if (ui.score > 2500) {
          title = "🐮 SACRED COW MASTER & BLESSER 🐮";
        }
        document.getElementById('final-title-val').textContent = title;
      }
    }

    // 7. Main Animation Loop
    let lastTime = performance.now();

    function animate(currentTime) {
      requestAnimationFrame(animate);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Update match timer in championship mode
      if (gameState.mode === 'championship' && !gameState.isGameOver) {
        gameState.timeLeft -= delta;
        if (gameState.timeLeft <= 0) {
          gameState.timeLeft = 0;
          triggerGameOver();
        }
      }

      // 1. Update World (bell swings, particles)
      world.update(delta);

      // 2. Update Player
      player.update(delta, world, weaponSystem);

      // 3. Update Cows
      cows.forEach(cow => cow.update(delta, world));

      // 4. Update Villagers
      villagers.forEach(villager => {
        villager.update(delta, world, player.position, (projConfig) => {
          weaponSystem.spawnProjectile(projConfig);
        });
      });

      // 5. Update Weapon Projectiles & Particle Physics
      weaponSystem.update(delta, world, cows, villagers, player, onGameEvent);

      // 6. Update UI
      ui.update(delta, player, cows, villagers, world, gameState);

      // 7. Render 3D Scene
      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
  });
})();
