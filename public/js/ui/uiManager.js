/**
 * Hood Warfare - UI Manager
 * Controls DOM Screens (Server Browser -> Faction & Loadout Select -> Active HUD),
 * Killfeed, Dynamic Crosshair, Hitmarker, Directional Damage Vignette, and Scoreboard Modal.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UIManager = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  class UIManager {
    constructor() {
      this.networkClient = null;
      this.localPlayer = null;
      this.weaponSystem = null;

      this.selectedServerId = 'server-1';
      this.selectedTeam = 'crips';
      this.selectedLoadout = 'ar';
      this.callsign = 'HOOD_SOLDIER_' + Math.floor(Math.random() * 899 + 100);

      this.currentScreen = 'browser'; // 'browser' | 'team-select' | 'hud'
      this.isScoreboardOpen = false;

      this.cacheDomElements();
      this.initEvents();
    }

    cacheDomElements() {
      // Screens
      this.screenBrowser = document.getElementById('screen-server-browser');
      this.screenTeamSelect = document.getElementById('screen-team-select');
      this.screenHud = document.getElementById('screen-hud');

      // Server Browser elements
      this.callsignInput = document.getElementById('input-callsign');
      this.serverTableBody = document.getElementById('server-table-body');

      // Team Select elements
      this.btnCrips = document.getElementById('card-crips');
      this.btnBloods = document.getElementById('card-bloods');
      this.cripsCountEl = document.getElementById('crips-count-label');
      this.bloodsCountEl = document.getElementById('bloods-count-label');
      this.balanceWarningEl = document.getElementById('team-balance-warning');
      this.btnDeploy = document.getElementById('btn-deploy');

      // HUD elements
      this.hudTimer = document.getElementById('hud-timer');
      this.scoreCripsBar = document.getElementById('score-crips-bar');
      this.scoreBloodsBar = document.getElementById('score-bloods-bar');
      this.scoreCripsVal = document.getElementById('score-crips-val');
      this.scoreBloodsVal = document.getElementById('score-bloods-val');

      this.killfeedContainer = document.getElementById('killfeed-container');
      this.crosshair = document.getElementById('crosshair');
      this.hitmarker = document.getElementById('hitmarker');
      this.damageVignette = document.getElementById('damage-vignette');
      this.clickToPlayPrompt = document.getElementById('click-to-play-prompt');

      this.hudHpVal = document.getElementById('hud-hp-val');
      this.hudHpBar = document.getElementById('hud-hp-bar');
      this.hudFactionBadge = document.getElementById('hud-faction-badge');
      this.hudPosture = document.getElementById('hud-posture');

      this.hudWeaponName = document.getElementById('hud-weapon-name');
      this.hudAmmoMag = document.getElementById('hud-ammo-mag');
      this.hudAmmoReserve = document.getElementById('hud-ammo-reserve');
      this.hudReloadBar = document.getElementById('hud-reload-bar');

      // Modals / Overlays
      this.modalScoreboard = document.getElementById('modal-scoreboard');
      this.sbCripsList = document.getElementById('sb-crips-list');
      this.sbBloodsList = document.getElementById('sb-bloods-list');

      this.spawnsFlippedBanner = document.getElementById('banner-spawns-flipped');
      this.deathScreen = document.getElementById('death-screen');
      this.deathKiller = document.getElementById('death-killer');
      this.deathTimer = document.getElementById('death-timer');

      this.matchOverScreen = document.getElementById('match-over-screen');
      this.matchOverTitle = document.getElementById('match-over-title');
      this.matchOverScores = document.getElementById('match-over-scores');

      if (this.callsignInput) {
        this.callsignInput.value = this.callsign;
      }
    }

    bindReferences(networkClient, localPlayer, weaponSystem) {
      this.networkClient = networkClient;
      this.localPlayer = localPlayer;
      this.weaponSystem = weaponSystem;
    }

    requestPointerLock() {
      const canvas = document.querySelector('canvas') || document.body;
      if (canvas && canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    }

    initEvents() {
      // Callsign change
      if (this.callsignInput) {
        this.callsignInput.addEventListener('input', (e) => {
          this.callsign = e.target.value.trim() || 'SOLDIER';
        });
      }

      // Faction Card selection
      if (this.btnCrips) {
        this.btnCrips.addEventListener('click', () => {
          this.selectedTeam = 'crips';
          this.btnCrips.classList.add('selected');
          if (this.btnBloods) this.btnBloods.classList.remove('selected');
        });
      }

      if (this.btnBloods) {
        this.btnBloods.addEventListener('click', () => {
          this.selectedTeam = 'bloods';
          this.btnBloods.classList.add('selected');
          if (this.btnCrips) this.btnCrips.classList.remove('selected');
        });
      }

      // Loadout selector cards
      const loadoutCards = document.querySelectorAll('.loadout-card');
      loadoutCards.forEach(card => {
        card.addEventListener('click', () => {
          loadoutCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedLoadout = card.getAttribute('data-loadout');
        });
      });

      // Deploy Button: Synchronously request pointer lock in user click gesture!
      if (this.btnDeploy) {
        this.btnDeploy.addEventListener('click', () => {
          this.requestPointerLock();
          this.deployToBattle();
        });
      }

      // Click to play prompt or clicking anywhere while in game
      if (this.clickToPlayPrompt) {
        this.clickToPlayPrompt.addEventListener('click', () => {
          this.requestPointerLock();
        });
      }

      window.addEventListener('click', () => {
        if (this.currentScreen === 'hud' && !document.pointerLockElement) {
          this.requestPointerLock();
        }
      });

      // Pointer lock change listener
      document.addEventListener('pointerlockchange', () => {
        if (this.clickToPlayPrompt) {
          const locked = !!document.pointerLockElement;
          this.clickToPlayPrompt.style.display = (this.currentScreen === 'hud' && !locked) ? 'flex' : 'none';
        }
      });

      // Tab Scoreboard Key & M key
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Tab') {
          e.preventDefault();
          this.showScoreboard(true);
        }
        if (e.code === 'KeyM' && this.currentScreen === 'hud') {
          this.showTeamSelect();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Tab') {
          e.preventDefault();
          this.showScoreboard(false);
        }
      });
    }

    showScreen(screenName) {
      this.currentScreen = screenName;
      if (this.screenBrowser) this.screenBrowser.style.display = (screenName === 'browser') ? 'flex' : 'none';
      if (this.screenTeamSelect) this.screenTeamSelect.style.display = (screenName === 'team-select') ? 'flex' : 'none';
      if (this.screenHud) this.screenHud.style.display = (screenName === 'hud') ? 'block' : 'none';

      if (this.clickToPlayPrompt) {
        const locked = !!document.pointerLockElement;
        this.clickToPlayPrompt.style.display = (screenName === 'hud' && !locked) ? 'flex' : 'none';
      }
    }

    showTeamSelect() {
      this.showScreen('team-select');
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    }

    updateServerBrowser(serverList) {
      if (!this.serverTableBody) return;
      this.serverTableBody.innerHTML = '';

      serverList.forEach(srv => {
        const tr = document.createElement('tr');
        tr.className = (srv.id === this.selectedServerId) ? 'selected-server-row' : '';

        tr.innerHTML = `
          <td class="col-name"><strong>${srv.name}</strong></td>
          <td class="col-players">${srv.humans} / ${srv.max} <span class="bot-badge">(+${srv.bots} Bots)</span></td>
          <td class="col-score"><span class="crip-score">${srv.scoreCrips}</span> - <span class="blood-score">${srv.scoreBloods}</span></td>
          <td class="col-action">
            <button class="btn-join-room" data-server="${srv.id}">JOIN SERVER</button>
          </td>
        `;

        const btn = tr.querySelector('.btn-join-room');
        btn.addEventListener('click', () => {
          this.selectedServerId = srv.id;
          this.joinServer(srv.id);
        });

        this.serverTableBody.appendChild(tr);
      });
    }

    joinServer(serverId) {
      if (!this.networkClient) return;

      this.networkClient.joinServer(serverId, this.callsign, (res) => {
        if (res && res.success) {
          this.showScreen('team-select');
          if (res.teamCounts) {
            this.updateTeamCounts(res.teamCounts);
          }
        }
      });
    }

    updateTeamCounts(counts) {
      if (this.cripsCountEl) this.cripsCountEl.innerText = `${counts.crips} Players`;
      if (this.bloodsCountEl) this.bloodsCountEl.innerText = `${counts.bloods} Players`;
    }

    deployToBattle() {
      if (!this.networkClient) return;

      this.networkClient.joinTeam(this.selectedTeam, this.selectedLoadout, (res) => {
        if (res && res.success) {
          if (this.localPlayer) {
            this.localPlayer.team = res.team;
            this.localPlayer.loadoutId = res.loadoutId;
            this.localPlayer.respawn(res.spawn, res.rotY);
          }
          if (this.weaponSystem) {
            this.weaponSystem.selectWeapon(res.loadoutId);
            this.weaponSystem.resetAmmo();
          }

          if (this.hudFactionBadge) {
            this.hudFactionBadge.innerText = res.team.toUpperCase();
            this.hudFactionBadge.className = `faction-badge ${res.team}`;
          }

          this.showScreen('hud');
        } else if (res && res.error) {
          if (this.balanceWarningEl) {
            this.balanceWarningEl.innerText = res.error;
            this.balanceWarningEl.style.display = 'block';
            setTimeout(() => {
              this.balanceWarningEl.style.display = 'none';
            }, 4000);
          }
        }
      });
    }

    updateScores(scores, timer) {
      if (!scores) return;
      if (this.scoreCripsVal) this.scoreCripsVal.innerText = scores.crips;
      if (this.scoreBloodsVal) this.scoreBloodsVal.innerText = scores.bloods;

      const maxScore = 75;
      if (this.scoreCripsBar) {
        this.scoreCripsBar.style.width = `${Math.min(100, (scores.crips / maxScore) * 100)}%`;
      }
      if (this.scoreBloodsBar) {
        this.scoreBloodsBar.style.width = `${Math.min(100, (scores.bloods / maxScore) * 100)}%`;
      }

      if (this.hudTimer && timer !== undefined) {
        const mins = Math.floor(timer / 60);
        const secs = timer % 60;
        this.hudTimer.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
    }

    addKillfeedEntry(data) {
      if (!this.killfeedContainer) return;

      const item = document.createElement('div');
      item.className = 'killfeed-item';

      const killerTeam = data.killerTeam || 'crips';
      const victimTeam = data.victimTeam || 'bloods';
      const weaponName = (data.weaponId || 'AR').toUpperCase();
      const headshotTag = data.isHeadshot ? '<span class="kf-headshot">[HEADSHOT]</span>' : '';

      item.innerHTML = `
        <span class="kf-killer team-${killerTeam}">${data.killerName}</span>
        <span class="kf-weapon">${weaponName}</span>
        ${headshotTag}
        <span class="kf-victim team-${victimTeam}">${data.victimName}</span>
      `;

      this.killfeedContainer.appendChild(item);

      setTimeout(() => {
        item.classList.add('fade-out');
        setTimeout(() => {
          if (item.parentNode) item.parentNode.removeChild(item);
        }, 500);
      }, 4500);
    }

    showHitmarker(isHeadshot) {
      if (!this.hitmarker) return;

      this.hitmarker.className = isHeadshot ? 'hitmarker headshot' : 'hitmarker body';
      this.hitmarker.style.display = 'block';

      clearTimeout(this.hitmarkerTimeout);
      this.hitmarkerTimeout = setTimeout(() => {
        this.hitmarker.style.display = 'none';
      }, 120);
    }

    showDamageVignette(fromPos, localPos) {
      if (!this.damageVignette) return;

      this.damageVignette.style.opacity = '1.0';
      clearTimeout(this.vignetteTimeout);
      this.vignetteTimeout = setTimeout(() => {
        this.damageVignette.style.opacity = '0.0';
      }, 350);
    }

    showSpawnsFlippedBanner() {
      if (!this.spawnsFlippedBanner) return;
      this.spawnsFlippedBanner.style.display = 'block';
      setTimeout(() => {
        this.spawnsFlippedBanner.style.display = 'none';
      }, 3500);
    }

    showDeathScreen(killerName, countdown) {
      if (!this.deathScreen) return;
      if (this.deathKiller) this.deathKiller.innerText = `Killed by ${killerName || 'Enemy'}`;

      this.deathScreen.style.display = 'flex';
      let remaining = countdown || 3;
      if (this.deathTimer) this.deathTimer.innerText = `Respawning in ${remaining}s...`;

      const interval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(interval);
        } else if (this.deathTimer) {
          this.deathTimer.innerText = `Respawning in ${remaining}s...`;
        }
      }, 1000);
    }

    hideDeathScreen() {
      if (this.deathScreen) this.deathScreen.style.display = 'none';
    }

    showMatchOver(winner, scores) {
      if (!this.matchOverScreen) return;

      if (this.matchOverTitle) {
        if (winner === 'draw') {
          this.matchOverTitle.innerText = 'MATCH DRAW';
          this.matchOverTitle.style.color = '#e5a918';
        } else if (winner === (this.localPlayer ? this.localPlayer.team : '')) {
          this.matchOverTitle.innerText = 'VICTORY';
          this.matchOverTitle.style.color = '#2588ff';
        } else {
          this.matchOverTitle.innerText = 'DEFEAT';
          this.matchOverTitle.style.color = '#ff2525';
        }
      }

      if (this.matchOverScores && scores) {
        this.matchOverScores.innerText = `CRIPS ${scores.crips} — BLOODS ${scores.bloods}`;
      }

      this.matchOverScreen.style.display = 'flex';
    }

    hideMatchOver() {
      if (this.matchOverScreen) this.matchOverScreen.style.display = 'none';
    }

    showScoreboard(show) {
      this.isScoreboardOpen = show;
      if (this.modalScoreboard) {
        this.modalScoreboard.style.display = show ? 'flex' : 'none';
      }
    }

    updateScoreboard(players) {
      if (!this.sbCripsList || !this.sbBloodsList || !players) return;

      let cripsHtml = '';
      let bloodsHtml = '';

      for (const id in players) {
        const p = players[id];
        const kd = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2);
        const row = `
          <div class="sb-row ${p.isBot ? 'is-bot' : ''}">
            <span class="sb-name">${p.name}</span>
            <span class="sb-kills">${p.kills}</span>
            <span class="sb-deaths">${p.deaths}</span>
            <span class="sb-kd">${kd}</span>
          </div>
        `;

        if (p.team === 'crips') cripsHtml += row;
        else if (p.team === 'bloods') bloodsHtml += row;
      }

      this.sbCripsList.innerHTML = cripsHtml;
      this.sbBloodsList.innerHTML = bloodsHtml;
    }

    update(dt) {
      if (this.currentScreen !== 'hud' || !this.localPlayer || !this.weaponSystem) return;

      // Update Player Status
      if (this.hudHpVal) this.hudHpVal.innerText = Math.round(this.localPlayer.hp);
      if (this.hudHpBar) this.hudHpBar.style.width = `${Math.max(0, this.localPlayer.hp)}%`;
      if (this.hudPosture) this.hudPosture.innerText = this.localPlayer.state.toUpperCase();

      // Update Weapon Status
      const curWeapon = this.weaponSystem.currentWeapon;
      const ammo = this.weaponSystem.ammo[this.weaponSystem.activeWeaponId];

      if (curWeapon && ammo) {
        if (this.hudWeaponName) this.hudWeaponName.innerText = curWeapon.displayName;
        if (this.hudAmmoMag) this.hudAmmoMag.innerText = ammo.mag;
        if (this.hudAmmoReserve) this.hudAmmoReserve.innerText = ammo.reserve;
      }

      // Reload bar
      if (this.hudReloadBar) {
        if (this.weaponSystem.isReloading) {
          const elapsed = Date.now() - this.weaponSystem.reloadStartTime;
          const pct = Math.min(100, (elapsed / this.weaponSystem.reloadDuration) * 100);
          this.hudReloadBar.style.width = `${pct}%`;
          this.hudReloadBar.style.opacity = '1.0';
        } else {
          this.hudReloadBar.style.opacity = '0.0';
          this.hudReloadBar.style.width = '0%';
        }
      }

      // Crosshair Visibility during ADS
      if (this.crosshair) {
        this.crosshair.style.display = this.weaponSystem.isADS ? 'none' : 'block';

        const horizSpeed = Math.sqrt(this.localPlayer.vel[0] * this.localPlayer.vel[0] + this.localPlayer.vel[2] * this.localPlayer.vel[2]);
        const spreadOffset = Math.min(24, Math.max(8, 8 + horizSpeed * 1.5));
        this.crosshair.style.setProperty('--spread', `${spreadOffset}px`);
      }
    }
  }

  return UIManager;
}));
