/**
 * Hood Warfare - First-Person Weapon System
 * Procedural 3D weapon viewmodels, ADS iron-sights lerp, recoil, spread,
 * raycasting hit detection, 3D tracers & muzzle flash
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WeaponSystem = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class WeaponSystem {
    constructor(app, localPlayer, weaponsData, soundSynth, networkClient) {
      this.app = app;
      this.player = localPlayer;
      this.weaponsData = weaponsData;
      this.soundSynth = soundSynth;
      this.networkClient = networkClient;

      // Weapon Holder attached to Camera
      this.weaponHolder = new pc.Entity('Weapon_Holder');
      this.player.camera.addChild(this.weaponHolder);

      // Hip and ADS Transforms
      this.hipPos = new pc.Vec3(0.24, -0.22, -0.42);
      this.adsPos = new pc.Vec3(0.0, -0.145, -0.32);
      this.currentPos = new pc.Vec3().copy(this.hipPos);
      this.currentRot = new pc.Vec3(0, 0, 0);

      // FOV tracking
      this.baseFov = 75;
      this.currentFov = 75;

      // State
      this.isADS = false;
      this.adsProgress = 0; // 0 (hip) to 1 (ads)
      this.isFiring = false;
      this.lastFireTime = 0;
      this.isReloading = false;
      this.reloadStartTime = 0;
      this.reloadDuration = 2000;

      // Recoil & Sway
      this.recoilKick = new pc.Vec3(0, 0, 0);
      this.recoilRot = new pc.Vec3(0, 0, 0);
      this.swayPos = new pc.Vec3(0, 0, 0);
      this.walkBobPhase = 0;

      // Ammo states per weapon
      this.ammo = {
        ar: { mag: 30, reserve: 120 },
        smg: { mag: 32, reserve: 128 },
        shotgun: { mag: 8, reserve: 32 },
        pistol: { mag: 15, reserve: 60 }
      };

      // Active weapon setup
      this.activeWeaponId = this.player.loadoutId || 'ar';
      this.currentWeapon = this.weaponsData.WEAPONS[this.activeWeaponId] || this.weaponsData.WEAPONS.ar;

      // Weapon models map
      this.weaponEntities = {};

      // Remote players reference for hit detection
      this.remotePlayers = {};

      // Muzzle Flash Light
      this.muzzleLight = new pc.Entity('MuzzleLight');
      this.muzzleLight.addComponent('light', {
        type: 'point',
        color: new pc.Color(1.0, 0.75, 0.3),
        intensity: 0,
        range: 4.5,
        castShadows: false
      });
      this.weaponHolder.addChild(this.muzzleLight);
      this.muzzleFlashTimer = 0;

      // Build 3D Models
      this.initWeaponModels();
      this.selectWeapon(this.activeWeaponId);
      this.initInput();
    }

    setRemotePlayers(remotePlayersMap) {
      this.remotePlayers = remotePlayersMap;
    }

    createMaterial(diffuseHex, roughness = 0.6, metalness = 0.2) {
      const mat = new pc.StandardMaterial();
      const r = parseInt(diffuseHex.slice(1, 3), 16) / 255;
      const g = parseInt(diffuseHex.slice(3, 5), 16) / 255;
      const b = parseInt(diffuseHex.slice(5, 7), 16) / 255;
      mat.diffuse = new pc.Color(r, g, b);
      mat.roughness = roughness;
      mat.metalness = metalness;
      mat.update();
      return mat;
    }

    initWeaponModels() {
      const metalMat = this.createMaterial('#1a1c1e', 0.45, 0.6);
      const steelMat = this.createMaterial('#383c42', 0.4, 0.7);
      const woodMat = this.createMaterial('#5c3818', 0.8, 0.05);
      const goldMat = this.createMaterial('#d4af37', 0.3, 0.85);
      const polymerMat = this.createMaterial('#151618', 0.7, 0.1);
      const sightGlowMat = this.createMaterial('#33ff55', 0.2, 0.0);

      // -------------------------------------------------------------
      // 1. AR-47 MODEL
      // -------------------------------------------------------------
      const arRoot = new pc.Entity('Gun_AR');

      // Receiver
      const arReceiver = new pc.Entity('AR_Receiver');
      arReceiver.addComponent('render', { type: 'box', material: metalMat });
      arReceiver.setLocalPosition(0, 0, 0);
      arReceiver.setLocalScale(0.048, 0.075, 0.26);
      arRoot.addChild(arReceiver);

      // Barrel
      const arBarrel = new pc.Entity('AR_Barrel');
      arBarrel.addComponent('render', { type: 'cylinder', material: steelMat });
      arBarrel.setLocalPosition(0, 0.015, -0.28);
      arBarrel.setLocalScale(0.018, 0.32, 0.018);
      arBarrel.setEulerAngles(90, 0, 0);
      arRoot.addChild(arBarrel);

      // Wooden Handguard
      const arHandguard = new pc.Entity('AR_Handguard');
      arHandguard.addComponent('render', { type: 'box', material: woodMat });
      arHandguard.setLocalPosition(0, 0.012, -0.20);
      arHandguard.setLocalScale(0.052, 0.065, 0.16);
      arRoot.addChild(arHandguard);

      // Wooden Stock
      const arStock = new pc.Entity('AR_Stock');
      arStock.addComponent('render', { type: 'box', material: woodMat });
      arStock.setLocalPosition(0, -0.018, 0.22);
      arStock.setLocalScale(0.042, 0.085, 0.19);
      arStock.setEulerAngles(-6, 0, 0);
      arRoot.addChild(arStock);

      // Curved Banana Magazine
      const arMag = new pc.Entity('AR_Mag');
      arMag.addComponent('render', { type: 'box', material: metalMat });
      arMag.setLocalPosition(0, -0.09, -0.035);
      arMag.setLocalScale(0.032, 0.15, 0.065);
      arMag.setEulerAngles(14, 0, 0);
      arRoot.addChild(arMag);

      // Pistol Grip
      const arGrip = new pc.Entity('AR_Grip');
      arGrip.addComponent('render', { type: 'box', material: woodMat });
      arGrip.setLocalPosition(0, -0.075, 0.10);
      arGrip.setLocalScale(0.034, 0.095, 0.048);
      arGrip.setEulerAngles(-22, 0, 0);
      arRoot.addChild(arGrip);

      // Rear Sight Notch (aligns with screen center in ADS)
      const arRearSight = new pc.Entity('AR_RearSight');
      arRearSight.addComponent('render', { type: 'box', material: steelMat });
      arRearSight.setLocalPosition(0, 0.052, -0.08);
      arRearSight.setLocalScale(0.036, 0.022, 0.018);
      arRoot.addChild(arRearSight);

      // Front Sight Post (with luminescent tip)
      const arFrontSight = new pc.Entity('AR_FrontSight');
      arFrontSight.addComponent('render', { type: 'box', material: sightGlowMat });
      arFrontSight.setLocalPosition(0, 0.054, -0.42);
      arFrontSight.setLocalScale(0.007, 0.032, 0.007);
      arRoot.addChild(arFrontSight);

      this.weaponHolder.addChild(arRoot);
      this.weaponEntities.ar = arRoot;

      // -------------------------------------------------------------
      // 2. SMG MODEL (MAC-10)
      // -------------------------------------------------------------
      const smgRoot = new pc.Entity('Gun_SMG');

      // Body
      const smgBody = new pc.Entity('SMG_Body');
      smgBody.addComponent('render', { type: 'box', material: polymerMat });
      smgBody.setLocalPosition(0, 0, 0);
      smgBody.setLocalScale(0.052, 0.082, 0.22);
      smgRoot.addChild(smgBody);

      // Short Barrel
      const smgBarrel = new pc.Entity('SMG_Barrel');
      smgBarrel.addComponent('render', { type: 'cylinder', material: steelMat });
      smgBarrel.setLocalPosition(0, 0.012, -0.17);
      smgBarrel.setLocalScale(0.022, 0.12, 0.022);
      smgBarrel.setEulerAngles(90, 0, 0);
      smgRoot.addChild(smgBarrel);

      // Vertical Stick Mag in Grip
      const smgGrip = new pc.Entity('SMG_Grip');
      smgGrip.addComponent('render', { type: 'box', material: metalMat });
      smgGrip.setLocalPosition(0, -0.10, 0.02);
      smgGrip.setLocalScale(0.036, 0.18, 0.052);
      smgGrip.setEulerAngles(-6, 0, 0);
      smgRoot.addChild(smgGrip);

      // Wire Stock
      const smgStock = new pc.Entity('SMG_Stock');
      smgStock.addComponent('render', { type: 'box', material: steelMat });
      smgStock.setLocalPosition(0, 0.01, 0.16);
      smgStock.setLocalScale(0.042, 0.035, 0.12);
      smgRoot.addChild(smgStock);

      // Front sight pin
      const smgFrontSight = new pc.Entity('SMG_FrontSight');
      smgFrontSight.addComponent('render', { type: 'box', material: sightGlowMat });
      smgFrontSight.setLocalPosition(0, 0.053, -0.22);
      smgFrontSight.setLocalScale(0.007, 0.025, 0.007);
      smgRoot.addChild(smgFrontSight);

      this.weaponHolder.addChild(smgRoot);
      this.weaponEntities.smg = smgRoot;

      // -------------------------------------------------------------
      // 3. SHOTGUN MODEL (TRENCH 12G)
      // -------------------------------------------------------------
      const shotRoot = new pc.Entity('Gun_Shotgun');

      // Receiver
      const shotReceiver = new pc.Entity('Shot_Receiver');
      shotReceiver.addComponent('render', { type: 'box', material: steelMat });
      shotReceiver.setLocalPosition(0, 0, 0);
      shotReceiver.setLocalScale(0.055, 0.085, 0.25);
      shotRoot.addChild(shotReceiver);

      // Long Barrel
      const shotBarrel = new pc.Entity('Shot_Barrel');
      shotBarrel.addComponent('render', { type: 'cylinder', material: metalMat });
      shotBarrel.setLocalPosition(0, 0.022, -0.32);
      shotBarrel.setLocalScale(0.024, 0.42, 0.024);
      shotBarrel.setEulerAngles(90, 0, 0);
      shotRoot.addChild(shotBarrel);

      // Mag Tube below
      const shotTube = new pc.Entity('Shot_Tube');
      shotTube.addComponent('render', { type: 'cylinder', material: metalMat });
      shotTube.setLocalPosition(0, -0.014, -0.30);
      shotTube.setLocalScale(0.022, 0.38, 0.022);
      shotTube.setEulerAngles(90, 0, 0);
      shotRoot.addChild(shotTube);

      // Pump Forend
      const shotPump = new pc.Entity('Shot_Pump');
      shotPump.addComponent('render', { type: 'box', material: woodMat });
      shotPump.setLocalPosition(0, -0.014, -0.24);
      shotPump.setLocalScale(0.062, 0.062, 0.15);
      shotRoot.addChild(shotPump);

      // Wooden Stock
      const shotStock = new pc.Entity('Shot_Stock');
      shotStock.addComponent('render', { type: 'box', material: woodMat });
      shotStock.setLocalPosition(0, -0.025, 0.24);
      shotStock.setLocalScale(0.046, 0.095, 0.24);
      shotStock.setEulerAngles(-8, 0, 0);
      shotRoot.addChild(shotStock);

      // Brass Bead Sight
      const shotBead = new pc.Entity('Shot_Bead');
      shotBead.addComponent('render', { type: 'sphere', material: goldMat });
      shotBead.setLocalPosition(0, 0.046, -0.52);
      shotBead.setLocalScale(0.014, 0.014, 0.014);
      shotRoot.addChild(shotBead);

      this.weaponHolder.addChild(shotRoot);
      this.weaponEntities.shotgun = shotRoot;

      // -------------------------------------------------------------
      // 4. PISTOL MODEL (GLOCK 19)
      // -------------------------------------------------------------
      const pistolRoot = new pc.Entity('Gun_Pistol');

      // Slide
      const pistolSlide = new pc.Entity('Pistol_Slide');
      pistolSlide.addComponent('render', { type: 'box', material: steelMat });
      pistolSlide.setLocalPosition(0, 0.02, -0.04);
      pistolSlide.setLocalScale(0.038, 0.044, 0.18);
      pistolRoot.addChild(pistolSlide);

      // Grip / Frame
      const pistolGrip = new pc.Entity('Pistol_Grip');
      pistolGrip.addComponent('render', { type: 'box', material: polymerMat });
      pistolGrip.setLocalPosition(0, -0.055, 0.025);
      pistolGrip.setLocalScale(0.036, 0.11, 0.058);
      pistolGrip.setEulerAngles(-18, 0, 0);
      pistolRoot.addChild(pistolGrip);

      // Front sight dot
      const pistolSight = new pc.Entity('Pistol_Sight');
      pistolSight.addComponent('render', { type: 'box', material: sightGlowMat });
      pistolSight.setLocalPosition(0, 0.048, -0.125);
      pistolSight.setLocalScale(0.007, 0.016, 0.007);
      pistolRoot.addChild(pistolSight);

      this.weaponHolder.addChild(pistolRoot);
      this.weaponEntities.pistol = pistolRoot;
    }

    selectWeapon(weaponId) {
      this.activeWeaponId = weaponId;
      this.currentWeapon = this.weaponsData.WEAPONS[weaponId] || this.weaponsData.WEAPONS.ar;

      for (const id in this.weaponEntities) {
        this.weaponEntities[id].enabled = (id === weaponId);
      }

      this.isReloading = false;
      this.isFiring = false;
    }

    switchSlot(slot) {
      if (this.isReloading) return;
      if (slot === 1) {
        this.selectWeapon(this.player.loadoutId || 'ar');
      } else if (slot === 2) {
        this.selectWeapon('pistol');
      }
    }

    resetAmmo() {
      for (const id in this.weaponsData.WEAPONS) {
        const w = this.weaponsData.WEAPONS[id];
        this.ammo[id] = { mag: w.magSize, reserve: w.reserveMax };
      }
      this.isReloading = false;
    }

    initInput() {
      window.addEventListener('mousedown', (e) => {
        // Only process firing if pointer lock is active and local player is alive
        if (!document.pointerLockElement) return;
        if (!this.player || !this.player.alive) return;

        if (e.button === 0) {
          // Left click: Fire
          this.isFiring = true;
          this.tryFire();
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          this.isFiring = false;
        }
      });

      // Safely release firing state on pointer lock changes or window focus loss
      document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement) {
          this.isFiring = false;
        }
      });

      window.addEventListener('blur', () => {
        this.isFiring = false;
      });
    }

    reload() {
      if (this.isReloading || !this.currentWeapon) return;
      const currentAmmo = this.ammo[this.activeWeaponId];
      if (currentAmmo.mag >= this.currentWeapon.magSize || currentAmmo.reserve <= 0) return;

      this.isReloading = true;
      this.reloadStartTime = Date.now();
      this.reloadDuration = this.currentWeapon.reloadTime;

      if (this.soundSynth) {
        this.soundSynth.playReload();
      }
    }

    tryFire() {
      if (!this.player.alive || this.isReloading) return;

      const now = Date.now();
      const currentAmmo = this.ammo[this.activeWeaponId];

      if (currentAmmo.mag <= 0) {
        this.reload();
        return;
      }

      if (now - this.lastFireTime < this.currentWeapon.fireDelay) {
        return;
      }

      this.lastFireTime = now;
      currentAmmo.mag--;

      // Recoil kick values
      const recoilPitch = this.currentWeapon.recoilPitch;
      const recoilYaw = (Math.random() - 0.5) * this.currentWeapon.recoilYaw;
      this.player.pitch += recoilPitch;
      this.player.rotY += recoilYaw;

      // Weapon viewmodel physical punch
      this.recoilKick.z += 0.045;
      this.recoilKick.y += 0.012;
      this.recoilRot.x -= 3.5;

      // Play Sound
      if (this.soundSynth) {
        this.soundSynth.playGunshot(this.activeWeaponId, 0);
      }

      // Flash Muzzle Light
      this.muzzleLight.light.intensity = 3.0;
      this.muzzleFlashTimer = 0.045;

      // Fire Raycasts (1 for bullet, 8 for shotgun)
      const pellets = this.currentWeapon.pellets || 1;
      const spread = (this.isADS ? this.currentWeapon.adsSpread : this.currentWeapon.hipSpread) * Math.PI / 180;

      for (let p = 0; p < pellets; p++) {
        this.fireSingleRay(spread);
      }
    }

    fireSingleRay(spreadRad) {
      // Eye position
      const eyePos = this.player.camera.getPosition();
      const camFwd = this.player.camera.forward;
      const camRight = this.player.camera.right;
      const camUp = this.player.camera.up;

      // Add cone spread
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * spreadRad;
      const spreadX = Math.cos(angle) * r;
      const spreadY = Math.sin(angle) * r;

      const rayDir = new pc.Vec3()
        .copy(camFwd)
        .add(new pc.Vec3().copy(camRight).scale(spreadX))
        .add(new pc.Vec3().copy(camUp).scale(spreadY))
        .normalize();

      const originArr = [eyePos.x, eyePos.y, eyePos.z];
      const dirArr = [rayDir.x, rayDir.y, rayDir.z];

      // 1. Raycast vs Map Static Colliders
      let closestWallDist = 180;
      let wallHitPoint = null;

      for (let i = 0; i < this.player.mapData.COLLIDERS.length; i++) {
        const col = this.player.mapData.COLLIDERS[i];
        const t = this.player.mapData.intersectRayAABB(originArr, dirArr, col);
        if (t < closestWallDist) {
          closestWallDist = t;
          wallHitPoint = [
            eyePos.x + rayDir.x * t,
            eyePos.y + rayDir.y * t,
            eyePos.z + rayDir.z * t
          ];
        }
      }

      // 2. Raycast vs Opposing Remote Players & Hitboxes
      let closestPlayerDist = closestWallDist;
      let hitTargetId = null;
      let hitZone = 'torso';
      let playerHitPoint = null;

      for (const id in this.remotePlayers) {
        const rp = this.remotePlayers[id];
        if (!rp.alive || rp.team === this.player.team) continue;

        const hit = rp.checkRaycastHit(originArr, dirArr);
        if (hit && hit.dist < closestPlayerDist) {
          closestPlayerDist = hit.dist;
          hitTargetId = rp.id;
          hitZone = hit.zone;
          playerHitPoint = hit.point;
        }
      }

      // Determine final impact point
      const finalHitPoint = hitTargetId ? playerHitPoint : (wallHitPoint || [
        eyePos.x + rayDir.x * 60,
        eyePos.y + rayDir.y * 60,
        eyePos.z + rayDir.z * 60
      ]);

      // Spawn 3D Tracer
      this.spawnTracer(eyePos, finalHitPoint);

      // Emit network combat event
      if (this.networkClient) {
        this.networkClient.sendFire({
          origin: originArr,
          dir: dirArr,
          weaponId: this.activeWeaponId,
          hitTargetId: hitTargetId,
          hitZone: hitZone,
          hitPoint: finalHitPoint
        });
      }

      // Trigger client audio hitmarker on local confirmed hit
      if (hitTargetId && this.soundSynth) {
        this.soundSynth.playHitmarker(hitZone === 'head');
      }
    }

    spawnTracer(startVec, endArr) {
      const tracer = new pc.Entity('Tracer');
      const tracerMat = new pc.StandardMaterial();
      tracerMat.emissive = new pc.Color(1.0, 0.85, 0.35);
      tracerMat.diffuse = new pc.Color(1.0, 0.9, 0.4);
      tracerMat.update();

      const dx = endArr[0] - startVec.x;
      const dy = endArr[1] - startVec.y;
      const dz = endArr[2] - startVec.z;
      const length = Math.min(Math.sqrt(dx * dx + dy * dy + dz * dz), 35);

      tracer.addComponent('render', {
        type: 'cylinder',
        material: tracerMat
      });

      tracer.setLocalScale(0.012, length, 0.012);
      tracer.setPosition(
        startVec.x + (endArr[0] - startVec.x) * 0.15,
        startVec.y + (endArr[1] - startVec.y) * 0.15,
        startVec.z + (endArr[2] - startVec.z) * 0.15
      );
      tracer.lookAt(new pc.Vec3(endArr[0], endArr[1], endArr[2]));
      tracer.rotateLocal(90, 0, 0);

      this.app.root.addChild(tracer);

      // Fast fade out
      let life = 0.08;
      const fadeInterval = setInterval(() => {
        life -= 0.02;
        if (life <= 0) {
          clearInterval(fadeInterval);
          tracer.destroy();
        }
      }, 20);
    }

    update(dt) {
      // Automatic fire hold
      if (this.isFiring && this.currentWeapon && this.currentWeapon.fireMode === 'auto') {
        this.tryFire();
      }

      // Reload completion
      if (this.isReloading) {
        const elapsed = Date.now() - this.reloadStartTime;
        if (elapsed >= this.reloadDuration) {
          this.isReloading = false;
          const w = this.currentWeapon;
          const cur = this.ammo[this.activeWeaponId];
          const needed = w.magSize - cur.mag;
          const take = Math.min(needed, cur.reserve);
          cur.mag += take;
          cur.reserve -= take;
        }
      }

      // ADS Lerp
      this.isADS = this.player.keys.ads && !this.player.isSprinting && !this.player.isSliding;
      const adsSpeed = 1000 / (this.currentWeapon.adsTime || 120);

      if (this.isADS) {
        this.adsProgress = Math.min(1.0, this.adsProgress + dt * adsSpeed);
      } else {
        this.adsProgress = Math.max(0.0, this.adsProgress - dt * adsSpeed);
      }

      // Smooth Position between Hip and ADS
      this.currentPos.lerp(this.hipPos, this.adsPos, this.adsProgress);

      // FOV Lerp
      const targetFov = this.isADS ? (this.currentWeapon.adsFov || 55) : this.baseFov;
      this.currentFov += (targetFov - this.currentFov) * Math.min(1.0, dt * 14);
      this.player.camera.camera.fov = this.currentFov;

      // Recoil Decay
      this.recoilKick.lerp(this.recoilKick, pc.Vec3.ZERO, Math.min(1.0, dt * 18));
      this.recoilRot.lerp(this.recoilRot, pc.Vec3.ZERO, Math.min(1.0, dt * 20));

      // Movement Bobbing
      const horizSpeed = Math.sqrt(this.player.vel[0] * this.player.vel[0] + this.player.vel[2] * this.player.vel[2]);
      if (this.player.grounded && horizSpeed > 0.5) {
        this.walkBobPhase += dt * (this.player.isSprinting ? 15.0 : 10.0);
      } else {
        this.walkBobPhase = 0;
      }

      const bobMult = (1.0 - this.adsProgress * 0.85); // Suppress bob during ADS
      const bobX = Math.cos(this.walkBobPhase * 0.5) * 0.015 * bobMult;
      const bobY = Math.abs(Math.sin(this.walkBobPhase)) * 0.018 * bobMult;

      // Reload dip animation
      let reloadDipY = 0;
      let reloadDipRot = 0;
      if (this.isReloading) {
        const prog = (Date.now() - this.reloadStartTime) / this.reloadDuration;
        reloadDipY = -Math.sin(prog * Math.PI) * 0.09;
        reloadDipRot = Math.sin(prog * Math.PI) * 16.0;
      }

      // Apply Final Transform to Weapon Holder
      this.weaponHolder.setLocalPosition(
        this.currentPos.x + bobX + this.recoilKick.x,
        this.currentPos.y + bobY + reloadDipY + this.recoilKick.y,
        this.currentPos.z + this.recoilKick.z
      );

      this.weaponHolder.setLocalEulerAngles(
        this.recoilRot.x + reloadDipRot,
        this.recoilRot.y,
        this.recoilRot.z
      );

      // Muzzle Flash Timer
      if (this.muzzleFlashTimer > 0) {
        this.muzzleFlashTimer -= dt;
        if (this.muzzleFlashTimer <= 0) {
          this.muzzleLight.light.intensity = 0;
        }
      }
    }
  }

  return WeaponSystem;
}));
