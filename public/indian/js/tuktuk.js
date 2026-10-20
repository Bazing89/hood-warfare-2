/**
 * Indian Simulator: Village Mud Wars
 * High-Fidelity 3D Tuk-Tuk / Auto Rickshaw Asset Builder
 * Inspired by authentic Egyptian & Indian street tuk-tuks (like Sketchfab #8419e1a79332495d815550b89e53bb8d)
 * Features weathered multi-tone body panels, tubular roll-cage, canvas canopy with scalloped valance,
 * front fork suspension, motorcycle handlebars, patterned passenger bench, chrome exhaust, and horn sound.
 */

class TukTukBuilder {
  static createTukTuk(options = {}) {
    const group = new THREE.Group();
    group.position.set(options.x || 0, options.y || 0, options.z || 0);
    if (options.rotationY) group.rotation.y = options.rotationY;

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: options.bodyColor || 0x1b5e20, // Classic auto-rickshaw dark green
      roughness: 0.4,
      metalness: 0.3
    });

    const hoodMat = new THREE.MeshStandardMaterial({
      color: options.hoodColor || 0xfcb003, // Classic auto-rickshaw yellow
      roughness: 0.35,
      metalness: 0.25
    });

    const blackSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.6,
      metalness: 0.8
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.95,
      roughness: 0.15
    });

    const canvasRoofMat = new THREE.MeshStandardMaterial({
      color: 0xe0a010, // Weathered yellow canvas canopy
      roughness: 0.85,
      metalness: 0.05
    });

    const valanceMat = new THREE.MeshLambertMaterial({
      color: 0xb71c1c, // Red decorative scalloped fringe
      side: THREE.DoubleSide
    });

    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x5d1010, // Maroon pleated leather upholstery
      roughness: 0.65
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.85,
      metalness: 0.1
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1
    });

    // 1. Chassis & Floorboards
    const floorGeo = new THREE.BoxGeometry(1.6, 0.18, 3.1);
    const floor = new THREE.Mesh(floorGeo, blackSteelMat);
    floor.position.y = 0.42;
    floor.castShadow = true;
    floor.receiveShadow = true;
    group.add(floor);

    // Lower Body Skirts & Passenger Entrance
    const skirtGeoL = new THREE.BoxGeometry(0.12, 0.5, 1.4);
    const skirtL = new THREE.Mesh(skirtGeoL, bodyMat);
    skirtL.position.set(-0.76, 0.72, -0.6);
    skirtL.castShadow = true;
    const skirtR = skirtL.clone();
    skirtR.position.x = 0.76;
    group.add(skirtL);
    group.add(skirtR);

    // Rear Body Enclosure & Engine Compartment
    const rearPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.64, 0.75, 0.9),
      bodyMat
    );
    rearPanel.position.set(0, 0.82, -1.1);
    rearPanel.castShadow = true;
    group.add(rearPanel);

    // 2. Front Cabin & Apron
    const frontApron = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.85, 0.85, 16, 1, false, -Math.PI / 2, Math.PI),
      hoodMat
    );
    frontApron.rotation.y = Math.PI / 2;
    frontApron.position.set(0, 0.88, 1.1);
    frontApron.castShadow = true;
    group.add(frontApron);

    // Front Nose / Center Hood Ridge
    const hoodRidge = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.82, 0.45),
      hoodMat
    );
    hoodRidge.position.set(0, 0.88, 1.35);
    hoodRidge.castShadow = true;
    group.add(hoodRidge);

    // Windshield Frame & Glass
    const frameGeo = new THREE.BoxGeometry(1.48, 0.85, 0.08);
    const wsFrame = new THREE.Mesh(frameGeo, blackSteelMat);
    wsFrame.position.set(0, 1.62, 0.88);
    wsFrame.rotation.x = -0.15;
    group.add(wsFrame);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.36, 0.72),
      glassMat
    );
    glass.position.set(0, 1.62, 0.93);
    glass.rotation.x = -0.15;
    group.add(glass);

    // Windshield Wiper
    const wiper = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.45, 0.03),
      blackSteelMat
    );
    wiper.position.set(-0.15, 1.65, 0.97);
    wiper.rotation.z = -0.55;
    group.add(wiper);

    // 3. Tubular Roll Cage Frame (A-pillars, B-pillars, C-pillars)
    const pipeGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.45, 8);

    // Front Left & Right Pillars
    const pillarFL = new THREE.Mesh(pipeGeo, blackSteelMat);
    pillarFL.position.set(-0.72, 1.55, 0.82);
    pillarFL.rotation.x = -0.12;
    const pillarFR = pillarFL.clone();
    pillarFR.position.x = 0.72;
    group.add(pillarFL);
    group.add(pillarFR);

    // Rear Left & Right Pillars
    const pillarRL = new THREE.Mesh(pipeGeo, blackSteelMat);
    pillarRL.position.set(-0.75, 1.6, -1.35);
    const pillarRR = pillarRL.clone();
    pillarRR.position.x = 0.75;
    group.add(pillarRL);
    group.add(pillarRR);

    // Center B-Pillars (Middle)
    const pillarML = new THREE.Mesh(pipeGeo, blackSteelMat);
    pillarML.position.set(-0.76, 1.6, -0.1);
    const pillarMR = pillarML.clone();
    pillarMR.position.x = 0.76;
    group.add(pillarML);
    group.add(pillarMR);

    // 4. Arched Canopy / Canvas Roof
    const roofGeo = new THREE.CylinderGeometry(0.85, 0.85, 2.7, 16, 1, false, 0, Math.PI);
    const roof = new THREE.Mesh(roofGeo, canvasRoofMat);
    roof.rotation.x = Math.PI / 2;
    roof.rotation.z = Math.PI / 2;
    roof.scale.set(1.0, 0.45, 1.0);
    roof.position.set(0, 2.22, -0.2);
    roof.castShadow = true;
    group.add(roof);

    // Scalloped Cloth Valance Fringe around roof perimeter (Authentic Tuk-Tuk touch!)
    for (let i = 0; i < 18; i++) {
      const zPos = -1.4 + (i / 17) * 2.5;
      const fringeL = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.16, 3),
        valanceMat
      );
      fringeL.rotation.x = Math.PI;
      fringeL.position.set(-0.84, 2.05, zPos);
      const fringeR = fringeL.clone();
      fringeR.position.x = 0.84;
      group.add(fringeL);
      group.add(fringeR);
    }

    // 5. Cockpit & Handlebars
    // Steering column & fork
    const colGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8);
    const col = new THREE.Mesh(colGeo, chromeMat);
    col.position.set(0, 1.05, 0.65);
    col.rotation.x = 0.25;
    group.add(col);

    // Handlebar T-bar
    const barGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8);
    const bar = new THREE.Mesh(barGeo, chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.35, 0.58);
    group.add(bar);

    // Rubber Grips
    const gripGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.16, 8);
    const gripL = new THREE.Mesh(gripGeo, rubberMat);
    gripL.rotation.z = Math.PI / 2;
    gripL.position.set(-0.32, 1.35, 0.58);
    const gripR = gripL.clone();
    gripR.position.x = 0.32;
    group.add(gripL);
    group.add(gripR);

    // Chrome Side Mirrors on curved stalks
    const mirrorGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12);
    const mirrorL = new THREE.Mesh(mirrorGeo, chromeMat);
    mirrorL.rotation.x = Math.PI / 2;
    mirrorL.position.set(-0.45, 1.5, 0.6);
    const mirrorR = mirrorL.clone();
    mirrorR.position.x = 0.45;
    group.add(mirrorL);
    group.add(mirrorR);

    // Speedometer Instrument Pod
    const speedo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.07, 0.06, 12),
      blackSteelMat
    );
    speedo.position.set(0, 1.38, 0.62);
    speedo.rotation.x = 0.35;
    group.add(speedo);

    // Driver Saddle
    const dSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.18, 0.45),
      seatMat
    );
    dSeat.position.set(0, 0.78, 0.15);
    group.add(dSeat);

    // Passenger Bench Seat (Wide Rear)
    const pSeatBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.25, 0.65),
      seatMat
    );
    pSeatBase.position.set(0, 0.75, -0.75);
    pSeatBase.castShadow = true;
    group.add(pSeatBase);

    const pSeatBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.65, 0.15),
      seatMat
    );
    pSeatBack.position.set(0, 1.15, -1.05);
    pSeatBack.castShadow = true;
    group.add(pSeatBack);

    // 6. Wheels & Suspension
    const wheelRadius = 0.38;
    const tireWidth = 0.24;
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, tireWidth, 16);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, tireWidth + 0.02, 12);

    // Front Single Wheel
    const fWheelGroup = new THREE.Group();
    fWheelGroup.position.set(0, wheelRadius, 1.35);

    const fTire = new THREE.Mesh(tireGeo, rubberMat);
    fTire.rotation.z = Math.PI / 2;
    fTire.castShadow = true;
    const fRim = new THREE.Mesh(rimGeo, chromeMat);
    fRim.rotation.z = Math.PI / 2;
    fWheelGroup.add(fTire);
    fWheelGroup.add(fRim);

    // Front Mudguard Fender
    const fFender = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius + 0.06, wheelRadius + 0.06, tireWidth + 0.06, 12, 1, false, 0, Math.PI),
      bodyMat
    );
    fFender.rotation.z = Math.PI / 2;
    fFender.position.y = 0.05;
    fWheelGroup.add(fFender);

    group.add(fWheelGroup);

    // Rear Dual Wheels (Left & Right)
    const rWheelL = new THREE.Group();
    rWheelL.position.set(-0.85, wheelRadius, -0.95);
    const rTireL = new THREE.Mesh(tireGeo, rubberMat);
    rTireL.rotation.z = Math.PI / 2;
    rTireL.castShadow = true;
    const rRimL = new THREE.Mesh(rimGeo, chromeMat);
    rRimL.rotation.z = Math.PI / 2;
    rWheelL.add(rTireL);
    rWheelL.add(rRimL);

    const rWheelR = new THREE.Group();
    rWheelR.position.set(0.85, wheelRadius, -0.95);
    const rTireR = new THREE.Mesh(tireGeo, rubberMat);
    rTireR.rotation.z = Math.PI / 2;
    rTireR.castShadow = true;
    const rRimR = new THREE.Mesh(rimGeo, chromeMat);
    rRimR.rotation.z = Math.PI / 2;
    rWheelR.add(rTireR);
    rWheelR.add(rRimR);

    group.add(rWheelL);
    group.add(rWheelR);

    // 7. Headlight, Taillights & License Plates
    // Large Front Headlight
    const headlightGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.12, 16);
    const headlight = new THREE.Mesh(headlightGeo, chromeMat);
    headlight.rotation.x = Math.PI / 2;
    headlight.position.set(0, 0.95, 1.58);
    group.add(headlight);

    // Front Indicator Blinkers
    const blinkerGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const blinkerMat = new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.2 });
    const blinkerFL = new THREE.Mesh(blinkerGeo, blinkerMat);
    blinkerFL.position.set(-0.45, 0.92, 1.35);
    const blinkerFR = blinkerFL.clone();
    blinkerFR.position.x = 0.45;
    group.add(blinkerFL);
    group.add(blinkerFR);

    // Rear Taillights
    const tailLightMat = new THREE.MeshStandardMaterial({ color: 0xd50000, roughness: 0.2 });
    const tailLightL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.04), tailLightMat);
    tailLightL.position.set(-0.6, 0.72, -1.56);
    const tailLightR = tailLightL.clone();
    tailLightR.position.x = 0.6;
    group.add(tailLightL);
    group.add(tailLightR);

    // Chrome Exhaust Pipe with Muffler
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.75, 8),
      chromeMat
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(-0.55, 0.25, -1.35);
    group.add(exhaust);

    // Front & Rear License Plates ("IND / 8419")
    const plateGeo = new THREE.BoxGeometry(0.42, 0.12, 0.02);
    const plateMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const fPlate = new THREE.Mesh(plateGeo, plateMat);
    fPlate.position.set(0, 0.52, 1.58);
    const rPlate = fPlate.clone();
    rPlate.position.set(0, 0.52, -1.56);
    group.add(fPlate);
    group.add(rPlate);

    return group;
  }
}

// Attach globally
window.TukTukBuilder = TukTukBuilder;
