/**
 * Indian Simulator: Village Mud Wars
 * Player Controller & First-Person / Third-Person Camera System
 */

class PlayerController {
  constructor(camera, scene, domElement) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;

    // Movement state
    this.position = new THREE.Vector3(0, 0, 15);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.isGrounded = true;
    this.walkSpeed = 6.0;
    this.sprintSpeed = 9.8;
    this.jumpForce = 7.5;
    this.stepTimer = 0;

    // Camera mode: 'first_person' or 'third_person'
    this.cameraMode = 'first_person';
    this.tpDistance = 4.5;
    this.tpHeight = 2.0;

    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false
    };

    // Mud Ammo Inventory
    this.ammo = {
      standard: 25,
      mega: 6,
      golden: 10
    };
    this.maxAmmo = {
      standard: 40,
      mega: 10,
      golden: 15
    };
    this.selectedMudType = 'standard'; // 'standard', 'mega', 'golden'

    // Throw charging
    this.isChargingThrow = false;
    this.throwCharge = 0.0; // 0.0 to 1.0
    this.chargeSpeed = 1.35; // fills in ~0.75 seconds
    this.minThrowSpeed = 14.0;
    this.maxThrowSpeed = 34.0;

    // Mud on face / screen
    this.screenMudLevel = 0.0; // 0.0 to 1.0

    // Viewmodel Hand & Mud Ball
    this.viewmodel = new THREE.Group();
    this._initViewmodel();
    this.camera.add(this.viewmodel);

    // Third-person character model
    this.tpPlayerGroup = new THREE.Group();
    this._initThirdPersonModel();
    this.scene.add(this.tpPlayerGroup);

    this._bindEvents();
  }

  _initViewmodel() {
    // First-person viewmodel: hand holding a soft, squishy mud ball
    this.viewmodel.position.set(0.35, -0.32, -0.65);

    // Hand / Arm
    const armGeo = new THREE.BoxGeometry(0.14, 0.45, 0.14);
    const skinMat = new THREE.MeshLambertMaterial({ color: 0x9c6644 });
    const arm = new THREE.Mesh(armGeo, skinMat);
    arm.position.set(0, -0.15, 0.1);
    arm.rotation.x = -0.6;
    this.viewmodel.add(arm);

    // Mud Ball in hand
    const ballGeo = new THREE.DodecahedronGeometry(0.12, 1);
    this.vmMudBallMat = new THREE.MeshStandardMaterial({
      color: 0x4a2a16,
      roughness: 0.35,
      metalness: 0.05
    });
    this.vmMudBall = new THREE.Mesh(ballGeo, this.vmMudBallMat);
    this.vmMudBall.position.set(0, 0.08, -0.05);
    this.viewmodel.add(this.vmMudBall);
  }

  _initThirdPersonModel() {
    // 3D character mesh visible in third-person view
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff6f00 }); // Saffron kurta
    const dhotiMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e6 });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0x9c6644 });
    const pagriMat = new THREE.MeshLambertMaterial({ color: 0x00897b }); // Teal turban

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.1, 0.42), bodyMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    this.tpPlayerGroup.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.38), skinMat);
    head.position.y = 2.15;
    this.tpPlayerGroup.add(head);

    // Pagri / Turban
    const turban = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.28, 10), pagriMat);
    turban.position.y = 2.42;
    this.tpPlayerGroup.add(turban);

    // Dhoti legs
    const legGeo = new THREE.BoxGeometry(0.26, 0.85, 0.28);
    this.tpLeftLeg = new THREE.Mesh(legGeo, dhotiMat);
    this.tpLeftLeg.position.set(-0.2, 0.45, 0);
    this.tpRightLeg = new THREE.Mesh(legGeo, dhotiMat);
    this.tpRightLeg.position.set(0.2, 0.45, 0);
    this.tpPlayerGroup.add(this.tpLeftLeg);
    this.tpPlayerGroup.add(this.tpRightLeg);

    this.tpPlayerGroup.visible = false;
  }

  _bindEvents() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = true; break;
        case 'Space':
          if (this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
          }
          break;
        case 'KeyV':
          this.toggleCameraMode();
          break;
        case 'KeyC':
          this.cleanScreenMud();
          break;
        case 'Digit1':
          this.selectMudType('standard');
          break;
        case 'Digit2':
          this.selectMudType('mega');
          break;
        case 'Digit3':
          this.selectMudType('golden');
          break;
        case 'KeyR':
          this.refillMudAmmo();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = false; break;
      }
    });

    // Mouse Look (Pointer Lock)
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.domElement) {
        const sensitivity = 0.0022;
        this.yaw -= e.movementX * sensitivity;
        this.pitch -= e.movementY * sensitivity;

        // Clamp pitch so camera doesn't flip
        const maxPitch = Math.PI / 2 - 0.05;
        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
      }
    });

    // Mouse Throw Buttons
    this.domElement.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock();
        if (window.soundEngine) {
          window.soundEngine.init();
        }
        return;
      }

      if (e.button === 0) {
        // Left Click: Start charging throw
        if (this.ammo[this.selectedMudType] > 0) {
          this.isChargingThrow = true;
          this.throwCharge = 0.1;
        }
      } else if (e.button === 2) {
        // Right Click: Quick throw or scoop
        e.preventDefault();
        this.quickThrow();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.isChargingThrow) {
        this.releaseThrow();
      }
    });

    // Prevent context menu
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse scroll for switching mud types
    window.addEventListener('wheel', (e) => {
      const types = ['standard', 'mega', 'golden'];
      let idx = types.indexOf(this.selectedMudType);
      if (e.deltaY > 0) {
        idx = (idx + 1) % types.length;
      } else {
        idx = (idx - 1 + types.length) % types.length;
      }
      this.selectMudType(types[idx]);
    });
  }

  toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'first_person' ? 'third_person' : 'first_person';
    const isFP = this.cameraMode === 'first_person';
    this.viewmodel.visible = isFP;
    this.tpPlayerGroup.visible = !isFP;
  }

  selectMudType(type) {
    this.selectedMudType = type;
    if (this.vmMudBallMat) {
      if (type === 'mega') {
        this.vmMudBallMat.color.setHex(0x361f10);
        this.vmMudBall.scale.set(1.5, 0.7, 1.5);
      } else if (type === 'golden') {
        this.vmMudBallMat.color.setHex(0xd49b28);
        this.vmMudBall.scale.set(1.0, 1.0, 1.0);
      } else {
        this.vmMudBallMat.color.setHex(0x4a2a16);
        this.vmMudBall.scale.set(1.2, 1.2, 1.2);
      }
    }
  }

  refillMudAmmo() {
    this.ammo.standard = this.maxAmmo.standard;
    this.ammo.mega = this.maxAmmo.mega;
    this.ammo.golden = this.maxAmmo.golden;
    if (window.soundEngine) {
      window.soundEngine.playScoopMud();
    }
  }

  cleanScreenMud() {
    if (this.screenMudLevel > 0) {
      this.screenMudLevel = 0;
      if (window.soundEngine) {
        window.soundEngine.playWipeSound();
      }
    }
  }

  onHitByMud(mudType = 'standard') {
    const splash = mudType === 'mega' ? 0.75 : 0.45;
    this.screenMudLevel = Math.min(1.0, this.screenMudLevel + splash);
  }

  quickThrow() {
    if (this.ammo[this.selectedMudType] <= 0) return;
    this.throwCharge = 0.45;
    this.releaseThrow();
  }

  releaseThrow() {
    if (!this.isChargingThrow && this.throwCharge <= 0) return;
    this.isChargingThrow = false;

    if (this.ammo[this.selectedMudType] <= 0) {
      this.throwCharge = 0;
      return;
    }

    this.ammo[this.selectedMudType]--;

    // Compute launch vector from camera orientation
    const speed = this.minThrowSpeed + (this.maxThrowSpeed - this.minThrowSpeed) * this.throwCharge;
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

    const launchPos = this.camera.position.clone().add(dir.clone().multiplyScalar(0.7));

    if (this.onThrowCallback) {
      this.onThrowCallback({
        type: this.selectedMudType,
        startPos: launchPos,
        velocity: dir.multiplyScalar(speed),
        thrower: 'Player',
        isFromPlayer: true
      });
    }

    this.throwCharge = 0;
  }

  update(delta, world, weaponSystem) {
    // 1. Natural mud screen fading
    if (this.screenMudLevel > 0) {
      this.screenMudLevel = Math.max(0, this.screenMudLevel - delta * 0.15);
    }

    // 2. Charge throw power
    if (this.isChargingThrow) {
      this.throwCharge = Math.min(1.0, this.throwCharge + delta * this.chargeSpeed);

      // Squish viewmodel mudball while charging
      if (this.vmMudBall) {
        const squish = 1.0 + Math.sin(this.throwCharge * 20) * 0.12;
        this.vmMudBall.scale.set(squish, 1.0 / squish, squish);
      }

      // Update 3D trajectory preview line
      const speed = this.minThrowSpeed + (this.maxThrowSpeed - this.minThrowSpeed) * this.throwCharge;
      const dir = new THREE.Vector3(0, 0, -1);
      dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      const launchPos = this.camera.position.clone().add(dir.clone().multiplyScalar(0.7));

      if (weaponSystem) {
        weaponSystem.updateTrajectoryPreview(launchPos, dir.multiplyScalar(speed), true);
      }
    } else {
      if (weaponSystem) {
        weaponSystem.updateTrajectoryPreview(null, null, false);
      }
    }

    // 3. Horizontal movement
    const currentSpeed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;
    const moveX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const moveZ = (this.keys.backward ? 1 : 0) - (this.keys.forward ? 1 : 0);

    const isMoving = (moveX !== 0 || moveZ !== 0);

    if (isMoving) {
      const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize();
      moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      const nextX = this.position.x + moveVec.x * currentSpeed * delta;
      const nextZ = this.position.z + moveVec.z * currentSpeed * delta;

      // Check collision
      if (this._canMoveTo(nextX, nextZ, world)) {
        this.position.x = nextX;
        this.position.z = nextZ;
      }

      // Footstep sound
      this.stepTimer += delta * (this.keys.sprint ? 14 : 10);
      if (this.stepTimer >= Math.PI) {
        this.stepTimer = 0;
        const inMud = world && world.isPositionInMud(this.position);
        if (window.soundEngine) {
          window.soundEngine.playFootstep(!!inMud);
        }
      }
    }

    // 4. Vertical physics & gravity
    const gravity = -19.6;
    this.velocity.y += gravity * delta;
    this.position.y += this.velocity.y * delta;

    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Check if player is standing in mud pit (infinite refill!)
    if (world) {
      const pit = world.isPositionInMud(this.position);
      if (pit) {
        if (this.ammo.standard < this.maxAmmo.standard) {
          this.ammo.standard = Math.min(this.maxAmmo.standard, this.ammo.standard + 1);
        }
      }
    }

    // 5. Update Camera & Player Model Position
    if (this.cameraMode === 'first_person') {
      const eyeHeight = 1.72;
      const headBob = isMoving ? Math.sin(this.stepTimer * 2) * 0.04 : 0;
      this.camera.position.set(this.position.x, this.position.y + eyeHeight + headBob, this.position.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    } else {
      // Third person orbit camera
      this.tpPlayerGroup.position.set(this.position.x, this.position.y, this.position.z);
      this.tpPlayerGroup.rotation.y = this.yaw;

      const camOffset = new THREE.Vector3(0, this.tpHeight, this.tpDistance);
      camOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
      camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.camera.position.copy(this.position).add(camOffset);
      this.camera.lookAt(this.position.x, this.position.y + 1.6, this.position.z);

      // Animate legs in third person
      if (isMoving) {
        const legSwing = Math.sin(this.stepTimer * 2) * 0.5;
        this.tpLeftLeg.rotation.x = legSwing;
        this.tpRightLeg.rotation.x = -legSwing;
      } else {
        this.tpLeftLeg.rotation.x = 0;
        this.tpRightLeg.rotation.x = 0;
      }
    }
  }

  _canMoveTo(x, z, world) {
    if (x < -65 || x > 65 || z < -65 || z > 65) return false;
    if (world && world.colliders) {
      for (let c of world.colliders) {
        if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
          return false;
        }
      }
    }
    return true;
  }
}
