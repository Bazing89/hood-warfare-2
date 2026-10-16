/**
 * Hood Warfare - PlayCanvas Bootstrap & Main Game Loop
 * Initializes PlayCanvas engine, aerial lobby camera, world builder,
 * first-person controller, weapon system, network client, and UI manager.
 */
(function() {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('application-canvas');
    if (!canvas) {
      console.error('[Hood Warfare] Canvas element #application-canvas not found!');
      return;
    }

    // Initialize PlayCanvas Application
    const app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      touch: new pc.TouchDevice(canvas),
      keyboard: new pc.Keyboard(window),
      graphicsDeviceOptions: {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      }
    });

    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);

    window.addEventListener('resize', () => {
      app.resizeCanvas();
    });

    app.start();

    // 1. Build Nuketown 3D Procedural Map
    MapBuilder.buildMap(app, MapData);

    // 2. Aerial Orbit Camera for Lobby & Team Select
    const aerialCamera = new pc.Entity('AerialLobbyCamera');
    aerialCamera.addComponent('camera', {
      clearColor: new pc.Color(0.45, 0.62, 0.85),
      fov: 65,
      nearClip: 0.1,
      farClip: 400
    });
    aerialCamera.setPosition(0, 24, 48);
    aerialCamera.lookAt(0, 3, 0);
    app.root.addChild(aerialCamera);

    let orbitAngle = 0;

    // 3. Initialize Core Game Systems
    const localPlayer = new LocalPlayer(app, MapData, WeaponsData, SoundSynth);
    // Disable local player camera while in lobby
    localPlayer.camera.camera.enabled = false;

    const networkClient = new NetworkClient();
    const weaponSystem = new WeaponSystem(app, localPlayer, WeaponsData, SoundSynth, networkClient);
    localPlayer.weaponSystem = weaponSystem;

    const uiManager = new UIManager();

    // 4. Cross-bind All System References
    uiManager.bindReferences(networkClient, localPlayer, weaponSystem);
    networkClient.bindReferences(app, localPlayer, weaponSystem, uiManager, MapData, SoundSynth);

    // Camera Switch Helper
    const originalDeploy = uiManager.deployToBattle.bind(uiManager);
    uiManager.deployToBattle = function() {
      aerialCamera.camera.enabled = false;
      localPlayer.camera.camera.enabled = true;
      originalDeploy();
    };

    const originalShowTeamSelect = uiManager.showTeamSelect.bind(uiManager);
    uiManager.showTeamSelect = function() {
      aerialCamera.camera.enabled = true;
      localPlayer.camera.camera.enabled = false;
      originalShowTeamSelect();
    };

    // 5. Main Game Loop (PlayCanvas Update Event)
    app.on('update', (dt) => {
      if (uiManager.currentScreen === 'hud') {
        localPlayer.update(dt);
        weaponSystem.update(dt);
        networkClient.update(dt);
        uiManager.update(dt);
      } else {
        // Orbit aerial camera around Nuketown mid-map
        orbitAngle += dt * 0.14;
        const radius = 48.0;
        const camX = Math.sin(orbitAngle) * radius;
        const camZ = Math.cos(orbitAngle) * radius;
        aerialCamera.setPosition(camX, 22.0, camZ);
        aerialCamera.lookAt(0, 3.5, 0);

        uiManager.update(dt);
      }
    });

    console.log('[Hood Warfare 2] Initialized successfully. Ready to deploy!');
  });
})();
