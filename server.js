/**
 * Hood Warfare - Authoritative Multiplayer Backend
 * Node.js + Express + Socket.io
 * 4 Persistent Dedicated Server Rooms, Server-Side AI Bot Fill, Hit Registration & Spawns
 */
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const mapData = require('./public/js/config/mapData.js');
const weaponsData = require('./public/js/config/weaponsData.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// WebRTC ICE servers for Karen Warfare
app.get('/api/turn', (req, res) => {
  res.json({ iceServers: [] });
});

// Dedicated routes for Karen Warfare
app.get(['/karen', '/karen-warfare'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'karen.html'));
});

// Dedicated routes for Indian Simulator
app.get(['/indian', '/indian-simulator'], (req, res) => {
  res.redirect('http://localhost:3002');
});

// Fallback route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bot Names
const CRIP_BOT_NAMES = ['[BOT] Crip_Loc', '[BOT] Blue_Ray', '[BOT] Killa_C', '[BOT] West_Tray', '[BOT] Nipsey_Bot', '[BOT] Blue_Dime'];
const BLOOD_BOT_NAMES = ['[BOT] Blood_Hawk', '[BOT] Red_Ogg', '[BOT] Suge_Bot', '[BOT] East_Rider', '[BOT] Blood_Shot', '[BOT] Pyro_Red'];
const BOT_WEAPONS = ['ar', 'smg', 'shotgun', 'ar'];

// Persistent Dedicated Server Rooms
const ROOM_CONFIGS = [
  { id: 'server-1', name: 'Server 1 - Nuketown 24/7 [US-East]', maxPlayers: 12, botFill: true },
  { id: 'server-2', name: 'Server 2 - Turf War TDM [US-West]',  maxPlayers: 12, botFill: true },
  { id: 'server-3', name: 'Server 3 - Hood Classic [US-East]',   maxPlayers: 12, botFill: true },
  { id: 'server-4', name: 'Server 4 - Competitive Scrims [Global]', maxPlayers: 12, botFill: false }
];

class GameRoom {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.maxPlayers = config.maxPlayers;
    this.botFill = config.botFill;

    this.scores = { crips: 0, bloods: 0 };
    this.scoreLimit = 75;
    this.timer = 600; // 10 minutes in seconds
    this.matchOver = false;

    // Spawn sides: West (Crips) and East (Bloods)
    this.activeCripSide = 'west';
    this.activeBloodSide = 'east';
    this.lastSpawnFlipCheck = 0;

    // Players: keyed by socket.id or bot-id
    this.players = {};
    this.sockets = new Map(); // socketId -> socket

    // Bot ID generator
    this.nextBotNum = 1;

    // Spawn initial bots if botFill is on
    this.lastBotTick = Date.now();
  }

  getHumanCount() {
    let count = 0;
    for (const id in this.players) {
      if (!this.players[id].isBot) count++;
    }
    return count;
  }

  getBotCount() {
    let count = 0;
    for (const id in this.players) {
      if (this.players[id].isBot) count++;
    }
    return count;
  }

  getTeamHumanCounts() {
    let crips = 0, bloods = 0;
    for (const id in this.players) {
      const p = this.players[id];
      if (!p.isBot && p.team) {
        if (p.team === 'crips') crips++;
        else if (p.team === 'bloods') bloods++;
      }
    }
    return { crips, bloods };
  }

  getSpawnPoint(team) {
    const isCrip = team === 'crips';
    const side = isCrip ? this.activeCripSide : this.activeBloodSide;
    const spawnList = side === 'west' ? mapData.WEST_SPAWNS : mapData.EAST_SPAWNS;
    const idx = Math.floor(Math.random() * spawnList.length);
    const sp = spawnList[idx];
    return {
      pos: [sp.pos[0] + (Math.random() - 0.5) * 1.5, sp.pos[1], sp.pos[2] + (Math.random() - 0.5) * 1.5],
      rotY: sp.rotY
    };
  }

  adjustBots() {
    if (!this.botFill) return;

    const humans = this.getHumanCount();
    if (humans === 0) {
      // Remove all bots if no humans are in the room
      for (const id in this.players) {
        if (this.players[id].isBot) {
          delete this.players[id];
        }
      }
      return;
    }

    const targetParticipants = 8; // 4v4 target
    const currentTotal = Object.keys(this.players).length;
    let cripsCount = 0, bloodsCount = 0;

    for (const id in this.players) {
      if (this.players[id].team === 'crips') cripsCount++;
      else if (this.players[id].team === 'bloods') bloodsCount++;
    }

    const targetPerTeam = Math.floor(targetParticipants / 2);

    // Add bots if below target per team
    while (cripsCount < targetPerTeam) {
      this.spawnBot('crips');
      cripsCount++;
    }
    while (bloodsCount < targetPerTeam) {
      this.spawnBot('bloods');
      bloodsCount++;
    }

    // Remove excess bots if humans joined
    if (cripsCount > targetPerTeam) {
      for (const id in this.players) {
        if (this.players[id].isBot && this.players[id].team === 'crips') {
          delete this.players[id];
          cripsCount--;
          if (cripsCount <= targetPerTeam) break;
        }
      }
    }
    if (bloodsCount > targetPerTeam) {
      for (const id in this.players) {
        if (this.players[id].isBot && this.players[id].team === 'bloods') {
          delete this.players[id];
          bloodsCount--;
          if (bloodsCount <= targetPerTeam) break;
        }
      }
    }
  }

  spawnBot(team) {
    const botId = `bot-${this.id}-${this.nextBotNum++}`;
    const namePool = team === 'crips' ? CRIP_BOT_NAMES : BLOOD_BOT_NAMES;
    const name = namePool[Math.floor(Math.random() * namePool.length)] + ` #${Math.floor(Math.random()*90 + 10)}`;
    const spawn = this.getSpawnPoint(team);
    const weaponId = BOT_WEAPONS[Math.floor(Math.random() * BOT_WEAPONS.length)];

    // Select a lane: 0 (North), 1 (Mid), or 2 (South)
    const laneIndex = Math.floor(Math.random() * mapData.BOT_LANES.length);
    const lane = mapData.BOT_LANES[laneIndex];
    // If crips (spawning west), start at index 0 moving forward; if bloods (spawning east), start at end moving backwards
    const targetWpIndex = team === 'crips' ? 1 : lane.length - 2;
    const dir = team === 'crips' ? 1 : -1;

    this.players[botId] = {
      id: botId,
      name,
      isBot: true,
      team,
      loadoutId: weaponId,
      weaponId: weaponId,
      pos: spawn.pos,
      rotY: spawn.rotY,
      pitch: 0,
      hp: 100,
      maxHp: 100,
      state: 'run',
      alive: true,
      kills: 0,
      deaths: 0,
      laneIndex,
      targetWpIndex,
      dir,
      lastShotTime: 0,
      lastDamageTime: 0,
      respawnTimer: 0
    };
  }

  updateBots(dt) {
    const now = Date.now();
    for (const id in this.players) {
      const bot = this.players[id];
      if (!bot.isBot) continue;

      // Respawn timer
      if (!bot.alive) {
        bot.respawnTimer -= dt;
        if (bot.respawnTimer <= 0) {
          bot.alive = true;
          bot.hp = 100;
          const sp = this.getSpawnPoint(bot.team);
          bot.pos = sp.pos;
          bot.rotY = sp.rotY;
          bot.pitch = 0;
          bot.state = 'idle';
          const lane = mapData.BOT_LANES[bot.laneIndex];
          bot.targetWpIndex = bot.team === 'crips' ? 1 : lane.length - 2;
          bot.dir = bot.team === 'crips' ? 1 : -1;
        }
        continue;
      }

      // 1. Scan for nearest visible enemy
      let nearestEnemy = null;
      let nearestDist = 38; // Max engagement range: 38m

      for (const otherId in this.players) {
        const other = this.players[otherId];
        if (!other.alive || other.team === bot.team) continue;

        const dx = other.pos[0] - bot.pos[0];
        const dy = (other.pos[1] + 1.2) - (bot.pos[1] + 1.4);
        const dz = other.pos[2] - bot.pos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < nearestDist) {
          const eyeBot = [bot.pos[0], bot.pos[1] + 1.4, bot.pos[2]];
          const eyeTarget = [other.pos[0], other.pos[1] + 1.2, other.pos[2]];
          if (mapData.checkLineOfSight(eyeBot, eyeTarget)) {
            nearestDist = dist;
            nearestEnemy = other;
          }
        }
      }

      // 2. Combat vs Patrol
      if (nearestEnemy) {
        // Aim at enemy
        const dx = nearestEnemy.pos[0] - bot.pos[0];
        const dy = (nearestEnemy.pos[1] + 1.2) - (bot.pos[1] + 1.4);
        const dz = nearestEnemy.pos[2] - bot.pos[2];
        const horizDist = Math.sqrt(dx * dx + dz * dz) || 1e-5;

        bot.rotY = (Math.atan2(-dx, -dz) * 180 / Math.PI);
        bot.pitch = (Math.atan2(dy, horizDist) * 180 / Math.PI);
        bot.state = 'crouch';

        // Fire rate delay check
        const weapon = weaponsData.WEAPONS[bot.weaponId] || weaponsData.WEAPONS.ar;
        const fireInterval = Math.max(weapon.fireDelay * 1.5, 120); // slightly staggered bot burst
        if (now - bot.lastShotTime >= fireInterval) {
          bot.lastShotTime = now;

          // Raycast fire
          const aimSpread = (Math.random() - 0.5) * 0.08;
          const dirX = dx / nearestDist + aimSpread;
          const dirY = dy / nearestDist + (Math.random() - 0.5) * 0.05;
          const dirZ = dz / nearestDist + aimSpread;

          const origin = [bot.pos[0], bot.pos[1] + 1.4, bot.pos[2]];
          const hitPoint = [nearestEnemy.pos[0], nearestEnemy.pos[1] + 1.2, nearestEnemy.pos[2]];

          // Broadcast combat FX
          this.broadcast('combat:fx', {
            shooterId: bot.id,
            origin: origin,
            hitPoint: hitPoint,
            weaponId: bot.weaponId
          });

          // Chance to hit enemy based on distance (better accuracy closer)
          const hitChance = Math.max(0.35, 0.85 - (nearestDist / 40) * 0.45);
          if (Math.random() < hitChance) {
            const isHead = Math.random() < 0.2;
            const zone = isHead ? 'head' : (Math.random() < 0.7 ? 'torso' : 'limbs');
            const damage = weaponsData.calculateDamage(bot.weaponId, nearestDist, zone);

            this.applyDamage(bot, nearestEnemy, damage, zone, origin);
          }
        }
      } else {
        // Patrol along lane waypoints
        const lane = mapData.BOT_LANES[bot.laneIndex];
        const targetWp = lane[bot.targetWpIndex];
        if (targetWp) {
          const dx = targetWp.x - bot.pos[0];
          const dz = targetWp.z - bot.pos[2];
          const distToWp = Math.sqrt(dx * dx + dz * dz);

          if (distToWp < 1.5) {
            // Advance waypoint
            bot.targetWpIndex += bot.dir;
            if (bot.targetWpIndex >= lane.length) {
              bot.targetWpIndex = lane.length - 2;
              bot.dir = -1;
            } else if (bot.targetWpIndex < 0) {
              bot.targetWpIndex = 1;
              bot.dir = 1;
            }
          } else {
            // Move toward waypoint
            const moveSpeed = 5.2; // m/s
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
  }

  applyDamage(attacker, victim, damage, zone, fromPos) {
    if (!victim || !victim.alive) return;

    victim.hp = Math.max(0, victim.hp - damage);
    victim.lastDamageTime = Date.now();

    const isKill = victim.hp <= 0;
    const isHeadshot = zone === 'head';

    // Notify attacker
    if (!attacker.isBot) {
      const socket = this.sockets.get(attacker.id);
      if (socket) {
        socket.emit('combat:hitConfirm', {
          targetId: victim.id,
          damage: damage,
          isHeadshot: isHeadshot,
          isKill: isKill,
          victimHp: victim.hp
        });
      }
    }

    // Notify victim if human
    if (!victim.isBot) {
      const socket = this.sockets.get(victim.id);
      if (socket) {
        socket.emit('player:damaged', {
          attackerId: attacker.id,
          damage: damage,
          hp: victim.hp,
          fromPos: fromPos || attacker.pos
        });
      }
    }

    if (isKill) {
      victim.alive = false;
      attacker.kills++;
      victim.deaths++;

      // Update team score
      if (attacker.team === 'crips') this.scores.crips++;
      else if (attacker.team === 'bloods') this.scores.bloods++;

      this.broadcast('player:killed', {
        killerId: attacker.id,
        killerName: attacker.name,
        killerTeam: attacker.team,
        victimId: victim.id,
        victimName: victim.name,
        victimTeam: victim.team,
        weaponId: attacker.weaponId,
        isHeadshot: isHeadshot
      });

      // Check win condition
      if (this.scores.crips >= this.scoreLimit || this.scores.bloods >= this.scoreLimit) {
        this.triggerMatchOver();
        return;
      }

      // Schedule respawn (3 seconds)
      if (victim.isBot) {
        victim.respawnTimer = 3.0;
      } else {
        setTimeout(() => {
          if (!this.players[victim.id]) return;
          victim.hp = 100;
          victim.alive = true;
          const spawn = this.getSpawnPoint(victim.team);
          victim.pos = spawn.pos;
          victim.rotY = spawn.rotY;

          const sock = this.sockets.get(victim.id);
          if (sock) {
            sock.emit('player:respawn', {
              pos: spawn.pos,
              rotY: spawn.rotY,
              hp: 100
            });
          }
        }, 3000);
      }
    }
  }

  checkSpawnFlips() {
    const now = Date.now();
    if (now - this.lastSpawnFlipCheck < 1000) return;
    this.lastSpawnFlipCheck = now;

    let cripPushers = 0; // Crips in East backyard (X > 38)
    let bloodPushers = 0; // Bloods in West backyard (X < -38)

    for (const id in this.players) {
      const p = this.players[id];
      if (!p.alive) continue;
      if (p.team === 'crips' && p.pos[0] > 38) cripPushers++;
      if (p.team === 'bloods' && p.pos[0] < -38) bloodPushers++;
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

    if (flipped) {
      this.broadcast('game:spawnsFlipped', {
        activeCripSide: this.activeCripSide,
        activeBloodSide: this.activeBloodSide
      });
    }
  }

  updateHealthRegen(dt) {
    const now = Date.now();
    for (const id in this.players) {
      const p = this.players[id];
      if (!p.alive || p.hp >= 100) continue;
      if (now - p.lastDamageTime >= 5000) {
        p.hp = Math.min(100, p.hp + 25 * dt);
      }
    }
  }

  triggerMatchOver() {
    if (this.matchOver) return;
    this.matchOver = true;

    const winner = this.scores.crips > this.scores.bloods ? 'crips' :
                   (this.scores.bloods > this.scores.crips ? 'bloods' : 'draw');

    this.broadcast('match:over', {
      winner,
      scores: this.scores
    });

    // Wait 8 seconds, reset and restart match
    setTimeout(() => {
      this.scores = { crips: 0, bloods: 0 };
      this.timer = 600;
      this.matchOver = false;
      this.activeCripSide = 'west';
      this.activeBloodSide = 'east';

      // Respawn everyone
      for (const id in this.players) {
        const p = this.players[id];
        p.hp = 100;
        p.alive = true;
        const sp = this.getSpawnPoint(p.team);
        p.pos = sp.pos;
        p.rotY = sp.rotY;

        if (!p.isBot) {
          const sock = this.sockets.get(id);
          if (sock) {
            sock.emit('player:respawn', {
              pos: sp.pos,
              rotY: sp.rotY,
              hp: 100
            });
          }
        }
      }

      this.broadcast('match:restart', {
        scores: this.scores,
        timer: this.timer
      });
    }, 8000);
  }

  broadcast(event, payload) {
    for (const socket of this.sockets.values()) {
      socket.emit(event, payload);
    }
  }

  tick(dt) {
    // Timer countdown
    if (!this.matchOver) {
      this.timer = Math.max(0, this.timer - dt);
      if (this.timer <= 0) {
        this.triggerMatchOver();
      }
    }

    // Health regen & Bot AI
    this.updateHealthRegen(dt);
    this.updateBots(dt);
    this.checkSpawnFlips();

    // Broadcast world:state at 20Hz
    const playerSummaries = {};
    for (const id in this.players) {
      const p = this.players[id];
      playerSummaries[id] = {
        id: p.id,
        name: p.name,
        isBot: !!p.isBot,
        team: p.team,
        weaponId: p.weaponId,
        pos: [Number(p.pos[0].toFixed(2)), Number(p.pos[1].toFixed(2)), Number(p.pos[2].toFixed(2))],
        rotY: Number(p.rotY.toFixed(1)),
        pitch: Number(p.pitch.toFixed(1)),
        hp: Math.round(p.hp),
        state: p.state,
        alive: p.alive,
        kills: p.kills,
        deaths: p.deaths
      };
    }

    this.broadcast('world:state', {
      players: playerSummaries,
      scores: this.scores,
      timer: Math.ceil(this.timer)
    });
  }
}

// Instantiate the 4 persistent rooms
const rooms = {};
ROOM_CONFIGS.forEach(cfg => {
  rooms[cfg.id] = new GameRoom(cfg);
});

// Periodic Lobby List broadcast (every 2s)
function getLobbyList() {
  return ROOM_CONFIGS.map(cfg => {
    const room = rooms[cfg.id];
    return {
      id: room.id,
      name: room.name,
      humans: room.getHumanCount(),
      bots: room.getBotCount(),
      max: room.maxPlayers,
      scoreCrips: room.scores.crips,
      scoreBloods: room.scores.bloods
    };
  });
}

setInterval(() => {
  io.emit('lobby:list', getLobbyList());
}, 2000);

// Main Server 20Hz Game Loop (every 50ms)
const TICK_INTERVAL = 50; // ms
let lastTickTime = Date.now();

setInterval(() => {
  const now = Date.now();
  const dt = Math.min((now - lastTickTime) / 1000, 0.1);
  lastTickTime = now;

  for (const roomId in rooms) {
    rooms[roomId].tick(dt);
  }
}, TICK_INTERVAL);

// Socket.io Connection & Event Handling
io.on('connection', (socket) => {
  let currentRoom = null;
  let callsign = 'HOOD_SOLDIER_' + Math.floor(Math.random() * 899 + 100);

  // Send initial lobby list
  socket.emit('lobby:list', getLobbyList());

  socket.on('lobby:joinServer', (data, callback) => {
    const serverId = data && data.serverId ? data.serverId : 'server-1';
    if (data && data.callsign && data.callsign.trim().length > 0) {
      callsign = data.callsign.trim().substring(0, 16);
    }

    const room = rooms[serverId];
    if (!room) {
      if (callback) callback({ success: false, error: 'Server room not found' });
      return;
    }

    if (currentRoom) {
      currentRoom.sockets.delete(socket.id);
      delete currentRoom.players[socket.id];
      currentRoom.adjustBots();
    }

    currentRoom = room;
    currentRoom.sockets.set(socket.id, socket);

    if (callback) {
      callback({
        success: true,
        roomId: room.id,
        roomName: room.name,
        teamCounts: room.getTeamHumanCounts(),
        scores: room.scores,
        timer: Math.ceil(room.timer)
      });
    }

    // Refresh lobby list
    io.emit('lobby:list', getLobbyList());
  });

  socket.on('game:joinTeam', (data, callback) => {
    if (!currentRoom) {
      if (callback) callback({ success: false, error: 'Not in a server room' });
      return;
    }

    const team = data && (data.team === 'crips' || data.team === 'bloods') ? data.team : 'crips';
    const loadoutId = data && data.loadoutId ? data.loadoutId : 'ar';

    // Auto-balance check: Prevent joining team if it has >= 2 more human players than opposing team
    const teamCounts = currentRoom.getTeamHumanCounts();
    const otherTeam = team === 'crips' ? 'bloods' : 'crips';

    if (teamCounts[team] - teamCounts[otherTeam] >= 2) {
      if (callback) {
        callback({
          success: false,
          error: `Auto-Balance: ${team.toUpperCase()} is full! Join ${otherTeam.toUpperCase()} to balance teams.`
        });
      }
      return;
    }

    const spawn = currentRoom.getSpawnPoint(team);

    currentRoom.players[socket.id] = {
      id: socket.id,
      name: callsign,
      isBot: false,
      team: team,
      loadoutId: loadoutId,
      weaponId: loadoutId,
      pos: spawn.pos,
      rotY: spawn.rotY,
      pitch: 0,
      hp: 100,
      maxHp: 100,
      state: 'idle',
      alive: true,
      kills: 0,
      deaths: 0,
      lastDamageTime: 0
    };

    // Rebalance bots when a new human joins
    currentRoom.adjustBots();

    if (callback) {
      callback({
        success: true,
        spawn: spawn.pos,
        rotY: spawn.rotY,
        team: team,
        loadoutId: loadoutId,
        scores: currentRoom.scores,
        timer: Math.ceil(currentRoom.timer)
      });
    }

    io.emit('lobby:list', getLobbyList());
  });

  socket.on('player:move', (data) => {
    if (!currentRoom) return;
    const player = currentRoom.players[socket.id];
    if (!player || !player.alive) return;

    if (Array.isArray(data.pos) && data.pos.length === 3) {
      player.pos = [data.pos[0], data.pos[1], data.pos[2]];
    }
    if (typeof data.rotY === 'number') player.rotY = data.rotY;
    if (typeof data.pitch === 'number') player.pitch = data.pitch;
    if (typeof data.state === 'string') player.state = data.state;
    if (typeof data.weaponId === 'string') player.weaponId = data.weaponId;
  });

  socket.on('combat:fire', (data) => {
    if (!currentRoom) return;
    const shooter = currentRoom.players[socket.id];
    if (!shooter || !shooter.alive) return;

    const origin = Array.isArray(data.origin) ? data.origin : shooter.pos;
    const hitPoint = Array.isArray(data.hitPoint) ? data.hitPoint : origin;
    const weaponId = data.weaponId || shooter.weaponId;

    // Broadcast tracer & gunshot FX to all players in the room
    currentRoom.broadcast('combat:fx', {
      shooterId: socket.id,
      origin: origin,
      hitPoint: hitPoint,
      weaponId: weaponId
    });

    // Validate hit target
    if (data.hitTargetId && currentRoom.players[data.hitTargetId]) {
      const victim = currentRoom.players[data.hitTargetId];
      if (victim.alive && victim.team !== shooter.team) {
        const dx = victim.pos[0] - origin[0];
        const dy = victim.pos[1] - origin[1];
        const dz = victim.pos[2] - origin[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Sanity distance check
        if (dist <= 90) {
          const zone = data.hitZone || 'torso';
          const damage = weaponsData.calculateDamage(weaponId, dist, zone);
          currentRoom.applyDamage(shooter, victim, damage, zone, origin);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      currentRoom.sockets.delete(socket.id);
      delete currentRoom.players[socket.id];
      currentRoom.adjustBots();
    }
    io.emit('lobby:list', getLobbyList());
  });
});

server.listen(PORT, () => {
  console.log(`[Hood Warfare 2 Server] Authoritative Backend running on http://localhost:${PORT}`);
});
