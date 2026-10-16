const path = require('path');
const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');

console.log('[Test] Connecting to server at http://localhost:3000 ...');

socket.on('connect', () => {
  console.log('[Test] Connected with socket ID:', socket.id);

  // Join Server 1
  socket.emit('lobby:joinServer', { serverId: 'server-1', callsign: 'TEST_SOLDIER' }, (res) => {
    console.log('[Test] joinServer response success:', res.success, 'room:', res.roomId);

    // Join Team Crips with AR loadout
    socket.emit('game:joinTeam', { team: 'crips', loadoutId: 'ar' }, (joinRes) => {
      console.log('[Test] joinTeam response success:', joinRes.success, 'spawn:', joinRes.spawn);

      // Emit move
      socket.emit('player:move', {
        pos: joinRes.spawn,
        rotY: joinRes.rotY,
        pitch: 0,
        state: 'run',
        weaponId: 'ar'
      });
      console.log('[Test] player:move emitted');

      // Test fire
      socket.emit('combat:fire', {
        origin: joinRes.spawn,
        dir: [0, 0, 1],
        weaponId: 'ar',
        hitPoint: [0, 1, 10]
      });
      console.log('[Test] combat:fire emitted');
    });
  });
});

let stateTicks = 0;
socket.on('world:state', (data) => {
  stateTicks++;
  if (stateTicks === 1) {
    console.log('[Test] First world:state received! Total participants (humans + bots):', Object.keys(data.players).length);
    console.log('[Test] Current Scores:', data.scores, 'Timer:', data.timer);
  }
  if (stateTicks >= 5) {
    console.log('[Test] Successfully synchronized 5 consecutive 20Hz ticks. Test PASSED!');
    socket.disconnect();
    process.exit(0);
  }
});

socket.on('combat:fx', (data) => {
  console.log('[Test] Received combat:fx confirmation from:', data.shooterId);
});

setTimeout(() => {
  console.error('[Test] FAIL: Timeout waiting for server response');
  process.exit(1);
}, 5000);
