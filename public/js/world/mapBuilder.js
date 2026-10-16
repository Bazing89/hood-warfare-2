/**
 * Hood Warfare - Procedural Nuketown Map Builder
 * Instantiates PlayCanvas PBR primitives, ramps, lighting, and environmental props.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MapBuilder = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // Material Cache
  const materialCache = new Map();

  function hexToColor(hex) {
    if (!hex || hex.length < 7) return new pc.Color(0.5, 0.5, 0.5);
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return new pc.Color(r, g, b);
  }

  function getMaterial(app, hexColor, roughness = 0.7, metalness = 0.1) {
    const key = `${hexColor}_${roughness}_${metalness}`;
    if (materialCache.has(key)) {
      return materialCache.get(key);
    }

    const mat = new pc.StandardMaterial();
    mat.diffuse = hexToColor(hexColor);
    mat.roughness = roughness;
    mat.metalness = metalness;
    mat.update();

    materialCache.set(key, mat);
    return mat;
  }

  function buildMap(app, mapData) {
    const rootEntity = new pc.Entity('Nuketown_World');
    app.root.addChild(rootEntity);

    // 1. Environmental Sun & Ambient Lighting
    app.scene.ambientLight = new pc.Color(0.28, 0.32, 0.38);

    // Directional Sun
    const sun = new pc.Entity('Sun_Light');
    sun.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1.0, 0.95, 0.88),
      intensity: 1.35,
      castShadows: true,
      shadowDistance: 100,
      shadowResolution: 2048,
      shadowBias: 0.15,
      normalOffsetBias: 0.05
    });
    sun.setEulerAngles(48, -42, 0);
    rootEntity.addChild(sun);

    // Soft Fill Sky Light
    const skyFill = new pc.Entity('Sky_Fill');
    skyFill.addComponent('light', {
      type: 'directional',
      color: new pc.Color(0.5, 0.65, 0.85),
      intensity: 0.5,
      castShadows: false
    });
    skyFill.setEulerAngles(-60, 138, 0);
    rootEntity.addChild(skyFill);

    // Porch Lanterns on West and East Houses
    const westPorchLight = new pc.Entity('West_Porch_Light');
    westPorchLight.addComponent('light', {
      type: 'point',
      color: new pc.Color(0.2, 0.5, 1.0),
      intensity: 1.8,
      range: 8.0,
      castShadows: false
    });
    westPorchLight.setLocalPosition(-24.5, 3.2, 0);
    rootEntity.addChild(westPorchLight);

    const eastPorchLight = new pc.Entity('East_Porch_Light');
    eastPorchLight.addComponent('light', {
      type: 'point',
      color: new pc.Color(1.0, 0.3, 0.2),
      intensity: 1.8,
      range: 8.0,
      castShadows: false
    });
    eastPorchLight.setLocalPosition(24.5, 3.2, 0);
    rootEntity.addChild(eastPorchLight);

    // 2. Instantiate Static Map Boxes
    mapData.BOXES.forEach((box, index) => {
      // Skip invisible boundary colliders
      if (!box.color) return;

      const ent = new pc.Entity(`Box_${index}_${box.tag || 'geo'}`);
      let roughness = 0.75;
      let metalness = 0.05;

      if (box.tag === 'ground') {
        roughness = 0.9;
      } else if (box.tag === 'bus') {
        roughness = 0.4;
        metalness = 0.3;
      } else if (box.tag === 'wheel') {
        roughness = 0.95;
      } else if (box.tag && box.tag.includes('car')) {
        roughness = 0.35;
        metalness = 0.45;
      } else if (box.tag === 'balcony_floor' || box.tag === 'floor') {
        roughness = 0.85;
      }

      const mat = getMaterial(app, box.color, roughness, metalness);
      ent.addComponent('render', {
        type: 'box',
        material: mat,
        castShadows: true,
        receiveShadows: true
      });

      ent.setLocalPosition(box.x, box.y, box.z);
      ent.setLocalScale(box.w, box.h, box.d);
      rootEntity.addChild(ent);
    });

    // 3. Instantiate Ramps (Staircases and Truck Ramp)
    mapData.RAMPS.forEach((ramp, index) => {
      const rampEnt = new pc.Entity(`Ramp_${index}_${ramp.id}`);
      const mat = getMaterial(app, ramp.color || '#555555', 0.8, 0.1);

      // In addition to a smooth slope, we can construct the visual angled board
      if (ramp.dir === 'x+' || ramp.dir === 'x-') {
        const length = Math.sqrt(ramp.w * ramp.w + ramp.h * ramp.h);
        const angle = Math.atan2(ramp.h, ramp.w) * 180 / Math.PI;

        rampEnt.addComponent('render', {
          type: 'box',
          material: mat,
          castShadows: true,
          receiveShadows: true
        });

        rampEnt.setLocalPosition(ramp.x, ramp.y, ramp.z);
        rampEnt.setLocalScale(length, 0.18, ramp.d);
        rampEnt.setEulerAngles(0, 0, ramp.dir === 'x+' ? -angle : angle);
        rootEntity.addChild(rampEnt);

        // Also add step treads for aesthetic realism
        const steps = 10;
        const stepWidth = ramp.w / steps;
        const stepHeight = ramp.h / steps;
        for (let s = 0; s < steps; s++) {
          const stepEnt = new pc.Entity(`Step_${index}_${s}`);
          stepEnt.addComponent('render', {
            type: 'box',
            material: mat,
            castShadows: true,
            receiveShadows: true
          });

          const startX = ramp.dir === 'x+' ? (ramp.x - ramp.w / 2) : (ramp.x + ramp.w / 2);
          const sign = ramp.dir === 'x+' ? 1 : -1;
          const sx = startX + (s + 0.5) * stepWidth * sign;
          const sy = (ramp.y - ramp.h / 2) + (s + 0.5) * stepHeight;

          stepEnt.setLocalPosition(sx, sy, ramp.z);
          stepEnt.setLocalScale(stepWidth * 1.05, stepHeight, ramp.d);
          rootEntity.addChild(stepEnt);
        }
      } else if (ramp.dir === 'z+' || ramp.dir === 'z-') {
        const length = Math.sqrt(ramp.d * ramp.d + ramp.h * ramp.h);
        const angle = Math.atan2(ramp.h, ramp.d) * 180 / Math.PI;

        rampEnt.addComponent('render', {
          type: 'box',
          material: mat,
          castShadows: true,
          receiveShadows: true
        });

        rampEnt.setLocalPosition(ramp.x, ramp.y, ramp.z);
        rampEnt.setLocalScale(ramp.w, 0.15, length);
        rampEnt.setEulerAngles(ramp.dir === 'z+' ? angle : -angle, 0, 0);
        rootEntity.addChild(rampEnt);
      }
    });

    return rootEntity;
  }

  return {
    buildMap,
    getMaterial
  };
}));
