/**
 * Indian Simulator: Village Mud Wars
 * AI Villager Festival Participants
 * Authentic rural characters with colorful turbans/kurtas, pathfinding,
 * mud throwing AI, funny dialogue callouts, and mud splatter reactions.
 */

class Villager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.id = options.id || 'villager_' + Math.floor(Math.random() * 10000);
    this.name = options.name || 'Ramu';
    this.role = options.role || 'Villager';
    this.kurtaColor = options.kurtaColor || 0xff6f00; // Saffron orange
    this.turbanColor = options.turbanColor || 0xd81b60; // Festive pink / red

    this.position = new THREE.Vector3(options.x || 0, 0, options.z || 0);
    this.rotationY = options.rotation || Math.random() * Math.PI * 2;
    this.targetRotationY = this.rotationY;

    // AI States: 'patrol', 'seek_mud', 'aim_and_throw', 'flee', 'stagger'
    this.state = 'patrol';
    this.stateTimer = 2.0 + Math.random() * 3.0;
    this.walkSpeed = 3.2 + Math.random() * 0.8;
    this.mudAmmo = 8;
    this.maxMudAmmo = 10;
    this.throwCooldown = 2.5 + Math.random() * 2.0;
    this.animTimer = Math.random() * 10;

    this.isThrowing = false;
    this.throwAnimTimer = 0;
    this.isStaggered = false;
    this.staggerTimer = 0;
    this.mudCoatCount = 0;

    // Dialogue quotes
    this.quotes = [
      "Bura na mano, Gorehabba hai! 🌾",
      "Catch this fresh mud! 💥",
      "Wah! Direct hit! 🎯",
      "Arre baap re! Who threw that?! 😱",
      "Gorehabba ki Jai! 🐮",
      "Shabaash! Nice shot! 👏",
      "More mud, more blessing! 🪷"
    ];

    this.group = new THREE.Group();
    this.mudDecals = [];

    this._buildMesh();
    this.scene.add(this.group);
  }

  _buildMesh() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color: 0x9e6843 });
    const kurtaMat = new THREE.MeshLambertMaterial({ color: this.kurtaColor });
    const dhotiMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e6 });
    const turbanMat = new THREE.MeshLambertMaterial({ color: this.turbanColor });
    const sandalMat = new THREE.MeshLambertMaterial({ color: 0x3d2719 });

    // 1. Torso (Kurta)
    const torsoGeo = new THREE.BoxGeometry(0.72, 1.05, 0.42);
    this.torso = new THREE.Mesh(torsoGeo, kurtaMat);
    this.torso.position.y = 1.35;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.38, 0.42, 0.38);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 2.12;
    this.head.castShadow = true;
    this.group.add(this.head);

    // 3. Indian Turban (Pagri)
    const turbanGeo = new THREE.CylinderGeometry(0.34, 0.3, 0.28, 10);
    this.turban = new THREE.Mesh(turbanGeo, turbanMat);
    this.turban.position.y = 2.38;
    this.turban.castShadow = true;
    this.group.add(this.turban);

    // Turban knot plume
    const plumeGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const plume = new THREE.Mesh(plumeGeo, turbanMat);
    plume.position.set(0.14, 2.48, 0.12);
    this.group.add(plume);

    // 4. Arms with shoulders
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.48, 1.75, 0);
    const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    const lArmMesh = new THREE.Mesh(armGeo, kurtaMat);
    lArmMesh.position.y = -0.35;
    this.leftArm.add(lArmMesh);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.48, 1.75, 0);
    const rArmMesh = new THREE.Mesh(armGeo, kurtaMat);
    rArmMesh.position.y = -0.35;
    this.rightArm.add(rArmMesh);
    this.group.add(this.rightArm);

    // Mud ball in hand (visible when ready to throw)
    const handBallGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const handBallMat = new THREE.MeshStandardMaterial({ color: 0x3d2412, roughness: 0.3 });
    this.handBall = new THREE.Mesh(handBallGeo, handBallMat);
    this.handBall.position.set(0, -0.7, 0.1);
    this.rightArm.add(this.handBall);

    // 5. Legs (Dhoti)
    const legGeo = new THREE.BoxGeometry(0.26, 0.85, 0.28);
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, 0.85, 0);
    const lLegMesh = new THREE.Mesh(legGeo, dhotiMat);
    lLegMesh.position.y = -0.4;
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh);

    const sandalGeo = new THREE.BoxGeometry(0.28, 0.1, 0.35);
    const lSandal = new THREE.Mesh(sandalGeo, sandalMat);
    lSandal.position.set(0, -0.82, 0.04);
    this.leftLeg.add(lSandal);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, 0.85, 0);
    const rLegMesh = new THREE.Mesh(legGeo, dhotiMat);
    rLegMesh.position.y = -0.4;
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh);

    const rSandal = new THREE.Mesh(sandalGeo, sandalMat);
    rSandal.position.set(0, -0.82, 0.04);
    this.rightLeg.add(rSandal);
    this.group.add(this.rightLeg);
  }

  update(delta, world, playerPos, onThrowProjectile) {
    this.animTimer += delta;
    this.throwCooldown -= delta;

    // Handle stagger when hit by mud
    if (this.isStaggered) {
      this.staggerTimer -= delta;
      this.torso.rotation.x = -0.35;
      this.head.rotation.x = -0.3;
      if (this.staggerTimer <= 0) {
        this.isStaggered = false;
        this.torso.rotation.x = 0;
        this.head.rotation.x = 0;
      }
      return;
    }

    // Handle throwing wind-up animation
    if (this.isThrowing) {
      this.throwAnimTimer += delta * 6;
      // Right arm wind-up back and hurl forward
      this.rightArm.rotation.x = -Math.PI * 0.8 + Math.sin(this.throwAnimTimer) * Math.PI * 0.9;
      if (this.throwAnimTimer >= Math.PI) {
        this.isThrowing = false;
        this.rightArm.rotation.x = 0;
      }
    }

    // AI Decision Cycle
    this.stateTimer -= delta;
    if (this.stateTimer <= 0) {
      this._pickNewState(playerPos, world);
    }

    // Check if near player to engage in mud duel!
    const distToPlayer = this.position.distanceTo(playerPos);
    if (distToPlayer < 25 && this.mudAmmo > 0 && this.throwCooldown <= 0) {
      this._attemptThrowAt(playerPos, onThrowProjectile);
    }

    // State Execution
    if (this.state === 'patrol' || this.state === 'seek_mud') {
      let diff = this.targetRotationY - this.rotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rotationY += diff * Math.min(1.0, delta * 4.0);
      this.group.rotation.y = this.rotationY;

      const moveDist = this.walkSpeed * delta;
      const nextX = this.position.x + Math.sin(this.rotationY) * moveDist;
      const nextZ = this.position.z + Math.cos(this.rotationY) * moveDist;

      if (this._canMoveTo(nextX, nextZ, world)) {
        this.position.x = nextX;
        this.position.z = nextZ;
        this.group.position.x = nextX;
        this.group.position.z = nextZ;
      } else {
        this.targetRotationY += Math.PI * 0.75 + (Math.random() - 0.5);
      }

      // Check if reached mud pit when seeking ammo
      if (this.state === 'seek_mud' && world.isPositionInMud(this.position)) {
        this.mudAmmo = this.maxMudAmmo;
        this.state = 'patrol';
        this.stateTimer = 4.0;
        if (window.soundEngine) {
          window.soundEngine.playScoopMud();
        }
      }

      // Walking swing
      const swing = Math.sin(this.animTimer * 8.0) * 0.55;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing;
      if (!this.isThrowing) {
        this.rightArm.rotation.x = swing;
      }
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    }

    // Show/hide mudball in hand based on ammo
    this.handBall.visible = this.mudAmmo > 0;
  }

  _pickNewState(playerPos, world) {
    if (this.mudAmmo <= 0) {
      this.state = 'seek_mud';
      this.stateTimer = 5.0;
      // Head to closest mud pit
      if (world && world.mudPits.length > 0) {
        const pit = world.mudPits[0];
        const dx = pit.x - this.position.x;
        const dz = pit.z - this.position.z;
        this.targetRotationY = Math.atan2(dx, dz);
      }
      return;
    }

    const r = Math.random();
    if (r < 0.6) {
      this.state = 'patrol';
      this.stateTimer = 3.0 + Math.random() * 3.0;
      this.targetRotationY = this.rotationY + (Math.random() - 0.5) * 1.8;
    } else {
      this.state = 'idle';
      this.stateTimer = 1.5 + Math.random() * 2.5;
    }
  }

  _attemptThrowAt(targetPos, onThrowProjectile) {
    this.mudAmmo--;
    this.throwCooldown = 3.0 + Math.random() * 2.5;
    this.isThrowing = true;
    this.throwAnimTimer = 0;

    // Turn towards target
    const dx = targetPos.x - this.position.x;
    const dz = targetPos.z - this.position.z;
    this.targetRotationY = Math.atan2(dx, dz);
    this.rotationY = this.targetRotationY;
    this.group.rotation.y = this.rotationY;

    // Launch mud projectile from hand after brief windup
    setTimeout(() => {
      if (!onThrowProjectile) return;

      const launchPos = new THREE.Vector3(
        this.position.x + Math.sin(this.rotationY) * 0.6,
        1.7,
        this.position.z + Math.cos(this.rotationY) * 0.6
      );

      // Trajectory velocity calculation to hit near target
      const dist = Math.sqrt(dx * dx + dz * dz);
      const throwSpeed = Math.min(26, 12 + dist * 0.7);
      const angle = Math.atan2(dx, dz);
      const elevation = 0.28 + dist * 0.012;

      const vel = new THREE.Vector3(
        Math.sin(angle) * throwSpeed * Math.cos(elevation),
        throwSpeed * Math.sin(elevation),
        Math.cos(angle) * throwSpeed * Math.cos(elevation)
      );

      // Add a little friendly inaccuracy
      vel.x += (Math.random() - 0.5) * 2.5;
      vel.z += (Math.random() - 0.5) * 2.5;

      onThrowProjectile({
        type: 'standard',
        startPos: launchPos,
        velocity: vel,
        thrower: this.name,
        isFromPlayer: false
      });
    }, 180);
  }

  _canMoveTo(x, z, world) {
    if (x < -60 || x > 60 || z < -60 || z > 60) return false;
    if (world && world.colliders) {
      for (let c of world.colliders) {
        if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Called when hit by a mud ball
   */
  onHitByMud(hitPoint, mudType = 'standard') {
    this.mudCoatCount++;
    this.isStaggered = true;
    this.staggerTimer = 0.8;

    if (window.soundEngine) {
      window.soundEngine.playVillagerReaction(false);
    }

    // Add brown mud splatter to villager clothes
    this._addMudDecal(hitPoint);

    // Random hilarious dialogue quote
    const quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];

    return {
      points: mudType === 'mega' ? 350 : 200,
      quote: quote,
      villagerName: this.name
    };
  }

  _addMudDecal(hitPoint) {
    if (this.mudDecals.length > 6) {
      const old = this.mudDecals.shift();
      this.torso.remove(old);
    }

    const local = this.torso.worldToLocal(hitPoint.clone());
    const splatMat = new THREE.MeshStandardMaterial({
      color: 0x3d2412,
      roughness: 0.35
    });

    const splat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.05, 8),
      splatMat
    );
    splat.position.copy(local);
    splat.rotation.x = Math.PI / 2;
    this.torso.add(splat);
    this.mudDecals.push(splat);
  }
}
