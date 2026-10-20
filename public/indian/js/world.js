/**
 * Indian Simulator: Village Mud Wars
 * Procedural Indian Village World Generator
 * Creates authentic rural environment: Mud huts, Banyan tree, Temple shrine,
 * Gaushala (cow sanctuary), Mud pits, Bullock carts, Tuk-Tuk, Matkas, and festive bunting.
 */

class VillageWorld {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // AABB bounding boxes {minX, maxX, minZ, maxZ, minY, maxY}
    this.breakableMatkas = []; // Array of clay pots that can be shattered
    this.mudPits = []; // Mud pit zones for ammo refill
    this.templeBell = null; // Hanging brass bell target
    this.bellMesh = null;
    this.bellSwinging = false;
    this.bellSwingAngle = 0;

    this.materials = this._initMaterials();
  }

  _initMaterials() {
    // Canvas procedural textures for natural Indian village look
    const dirtCanvas = document.createElement('canvas');
    dirtCanvas.width = 128;
    dirtCanvas.height = 128;
    const dCtx = dirtCanvas.getContext('2d');
    dCtx.fillStyle = '#b58450';
    dCtx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 600; i++) {
      dCtx.fillStyle = Math.random() > 0.5 ? '#9e6d3b' : '#c99661';
      dCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    const dirtTexture = new THREE.CanvasTexture(dirtCanvas);
    dirtTexture.wrapS = THREE.RepeatWrapping;
    dirtTexture.wrapT = THREE.RepeatWrapping;
    dirtTexture.repeat.set(40, 40);

    return {
      dirt: new THREE.MeshLambertMaterial({ map: dirtTexture }),
      grass: new THREE.MeshLambertMaterial({ color: 0x557a2b }),
      mudWet: new THREE.MeshStandardMaterial({
        color: 0x3d2412,
        roughness: 0.25,
        metalness: 0.1
      }),
      mudWall: new THREE.MeshLambertMaterial({ color: 0xd9824c }),
      whiteWall: new THREE.MeshLambertMaterial({ color: 0xeee7db }),
      tileRoof: new THREE.MeshLambertMaterial({ color: 0xa8432a }),
      thatchRoof: new THREE.MeshLambertMaterial({ color: 0xc49b5c }),
      wood: new THREE.MeshLambertMaterial({ color: 0x5c3a21 }),
      darkWood: new THREE.MeshLambertMaterial({ color: 0x3b2211 }),
      straw: new THREE.MeshLambertMaterial({ color: 0xd6ad56 }),
      foliage: new THREE.MeshLambertMaterial({ color: 0x2e6b27 }),
      bark: new THREE.MeshLambertMaterial({ color: 0x4a3319 }),
      terracotta: new THREE.MeshLambertMaterial({ color: 0xb8512e }),
      brass: new THREE.MeshStandardMaterial({
        color: 0xe6b422,
        metalness: 0.85,
        roughness: 0.25
      }),
      rickshawYellow: new THREE.MeshLambertMaterial({ color: 0xfcb003 }),
      rickshawGreen: new THREE.MeshLambertMaterial({ color: 0x1b5e20 }),
      blackMetal: new THREE.MeshLambertMaterial({ color: 0x222222 }),
      marigold: new THREE.MeshLambertMaterial({ color: 0xff8f00 })
    };
  }

  build() {
    this._buildLighting();
    this._buildSkyAndAtmosphere();
    this._buildTerrain();
    this._buildMudPits();
    this._buildVillageHuts();
    this._buildGaushala();
    this._buildBanyanTreeAndShrine();
    this._buildBullockCart();
    this._buildAutoRickshaw();
    this._buildClayMatkas();
    this._buildFencesAndDecorations();
    this._buildSurroundingScenery();
  }

  _buildLighting() {
    // Warm Indian Golden Hour Sun
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    sunLight.position.set(45, 60, 35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 180;
    const d = 60;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Ambient warm sky illumination
    const ambientLight = new THREE.HemisphereLight(0xfff0db, 0xa57548, 0.75);
    this.scene.add(ambientLight);
  }

  _buildSkyAndAtmosphere() {
    // Atmospheric warm Indian festival haze
    this.scene.fog = new THREE.FogExp2(0xfadbb4, 0.008);

    // Warm Sky Dome
    const skyGeo = new THREE.SphereGeometry(220, 24, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0xf5cca0,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  _buildTerrain() {
    // Main ground plane (160 x 160 meters)
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const ground = new THREE.Mesh(groundGeo, this.materials.dirt);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Pastoral green grass zones around the village edges
    const grassPatches = [
      { x: -35, z: -25, w: 32, h: 40 },
      { x: 38, z: 20, w: 30, h: 35 },
      { x: -28, z: 35, w: 36, h: 28 },
      { x: 32, z: -35, w: 34, h: 32 }
    ];

    grassPatches.forEach(gp => {
      const gGeo = new THREE.PlaneGeometry(gp.w, gp.h);
      const gMesh = new THREE.Mesh(gGeo, this.materials.grass);
      gMesh.rotation.x = -Math.PI / 2;
      gMesh.position.set(gp.x, 0.02, gp.z);
      gMesh.receiveShadow = true;
      this.scene.add(gMesh);
    });
  }

  _buildMudPits() {
    // 1. Central Great Sacred Mud Pit (Gorehabba Reservoir)
    const mainPitRadius = 7.0;
    const pitGeo = new THREE.CylinderGeometry(mainPitRadius, mainPitRadius, 0.35, 32);
    const pitMesh = new THREE.Mesh(pitGeo, this.materials.mudWet);
    pitMesh.position.set(0, 0.12, -4);
    pitMesh.receiveShadow = true;
    this.scene.add(pitMesh);

    // Central mud mound (where villagers pile fresh blessed mud)
    const moundGeo = new THREE.SphereGeometry(2.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const moundMesh = new THREE.Mesh(moundGeo, this.materials.mudWet);
    moundMesh.position.set(0, 0.15, -4);
    moundMesh.scale.set(1.4, 0.65, 1.4);
    this.scene.add(moundMesh);

    // Wooden border stakes around the mud pit
    const stakes = 24;
    for (let i = 0; i < stakes; i++) {
      const angle = (i / stakes) * Math.PI * 2;
      const sx = Math.cos(angle) * (mainPitRadius + 0.2);
      const sz = -4 + Math.sin(angle) * (mainPitRadius + 0.2);
      const stakeGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.8, 8);
      const stake = new THREE.Mesh(stakeGeo, this.materials.darkWood);
      stake.position.set(sx, 0.35, sz);
      stake.castShadow = true;
      this.scene.add(stake);
    }

    this.mudPits.push({ x: 0, z: -4, radius: mainPitRadius, name: 'The Sacred Mud Reservoir' });

    // 2. Secondary North Mud Pit
    const pit2Geo = new THREE.CylinderGeometry(4.2, 4.2, 0.3, 24);
    const pit2 = new THREE.Mesh(pit2Geo, this.materials.mudWet);
    pit2.position.set(-28, 0.1, 18);
    this.scene.add(pit2);
    this.mudPits.push({ x: -28, z: 18, radius: 4.2, name: 'Gaushala Mud Puddle' });

    // 3. Secondary East Mud Pit
    const pit3 = new THREE.Mesh(pit2Geo.clone(), this.materials.mudWet);
    pit3.position.set(28, 0.1, -22);
    this.scene.add(pit3);
    this.mudPits.push({ x: 28, z: -22, radius: 4.2, name: 'East Courtyard Mud Puddle' });
  }

  _buildVillageHuts() {
    // Layout of authentic Indian mud houses & Havelis
    const huts = [
      // North Havelis
      { x: -14, z: -26, w: 9, h: 4.2, d: 7, roof: 'tile', wall: 'mud' },
      { x: 12, z: -28, w: 10, h: 4.5, d: 8, roof: 'tile', wall: 'white' },
      // East Houses
      { x: 28, z: -4, w: 8, h: 3.8, d: 6.5, roof: 'thatch', wall: 'mud' },
      { x: 30, z: 14, w: 8.5, h: 4.0, d: 7, roof: 'tile', wall: 'white' },
      // South Houses
      { x: 10, z: 28, w: 9.5, h: 4.0, d: 7.5, roof: 'tile', wall: 'mud' },
      { x: -12, z: 26, w: 8.5, h: 3.8, d: 6.5, roof: 'thatch', wall: 'white' },
      // West Houses
      { x: -28, z: -6, w: 9, h: 4.2, d: 7.5, roof: 'tile', wall: 'mud' }
    ];

    huts.forEach(hut => {
      this._createHut(hut.x, hut.z, hut.w, hut.h, hut.d, hut.roof, hut.wall);
    });
  }

  _createHut(x, z, width, height, depth, roofType, wallType) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Wall base
    const wallMat = wallType === 'white' ? this.materials.whiteWall : this.materials.mudWall;
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = height / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Wooden door
    const doorGeo = new THREE.BoxGeometry(1.4, 2.4, 0.2);
    const door = new THREE.Mesh(doorGeo, this.materials.darkWood);
    door.position.set(0, 1.2, depth / 2 + 0.05);
    group.add(door);

    // Windows with wooden shutters
    const winGeo = new THREE.BoxGeometry(1.0, 1.0, 0.15);
    const win1 = new THREE.Mesh(winGeo, this.materials.darkWood);
    win1.position.set(-width * 0.28, height * 0.55, depth / 2 + 0.05);
    const win2 = win1.clone();
    win2.position.x = width * 0.28;
    group.add(win1);
    group.add(win2);

    // Porch step (Otla)
    const otlaGeo = new THREE.BoxGeometry(width + 0.8, 0.4, 1.8);
    const otla = new THREE.Mesh(otlaGeo, this.materials.mudWall);
    otla.position.set(0, 0.2, depth / 2 + 0.9);
    otla.receiveShadow = true;
    group.add(otla);

    // Roof
    if (roofType === 'tile') {
      // Sloped tiled gable roof
      const roofHeight = 2.2;
      const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, roofHeight, 4);
      const roof = new THREE.Mesh(roofGeo, this.materials.tileRoof);
      roof.position.y = height + roofHeight / 2 - 0.2;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(width / Math.max(width, depth) * 1.15, 1, depth / Math.max(width, depth) * 1.15);
      roof.castShadow = true;
      group.add(roof);
    } else {
      // Thatched straw roof with overhang
      const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 1.8, 6);
      const roof = new THREE.Mesh(roofGeo, this.materials.thatchRoof);
      roof.position.y = height + 0.8;
      roof.scale.set(1.2, 1, 1.2);
      roof.castShadow = true;
      group.add(roof);
    }

    this.scene.add(group);

    // Register AABB collider
    this.colliders.push({
      minX: x - width / 2 - 0.5,
      maxX: x + width / 2 + 0.5,
      minZ: z - depth / 2 - 0.5,
      maxZ: z + depth / 2 + 1.8,
      minY: 0,
      maxY: height + 2.5
    });
  }

  _buildGaushala() {
    // Traditional Cow Shed / Gaushala (Barn with stalls and feeding troughs)
    const gX = -32;
    const gZ = 12;
    const gW = 16;
    const gD = 12;
    const gH = 3.6;

    const group = new THREE.Group();
    group.position.set(gX, 0, gZ);

    // Wooden support posts
    const postGeo = new THREE.CylinderGeometry(0.18, 0.18, gH, 8);
    const postPositions = [
      [-gW / 2 + 0.5, -gD / 2 + 0.5],
      [0, -gD / 2 + 0.5],
      [gW / 2 - 0.5, -gD / 2 + 0.5],
      [-gW / 2 + 0.5, gD / 2 - 0.5],
      [0, gD / 2 - 0.5],
      [gW / 2 - 0.5, gD / 2 - 0.5]
    ];

    postPositions.forEach(p => {
      const post = new THREE.Mesh(postGeo, this.materials.wood);
      post.position.set(p[0], gH / 2, p[1]);
      post.castShadow = true;
      group.add(post);
    });

    // Thatched Roof
    const roofGeo = new THREE.ConeGeometry(gW * 0.7, 2.0, 4);
    const roof = new THREE.Mesh(roofGeo, this.materials.thatchRoof);
    roof.position.y = gH + 0.9;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.2, 1, 0.9);
    roof.castShadow = true;
    group.add(roof);

    // Hay bedding on floor
    const hayFloor = new THREE.Mesh(
      new THREE.BoxGeometry(gW - 1, 0.15, gD - 1),
      this.materials.straw
    );
    hayFloor.position.y = 0.08;
    group.add(hayFloor);

    // Wooden feeding troughs (Charl)
    const troughGeo = new THREE.BoxGeometry(5.0, 0.7, 1.0);
    const trough1 = new THREE.Mesh(troughGeo, this.materials.darkWood);
    trough1.position.set(-gW * 0.25, 0.35, -gD * 0.25);
    const trough2 = trough1.clone();
    trough2.position.set(gW * 0.25, 0.35, -gD * 0.25);
    group.add(trough1);
    group.add(trough2);

    // Hay bales around Gaushala
    for (let i = 0; i < 4; i++) {
      const bale = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 1.4, 12),
        this.materials.straw
      );
      bale.rotation.z = Math.PI / 2;
      bale.position.set(
        -gW / 2 - 2 - i * 1.5,
        0.8,
        gD / 2 - 2 + (i % 2) * 1.8
      );
      bale.castShadow = true;
      group.add(bale);
    }

    this.scene.add(group);

    this.colliders.push({
      minX: gX - gW / 2 - 1,
      maxX: gX + gW / 2 + 1,
      minZ: gZ - gD / 2 - 1,
      maxZ: gZ + gD / 2 + 1,
      minY: 0,
      maxY: gH + 2
    });
  }

  _buildBanyanTreeAndShrine() {
    // Majestic Ancient Banyan Tree
    const treeX = 22;
    const treeZ = -18;
    const group = new THREE.Group();
    group.position.set(treeX, 0, treeZ);

    // Circular stone Chabutra (raised platform) around tree
    const chabutraGeo = new THREE.CylinderGeometry(5.5, 5.8, 0.7, 24);
    const chabutra = new THREE.Mesh(chabutraGeo, this.materials.whiteWall);
    chabutra.position.y = 0.35;
    chabutra.receiveShadow = true;
    group.add(chabutra);

    // Main Trunk
    const trunkGeo = new THREE.CylinderGeometry(1.4, 2.2, 6.5, 12);
    const trunk = new THREE.Mesh(trunkGeo, this.materials.bark);
    trunk.position.y = 3.25;
    trunk.castShadow = true;
    group.add(trunk);

    // Hanging Aerial Prop Roots
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const rad = 3.2 + (i % 2) * 0.8;
      const rx = Math.cos(angle) * rad;
      const rz = Math.sin(angle) * rad;
      const rootGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.5, 8);
      const root = new THREE.Mesh(rootGeo, this.materials.bark);
      root.position.set(rx, 2.75, rz);
      group.add(root);
    }

    // Sprawling Canopy Foliage
    const foliageCluster = [
      { x: 0, y: 7.2, z: 0, r: 5.2 },
      { x: 2.5, y: 6.8, z: 1.5, r: 4.2 },
      { x: -2.8, y: 6.5, z: -1.8, r: 4.0 },
      { x: 1.2, y: 6.2, z: -2.8, r: 3.8 },
      { x: -1.8, y: 6.4, z: 2.4, r: 3.8 }
    ];

    foliageCluster.forEach(fc => {
      const folGeo = new THREE.SphereGeometry(fc.r, 12, 10);
      const folMesh = new THREE.Mesh(folGeo, this.materials.foliage);
      folMesh.position.set(fc.x, fc.y, fc.z);
      folMesh.castShadow = true;
      group.add(folMesh);
    });

    // Small stone Mandir / Village Shrine under tree
    const shrineGeo = new THREE.BoxGeometry(1.6, 2.2, 1.4);
    const shrine = new THREE.Mesh(shrineGeo, this.materials.terracotta);
    shrine.position.set(0, 1.45, 2.6);
    shrine.castShadow = true;
    group.add(shrine);

    // Hanging Brass Temple Bell (Rings with +500 pts when hit with mud ball!)
    const bellGroup = new THREE.Group();
    bellGroup.position.set(0, 3.8, 2.6);

    const chainGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6);
    const chain = new THREE.Mesh(chainGeo, this.materials.blackMetal);
    chain.position.y = -0.45;
    bellGroup.add(chain);

    const bellBodyGeo = new THREE.ConeGeometry(0.35, 0.65, 16);
    const bellBody = new THREE.Mesh(bellBodyGeo, this.materials.brass);
    bellBody.position.y = -0.9;
    bellBody.rotation.x = Math.PI;
    bellBody.castShadow = true;
    bellGroup.add(bellBody);

    const clapperGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const clapper = new THREE.Mesh(clapperGeo, this.materials.brass);
    clapper.position.y = -1.25;
    bellGroup.add(clapper);

    group.add(bellGroup);
    this.bellMesh = bellGroup;
    this.templeBell = {
      position: new THREE.Vector3(treeX, 2.8, treeZ + 2.6),
      radius: 0.85
    };

    this.scene.add(group);

    this.colliders.push({
      minX: treeX - 3.5,
      maxX: treeX + 3.5,
      minZ: treeZ - 3.5,
      maxZ: treeZ + 3.5,
      minY: 0,
      maxY: 8
    });
  }

  _buildBullockCart() {
    // Traditional Indian Wooden Bullock Cart (Bailgadi)
    const cartX = 14;
    const cartZ = 8;
    const group = new THREE.Group();
    group.position.set(cartX, 0, cartZ);
    group.rotation.y = -0.35;

    // Cart Bed
    const bedGeo = new THREE.BoxGeometry(2.4, 0.25, 4.0);
    const bed = new THREE.Mesh(bedGeo, this.materials.wood);
    bed.position.y = 1.3;
    bed.castShadow = true;
    group.add(bed);

    // Cart Side Railings
    const railGeo = new THREE.BoxGeometry(0.12, 0.7, 4.0);
    const leftRail = new THREE.Mesh(railGeo, this.materials.wood);
    leftRail.position.set(-1.15, 1.65, 0);
    const rightRail = leftRail.clone();
    rightRail.position.x = 1.15;
    group.add(leftRail);
    group.add(rightRail);

    // Front Yoke beam (where bullocks are hitched)
    const yokeGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8);
    const yoke = new THREE.Mesh(yokeGeo, this.materials.wood);
    yoke.rotation.x = Math.PI / 2;
    yoke.position.set(0, 1.0, 3.0);
    group.add(yoke);

    // Twin Large Wooden Spoked Wheels
    const wheelRadius = 1.2;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.16, 18);
    const leftWheel = new THREE.Mesh(wheelGeo, this.materials.darkWood);
    leftWheel.rotation.z = Math.PI / 2;
    leftWheel.position.set(-1.35, wheelRadius, 0);
    leftWheel.castShadow = true;

    const rightWheel = leftWheel.clone();
    rightWheel.position.x = 1.35;
    group.add(leftWheel);
    group.add(rightWheel);

    // Sacks and Hay inside cart
    const hayCargo = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 8, 8),
      this.materials.straw
    );
    hayCargo.scale.set(0.9, 0.6, 1.4);
    hayCargo.position.set(0, 1.8, -0.4);
    group.add(hayCargo);

    this.scene.add(group);

    this.colliders.push({
      minX: cartX - 1.8,
      maxX: cartX + 1.8,
      minZ: cartZ - 2.5,
      maxZ: cartZ + 3.0,
      minY: 0,
      maxY: 2.4
    });
  }

  _buildAutoRickshaw() {
    // Iconic Indian Auto-Rickshaw (Tuk-Tuk)
    const autoX = -10;
    const autoZ = -34;
    const group = new THREE.Group();
    group.position.set(autoX, 0, autoZ);
    group.rotation.y = 0.5;

    // Green Lower Body
    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.9, 3.2),
      this.materials.rickshawGreen
    );
    lowerBody.position.y = 0.8;
    lowerBody.castShadow = true;
    group.add(lowerBody);

    // Yellow Upper Hood / Canopy
    const upperHood = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.85, 2.6),
      this.materials.rickshawYellow
    );
    upperHood.position.set(0, 1.65, -0.2);
    upperHood.castShadow = true;
    group.add(upperHood);

    // Windshield & Front Nose
    const frontNose = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.2, 4),
      this.materials.rickshawYellow
    );
    frontNose.rotation.x = Math.PI / 4;
    frontNose.position.set(0, 1.2, 1.3);
    group.add(frontNose);

    // 3 Wheels (1 front, 2 rear)
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 12);
    const fWheel = new THREE.Mesh(wheelGeo, this.materials.blackMetal);
    fWheel.rotation.z = Math.PI / 2;
    fWheel.position.set(0, 0.38, 1.3);

    const rWheelL = fWheel.clone();
    rWheelL.position.set(-0.95, 0.38, -0.9);

    const rWheelR = fWheel.clone();
    rWheelR.position.set(0.95, 0.38, -0.9);

    group.add(fWheel);
    group.add(rWheelL);
    group.add(rWheelR);

    // Headlight
    const headlight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8),
      this.materials.brass
    );
    headlight.rotation.x = Math.PI / 2;
    headlight.position.set(0, 0.95, 1.7);
    group.add(headlight);

    this.scene.add(group);

    this.colliders.push({
      minX: autoX - 1.4,
      maxX: autoX + 1.4,
      minZ: autoZ - 2.0,
      maxZ: autoZ + 2.0,
      minY: 0,
      maxY: 2.2
    });
  }

  _buildClayMatkas() {
    // Traditional Indian Earthen Water Pots placed across village
    const matkaPositions = [
      { x: -8.8, y: 0.5, z: -22.2 },
      { x: -9.8, y: 0.5, z: -22.2 },
      { x: 17.5, y: 0.5, z: -23.5 },
      { x: 23.5, y: 0.5, z: -3.8 },
      { x: 25.5, y: 0.5, z: 10.5 },
      { x: 5.5, y: 0.5, z: 23.8 },
      { x: -16.5, y: 0.5, z: 22.5 },
      { x: -23.5, y: 0.5, z: -2.0 },
      { x: 15.2, y: 1.4, z: 8.2 }, // On bullock cart!
      { x: 24.5, y: 0.9, z: -16.5 }, // On chabutra
      { x: 3.5, y: 0.5, z: -10.5 },
      { x: -4.5, y: 0.5, z: 1.5 }
    ];

    matkaPositions.forEach((pos, idx) => {
      const potGroup = new THREE.Group();
      potGroup.position.set(pos.x, pos.y, pos.z);

      // Pot belly
      const bellyGeo = new THREE.SphereGeometry(0.42, 12, 10);
      const belly = new THREE.Mesh(bellyGeo, this.materials.terracotta);
      belly.position.y = 0.42;
      belly.castShadow = true;
      potGroup.add(belly);

      // Neck and rim
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.22, 12);
      const rim = new THREE.Mesh(rimGeo, this.materials.terracotta);
      rim.position.y = 0.82;
      potGroup.add(rim);

      this.scene.add(potGroup);

      this.breakableMatkas.push({
        id: 'matka_' + idx,
        group: potGroup,
        position: new THREE.Vector3(pos.x, pos.y + 0.45, pos.z),
        radius: 0.55,
        intact: true
      });
    });
  }

  _buildFencesAndDecorations() {
    // Village Wooden Fences
    const fenceSegments = [
      { x1: -22, z1: 6, x2: -22, z2: 24 },
      { x1: 22, z1: -12, x2: 22, z2: 6 },
      { x1: -6, z1: 32, x2: 6, z2: 32 }
    ];

    fenceSegments.forEach(seg => {
      const dx = seg.x2 - seg.x1;
      const dz = seg.z2 - seg.z1;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      const count = Math.floor(length / 2.0);

      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const px = seg.x1 + dx * t;
        const pz = seg.z1 + dz * t;

        // Post
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 1.4, 6),
          this.materials.wood
        );
        post.position.set(px, 0.7, pz);
        post.castShadow = true;
        this.scene.add(post);

        this.colliders.push({
          minX: px - 0.3,
          maxX: px + 0.3,
          minZ: pz - 0.3,
          maxZ: pz + 0.3,
          minY: 0,
          maxY: 1.5
        });
      }

      // Horizontal rails
      const railGeo = new THREE.BoxGeometry(0.08, 0.1, length);
      const rail1 = new THREE.Mesh(railGeo, this.materials.wood);
      rail1.position.set((seg.x1 + seg.x2) / 2, 0.6, (seg.z1 + seg.z2) / 2);
      rail1.rotation.y = angle;
      const rail2 = rail1.clone();
      rail2.position.y = 1.1;
      this.scene.add(rail1);
      this.scene.add(rail2);
    });

    // Festive Garlands / Toran between huts
    const toranColors = [0xe91e63, 0xff9800, 0x4caf50, 0x2196f3, 0xffeb3b];
    for (let i = 0; i < 20; i++) {
      const tx = (Math.random() - 0.5) * 40;
      const tz = (Math.random() - 0.5) * 40;
      const flagMat = new THREE.MeshBasicMaterial({
        color: toranColors[i % toranColors.length],
        side: THREE.DoubleSide
      });
      const flagGeo = new THREE.ConeGeometry(0.25, 0.45, 3);
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(tx, 3.8 + Math.random() * 0.4, tz);
      flag.rotation.x = Math.PI;
      this.scene.add(flag);
    }
  }

  _buildSurroundingScenery() {
    // Village boundary trees (Acacia, Mango, Palm)
    const treeCount = 28;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const dist = 55 + Math.random() * 15;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;

      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      const trunkH = 4.5 + Math.random() * 2;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.55, trunkH, 8),
        this.materials.bark
      );
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const crownR = 2.8 + Math.random() * 1.4;
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(crownR, 8, 8),
        this.materials.foliage
      );
      crown.position.y = trunkH + crownR * 0.7;
      crown.castShadow = true;
      tree.add(crown);

      this.scene.add(tree);
    }
  }

  // Check if position is inside any mud pit
  isPositionInMud(pos) {
    for (let pit of this.mudPits) {
      const dx = pos.x - pit.x;
      const dz = pos.z - pit.z;
      if (dx * dx + dz * dz <= pit.radius * pit.radius) {
        return pit;
      }
    }
    return null;
  }

  // Update dynamic world animations (e.g. swinging bell)
  update(delta) {
    if (this.bellSwinging && this.bellMesh) {
      this.bellSwingAngle += delta * 12;
      const damping = Math.exp(-this.bellSwingAngle * 0.25);
      const sway = Math.sin(this.bellSwingAngle) * 0.45 * damping;
      this.bellMesh.rotation.z = sway;

      if (damping < 0.02) {
        this.bellSwinging = false;
        this.bellMesh.rotation.z = 0;
      }
    }
  }

  ringBell() {
    this.bellSwinging = true;
    this.bellSwingAngle = 0;
    if (window.soundEngine) {
      window.soundEngine.playBell();
    }
  }
}
