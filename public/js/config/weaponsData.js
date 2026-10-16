/**
 * Hood Warfare - Weapon Loadouts & Combat Specifications
 * Compatible with Node.js and Browser
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WeaponsData = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const WEAPONS = {
    ar: {
      id: 'ar',
      displayName: 'STREET AK-47',
      category: 'primary',
      fireMode: 'auto',
      rpm: 620,
      fireDelay: 96, // ms
      baseDamage: 30,
      pellets: 1,
      falloffStart: 35,
      falloffEnd: 70,
      minDamageMult: 0.6,
      magSize: 30,
      reserveMax: 120,
      reloadTime: 2100, // ms
      hipSpread: 2.4, // deg
      adsSpread: 0.15,
      recoilPitch: 0.55,
      recoilYaw: 0.22,
      adsFov: 52,
      adsTime: 140, // ms
      moveSpeedMult: 0.95
    },
    smg: {
      id: 'smg',
      displayName: 'MAC-10 SMG',
      category: 'primary',
      fireMode: 'auto',
      rpm: 900,
      fireDelay: 66,
      baseDamage: 22,
      pellets: 1,
      falloffStart: 16,
      falloffEnd: 40,
      minDamageMult: 0.5,
      magSize: 32,
      reserveMax: 128,
      reloadTime: 1700,
      hipSpread: 1.6,
      adsSpread: 0.35,
      recoilPitch: 0.38,
      recoilYaw: 0.30,
      adsFov: 62,
      adsTime: 95,
      moveSpeedMult: 1.05
    },
    shotgun: {
      id: 'shotgun',
      displayName: 'TRENCH 12G',
      category: 'primary',
      fireMode: 'pump',
      rpm: 75,
      fireDelay: 800,
      baseDamage: 18,
      pellets: 8,
      falloffStart: 10,
      falloffEnd: 24,
      minDamageMult: 0.3,
      magSize: 8,
      reserveMax: 32,
      reloadTime: 2600,
      hipSpread: 4.2,
      adsSpread: 2.8,
      recoilPitch: 3.20,
      recoilYaw: 0.60,
      adsFov: 65,
      adsTime: 120,
      moveSpeedMult: 1.00
    },
    pistol: {
      id: 'pistol',
      displayName: 'GLOCK 19',
      category: 'secondary',
      fireMode: 'semi',
      rpm: 400,
      fireDelay: 150,
      baseDamage: 26,
      pellets: 1,
      falloffStart: 20,
      falloffEnd: 45,
      minDamageMult: 0.5,
      magSize: 15,
      reserveMax: 60,
      reloadTime: 1300,
      hipSpread: 1.5,
      adsSpread: 0.2,
      recoilPitch: 0.45,
      recoilYaw: 0.15,
      adsFov: 65,
      adsTime: 90,
      moveSpeedMult: 1.05
    }
  };

  const HITBOX_MULTIPLIERS = {
    head: 1.5,
    torso: 1.0,
    limbs: 0.8
  };

  /**
   * Computes weapon damage accounting for distance falloff and hitbox zone
   */
  function calculateDamage(weaponId, distance, hitZone) {
    const weapon = WEAPONS[weaponId] || WEAPONS.ar;
    let distMult = 1.0;
    if (distance <= weapon.falloffStart) {
      distMult = 1.0;
    } else if (distance >= weapon.falloffEnd) {
      distMult = weapon.minDamageMult;
    } else {
      const t = (distance - weapon.falloffStart) / (weapon.falloffEnd - weapon.falloffStart);
      distMult = 1.0 - (1.0 - weapon.minDamageMult) * t;
    }

    const zoneMult = HITBOX_MULTIPLIERS[hitZone] || 1.0;
    const finalDamage = Math.round(weapon.baseDamage * distMult * zoneMult);
    return Math.max(1, finalDamage);
  }

  return {
    WEAPONS,
    HITBOX_MULTIPLIERS,
    calculateDamage
  };
}));
