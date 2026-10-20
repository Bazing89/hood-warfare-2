/**
 * Indian Simulator: Village Mud Wars
 * UI Manager: HUD, Minimap, Mud-on-Screen FX, Floating Damage/Score Popups & Scoreboard
 */

class UIManager {
  constructor() {
    // DOM Elements
    this.scoreEl = document.getElementById('hud-score-val');
    this.comboEl = document.getElementById('hud-combo-val');
    this.timerEl = document.getElementById('hud-timer-val');
    this.ammoEl = document.getElementById('hud-ammo-val');
    this.ammoTypeEl = document.getElementById('hud-ammo-type');
    this.chargeBarEl = document.getElementById('charge-bar-inner');
    this.chargeContainerEl = document.getElementById('charge-bar-container');
    this.cleanPromptEl = document.getElementById('clean-prompt');

    // Minimap canvas
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.mmCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // Splatter canvas
    this.splatterCanvas = document.getElementById('splatter-canvas');
    this.spCtx = this.splatterCanvas ? this.splatterCanvas.getContext('2d') : null;

    this.floatingContainer = document.getElementById('floating-popups');

    this._resizeCanvases();
    window.addEventListener('resize', () => this._resizeCanvases());

    this.score = 0;
    this.displayScore = 0;
    this.combo = 1;
    this.comboTimer = 0;

    // Mud droplets on screen
    this.mudDroplets = [];
    this._generateMudDroplets();
  }

  _resizeCanvases() {
    if (this.splatterCanvas) {
      this.splatterCanvas.width = window.innerWidth;
      this.splatterCanvas.height = window.innerHeight;
    }
  }

  _generateMudDroplets() {
    this.mudDroplets = [];
    for (let i = 0; i < 28; i++) {
      this.mudDroplets.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 20 + Math.random() * 45,
        dripLength: 10 + Math.random() * 60,
        alpha: 0.7 + Math.random() * 0.3
      });
    }
  }

  update(delta, player, cows, villagers, world, gameState) {
    // 1. Update Score Display (smooth rolling)
    if (this.displayScore < this.score) {
      const step = Math.ceil((this.score - this.displayScore) * 0.2);
      this.displayScore += step;
      if (this.scoreEl) this.scoreEl.textContent = this.displayScore;
    }

    // 2. Combo timer
    if (this.combo > 1) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        if (this.comboEl) this.comboEl.textContent = '1x';
      }
    }

    // 3. Match Timer
    if (this.timerEl) {
      if (gameState.mode === 'championship') {
        const mins = Math.floor(gameState.timeLeft / 60);
        const secs = Math.floor(gameState.timeLeft % 60);
        this.timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      } else {
        this.timerEl.textContent = 'VILLAGE SANDBOX';
      }
    }

    // 4. Mud Ammo & Charge Bar
    if (player) {
      if (this.ammoEl) {
        this.ammoEl.textContent = `${player.ammo[player.selectedMudType]} / ${player.maxAmmo[player.selectedMudType]}`;
      }
      if (this.ammoTypeEl) {
        const names = {
          standard: 'Wet Mud Ball [1]',
          mega: 'Mega Cow Dung Patty [2]',
          golden: 'Golden Clay Ball [3]'
        };
        this.ammoTypeEl.textContent = names[player.selectedMudType] || 'Mud Ball';
      }

      if (this.chargeBarEl && this.chargeContainerEl) {
        if (player.isChargingThrow) {
          this.chargeContainerEl.style.opacity = '1';
          this.chargeBarEl.style.width = `${Math.floor(player.throwCharge * 100)}%`;
        } else {
          this.chargeContainerEl.style.opacity = '0';
          this.chargeBarEl.style.width = '0%';
        }
      }

      // Mud on screen prompt
      if (this.cleanPromptEl) {
        this.cleanPromptEl.style.display = player.screenMudLevel > 0.25 ? 'block' : 'none';
      }

      // Render Screen Mud Splatter
      this._renderScreenMud(player.screenMudLevel);
    }

    // 5. Render Minimap
    this._renderMinimap(player, cows, villagers, world);
  }

  addScore(points, reason = '') {
    const finalPoints = points * this.combo;
    this.score += finalPoints;

    // Increment combo
    this.combo = Math.min(5, this.combo + 1);
    this.comboTimer = 5.0; // 5 seconds window to chain combos
    if (this.comboEl) {
      this.comboEl.textContent = `${this.combo}x COMBO!`;
      this.comboEl.style.transform = 'scale(1.25)';
      setTimeout(() => {
        if (this.comboEl) this.comboEl.style.transform = 'scale(1.0)';
      }, 150);
    }

    return finalPoints;
  }

  spawnPopup(text, isPositive = true) {
    if (!this.floatingContainer) return;

    const popup = document.createElement('div');
    popup.className = `floating-popup ${isPositive ? 'popup-positive' : 'popup-negative'}`;
    popup.innerHTML = text;

    // Slight random offset
    popup.style.left = `${50 + (Math.random() - 0.5) * 15}%`;
    popup.style.top = `${40 + (Math.random() - 0.5) * 10}%`;

    this.floatingContainer.appendChild(popup);

    setTimeout(() => {
      if (popup.parentElement) {
        popup.parentElement.removeChild(popup);
      }
    }, 1800);
  }

  _renderScreenMud(mudLevel) {
    if (!this.spCtx || !this.splatterCanvas) return;
    this.spCtx.clearRect(0, 0, this.splatterCanvas.width, this.splatterCanvas.height);

    if (mudLevel <= 0.01) return;

    const ctx = this.spCtx;
    const w = this.splatterCanvas.width;
    const h = this.splatterCanvas.height;

    // Brown mud splatter
    const activeCount = Math.floor(this.mudDroplets.length * Math.min(1.0, mudLevel * 1.5));

    for (let i = 0; i < activeCount; i++) {
      const d = this.mudDroplets[i];
      const alpha = d.alpha * mudLevel;

      ctx.save();
      ctx.fillStyle = `rgba(58, 34, 18, ${alpha})`;
      ctx.beginPath();
      ctx.arc(d.x % w, d.y % h, d.radius * (0.8 + mudLevel * 0.4), 0, Math.PI * 2);
      ctx.fill();

      // Drip trail
      ctx.fillStyle = `rgba(45, 26, 14, ${alpha * 0.85})`;
      ctx.beginPath();
      ctx.roundRect((d.x % w) - d.radius * 0.25, (d.y % h), d.radius * 0.5, d.dripLength * mudLevel, 6);
      ctx.fill();
      ctx.restore();
    }
  }

  _renderMinimap(player, cows, villagers, world) {
    if (!this.mmCtx || !this.minimapCanvas) return;
    const ctx = this.mmCtx;
    const size = this.minimapCanvas.width;
    const center = size / 2;
    const scale = size / 140; // 140 meter world diameter

    ctx.clearRect(0, 0, size, size);

    // Background circle (village square)
    ctx.fillStyle = '#b58450';
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fill();

    // Sacred Mud Pits
    if (world && world.mudPits) {
      world.mudPits.forEach(pit => {
        const mx = center + pit.x * scale;
        const my = center + pit.z * scale;
        ctx.fillStyle = '#3a2212';
        ctx.beginPath();
        ctx.arc(mx, my, pit.radius * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Sacred Temple Bell / Banyan Tree
    if (world && world.templeBell) {
      const bx = center + world.templeBell.position.x * scale;
      const by = center + world.templeBell.position.z * scale;
      ctx.fillStyle = '#fbc02d';
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sacred Cows (White/yellow markers)
    if (cows) {
      cows.forEach(cow => {
        const cx = center + cow.position.x * scale;
        const cy = center + cow.position.z * scale;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f57f17';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // Villagers (Orange dots)
    if (villagers) {
      villagers.forEach(v => {
        const vx = center + v.position.x * scale;
        const vy = center + v.position.z * scale;
        ctx.fillStyle = '#ff3d00';
        ctx.beginPath();
        ctx.arc(vx, vy, 3.0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Player (Blue triangle with heading)
    if (player) {
      const px = center + player.position.x * scale;
      const py = center + player.position.z * scale;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-player.yaw);

      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-4, 4);
      ctx.lineTo(4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
