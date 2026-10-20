/**
 * Indian Simulator: Village Mud Wars
 * Procedural & Skeletal 3D Desi Cow (Zebu / Gir / Kamadhenu) Entity
 * Supports skeletal animations (Walk, Idle, Eating, HitReact) via GLTF/GLB models,
 * alongside authentic Zebu hump, horns, cowbell, flower garland, and mud splat coating.
 */

class DesiCow {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.id = options.id || 'cow_' + Math.floor(Math.random() * 10000);
    this.name = options.name || 'Gauri';
    this.colorType = options.colorType || 'white'; // 'white', 'brown', 'spotted'

    this.position = new THREE.Vector3(options.x || 0, 0, options.z || 0);
    this.rotationY = options.rotation || Math.random() * Math.PI * 2;
    this.targetRotationY = this.rotationY;

    // Movement & AI states
    this.state = 'idle'; // 'idle', 'walking', 'grazing', 'startled'
    this.stateTimer = 2.0 + Math.random() * 4.0;
    this.walkSpeed = 1.6;
    this.animTimer = Math.random() * 10;
    this.mudCoatCount = 0;
    this.isStartled = false;
    this.startleTimer = 0;

    // Mesh & Animation references
    this.group = new THREE.Group();
    this.proceduralMesh = new THREE.Group();
    this.legs = [];
    this.tail = null;
    this.head = null;
    this.cowbell = null;
    this.mudDecals = [];

    // GLB Skeletal animation
    this.isGLB = false;
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;

    this._buildMesh();
    this.group.add(this.proceduralMesh);
    this.scene.add(this.group);

    // Attempt to load animated 3D GLB model
    this._tryLoadGLB(options.modelPath);
  }

  _tryLoadGLB(customPath) {
    if (typeof THREE.GLTFLoader === 'undefined') return;

    const basePath = (window.location.pathname.startsWith('/indian') ? '/indian/models/' : '/models/');
    const modelFile = customPath || (this.colorType === 'brown' ? 'Bull.glb' : 'Cow.glb');
    const loader = new THREE.GLTFLoader();

    loader.load(
      basePath + modelFile,
      (gltf) => {
        this.isGLB = true;

        // Hide procedural mesh smoothly
        this.proceduralMesh.visible = false;

        const model = gltf.scene;
        model.scale.set(1.4, 1.4, 1.4);
        model.position.y = 0;
        model.rotation.y = Math.PI; // Face forward

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Add Sacred Zebu Hump & Flower Garland to GLB model
        const humpGeo = new THREE.SphereGeometry(0.32, 10, 8);
        const humpMat = new THREE.MeshLambertMaterial({
          color: this.colorType === 'brown' ? 0x8b4513 : 0xf0ece1
        });
        const hump = new THREE.Mesh(humpGeo, humpMat);
        hump.position.set(0, 1.85, 0.4);
        hump.scale.set(0.9, 1.1, 1.2);
        model.add(hump);

        // Garland & Cowbell
        const bellMat = new THREE.MeshStandardMaterial({ color: 0xefc026, metalness: 0.8, roughness: 0.3 });
        const bell = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 8), bellMat);
        bell.rotation.x = Math.PI;
        bell.position.set(0, 1.25, 0.7);
        model.add(bell);
        this.cowbell = bell;

        this.group.add(model);
        this.glbModel = model;

        // Initialize AnimationMixer
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => {
            const cleanName = clip.name.includes('|') ? clip.name.split('|')[1] : clip.name;
            this.animations[cleanName] = this.mixer.clipAction(clip);
          });

          this._playAnim('Idle');
        }
      },
      undefined,
      (err) => {
        console.warn('[DesiCow] GLB not loaded, using procedural model:', err);
      }
    );
  }

  _playAnim(name, once = false) {
    if (!this.mixer || !this.animations[name]) return;
    const nextAction = this.animations[name];

    if (this.currentAction === nextAction && !once) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(0.2);
    }

    nextAction.reset();
    if (once) {
      nextAction.setLoop(THREE.LoopOnce);
      nextAction.clampWhenFinished = true;
    } else {
      nextAction.setLoop(THREE.LoopRepeat);
    }
    nextAction.fadeIn(0.2).play();
    this.currentAction = nextAction;
  }

  _buildMesh() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // Materials based on breed
    let bodyColor = 0xf0ece1;
    let spotColor = 0x8b4513;

    if (this.colorType === 'brown') {
      bodyColor = 0xa3582e;
    } else if (this.colorType === 'spotted') {
      bodyColor = 0xf5f3ee;
      spotColor = 0x3d2719;
    }

    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const snoutMat = new THREE.MeshLambertMaterial({ color: 0x3a2e2a });
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const hoofMat = new THREE.MeshLambertMaterial({ color: 0x1f1916 });
    const marigoldMat = new THREE.MeshLambertMaterial({ color: 0xff9800 });
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xefc026, metalness: 0.8, roughness: 0.3 });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(1.4, 1.25, 2.6);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    this.proceduralMesh.add(torso);
    this.torsoMesh = torso;

    // 2. Distinctive Indian Zebu Shoulder Hump
    const humpGeo = new THREE.SphereGeometry(0.55, 10, 8);
    const hump = new THREE.Mesh(humpGeo, bodyMat);
    hump.position.set(0, 2.05, 0.65);
    hump.scale.set(0.9, 1.1, 1.2);
    hump.castShadow = true;
    this.proceduralMesh.add(hump);

    // 3. Spotted patches if spotted breed
    if (this.colorType === 'spotted') {
      const spotMat = new THREE.MeshLambertMaterial({ color: spotColor });
      const spot1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.8), spotMat);
      spot1.position.set(0.4, 1.45, 0.2);
      this.proceduralMesh.add(spot1);

      const spot2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.7), spotMat);
      spot2.position.set(-0.42, 1.35, -0.6);
      this.proceduralMesh.add(spot2);
    }

    // 4. Head Group (with neck)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.7, 1.35);

    const neckGeo = new THREE.BoxGeometry(0.7, 0.8, 0.9);
    const neck = new THREE.Mesh(neckGeo, bodyMat);
    neck.position.set(0, 0.1, 0.3);
    neck.rotation.x = 0.35;
    this.headGroup.add(neck);

    const headGeo = new THREE.BoxGeometry(0.75, 0.75, 0.95);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.35, 0.75);
    head.castShadow = true;
    this.headGroup.add(head);
    this.head = head;

    const snoutGeo = new THREE.BoxGeometry(0.65, 0.45, 0.5);
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, 0.2, 1.25);
    this.headGroup.add(snout);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.18, 0.5, 5);
    const leftEar = new THREE.Mesh(earGeo, bodyMat);
    leftEar.rotation.z = Math.PI / 2.5;
    leftEar.rotation.y = -0.3;
    leftEar.position.set(-0.55, 0.48, 0.7);
    const rightEar = leftEar.clone();
    rightEar.rotation.z = -Math.PI / 2.5;
    rightEar.rotation.y = 0.3;
    rightEar.position.x = 0.55;
    this.headGroup.add(leftEar);
    this.headGroup.add(rightEar);

    // Indian Curved Horns
    const hornGeo = new THREE.ConeGeometry(0.12, 0.7, 8);
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.rotation.x = -0.25;
    leftHorn.rotation.z = 0.45;
    leftHorn.position.set(-0.35, 0.85, 0.65);
    const rightHorn = leftHorn.clone();
    rightHorn.rotation.z = -0.45;
    rightHorn.position.x = 0.35;
    this.headGroup.add(leftHorn);
    this.headGroup.add(rightHorn);

    // Marigold Garland around neck
    for (let i = 0; i < 9; i++) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), marigoldMat);
      const angle = (i / 9) * Math.PI * 2;
      bead.position.set(Math.cos(angle) * 0.45, Math.sin(angle) * 0.42 - 0.1, 0.4);
      this.headGroup.add(bead);
    }

    // Jingling Brass Cowbell
    const bellGeo = new THREE.ConeGeometry(0.15, 0.3, 8);
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.rotation.x = Math.PI;
    bell.position.set(0, -0.45, 0.45);
    this.headGroup.add(bell);
    this.cowbell = bell;

    this.proceduralMesh.add(this.headGroup);

    // 5. Four Legs with Joints & Hooves
    const legPositions = [
      { x: -0.5, z: 0.85 },
      { x: 0.5, z: 0.85 },
      { x: -0.5, z: -0.85 },
      { x: 0.5, z: -0.85 }
    ];

    const legGeo = new THREE.BoxGeometry(0.28, 0.95, 0.28);
    const hoofGeo = new THREE.BoxGeometry(0.3, 0.15, 0.32);

    legPositions.forEach((pos, idx) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(pos.x, 0.95, pos.z);

      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.y = -0.45;
      leg.castShadow = true;
      legGroup.add(leg);

      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.y = -0.9;
      legGroup.add(hoof);

      this.proceduralMesh.add(legGroup);
      this.legs.push({ group: legGroup, baseZ: pos.z, idx });
    });

    // 6. Swishing Tail
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 1.85, -1.3);

    const tailGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.9, 6);
    const tail = new THREE.Mesh(tailGeo, bodyMat);
    tail.position.y = -0.45;
    tail.rotation.x = -0.15;
    this.tailGroup.add(tail);

    const tuftGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const tuft = new THREE.Mesh(tuftGeo, hornMat);
    tuft.position.set(0, -0.9, -0.05);
    this.tailGroup.add(tuft);

    this.proceduralMesh.add(this.tailGroup);
  }

  update(delta, world) {
    this.animTimer += delta;

    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Handle startled wiggle state
    if (this.isStartled) {
      this.startleTimer -= delta;
      if (this.torsoMesh) {
        this.torsoMesh.rotation.z = Math.sin(this.animTimer * 20) * 0.15;
        this.headGroup.rotation.z = -Math.sin(this.animTimer * 20) * 0.2;
      }
      if (this.startleTimer <= 0) {
        this.isStartled = false;
        if (this.torsoMesh) {
          this.torsoMesh.rotation.z = 0;
          this.headGroup.rotation.z = 0;
        }
      }
    }

    // AI State Machine
    this.stateTimer -= delta;
    if (this.stateTimer <= 0) {
      this._pickNewState();
    }

    if (this.state === 'walking') {
      let diff = this.targetRotationY - this.rotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.rotationY += diff * Math.min(1.0, delta * 3.0);
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
        this.targetRotationY += Math.PI * 0.8 + Math.random() * 0.4;
      }

      if (this.isGLB) {
        this._playAnim('Walk');
      } else {
        const swing = Math.sin(this.animTimer * 6.5) * 0.45;
        this.legs[0].group.rotation.x = swing;
        this.legs[1].group.rotation.x = -swing;
        this.legs[2].group.rotation.x = -swing;
        this.legs[3].group.rotation.x = swing;
      }

      if (this.cowbell) {
        this.cowbell.rotation.z = Math.sin(this.animTimer * 7.0) * 0.35;
      }
    } else {
      if (this.isGLB) {
        if (this.state === 'grazing') {
          this._playAnim('Eating');
        } else {
          this._playAnim('Idle');
        }
      } else {
        this.legs.forEach(l => l.group.rotation.x = 0);
        if (this.state === 'grazing') {
          this.headGroup.rotation.x = 0.55 + Math.sin(this.animTimer * 2.5) * 0.1;
        } else {
          this.headGroup.rotation.x = Math.sin(this.animTimer * 3.0) * 0.08;
        }
      }
    }

    if (this.tailGroup) {
      this.tailGroup.rotation.z = Math.sin(this.animTimer * 4.0) * 0.4;
    }
  }

  _pickNewState() {
    const r = Math.random();
    if (r < 0.45) {
      this.state = 'walking';
      this.stateTimer = 3.0 + Math.random() * 4.0;
      this.targetRotationY = this.rotationY + (Math.random() - 0.5) * 1.5;
    } else if (r < 0.8) {
      this.state = 'idle';
      this.stateTimer = 2.5 + Math.random() * 3.5;
    } else {
      this.state = 'grazing';
      this.stateTimer = 3.0 + Math.random() * 5.0;
    }
  }

  _canMoveTo(x, z, world) {
    if (x < -65 || x > 65 || z < -65 || z > 65) return false;
    if (world && world.colliders) {
      for (let c of world.colliders) {
        if (x >= c.minX - 1.2 && x <= c.maxX + 1.2 && z >= c.minZ - 1.2 && z <= c.maxZ + 1.2) {
          return false;
        }
      }
    }
    return true;
  }

  onHitByMud(hitPoint, mudType = 'standard') {
    this.mudCoatCount++;
    this.isStartled = true;
    this.startleTimer = 1.2;

    if (this.isGLB) {
      this._playAnim('Idle_HitReact_Left', true);
    }

    if (window.soundEngine) {
      const pitch = 0.9 + Math.random() * 0.25;
      window.soundEngine.playMoo(pitch);
    }

    this._addMudDecal(hitPoint);

    this.targetRotationY += (Math.random() - 0.5) * 2.0;
    this.state = 'walking';
    this.stateTimer = 2.0;

    return {
      points: mudType === 'mega' ? 300 : 150,
      cowName: this.name,
      coatLevel: this.mudCoatCount
    };
  }

  _addMudDecal(hitPoint) {
    if (this.mudDecals.length > 8) {
      const old = this.mudDecals.shift();
      this.group.remove(old);
    }

    const localHit = this.group.worldToLocal(hitPoint.clone());
    const splatMat = new THREE.MeshStandardMaterial({
      color: 0x3d2310,
      roughness: 0.35,
      metalness: 0.1
    });

    const splatGeo = new THREE.CylinderGeometry(0.28 + Math.random() * 0.2, 0.35 + Math.random() * 0.2, 0.06, 8);
    const splat = new THREE.Mesh(splatGeo, splatMat);
    splat.position.copy(localHit);
    splat.rotation.x = Math.PI / 2;
    splat.rotation.z = Math.random() * Math.PI;
    this.group.add(splat);
    this.mudDecals.push(splat);
  }
}
