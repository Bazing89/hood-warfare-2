/**
 * Hood Warfare - First-Person Kinematic Player Controller
 * Handles WASD, Sprint, Tactical Slide, Jump, AABB Obstacle Collision & Ramp Navigation
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LocalPlayer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class LocalPlayer {
    constructor(app, mapData, weaponsData, soundSynth) {
      this.app = app;
      this.mapData = mapData;
      this.weaponsData = weaponsData;
      this.soundSynth = soundSynth;

      // Root entity in PlayCanvas
      this.entity = new pc.Entity('LocalPlayer');
      this.app.root.addChild(this.entity);

      // Camera Pivot at eye height
      this.cameraPivot = new pc.Entity('CameraPivot');
      this.entity.addChild(this.cameraPivot);

      // First-person Camera
      this.camera = new pc.Entity('FirstPersonCamera');
      this.camera.addComponent('camera', {
        clearColor: new pc.Color(0.48, 0.65, 0.88),
        fov: 75,
        nearClip: 0.05,
        farClip: 350
      });
      this.cameraPivot.addChild(this.camera);

      // Dimensions & Speeds
      this.radius = 0.38;
      this.standingHeight = 1.80;
      this.standingEyeHeight = 1.62;
      this.crouchHeight = 1.00;
      this.crouchEyeHeight = 0.85;

      this.currentHeight = this.standingHeight;
      this.currentEyeHeight = this.standingEyeHeight;

      this.walkSpeed = 6.5;
      this.sprintSpeed = 9.8;
      this.crouchSpeed = 3.5;
      this.slideInitialSpeed = 11.5;
      this.jumpVelocity = 7.4;
      this.gravity = -19.6;

      // Position, Velocity & Orientation
      this.pos = [0, 0.1, 0]; // Feet position [x, y, z]
      this.vel = [0, 0, 0];
      this.rotY = 0; // Yaw in degrees
      this.pitch = 0; // Pitch in degrees
      this.roll = 0; // Roll in degrees
      this.targetRoll = 0;

      // Posture & Movement State: 'idle' | 'run' | 'crouch' | 'slide'
      this.state = 'idle';
      this.grounded = true;
      this.isSprinting = false;
      this.isCrouching = false;
      this.isSliding = false;
      this.slideTimer = 0;
      this.slideDuration = 0.65;
      this.slideDir = [0, 0];

      // Mouse drag tracking (fallback when pointer lock is transitioning)
      this.isMouseDown = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;

      // Stats & Combat
      this.hp = 100;
      this.maxHp = 100;
      this.alive = true;
      this.team = 'crips';
      this.loadoutId = 'ar';
      this.activeSlot = 1;

      // Input Keys
      this.keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        jump: false,
        crouch: false,
        ads: false
      };

      // Footstep cadence timer
      this.footstepTimer = 0;

      // Weapon System reference
      this.weaponSystem = null;

      this.initInput();
    }

    initInput() {
      window.addEventListener('keydown', (e) => {
        const code = e.code;
        const key = (e.key || '').toLowerCase();

        // Prevent default browser scroll on gameplay keys
        if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
          e.preventDefault();
        }

        if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') this.keys.forward = true;
        if (code === 'KeyS' || key === 's' || code === 'ArrowDown') this.keys.backward = true;
        if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') this.keys.left = true;
        if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') this.keys.right = true;

        if (code === 'ShiftLeft' || code === 'ShiftRight' || e.shiftKey) {
          this.keys.sprint = true;
        }
        if (code === 'Space') {
          this.handleJump();
        }
        if (code === 'KeyC' || key === 'c' || code === 'ControlLeft' || code === 'ControlRight') {
          this.handleCrouchOrSlide();
        }
        if (code === 'Digit1') {
          this.switchWeapon(1);
        }
        if (code === 'Digit2') {
          this.switchWeapon(2);
        }
        if (code === 'KeyQ' || key === 'q') {
          this.switchWeapon(this.activeSlot === 1 ? 2 : 1);
        }
        if (code === 'KeyR' || key === 'r') {
          if (this.weaponSystem) this.weaponSystem.reload();
        }
      });

      window.addEventListener('keyup', (e) => {
        const code = e.code;
        const key = (e.key || '').toLowerCase();

        if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') this.keys.forward = false;
        if (code === 'KeyS' || key === 's' || code === 'ArrowDown') this.keys.backward = false;
        if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') this.keys.left = false;
        if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') this.keys.right = false;

        if ((code === 'ShiftLeft' || code === 'ShiftRight') && !e.shiftKey) {
          this.keys.sprint = false;
        }
        if ((code === 'KeyC' || key === 'c' || code === 'ControlLeft') && this.isCrouching && !this.isSliding) {
          this.isCrouching = false;
        }
      });

      // Mouse Look - only active when pointer lock is engaged and player is alive
      window.addEventListener('mousemove', (e) => {
        if (!document.pointerLockElement || !this.alive) return;
        const sensitivity = 0.12;

        this.rotY -= e.movementX * sensitivity;
        this.pitch -= e.movementY * sensitivity;

        if (this.pitch > 89) this.pitch = 89;
        if (this.pitch < -89) this.pitch = -89;

        this.rotY = (this.rotY % 360 + 360) % 360;
      });

      window.addEventListener('mousedown', (e) => {
        // Only track aim-down-sights if pointer lock is active and player is alive
        if (!document.pointerLockElement || !this.alive) return;
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        if (e.button === 2) {
          this.keys.ads = true;
        }
      });

      window.addEventListener('mouseup', (e) => {
        this.isMouseDown = false;
        if (e.button === 2) {
          this.keys.ads = false;
        }
      });

      // Reset controls if pointer lock is dropped or window loses focus
      document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement) {
          this.isMouseDown = false;
          this.keys.ads = false;
        }
      });

      window.addEventListener('blur', () => {
        this.isMouseDown = false;
        this.keys.ads = false;
        for (const k in this.keys) {
          if (typeof this.keys[k] === 'boolean') this.keys[k] = false;
        }
      });

      window.addEventListener('wheel', () => {
        // Only switch weapon via wheel during active combat
        if (!document.pointerLockElement || !this.alive) return;
        this.switchWeapon(this.activeSlot === 1 ? 2 : 1);
      });

      window.addEventListener('contextmenu', (e) => {
        // Only suppress context menu during active gameplay
        if (document.pointerLockElement) {
          e.preventDefault();
        }
      });
    }

    handleJump() {
      if (!this.alive || !this.grounded) return;
      if (this.isSliding) {
        this.isSliding = false;
      }
      this.vel[1] = this.jumpVelocity;
      this.grounded = false;
    }

    handleCrouchOrSlide() {
      if (!this.alive) return;

      const horizSpeed = Math.sqrt(this.vel[0] * this.vel[0] + this.vel[2] * this.vel[2]);
      if (this.grounded && this.keys.forward && this.keys.sprint && horizSpeed > 7.0 && !this.isSliding) {
        this.isSliding = true;
        this.slideTimer = this.slideDuration;
        this.targetRoll = 4.0;

        const yawRad = this.rotY * Math.PI / 180;
        this.slideDir = [-Math.sin(yawRad), -Math.cos(yawRad)];

        if (this.soundSynth) {
          this.soundSynth.playSlide();
        }
      } else {
        this.isCrouching = !this.isCrouching;
      }
    }

    switchWeapon(slot) {
      if (this.activeSlot === slot || !this.weaponSystem) return;
      this.activeSlot = slot;
      this.weaponSystem.switchSlot(slot);
    }

    respawn(spawnPos, rotY) {
      this.pos = [spawnPos[0], Math.max(0.1, spawnPos[1]), spawnPos[2]];
      this.vel = [0, 0, 0];
      this.rotY = (rotY !== undefined) ? rotY : 0;
      this.pitch = 0;
      this.roll = 0;
      this.targetRoll = 0;
      this.hp = 100;
      this.alive = true;
      this.grounded = true;
      this.isSliding = false;
      this.isCrouching = false;
      this.slideTimer = 0;

      // Run de-penetration immediately on spawn
      this.resolvePenetration();

      if (this.weaponSystem) {
        this.weaponSystem.resetAmmo();
      }
    }

    update(dt) {
      if (!this.alive) return;

      // Clamp delta time to avoid large physics steps
      dt = Math.max(0.001, Math.min(dt, 0.033));

      // 1. Posture & Height Lerp
      let targetHeight = this.standingHeight;
      let targetEyeHeight = this.standingEyeHeight;

      if (this.isSliding || this.isCrouching) {
        targetHeight = this.crouchHeight;
        targetEyeHeight = this.crouchEyeHeight;
      }

      this.currentHeight += (targetHeight - this.currentHeight) * Math.min(1.0, dt * 14);
      this.currentEyeHeight += (targetEyeHeight - this.currentEyeHeight) * Math.min(1.0, dt * 14);

      // Camera Roll lerp
      this.roll += (this.targetRoll - this.roll) * Math.min(1.0, dt * 12);

      // Weapon speed modifier
      let weaponSpeedMult = 1.0;
      if (this.weaponSystem && this.weaponSystem.currentWeapon) {
        weaponSpeedMult = this.weaponSystem.currentWeapon.moveSpeedMult || 1.0;
      }

      // 2. Movement Directions
      const yawRad = this.rotY * Math.PI / 180;
      const forwardX = -Math.sin(yawRad);
      const forwardZ = -Math.cos(yawRad);
      const rightX = Math.cos(yawRad);
      const rightZ = -Math.sin(yawRad);

      let moveX = 0;
      let moveZ = 0;

      if (this.isSliding) {
        this.slideTimer -= dt;
        const slideProgress = 1.0 - (this.slideTimer / this.slideDuration);
        const currentSlideSpeed = this.slideInitialSpeed - (this.slideInitialSpeed - this.crouchSpeed) * Math.pow(slideProgress, 1.4);

        moveX = this.slideDir[0] * currentSlideSpeed;
        moveZ = this.slideDir[1] * currentSlideSpeed;

        if (this.slideTimer <= 0) {
          this.isSliding = false;
          this.targetRoll = 0;
          this.isCrouching = true;
        }
      } else {
        let inputFwd = 0;
        let inputRight = 0;
        if (this.keys.forward) inputFwd += 1;
        if (this.keys.backward) inputFwd -= 1;
        if (this.keys.right) inputRight += 1;
        if (this.keys.left) inputRight -= 1;

        const inputLen = Math.sqrt(inputFwd * inputFwd + inputRight * inputRight);
        if (inputLen > 0.001) {
          inputFwd /= inputLen;
          inputRight /= inputLen;

          let targetSpeed = this.walkSpeed;
          if (this.isCrouching) {
            targetSpeed = this.crouchSpeed;
          } else if (this.keys.sprint && inputFwd > 0.5 && !this.keys.ads) {
            targetSpeed = this.sprintSpeed;
            this.isSprinting = true;
          } else {
            this.isSprinting = false;
          }

          targetSpeed *= weaponSpeedMult;
          moveX = (forwardX * inputFwd + rightX * inputRight) * targetSpeed;
          moveZ = (forwardZ * inputFwd + rightZ * inputRight) * targetSpeed;
        } else {
          this.isSprinting = false;
        }
      }

      // Horizontal Velocity Lerp
      const accel = this.grounded ? 18.0 : 5.0;
      this.vel[0] += (moveX - this.vel[0]) * Math.min(1.0, dt * accel);
      this.vel[2] += (moveZ - this.vel[2]) * Math.min(1.0, dt * accel);

      // Gravity & Vertical Movement
      this.vel[1] += this.gravity * dt;

      // 3. Kinematic Collision & De-penetration
      this.moveWithCollision(dt);

      // 4. Update State string
      const horizSpeed = Math.sqrt(this.vel[0] * this.vel[0] + this.vel[2] * this.vel[2]);
      if (this.isSliding) {
        this.state = 'slide';
      } else if (this.isCrouching) {
        this.state = 'crouch';
      } else if (horizSpeed > 6.8) {
        this.state = 'run';
      } else {
        this.state = 'idle';
      }

      // 5. Procedural Footstep Audio
      if (this.grounded && horizSpeed > 0.8 && !this.isSliding) {
        const interval = this.isSprinting ? 0.30 : (this.isCrouching ? 0.65 : 0.46);
        this.footstepTimer += dt;
        if (this.footstepTimer >= interval) {
          this.footstepTimer = 0;
          if (this.soundSynth) this.soundSynth.playFootstep();
        }
      } else {
        this.footstepTimer = 0;
      }

      // 6. Update PlayCanvas Entity Transforms
      // Use setLocalEulerAngles so the camera inherits entity yaw + pivot pitch/roll!
      this.entity.setLocalPosition(this.pos[0], this.pos[1], this.pos[2]);
      this.entity.setLocalEulerAngles(0, this.rotY, 0);

      this.cameraPivot.setLocalPosition(0, this.currentEyeHeight, 0);
      this.cameraPivot.setLocalEulerAngles(this.pitch, 0, this.roll);
    }

    resolvePenetration() {
      // De-penetrates player from any intersecting colliders
      const minX = this.pos[0] - this.radius;
      const maxX = this.pos[0] + this.radius;
      const minY = this.pos[1];
      const maxY = this.pos[1] + this.currentHeight;
      const minZ = this.pos[2] - this.radius;
      const maxZ = this.pos[2] + this.radius;

      for (let i = 0; i < this.mapData.COLLIDERS.length; i++) {
        const col = this.mapData.COLLIDERS[i];
        if (col.tag === 'ground') continue;

        const bMinX = col.x - col.w / 2;
        const bMaxX = col.x + col.w / 2;
        const bMinY = col.y - col.h / 2;
        const bMaxY = col.y + col.h / 2;
        const bMinZ = col.z - col.d / 2;
        const bMaxZ = col.z + col.d / 2;

        if (minX < bMaxX && maxX > bMinX &&
            minY < bMaxY && maxY > bMinY &&
            minZ < bMaxZ && maxZ > bMinZ) {
          // Calculate overlaps on all 3 axes
          const overlapLeft = maxX - bMinX;
          const overlapRight = bMaxX - minX;
          const overlapBack = maxZ - bMinZ;
          const overlapFront = bMaxZ - minZ;

          const minOverlapX = Math.min(overlapLeft, overlapRight);
          const minOverlapZ = Math.min(overlapBack, overlapFront);

          if (minOverlapX < minOverlapZ) {
            if (overlapLeft < overlapRight) {
              this.pos[0] = bMinX - this.radius - 0.01;
            } else {
              this.pos[0] = bMaxX + this.radius + 0.01;
            }
          } else {
            if (overlapBack < overlapFront) {
              this.pos[2] = bMinZ - this.radius - 0.01;
            } else {
              this.pos[2] = bMaxZ + this.radius + 0.01;
            }
          }
        }
      }
    }

    moveWithCollision(dt) {
      // De-penetrate if currently stuck
      this.resolvePenetration();

      // Step X
      const nextX = this.pos[0] + this.vel[0] * dt;
      if (!this.checkAABBCollision(nextX, this.pos[1], this.pos[2])) {
        this.pos[0] = nextX;
      } else {
        const stepY = this.tryStepUp(nextX, this.pos[1], this.pos[2]);
        if (stepY !== null) {
          this.pos[0] = nextX;
          this.pos[1] = stepY;
        } else {
          this.vel[0] = 0;
        }
      }

      // Step Z
      const nextZ = this.pos[2] + this.vel[2] * dt;
      if (!this.checkAABBCollision(this.pos[0], this.pos[1], nextZ)) {
        this.pos[2] = nextZ;
      } else {
        const stepY = this.tryStepUp(this.pos[0], this.pos[1], nextZ);
        if (stepY !== null) {
          this.pos[2] = nextZ;
          this.pos[1] = stepY;
        } else {
          this.vel[2] = 0;
        }
      }

      // Step Y (Vertical)
      const nextY = this.pos[1] + this.vel[1] * dt;

      // Check Ramps (smooth staircase/ramp interpolation)
      const rampHeight = this.getRampHeight(this.pos[0], this.pos[2]);
      if (rampHeight !== null && (nextY <= rampHeight + 0.25 || this.pos[1] <= rampHeight + 0.25)) {
        this.pos[1] = rampHeight;
        this.vel[1] = 0;
        this.grounded = true;
        return;
      }

      if (this.vel[1] <= 0) {
        let groundHitY = null;
        for (let i = 0; i < this.mapData.COLLIDERS.length; i++) {
          const col = this.mapData.COLLIDERS[i];
          if (col.tag === 'boundary') continue;

          const topY = col.y + col.h / 2;
          const minX = col.x - col.w / 2;
          const maxX = col.x + col.w / 2;
          const minZ = col.z - col.d / 2;
          const maxZ = col.z + col.d / 2;

          if (this.pos[0] + this.radius > minX && this.pos[0] - this.radius < maxX &&
              this.pos[2] + this.radius > minZ && this.pos[2] - this.radius < maxZ) {
            if (this.pos[1] >= topY - 0.35 && nextY <= topY + 0.1) {
              if (groundHitY === null || topY > groundHitY) {
                groundHitY = topY;
              }
            }
          }
        }

        if (groundHitY !== null) {
          this.pos[1] = groundHitY;
          this.vel[1] = 0;
          this.grounded = true;
        } else if (nextY <= 0) {
          this.pos[1] = 0;
          this.vel[1] = 0;
          this.grounded = true;
        } else {
          this.pos[1] = nextY;
          this.grounded = false;
        }
      } else {
        if (this.checkAABBCollision(this.pos[0], nextY, this.pos[2])) {
          this.vel[1] = 0;
        } else {
          this.pos[1] = nextY;
          this.grounded = false;
        }
      }
    }

    checkAABBCollision(x, y, z) {
      const minX = x - this.radius;
      const maxX = x + this.radius;
      const minY = y + 0.05; // slight tolerance above feet
      const maxY = y + this.currentHeight;
      const minZ = z - this.radius;
      const maxZ = z + this.radius;

      for (let i = 0; i < this.mapData.COLLIDERS.length; i++) {
        const col = this.mapData.COLLIDERS[i];
        if (col.tag === 'ground') continue;

        const bMinX = col.x - col.w / 2;
        const bMaxX = col.x + col.w / 2;
        const bMinY = col.y - col.h / 2;
        const bMaxY = col.y + col.h / 2;
        const bMinZ = col.z - col.d / 2;
        const bMaxZ = col.z + col.d / 2;

        if (minX < bMaxX && maxX > bMinX &&
            minY < bMaxY && maxY > bMinY &&
            minZ < bMaxZ && maxZ > bMinZ) {
          return true;
        }
      }
      return false;
    }

    tryStepUp(nextX, currentY, nextZ) {
      const maxStepHeight = 0.45;
      const testStepY = currentY + maxStepHeight;

      if (!this.checkAABBCollision(nextX, testStepY, nextZ)) {
        let highestTop = null;
        for (let i = 0; i < this.mapData.COLLIDERS.length; i++) {
          const col = this.mapData.COLLIDERS[i];
          const topY = col.y + col.h / 2;
          if (topY > currentY && topY <= testStepY + 0.05) {
            const bMinX = col.x - col.w / 2;
            const bMaxX = col.x + col.w / 2;
            const bMinZ = col.z - col.d / 2;
            const bMaxZ = col.z + col.d / 2;

            if (nextX + this.radius > bMinX && nextX - this.radius < bMaxX &&
                nextZ + this.radius > bMinZ && nextZ - this.radius < bMaxZ) {
              if (highestTop === null || topY > highestTop) {
                highestTop = topY;
              }
            }
          }
        }
        if (highestTop !== null) {
          return highestTop;
        }
      }
      return null;
    }

    getRampHeight(px, pz) {
      for (let i = 0; i < this.mapData.RAMPS.length; i++) {
        const ramp = this.mapData.RAMPS[i];
        const minX = ramp.x - ramp.w / 2;
        const maxX = ramp.x + ramp.w / 2;
        const minZ = ramp.z - ramp.d / 2;
        const maxZ = ramp.z + ramp.d / 2;

        if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ) {
          let progress = 0;
          if (ramp.dir === 'x+') {
            progress = (px - minX) / ramp.w;
          } else if (ramp.dir === 'x-') {
            progress = (maxX - px) / ramp.w;
          } else if (ramp.dir === 'z+') {
            progress = (pz - minZ) / ramp.d;
          } else if (ramp.dir === 'z-') {
            progress = (maxZ - pz) / ramp.d;
          }
          progress = Math.max(0, Math.min(1, progress));
          const baseY = ramp.y - ramp.h / 2;
          return baseY + progress * ramp.h;
        }
      }
      return null;
    }
  }

  return LocalPlayer;
}));
