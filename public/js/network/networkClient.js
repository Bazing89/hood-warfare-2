/**
 * Hood Warfare - Socket.io Network Client Wrapper
 * Handles server browser state, 20Hz local player transform emission, and authoritative server events
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

      this.currentServerId = null;
      this.currentTeam = null;
      this.inGame = false;

      // 20Hz local transform emitter interval
      this.emitInterval = null;

      this.initSocket();
    }

    initSocket() {
      // Connect to origin socket.io server (or custom backend URL if specified)
      if (typeof io !== 'undefined') {
        const targetUrl = window.HOOD_SERVER_URL || undefined;
        this.socket = io(targetUrl, { reconnection: true, reconnectionDelay: 1000 });
      } else {
        console.error('[NetworkClient] Socket.io library not loaded!');
        return;
      }

      this.socket.on('connect', () => {
        console.log('[NetworkClient] Connected to server with ID:', this.socket.id);
      });

      this.socket.on('lobby:list', (serverList) => {
        if (this.uiManager) {
          this.uiManager.updateServerBrowser(serverList);
        }
      });

      this.socket.on('world:state', (data) => {
        this.handleWorldState(data);
      });

      this.socket.on('combat:fx', (data) => {
        this.handleCombatFx(data);
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
      if (!this.socket) return;
      this.currentServerId = serverId;
      this.socket.emit('lobby:joinServer', { serverId, callsign }, (res) => {
        if (callback) callback(res);
      });
    }

    joinTeam(team, loadoutId, callback) {
      if (!this.socket) return;
      this.currentTeam = team;
      this.socket.emit('game:joinTeam', { team, loadoutId }, (res) => {
        if (res.success) {
          this.inGame = true;
          this.startTransformEmitter();
        }
        if (callback) callback(res);
      });
    }

    startTransformEmitter() {
      if (this.emitInterval) clearInterval(this.emitInterval);
      // 20Hz (every 50ms)
      this.emitInterval = setInterval(() => {
        if (!this.inGame || !this.localPlayer || !this.localPlayer.alive || !this.socket) return;

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
      if (!this.socket || !this.inGame) return;
      this.socket.emit('combat:fire', combatData);
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
        if (this.socket && id === this.socket.id) {
          if (this.localPlayer) {
            // Update authoritative health & stats
            this.localPlayer.hp = pData.hp;
          }
          continue;
        }

        // Remote player entity management
        if (!this.remotePlayers[id]) {
          if (this.app && RemotePlayer) {
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
      // Update all remote players
      const cam = this.localPlayer ? this.localPlayer.camera : null;
      for (const id in this.remotePlayers) {
        this.remotePlayers[id].update(dt, cam, this.localPlayer);
      }
    }
  }

  return NetworkClient;
}));
