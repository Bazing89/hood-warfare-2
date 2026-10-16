/**
 * Hood Warfare - 3rd-Person Remote Character Rig & Hitbox System
 * Articulated Blue (Crips) / Red (Bloods) Street Models, Procedural Limb Swing,
 * Smooth Transform Interpolation, and Head/Torso/Limbs Raycast Hitboxes
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RemotePlayer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class RemotePlayer {
    constructor(app, id, data, mapData) {
      this.app = app;
      this.id = id;
      this.name = data.name || 'Soldier';
      this.team = data.team || 'crips';
      this.isBot = !!data.isBot;
      this.mapData = mapData;

      // Transform targets for 20Hz network interpolation
      this.targetPos = new pc.Vec3(data.pos[0], data.pos[1], data.pos[2]);
      this.currentPos = new pc.Vec3(data.pos[0], data.pos[1], data.pos[2]);
      this.targetRotY = data.rotY || 0;
      this.currentRotY = data.rotY || 0;
      this.targetPitch = data.pitch || 0;
      this.currentPitch = data.pitch || 0;

      this.hp = data.hp !== undefined ? data.hp : 100;
      this.maxHp = 100;
      this.alive = data.alive !== undefined ? data.alive : true;
      this.state = data.state || 'idle';
      this.weaponId = data.weaponId || 'ar';

      // Animation variables
      this.walkPhase = 0;

      // Build 3D Articulated Rig
      this.buildModel();
      this.createNametagDom();
    }

    createMaterial(colorHex, roughness = 0.7, metalness = 0.1) {
      const mat = new pc.StandardMaterial();
      const r = parseInt(colorHex.slice(1, 3), 16) / 255;
      const g = parseInt(colorHex.slice(3, 5), 16) / 255;
      const b = parseInt(colorHex.slice(5, 7), 16) / 255;
      mat.diffuse = new pc.Color(r, g, b);
      mat.roughness = roughness;
      mat.metalness = metalness;
      mat.update();
      return mat;
    }

    buildModel() {
      const isCrip = this.team === 'crips';
      const factionColor = isCrip ? '#1252cc' : '#cc141a';
      const factionBandanaColor = isCrip ? '#1868ff' : '#ff2228';
      const skinColor = '#d99b6c';
      const pantsColor = isCrip ? '#1c2430' : '#2e1e1e';
      const shoeColor = '#ffffff';
      const gunColor = '#222222';

      const factionMat = this.createMaterial(factionColor, 0.65, 0.1);
      const bandanaMat = this.createMaterial(factionBandanaColor, 0.6, 0.1);
      const skinMat = this.createMaterial(skinColor, 0.8, 0.05);
      const pantsMat = this.createMaterial(pantsColor, 0.85, 0.05);
      const shoeMat = this.createMaterial(shoeColor, 0.5, 0.1);
      const gunMat = this.createMaterial(gunColor, 0.4, 0.6);

      // Root Entity
      this.root = new pc.Entity(`RemotePlayer_${this.id}`);
      this.app.root.addChild(this.root);
      this.root.setPosition(this.currentPos);

      // Torso Entity (pivoted at hips)
      this.torso = new pc.Entity('Torso');
      this.torso.addComponent('render', { type: 'box', material: factionMat });
      this.torso.setLocalPosition(0, 1.08, 0);
      this.torso.setLocalScale(0.48, 0.68, 0.28);
      this.root.addChild(this.torso);

      // White Hoodie Stripe / Graphic
      const graphic = new pc.Entity('TorsoStripe');
      graphic.addComponent('render', { type: 'box', material: shoeMat });
      graphic.setLocalPosition(0, 0.05, 0.145);
      graphic.setLocalScale(0.32, 0.18, 0.02);
      this.torso.addChild(graphic);

      // Head Entity (Skin tone + faction bandana)
      this.head = new pc.Entity('Head');
      this.head.addComponent('render', { type: 'box', material: skinMat });
      this.head.setLocalPosition(0, 0.48, 0);
      this.head.setLocalScale(0.32, 0.34, 0.32);
      this.torso.addChild(this.head);

      // Bandana / Cap
      const bandana = new pc.Entity('Bandana');
      bandana.addComponent('render', { type: 'box', material: bandanaMat });
      bandana.setLocalPosition(0, 0.10, 0);
      bandana.setLocalScale(0.33, 0.16, 0.33);
      this.head.addChild(bandana);

      // Left Arm (Pivoted at shoulder)
      this.leftArmPivot = new pc.Entity('LeftArmPivot');
      this.leftArmPivot.setLocalPosition(-0.30, 0.26, 0);
      this.torso.addChild(this.leftArmPivot);

      const leftArmMesh = new pc.Entity('LeftArmMesh');
      leftArmMesh.addComponent('render', { type: 'box', material: factionMat });
      leftArmMesh.setLocalPosition(0, -0.28, 0);
      leftArmMesh.setLocalScale(0.14, 0.60, 0.14);
      this.leftArmPivot.addChild(leftArmMesh);

      // Right Arm (Weapon Wielding Arm)
      this.rightArmPivot = new pc.Entity('RightArmPivot');
      this.rightArmPivot.setLocalPosition(0.30, 0.26, 0);
      this.torso.addChild(this.rightArmPivot);

      const rightArmMesh = new pc.Entity('RightArmMesh');
      rightArmMesh.addComponent('render', { type: 'box', material: factionMat });
      rightArmMesh.setLocalPosition(0, -0.28, 0.12);
      rightArmMesh.setLocalScale(0.14, 0.60, 0.14);
      rightArmMesh.setEulerAngles(45, 0, 0);
      this.rightArmPivot.addChild(rightArmMesh);

      // 3rd-Person Gun attached to right arm
      this.gunEntity = new pc.Entity('ThirdPersonGun');
      this.gunEntity.addComponent('render', { type: 'box', material: gunMat });
      this.gunEntity.setLocalPosition(0, -0.32, 0.26);
      this.gunEntity.setLocalScale(0.08, 0.12, 0.65);
      this.rightArmPivot.addChild(this.gunEntity);

      // Left Leg (Pivoted at hip)
      this.leftLegPivot = new pc.Entity('LeftLegPivot');
      this.leftLegPivot.setLocalPosition(-0.14, 0.74, 0);
      this.root.addChild(this.leftLegPivot);

      const leftLegMesh = new pc.Entity('LeftLegMesh');
      leftLegMesh.addComponent('render', { type: 'box', material: pantsMat });
      leftLegMesh.setLocalPosition(0, -0.37, 0);
      leftLegMesh.setLocalScale(0.18, 0.74, 0.20);
      this.leftLegPivot.addChild(leftLegMesh);

      const leftShoe = new pc.Entity('LeftShoe');
      leftShoe.addComponent('render', { type: 'box', material: shoeMat });
      leftShoe.setLocalPosition(0, -0.70, 0.04);
      leftShoe.setLocalScale(0.19, 0.12, 0.28);
      this.leftLegPivot.addChild(leftShoe);

      // Right Leg (Pivoted at hip)
      this.rightLegPivot = new pc.Entity('RightLegPivot');
      this.rightLegPivot.setLocalPosition(0.14, 0.74, 0);
      this.root.addChild(this.rightLegPivot);

      const rightLegMesh = new pc.Entity('RightLegMesh');
      rightLegMesh.addComponent('render', { type: 'box', material: pantsMat });
      rightLegMesh.setLocalPosition(0, -0.37, 0);
      rightLegMesh.setLocalScale(0.18, 0.74, 0.20);
      this.rightLegPivot.addChild(rightLegMesh);

      const rightShoe = new pc.Entity('RightShoe');
      rightShoe.addComponent('render', { type: 'box', material: shoeMat });
      rightShoe.setLocalPosition(0, -0.70, 0.04);
      rightShoe.setLocalScale(0.19, 0.12, 0.28);
      this.rightLegPivot.addChild(rightShoe);
    }

    createNametagDom() {
      this.nametagEl = document.createElement('div');
      this.nametagEl.className = `remote-nametag team-${this.team}`;
      this.nametagEl.innerHTML = `
        <div class="nametag-title">${this.name}</div>
        <div class="nametag-bar"><div class="nametag-fill" style="width: 100%"></div></div>
      `;
      const container = document.getElementById('nametag-container') || document.body;
      container.appendChild(this.nametagEl);
    }

    updateNetworkState(data) {
      if (Array.isArray(data.pos)) {
        this.targetPos.set(data.pos[0], data.pos[1], data.pos[2]);
      }
      if (typeof data.rotY === 'number') this.targetRotY = data.rotY;
      if (typeof data.pitch === 'number') this.targetPitch = data.pitch;
      if (typeof data.hp === 'number') this.hp = data.hp;
      if (typeof data.state === 'string') this.state = data.state;
      if (data.weaponId) this.weaponId = data.weaponId;
      if (data.alive !== undefined) {
        this.alive = data.alive;
        this.root.enabled = this.alive;
        if (this.nametagEl) this.nametagEl.style.display = this.alive ? 'block' : 'none';
      }
    }

    checkRaycastHit(rayOrigin, rayDir) {
      if (!this.alive) return null;

      const px = this.currentPos.x;
      const py = this.currentPos.y;
      const pz = this.currentPos.z;

      // 1. Head Hitbox: Y offset +1.42m to +1.85m
      const headBox = {
        x: px, y: py + 1.635, z: pz,
        w: 0.38, h: 0.43, d: 0.38
      };
      const tHead = this.mapData.intersectRayAABB(rayOrigin, rayDir, headBox);

      // 2. Torso Hitbox: Y offset +0.75m to +1.42m
      const torsoBox = {
        x: px, y: py + 1.085, z: pz,
        w: 0.54, h: 0.67, d: 0.38
      };
      const tTorso = this.mapData.intersectRayAABB(rayOrigin, rayDir, torsoBox);

      // 3. Limbs Hitbox: Y offset 0.0m to +0.75m
      const limbsBox = {
        x: px, y: py + 0.375, z: pz,
        w: 0.56, h: 0.75, d: 0.56
      };
      const tLimbs = this.mapData.intersectRayAABB(rayOrigin, rayDir, limbsBox);

      let closestT = Infinity;
      let zone = 'torso';

      if (tHead < closestT) { closestT = tHead; zone = 'head'; }
      if (tTorso < closestT) { closestT = tTorso; zone = 'torso'; }
      if (tLimbs < closestT) { closestT = tLimbs; zone = 'limbs'; }

      if (closestT < Infinity) {
        return {
          dist: closestT,
          zone: zone,
          point: [
            rayOrigin[0] + rayDir[0] * closestT,
            rayOrigin[1] + rayDir[1] * closestT,
            rayOrigin[2] + rayDir[2] * closestT
          ]
        };
      }
      return null;
    }

    update(dt, localCamera, localPlayer) {
      if (!this.alive) {
        if (this.nametagEl) this.nametagEl.style.display = 'none';
        return;
      }

      // Smooth Position & Rotation Interpolation
      this.currentPos.lerp(this.currentPos, this.targetPos, Math.min(1.0, dt * 15));

      // Handle shortest angle difference for rotY
      let diffRot = (this.targetRotY - this.currentRotY) % 360;
      if (diffRot > 180) diffRot -= 360;
      if (diffRot < -180) diffRot += 360;
      this.currentRotY += diffRot * Math.min(1.0, dt * 16);

      this.currentPitch += (this.targetPitch - this.currentPitch) * Math.min(1.0, dt * 16);

      this.root.setPosition(this.currentPos);
      this.root.setEulerAngles(0, this.currentRotY, 0);

      // Right Arm pitch with gun
      this.rightArmPivot.setEulerAngles(this.currentPitch, this.currentRotY, 0);

      // Crouch or Slide height adjustments
      const isCrouching = this.state === 'crouch' || this.state === 'slide';
      const targetTorsoY = isCrouching ? 0.65 : 1.08;
      const targetLegScaleY = isCrouching ? 0.45 : 0.74;

      this.torso.setLocalPosition(0, targetTorsoY, 0);
      this.leftLegPivot.setLocalScale(1.0, targetLegScaleY / 0.74, 1.0);
      this.rightLegPivot.setLocalScale(1.0, targetLegScaleY / 0.74, 1.0);

      // Procedural Walking Swing
      const horizDist = this.currentPos.distance(this.targetPos);
      if (horizDist > 0.05 && !isCrouching) {
        this.walkPhase += dt * 11.0;
        const swing = Math.sin(this.walkPhase) * 28.0;
        this.leftLegPivot.setLocalEulerAngles(swing, 0, 0);
        this.rightLegPivot.setLocalEulerAngles(-swing, 0, 0);
        this.leftArmPivot.setLocalEulerAngles(-swing * 0.8, 0, 0);
      } else {
        this.leftLegPivot.setLocalEulerAngles(0, 0, 0);
        this.rightLegPivot.setLocalEulerAngles(0, 0, 0);
        this.leftArmPivot.setLocalEulerAngles(0, 0, 0);
      }

      // Update Overhead Nametag Screen Projection
      if (this.nametagEl && localCamera) {
        const headWorldPos = new pc.Vec3(this.currentPos.x, this.currentPos.y + 2.1, this.currentPos.z);
        const screenPos = new pc.Vec3();
        localCamera.camera.worldToScreen(headWorldPos, screenPos);

        const distToLocal = localPlayer ? headWorldPos.distance(localPlayer.camera.getPosition()) : 20;
        const isTeammate = localPlayer && localPlayer.team === this.team;

        // Enemies only show nametag if damaged / within 16m
        const showEnemy = !isTeammate && (distToLocal <= 16.0 || this.hp < 100);
        const shouldShow = screenPos.z > 0 && (isTeammate || showEnemy);

        if (shouldShow) {
          this.nametagEl.style.display = 'block';
          this.nametagEl.style.left = `${screenPos.x}px`;
          this.nametagEl.style.top = `${screenPos.y}px`;

          const fillEl = this.nametagEl.querySelector('.nametag-fill');
          if (fillEl) {
            fillEl.style.width = `${Math.max(0, this.hp)}%`;
          }
        } else {
          this.nametagEl.style.display = 'none';
        }
      }
    }

    destroy() {
      if (this.root) this.root.destroy();
      if (this.nametagEl && this.nametagEl.parentNode) {
        this.nametagEl.parentNode.removeChild(this.nametagEl);
      }
    }
  }

  return RemotePlayer;
}));
