/**
 * Hood Warfare - Socket.io Network Client & Standalone Engine
 * Handles authoritative server rooms, 20Hz transform sync, and robust
 * client-side bot simulation fallback for instant browser play out-of-the-box.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NetworkClient = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class NetworkClient {
    constructor() {
      this.socket = null;
      this.localPlayer = null;
      this.weaponSystem = null;
      this.uiManager = null;
      this.remotePlayers = {}; // id -> RemotePlayer instance
      this.app = null;
      this.mapData = null;
      this.soundSynth = null;

      this.currentServerId = 'server-1';
      this.currentTeam = 'crips';
      this.currentLoadoutId = 'ar';
      this.callsign = 'HOOD_SOLDIER';
      this.inGame = false;
      this.standaloneMode = false;

      // Standalone simulation state
      this.standaloneScores = { crips: 0, bloods: 0 };
      this.standaloneTimer = 600;
      this.standaloneMatchOver = false;
      this.standaloneBots = {};
      this.localPlayerKills = 0;
      this.localPlayerDeaths = 0;
      this.activeCripSide = 'west';
      this.activeBloodSide = 'east';
      this.lastSpawnFlipCheck = 0;

      // 20Hz local transform emitter interval
      this.emitInterval = null;

      this.initSocket();
    }

    initSocket() {
      if (typeof io !== 'undefined') {
        const targetUrl = window.HOOD_SERVER_URL || undefined;
        try {
          this.socket = io(targetUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            timeout: 3000
          });
        } catch (e) {
          console.warn('[NetworkClient] Socket initialization failed:', e);
          this.standaloneMode = true;
          return;
        }
      } else {
        console.warn('[NetworkClient] Socket.io library not loaded, running in standalone mode.');
        this.standaloneMode = true;
        return;
      }

      this.socket.on('connect', () => {
        console.log('[NetworkClient] Connected to server with ID:', this.socket.id);
        this.standaloneMode = false;
      });

      this.socket.on('connect_error', () => {
        // Automatically allow standalone matches if socket backend is offline/edge-hosted
        this.standaloneMode = true;
      });

      this.socket.on('lobby:list', (serverList) => {
        if (this.uiManager) {
          this.uiManager.updateServerBrowser(serverList);
        }
      });

      this.socket.on('world:state', (data) => {
        if (!this.standaloneMode) {
          this.handleWorldState(data);
        }
      });

      this.socket.on('combat:fx', (data) => {
        if (!this.standaloneMode) {
          this.handleCombatFx(data);
        }
      });

      this.socket.on('combat:hitConfirm', (data) => {
        if (this.uiManager) {
          this.uiManager.showHitmarker(data.isHeadshot);
        }
        if (this.soundSynth) {
          this.soundSynth.playHitmarker(data.isHeadshot);
        }
      });

      this.socket.on('player:damaged', (data) => {
        if (this.localPlayer) {
          this.localPlayer.hp = data.hp;
        }
        if (this.uiManager) {
          this.uiManager.showDamageVignette(data.fromPos, this.localPlayer ? this.localPlayer.pos : null);
        }
      });

      this.socket.on('player:killed', (data) => {
        if (this.uiManager) {
          this.uiManager.addKillfeedEntry(data);
        }
        if (this.localPlayer && data.victimId === this.socket.id) {
          this.localPlayer.alive = false;
          if (this.uiManager) {
            this.uiManager.showDeathScreen(data.killerName, 3);
          }
        }
      });

      this.socket.on('player:respawn', (data) => {
        if (this.localPlayer) {
          this.localPlayer.respawn(data.pos, data.rotY);
        }
        if (this.uiManager) {
          this.uiManager.hideDeathScreen();
        }
      });

      this.socket.on('game:spawnsFlipped', (data) => {
        if (this.uiManager) {
          this.uiManager.showSpawnsFlippedBanner();
        }
      });

      this.socket.on('match:over', (data) => {
        if (this.uiManager) {
          this.uiManager.showMatchOver(data.winner, data.scores);
        }
      });

      this.socket.on('match:restart', (data) => {
        if (this.uiManager) {
          this.uiManager.hideMatchOver();
        }
      });
    }

    bindReferences(app, localPlayer, weaponSystem, uiManager, mapData, soundSynth) {
      this.app = app;
      this.localPlayer = localPlayer;
      this.weaponSystem = weaponSystem;
      this.uiManager = uiManager;
      this.mapData = mapData;
      this.soundSynth = soundSynth;
    }

    joinServer(serverId, callsign, callback) {
      this.currentServerId = serverId;
      this.callsign = callsign || 'HOOD_SOLDIER';

      if (this.socket && this.socket.connected) {
        this.socket.emit('lobby:joinServer', { serverId, callsign: this.callsign }, (res) => {
          if (callback) callback(res);
        });
      } else {
        this.standaloneMode = true;
        if (callback) {
          callback({
            success: true,
            serverId: serverId,
            teamCounts: { crips: 4, bloods: 4 }
          });
        }
      }
    }

    joinTeam(team, loadoutId, callback) {
      this.currentTeam = team;
      this.currentLoadoutId = loadoutId;

      if (this.socket && this.socket.connected) {
        this.socket.emit('game:joinTeam', { team, loadoutId }, (res) => {
          if (res && res.success) {
            this.inGame = true;
            this.standaloneMode = false;
            this.startTransformEmitter();
          }
          if (callback) callback(res);
        });
      } else {
        // Standalone Bot Mode
        this.standaloneMode = true;
        this.inGame = true;
        this.initStandaloneMatch(team, loadoutId);
        const spawn = this.getStandaloneSpawn(team);
        if (callback) {
          callback({
            success: true,
            spawn: spawn.pos,
            rotY: spawn.rotY,
            team: team,
            loadoutId: loadoutId,
            scores: this.standaloneScores,
            timer: Math.ceil(this.standaloneTimer)
          });
        }
      }
    }

    leaveMatch() {
      this.inGame = false;
      this.stopTransformEmitter();
      if (this.socket && this.socket.connected) {
        this.socket.emit('game:leave', { serverId: this.currentServerId });
      }
      for (const id in this.remotePlayers) {
        if (this.remotePlayers[id] && typeof this.remotePlayers[id].destroy === 'function') {
          this.remotePlayers[id].destroy();
        }
      }
      this.remotePlayers = {};
      this.standaloneBots = {};
      this.currentTeam = null;
    }

    initStandaloneMatch(team, loadoutId) {
      this.standaloneScores = { crips: 0, bloods: 0 };
      this.standaloneTimer = 600;
      this.standaloneMatchOver = false;
      this.localPlayerKills = 0;
      this.localPlayerDeaths = 0;
      this.lastSpawnFlipCheck = 0;
      this.activeCripSide = 'west';
      this.activeBloodSide = 'east';

      const CRIP_BOT_NAMES = ['[BOT] Crip_Loc', '[BOT] Blue_Ray', '[BOT] Killa_C', '[BOT] West_Tray'];
      const BLOOD_BOT_NAMES = ['[BOT] Blood_Hawk', '[BOT] Red_Ogg', '[BOT] Suge_Bot', '[BOT] East_Rider'];
      const BOT_WEAPONS = ['ar', 'smg', 'shotgun', 'ar'];

      this.standaloneBots = {};
      let botIndex = 1;
      const otherTeam = (team === 'crips') ? 'bloods' : 'crips';

      // 3 teammate bots
      for (let i = 0; i < 3; i++) {
        const id = `bot-${botIndex++}`;
        const namePool = team === 'crips' ? CRIP_BOT_NAMES : BLOOD_BOT_NAMES;
        const name = namePool[i % namePool.length];
        const sp = this.getStandaloneSpawn(team);
        const wId = BOT_WEAPONS[i % BOT_WEAPONS.length];
        const laneIdx = i % (this.mapData.BOT_LANES ? this.mapData.BOT_LANES.length : 3);
        const lane = this.mapData.BOT_LANES[laneIdx];
        const targetWpIndex = team === 'crips' ? 1 : lane.length - 2;
        const dir = team === 'crips' ? 1 : -1;

        this.standaloneBots[id] = {
          id,
          name,
          team,
          weaponId: wId,
          pos: [sp.pos[0] + (Math.random() - 0.5) * 2, sp.pos[1], sp.pos[2] + (Math.random() - 0.5) * 2],
          rotY: sp.rotY,
          pitch: 0,
          hp: 100,
          maxHp: 100,
          state: 'run',
          alive: true,
          kills: 0,
          deaths: 0,
          laneIndex: laneIdx,
          targetWpIndex,
          dir,
          lastShotTime: 0,
          respawnTimer: 0
        };
      }

      // 4 enemy bots
      for (let i = 0; i < 4; i++) {
        const id = `bot-${botIndex++}`;
        const namePool = otherTeam === 'crips' ? CRIP_BOT_NAMES : BLOOD_BOT_NAMES;
        const name = namePool[i % namePool.length];
        const sp = this.getStandaloneSpawn(otherTeam);
        const wId = BOT_WEAPONS[i % BOT_WEAPONS.length];
        const laneIdx = i % (this.mapData.BOT_LANES ? this.mapData.BOT_LANES.length : 3);
        const lane = this.mapData.BOT_LANES[laneIdx];
        const targetWpIndex = otherTeam === 'crips' ? 1 : lane.length - 2;
        const dir = otherTeam === 'crips' ? 1 : -1;

        this.standaloneBots[id] = {
          id,
          name,
          team: otherTeam,
          weaponId: wId,
          pos: [sp.pos[0] + (Math.random() - 0.5) * 2, sp.pos[1], sp.pos[2] + (Math.random() - 0.5) * 2],
          rotY: sp.rotY,
          pitch: 0,
          hp: 100,
          maxHp: 100,
          state: 'run',
          alive: true,
          kills: 0,
          deaths: 0,
          laneIndex: laneIdx,
          targetWpIndex,
          dir,
          lastShotTime: 0,
          respawnTimer: 0
        };
      }
    }

    getStandaloneSpawn(team) {
      const isCrip = team === 'crips';
      const side = isCrip ? this.activeCripSide : this.activeBloodSide;
      const spawnList = side === 'west' ? this.mapData.WEST_SPAWNS : this.mapData.EAST_SPAWNS;
      const idx = Math.floor(Math.random() * spawnList.length);
      const sp = spawnList[idx];
      return {
        pos: [sp.pos[0] + (Math.random() - 0.5) * 1.5, sp.pos[1], sp.pos[2] + (Math.random() - 0.5) * 1.5],
        rotY: sp.rotY
      };
    }

    startTransformEmitter() {
      if (this.emitInterval) clearInterval(this.emitInterval);
      // 20Hz (every 50ms)
      this.emitInterval = setInterval(() => {
        if (!this.inGame || !this.localPlayer || !this.localPlayer.alive || !this.socket || !this.socket.connected) return;

        this.socket.emit('player:move', {
          pos: this.localPlayer.pos,
          rotY: this.localPlayer.rotY,
          pitch: this.localPlayer.pitch,
          state: this.localPlayer.state,
          weaponId: this.weaponSystem ? this.weaponSystem.activeWeaponId : 'ar'
        });
      }, 50);
    }

    sendFire(combatData) {
      if (!this.inGame) return;

      if (!this.standaloneMode && this.socket && this.socket.connected) {
        this.socket.emit('combat:fire', combatData);
        return;
      }

      // Standalone Hit Registration
      if (combatData.hitTargetId && this.standaloneBots && this.standaloneBots[combatData.hitTargetId]) {
        const victim = this.standaloneBots[combatData.hitTargetId];
        if (victim.alive) {
          const dx = combatData.hitPoint[0] - combatData.origin[0];
          const dy = combatData.hitPoint[1] - combatData.origin[1];
          const dz = combatData.hitPoint[2] - combatData.origin[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const isHead = combatData.hitZone === 'head';
          const damage = (typeof WeaponsData !== 'undefined' && WeaponsData.calculateDamage)
            ? WeaponsData.calculateDamage(combatData.weaponId, dist, combatData.hitZone)
            : 30;

          victim.hp = Math.max(0, victim.hp - damage);

          if (this.uiManager) {
            this.uiManager.showHitmarker(isHead);
          }
          if (this.soundSynth) {
            this.soundSynth.playHitmarker(isHead);
          }

          if (victim.hp <= 0) {
            victim.alive = false;
            victim.deaths++;
            this.localPlayerKills++;
            this.standaloneScores[this.currentTeam]++;
            victim.respawnTimer = 3.0;

            if (this.uiManager) {
              this.uiManager.addKillfeedEntry({
                killerName: this.callsign || 'YOU',
                killerTeam: this.currentTeam,
                victimName: victim.name,
                victimTeam: victim.team,
                weaponId: combatData.weaponId,
                isHeadshot: isHead
              });
            }

            if (this.standaloneScores.crips >= 75 || this.standaloneScores.bloods >= 75) {
              this.triggerStandaloneMatchOver();
            }
          }
        }
      }
    }

    updateStandalone(dt) {
      if (!this.inGame || this.standaloneMatchOver) return;

      const now = Date.now();
      this.standaloneTimer = Math.max(0, this.standaloneTimer - dt);
      if (this.standaloneTimer <= 0) {
        this.triggerStandaloneMatchOver();
        return;
      }

      // Check spawn flips
      if (now - this.lastSpawnFlipCheck > 1000) {
        this.lastSpawnFlipCheck = now;
        let cripPushers = 0;
        let bloodPushers = 0;
        if (this.localPlayer && this.localPlayer.alive) {
          if (this.currentTeam === 'crips' && this.localPlayer.pos[0] > 38) cripPushers++;
          if (this.currentTeam === 'bloods' && this.localPlayer.pos[0] < -38) bloodPushers++;
        }
        for (const id in this.standaloneBots) {
          const b = this.standaloneBots[id];
          if (!b.alive) continue;
          if (b.team === 'crips' && b.pos[0] > 38) cripPushers++;
          if (b.team === 'bloods' && b.pos[0] < -38) bloodPushers++;
        }

        let flipped = false;
        if (cripPushers >= 2 && this.activeCripSide === 'west') {
          this.activeCripSide = 'east';
          this.activeBloodSide = 'west';
          flipped = true;
        } else if (bloodPushers >= 2 && this.activeBloodSide === 'east') {
          this.activeCripSide = 'west';
          this.activeBloodSide = 'east';
          flipped = true;
        }
        if (flipped && this.uiManager) {
          this.uiManager.showSpawnsFlippedBanner();
        }
      }

      // Update bot behaviors
      for (const id in this.standaloneBots) {
        const bot = this.standaloneBots[id];

        // Respawn timer
        if (!bot.alive) {
          bot.respawnTimer -= dt;
          if (bot.respawnTimer <= 0) {
            bot.alive = true;
            bot.hp = 100;
            const sp = this.getStandaloneSpawn(bot.team);
            bot.pos = sp.pos;
            bot.rotY = sp.rotY;
            bot.pitch = 0;
            bot.state = 'idle';
            const lane = this.mapData.BOT_LANES[bot.laneIndex];
            bot.targetWpIndex = bot.team === 'crips' ? 1 : lane.length - 2;
            bot.dir = bot.team === 'crips' ? 1 : -1;
          }
          continue;
        }

        // 1. Scan for nearest visible enemy (Player or opposing bot)
        let nearestEnemy = null;
        let nearestDist = 38;

        // Check local player
        if (this.localPlayer && this.localPlayer.alive && this.currentTeam !== bot.team) {
          const dx = this.localPlayer.pos[0] - bot.pos[0];
          const dy = (this.localPlayer.pos[1] + 1.2) - (bot.pos[1] + 1.4);
          const dz = this.localPlayer.pos[2] - bot.pos[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < nearestDist) {
            const eyeBot = [bot.pos[0], bot.pos[1] + 1.4, bot.pos[2]];
            const eyeTarget = [this.localPlayer.pos[0], this.localPlayer.pos[1] + 1.2, this.localPlayer.pos[2]];
            if (this.mapData.checkLineOfSight(eyeBot, eyeTarget)) {
              nearestDist = dist;
              nearestEnemy = {
                id: 'local',
                isLocal: true,
                pos: this.localPlayer.pos,
                team: this.currentTeam
              };
            }
          }
        }

        // Check other bots
        for (const otherId in this.standaloneBots) {
          const other = this.standaloneBots[otherId];
          if (!other.alive || other.team === bot.team) continue;

          const dx = other.pos[0] - bot.pos[0];
          const dy = (other.pos[1] + 1.2) - (bot.pos[1] + 1.4);
          const dz = other.pos[2] - bot.pos[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < nearestDist) {
            const eyeBot = [bot.pos[0], bot.pos[1] + 1.4, bot.pos[2]];
            const eyeTarget = [other.pos[0], other.pos[1] + 1.2, other.pos[2]];
            if (this.mapData.checkLineOfSight(eyeBot, eyeTarget)) {
              nearestDist = dist;
              nearestEnemy = other;
            }
          }
        }

        // 2. Combat vs Patrol
        if (nearestEnemy) {
          const dx = nearestEnemy.pos[0] - bot.pos[0];
          const dy = (nearestEnemy.pos[1] + 1.2) - (bot.pos[1] + 1.4);
          const dz = nearestEnemy.pos[2] - bot.pos[2];
          const horizDist = Math.sqrt(dx * dx + dz * dz) || 1e-5;

          bot.rotY = (Math.atan2(-dx, -dz) * 180 / Math.PI);
          bot.pitch = (Math.atan2(dy, horizDist) * 180 / Math.PI);
          bot.state = 'crouch';

          const wConfig = (typeof WeaponsData !== 'undefined' && WeaponsData.WEAPONS && WeaponsData.WEAPONS[bot.weaponId]) || { fireDelay: 100, baseDamage: 25 };
          const fireInterval = Math.max(wConfig.fireDelay * 1.5, 120);

          if (now - bot.lastShotTime >= fireInterval) {
            bot.lastShotTime = now;

            const origin = [bot.pos[0], bot.pos[1] + 1.4, bot.pos[2]];
            const aimSpread = (Math.random() - 0.5) * 0.08;
            const dirX = dx / nearestDist + aimSpread;
            const dirY = dy / nearestDist + (Math.random() - 0.5) * 0.05;
            const dirZ = dz / nearestDist + aimSpread;
            const hitPoint = [nearestEnemy.pos[0], nearestEnemy.pos[1] + 1.2, nearestEnemy.pos[2]];

            // Muzzle flash / gunshot audio
            if (this.soundSynth && this.localPlayer) {
              const pPos = this.localPlayer.pos;
              const soundDist = Math.hypot(origin[0] - pPos[0], origin[1] - pPos[1], origin[2] - pPos[2]);
              this.soundSynth.playGunshot(bot.weaponId || 'ar', soundDist);
            }

            // Spawn tracer
            if (this.weaponSystem) {
              this.weaponSystem.spawnTracer(new pc.Vec3(origin[0], origin[1], origin[2]), hitPoint);
            }

            // Hit test
            const hitChance = Math.max(0.35, 0.85 - (nearestDist / 40) * 0.45);
            if (Math.random() < hitChance) {
              const isHead = Math.random() < 0.2;
              const zone = isHead ? 'head' : (Math.random() < 0.7 ? 'torso' : 'limbs');
              const damage = (typeof WeaponsData !== 'undefined' && WeaponsData.calculateDamage)
                ? WeaponsData.calculateDamage(bot.weaponId, nearestDist, zone)
                : 25;

              if (nearestEnemy.isLocal) {
                // Damage local player
                if (this.localPlayer && this.localPlayer.alive) {
                  this.localPlayer.hp = Math.max(0, this.localPlayer.hp - damage);
                  if (this.uiManager) {
                    this.uiManager.showDamageVignette(origin, this.localPlayer.pos);
                  }
                  if (this.localPlayer.hp <= 0) {
                    this.localPlayer.alive = false;
                    this.localPlayerDeaths++;
                    bot.kills++;
                    this.standaloneScores[bot.team]++;
                    if (this.uiManager) {
                      this.uiManager.addKillfeedEntry({
                        killerName: bot.name,
                        killerTeam: bot.team,
                        victimName: this.callsign || 'YOU',
                        victimTeam: this.currentTeam,
                        weaponId: bot.weaponId,
                        isHeadshot: isHead
                      });
                      this.uiManager.showDeathScreen(bot.name, 3);
                    }
                    setTimeout(() => {
                      if (!this.inGame || this.standaloneMatchOver) return;
                      const newSp = this.getStandaloneSpawn(this.currentTeam);
                      if (this.localPlayer) {
                        this.localPlayer.respawn(newSp.pos, newSp.rotY);
                      }
                      if (this.uiManager) {
                        this.uiManager.hideDeathScreen();
                      }
                    }, 3000);
                  }
                }
              } else {
                // Damage opposing bot
                const victim = nearestEnemy;
                victim.hp = Math.max(0, victim.hp - damage);
                if (victim.hp <= 0) {
                  victim.alive = false;
                  victim.deaths++;
                  bot.kills++;
                  this.standaloneScores[bot.team]++;
                  victim.respawnTimer = 3.0;

                  if (this.uiManager) {
                    this.uiManager.addKillfeedEntry({
                      killerName: bot.name,
                      killerTeam: bot.team,
                      victimName: victim.name,
                      victimTeam: victim.team,
                      weaponId: bot.weaponId,
                      isHeadshot: isHead
                    });
                  }
                }
              }

              // Win check
              if (this.standaloneScores.crips >= 75 || this.standaloneScores.bloods >= 75) {
                this.triggerStandaloneMatchOver();
                return;
              }
            }
          }
        } else {
          // Patrol waypoint along lane
          const lane = this.mapData.BOT_LANES[bot.laneIndex];
          const targetWp = lane[bot.targetWpIndex];
          if (targetWp) {
            const dx = targetWp.x - bot.pos[0];
            const dz = targetWp.z - bot.pos[2];
            const distToWp = Math.sqrt(dx * dx + dz * dz);

            if (distToWp < 1.5) {
              bot.targetWpIndex += bot.dir;
              if (bot.targetWpIndex >= lane.length) {
                bot.targetWpIndex = lane.length - 2;
                bot.dir = -1;
              } else if (bot.targetWpIndex < 0) {
                bot.targetWpIndex = 1;
                bot.dir = 1;
              }
            } else {
              const moveSpeed = 5.2;
              const moveX = (dx / distToWp) * moveSpeed * dt;
              const moveZ = (dz / distToWp) * moveSpeed * dt;
              bot.pos[0] += moveX;
              bot.pos[2] += moveZ;
              bot.rotY = Math.atan2(-dx, -dz) * 180 / Math.PI;
              bot.state = 'run';
            }
          }
        }
      }

      // Build state packet for 3D world state renderer
      const playersPacket = {};

      // Add local player
      if (this.localPlayer) {
        playersPacket['local'] = {
          name: this.callsign || 'YOU',
          pos: this.localPlayer.pos,
          rotY: this.localPlayer.rotY,
          pitch: this.localPlayer.pitch,
          hp: this.localPlayer.hp,
          team: this.currentTeam,
          state: this.localPlayer.state,
          weaponId: this.weaponSystem ? this.weaponSystem.activeWeaponId : 'ar',
          kills: this.localPlayerKills,
          deaths: this.localPlayerDeaths
        };
      }

      // Add all bots
      for (const id in this.standaloneBots) {
        const b = this.standaloneBots[id];
        playersPacket[id] = {
          name: b.name,
          pos: b.pos,
          rotY: b.rotY,
          pitch: b.pitch,
          hp: b.hp,
          team: b.team,
          state: b.state,
          weaponId: b.weaponId,
          kills: b.kills,
          deaths: b.deaths
        };
      }

      this.handleWorldState({
        players: playersPacket,
        scores: this.standaloneScores,
        timer: Math.ceil(this.standaloneTimer)
      });
    }

    triggerStandaloneMatchOver() {
      if (this.standaloneMatchOver) return;
      this.standaloneMatchOver = true;
      const winner = this.standaloneScores.crips > this.standaloneScores.bloods ? 'crips' : 'bloods';
      if (this.uiManager) {
        this.uiManager.showMatchOver(winner, this.standaloneScores);
      }
      setTimeout(() => {
        if (!this.inGame) return;
        this.standaloneScores = { crips: 0, bloods: 0 };
        this.standaloneTimer = 600;
        this.standaloneMatchOver = false;
        if (this.uiManager) {
          this.uiManager.hideMatchOver();
        }
        const sp = this.getStandaloneSpawn(this.currentTeam);
        if (this.localPlayer) {
          this.localPlayer.respawn(sp.pos, sp.rotY);
        }
      }, 8000);
    }

    handleWorldState(data) {
      if (!data || !data.players) return;

      // Update UI Scores & Timer
      if (this.uiManager) {
        this.uiManager.updateScores(data.scores, data.timer);
        this.uiManager.updateScoreboard(data.players);
      }

      // Track active player IDs for cleanup
      const activeIds = new Set();

      for (const id in data.players) {
        const pData = data.players[id];
        activeIds.add(id);

        // Skip local player
        if ((this.socket && id === this.socket.id) || id === 'local') {
          if (this.localPlayer && !this.standaloneMode) {
            // Update authoritative health & stats in multiplayer mode
            this.localPlayer.hp = pData.hp;
          }
          continue;
        }

        // Remote player entity management
        if (!this.remotePlayers[id]) {
          if (this.app && typeof RemotePlayer !== 'undefined') {
            this.remotePlayers[id] = new RemotePlayer(this.app, id, pData, this.mapData);
          }
        } else {
          this.remotePlayers[id].updateNetworkState(pData);
        }
      }

      // Remove disconnected remote players
      for (const id in this.remotePlayers) {
        if (!activeIds.has(id)) {
          this.remotePlayers[id].destroy();
          delete this.remotePlayers[id];
        }
      }

      // Keep WeaponSystem's remote targets up to date
      if (this.weaponSystem) {
        this.weaponSystem.setRemotePlayers(this.remotePlayers);
      }
    }

    handleCombatFx(data) {
      if (!data || !this.app) return;

      // Don't duplicate local player's own gunshot / tracer
      if (this.socket && data.shooterId === this.socket.id) return;

      // Play spatial gunshot sound
      if (this.soundSynth && this.localPlayer) {
        const localPos = this.localPlayer.pos;
        const dx = data.origin[0] - localPos[0];
        const dy = data.origin[1] - localPos[1];
        const dz = data.origin[2] - localPos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        this.soundSynth.playGunshot(data.weaponId || 'ar', dist);
      }

      // Spawn remote tracer
      if (this.weaponSystem) {
        const start = new pc.Vec3(data.origin[0], data.origin[1], data.origin[2]);
        this.weaponSystem.spawnTracer(start, data.hitPoint);
      }
    }

    update(dt) {
      if (this.standaloneMode && this.inGame) {
        this.updateStandalone(dt);
      }

      // Update all remote players
      const cam = this.localPlayer ? this.localPlayer.camera : null;
      for (const id in this.remotePlayers) {
        this.remotePlayers[id].update(dt, cam, this.localPlayer);
      }
    }
  }

  return NetworkClient;
}));
