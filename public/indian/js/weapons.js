/**
 * Indian Simulator: Village Mud Wars
 * Mud Projectile Physics, Trajectory Predictor & Particle FX System
 */

class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.projectiles = [];
    this.particles = [];
    this.groundDecals = [];

    // Trajectory preview line
    this.trajectoryLine = null;
    this._initTrajectoryLine();

    // Shared materials
    this.matStandardMud = new THREE.MeshStandardMaterial({
      color: 0x4a2a16,
      roughness: 0.35,
      metalness: 0.05
    });

    this.matMegaPatty = new THREE.MeshStandardMaterial({
      color: 0x361f10,
      roughness: 0.45,
      metalness: 0.02
    });

    this.matGoldenClay = new THREE.MeshStandardMaterial({
      color: 0xd49b28,
      metalness: 0.7,
      roughness: 0.25
    });

    this.matBlessingSpark = new THREE.MeshBasicMaterial({
      color: 0xffd54f
    });

    this.matClayShard = new THREE.MeshLambertMaterial({
      color: 0xb8512e
    });
  }

  _initTrajectoryLine() {
    const pointsCount = 30;
    const positions = new Float32Array(pointsCount * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineDashedMaterial({
      color: 0xffe082,
      dashSize: 0.4,
      gapSize: 0.25,
      linewidth: 2
    });

    this.trajectoryLine = new THREE.Line(geometry, material);
    this.trajectoryLine.computeLineDistances();
    this.trajectoryLine.visible = false;
    this.scene.add(this.trajectoryLine);
  }

  /**
   * Update 3D trajectory preview while player holds throw button
   */
  updateTrajectoryPreview(startPos, velocity, isCharging) {
    if (!isCharging) {
      this.trajectoryLine.visible = false;
      return;
    }

    this.trajectoryLine.visible = true;
    const positions = this.trajectoryLine.geometry.attributes.position.array;
    const gravity = -19.6;
    const dt = 0.05;

    let p = startPos.clone();
    let v = velocity.clone();

    for (let i = 0; i < 30; i++) {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      // Euler integration
      p.x += v.x * dt;
      p.y += v.y * dt;
      p.z += v.z * dt;
      v.y += gravity * dt;

      if (p.y < 0.1) {
        // Hit ground early, fill rest with ground point
        for (let j = i + 1; j < 30; j++) {
          positions[j * 3] = p.x;
          positions[j * 3 + 1] = 0.1;
          positions[j * 3 + 2] = p.z;
        }
        break;
      }
    }

    this.trajectoryLine.geometry.attributes.position.needsUpdate = true;
    this.trajectoryLine.computeLineDistances();
  }

  /**
   * Spawn a flying mud ball
   */
  spawnProjectile(config) {
    const type = config.type || 'standard';
    let mesh;

    if (type === 'mega') {
      // Disc-like flattened patty
      const geo = new THREE.CylinderGeometry(0.38, 0.45, 0.22, 12);
      mesh = new THREE.Mesh(geo, this.matMegaPatty);
      mesh.rotation.x = Math.PI / 2;
    } else if (type === 'golden') {
      const geo = new THREE.SphereGeometry(0.24, 12, 12);
      mesh = new THREE.Mesh(geo, this.matGoldenClay);
    } else {
      // Standard wet mud ball
      const geo = new THREE.SphereGeometry(0.28, 10, 10);
      mesh = new THREE.Mesh(geo, this.matStandardMud);
    }

    mesh.position.copy(config.startPos);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const projectile = {
      mesh: mesh,
      type: type,
      velocity: config.velocity.clone(),
      thrower: config.thrower || 'Player',
      isFromPlayer: config.isFromPlayer !== false,
      alive: true,
      lifetime: 0,
      bounces: 0
    };

    this.projectiles.push(projectile);

    if (window.soundEngine) {
      window.soundEngine.playThrowWhoosh(type === 'golden' ? 1.3 : 1.0);
    }

    return projectile;
  }

  update(delta, world, cows, villagers, player, onEvent) {
    const gravity = -19.6;

    // 1. Update Flying Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.lifetime += delta;

      // Update velocity & position
      proj.velocity.y += gravity * delta;
      proj.mesh.position.x += proj.velocity.x * delta;
      proj.mesh.position.y += proj.velocity.y * delta;
      proj.mesh.position.z += proj.velocity.z * delta;

      // Spin in air
      proj.mesh.rotation.x += delta * 5;
      proj.mesh.rotation.y += delta * 6;

      // Collision checks
      const hit = this._checkCollisions(proj, world, cows, villagers, player, onEvent);
      if (hit || proj.lifetime > 6.0) {
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Splat Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y += gravity * delta * 0.9;
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Bounce on ground
      if (p.mesh.position.y <= 0.08) {
        p.mesh.position.y = 0.08;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.6;
        p.velocity.z *= 0.6;
      }
    }
  }

  _checkCollisions(proj, world, cows, villagers, player, onEvent) {
    const pos = proj.mesh.position;

    // A. Check Sacred Cows
    for (let cow of cows) {
      const cowCenter = cow.position.clone();
      cowCenter.y += 1.4;
      if (pos.distanceTo(cowCenter) < 1.6) {
        const result = cow.onHitByMud(pos, proj.type);
        this._spawnMudSplash(pos, proj.type);
        this._spawnBlessingSparkles(pos);

        if (proj.isFromPlayer && onEvent) {
          onEvent('cow_hit', {
            cow: cow,
            points: result.points,
            hitPos: pos,
            coatLevel: result.coatLevel
          });
        }
        return true;
      }
    }

    // B. Check Villagers
    for (let villager of villagers) {
      if (villager.name === proj.thrower) continue; // Don't hit self immediately

      const vCenter = villager.position.clone();
      vCenter.y += 1.3;
      if (pos.distanceTo(vCenter) < 1.15) {
        const result = villager.onHitByMud(pos, proj.type);
        this._spawnMudSplash(pos, proj.type);

        if (proj.isFromPlayer && onEvent) {
          onEvent('villager_hit', {
            villager: villager,
            points: result.points,
            quote: result.quote,
            hitPos: pos
          });
        }
        return true;
      }
    }

    // C. Check Player (if thrown by bot)
    if (!proj.isFromPlayer && player) {
      const pCenter = player.position.clone();
      pCenter.y += 1.4;
      if (pos.distanceTo(pCenter) < 1.25) {
        player.onHitByMud(proj.type);
        this._spawnMudSplash(pos, proj.type);
        if (onEvent) {
          onEvent('player_hit', { thrower: proj.thrower });
        }
        return true;
      }
    }

    // D. Check Temple Bell
    if (world && world.templeBell) {
      if (pos.distanceTo(world.templeBell.position) < world.templeBell.radius) {
        world.ringBell();
        this._spawnBlessingSparkles(pos, 25);
        this._spawnMudSplash(pos, proj.type);

        if (proj.isFromPlayer && onEvent) {
          onEvent('bell_hit', {
            points: proj.type === 'golden' ? 1200 : 500,
            hitPos: pos
          });
        }
        return true;
      }
    }

    // E. Check Breakable Clay Matkas
    if (world && world.breakableMatkas) {
      for (let matka of world.breakableMatkas) {
        if (!matka.intact) continue;
        if (pos.distanceTo(matka.position) < matka.radius) {
          matka.intact = false;
          world.scene.remove(matka.group);
          this._spawnClayShards(matka.position);

          if (window.soundEngine) {
            window.soundEngine.playPotSmash();
          }

          if (proj.isFromPlayer && onEvent) {
            onEvent('matka_broken', {
              points: proj.type === 'golden' ? 250 : 100,
              hitPos: pos
            });
          }
          return true;
        }
      }
    }

    // F. Check Buildings / Colliders
    if (world && world.colliders) {
      for (let c of world.colliders) {
        if (pos.x >= c.minX && pos.x <= c.maxX &&
            pos.z >= c.minZ && pos.z <= c.maxZ &&
            pos.y >= c.minY && pos.y <= c.maxY) {
          this._spawnMudSplash(pos, proj.type);
          this._addGroundDecal(pos);
          return true;
        }
      }
    }

    // G. Check Ground Plane
    if (pos.y <= 0.15) {
      pos.y = 0.15;
      this._spawnMudSplash(pos, proj.type);
      this._addGroundDecal(pos);

      // Check if landed inside mud pit
      if (world && world.isPositionInMud(pos)) {
        if (window.soundEngine) {
          window.soundEngine.playSplat(1.4, true);
        }
      }
      return true;
    }

    return false;
  }

  _spawnMudSplash(hitPos, type = 'standard') {
    const isMega = type === 'mega';
    const count = isMega ? 24 : 12;

    if (window.soundEngine) {
      window.soundEngine.playSplat(1.0, isMega);
    }

    const mat = isMega ? this.matMegaPatty : (type === 'golden' ? this.matGoldenClay : this.matStandardMud);

    for (let i = 0; i < count; i++) {
      const size = 0.08 + Math.random() * 0.12;
      const geo = new THREE.DodecahedronGeometry(size, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(hitPos);

      // Burst velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * (isMega ? 8.0 : 5.0);
      const elevation = 0.2 + Math.random() * 0.9;

      const vel = new THREE.Vector3(
        Math.cos(angle) * speed * Math.cos(elevation),
        speed * Math.sin(elevation),
        Math.sin(angle) * speed * Math.cos(elevation)
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh: mesh,
        velocity: vel,
        life: 0.8 + Math.random() * 0.6
      });
    }
  }

  _spawnBlessingSparkles(hitPos, count = 16) {
    for (let i = 0; i < count; i++) {
      const size = 0.12 + Math.random() * 0.08;
      const geo = new THREE.OctahedronGeometry(size, 0);
      const mesh = new THREE.Mesh(geo, this.matBlessingSpark);
      mesh.position.copy(hitPos);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.5 + Math.random() * 3.5,
        Math.sin(angle) * speed
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh: mesh,
        velocity: vel,
        life: 1.2 + Math.random() * 0.5
      });
    }
  }

  _spawnClayShards(hitPos) {
    for (let i = 0; i < 14; i++) {
      const geo = new THREE.TetrahedronGeometry(0.12 + Math.random() * 0.1, 0);
      const mesh = new THREE.Mesh(geo, this.matClayShard);
      mesh.position.copy(hitPos);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 4.0;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        3.0 + Math.random() * 3.0,
        Math.sin(angle) * speed
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh: mesh,
        velocity: vel,
        life: 1.5
      });
    }
  }

  _addGroundDecal(hitPos) {
    if (this.groundDecals.length > 25) {
      const old = this.groundDecals.shift();
      this.scene.remove(old);
    }

    const decalGeo = new THREE.CircleGeometry(0.5 + Math.random() * 0.4, 10);
    const decalMat = new THREE.MeshLambertMaterial({
      color: 0x3d2412,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1
    });

    const decal = new THREE.Mesh(decalGeo, decalMat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(hitPos.x, 0.03, hitPos.z);
    this.scene.add(decal);
    this.groundDecals.push(decal);
  }
}
