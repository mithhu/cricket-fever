import { GameSession } from './GameSession.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const RECONNECT_WINDOW_MS = 30_000;

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.disconnectedPlayers = new Map();
  }

  getStats() {
    return {
      rooms: this.rooms.size,
      players: this.socketToRoom.size,
    };
  }

  createRoom(socket, data) {
    const { playerName, overs } = data || {};
    if (!playerName) return { error: 'Player name required' };

    let code;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);

    if (this.rooms.has(code)) return { error: 'Failed to generate room code' };

    const room = {
      code,
      overs: overs || 5,
      players: [
        { id: socket.id, name: playerName, ready: false, slot: 'host' },
      ],
      session: null,
      state: 'waiting',
      _ballResultPending: false,
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(socket.id, code);
    socket.join(code);

    console.log(`[room] ${playerName} created room ${code}`);
    return { ok: true, code, slot: 'host' };
  }

  joinRoom(socket, data) {
    const { playerName, code } = data || {};
    if (!playerName) return { error: 'Player name required' };
    if (!code) return { error: 'Room code required' };

    const upperCode = code.toUpperCase();
    const room = this.rooms.get(upperCode);
    if (!room) return { error: 'Room not found' };
    if (room.state !== 'waiting') return { error: 'Match already in progress' };
    if (room.players.length >= 2) return { error: 'Room is full' };

    const existingNames = room.players.map((p) => p.name.toLowerCase());
    if (existingNames.includes(playerName.toLowerCase())) {
      return { error: 'Name already taken in this room' };
    }

    room.players.push({ id: socket.id, name: playerName, ready: false, slot: 'guest' });
    this.socketToRoom.set(socket.id, upperCode);
    socket.join(upperCode);

    console.log(`[room] ${playerName} joined room ${upperCode}`);

    const hostPlayer = room.players.find((p) => p.slot === 'host');
    this.io.to(socket.id).emit('room_joined', {
      code: upperCode,
      opponent: hostPlayer.name,
      slot: 'guest',
    });

    this.io.to(hostPlayer.id).emit('opponent_joined', {
      opponent: playerName,
    });

    return { ok: true, code: upperCode, slot: 'guest', opponent: hostPlayer.name };
  }

  setPlayerReady(socket) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    player.ready = true;

    this.io.to(code).emit('player_ready_update', {
      playerName: player.name,
      allReady: room.players.length === 2 && room.players.every((p) => p.ready),
    });

    if (room.players.length === 2 && room.players.every((p) => p.ready)) {
      this._startMatch(room);
    }
  }

  _startMatch(room) {
    room.state = 'toss';
    room.session = new GameSession(room.overs);

    const tossResult = room.session.performToss();
    const winnerPlayer = room.players[tossResult.winnerIndex];

    this.io.to(room.code).emit('toss_result', {
      winner: winnerPlayer.name,
      winnerId: winnerPlayer.id,
    });

    console.log(`[match] Room ${room.code}: toss won by ${winnerPlayer.name}`);
  }

  handleTossChoice(socket, data) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || !room.session) return;

    const tossWinnerId = room.players[room.session.tossWinnerIndex].id;
    if (socket.id !== tossWinnerId) return;

    const { choice } = data;
    if (choice !== 'bat' && choice !== 'bowl') return;

    const winnerIdx = room.session.tossWinnerIndex;
    const loserIdx = winnerIdx === 0 ? 1 : 0;

    let batterIdx, bowlerIdx;
    if (choice === 'bat') {
      batterIdx = winnerIdx;
      bowlerIdx = loserIdx;
    } else {
      batterIdx = loserIdx;
      bowlerIdx = winnerIdx;
    }

    room.session.startInnings(batterIdx, bowlerIdx);
    room.state = 'playing';

    const batter = room.players[batterIdx];
    const bowlerP = room.players[bowlerIdx];

    this.io.to(room.code).emit('innings_start', {
      innings: 1,
      batterName: batter.name,
      batterId: batter.id,
      bowlerName: bowlerP.name,
      bowlerId: bowlerP.id,
      overs: room.overs,
    });

    this._requestNewBall(room);
    console.log(`[match] Room ${room.code}: innings 1 started. ${batter.name} bats, ${bowlerP.name} bowls`);
  }

  _requestNewBall(room) {
    room._ballResultPending = false;
    const session = room.session;
    session.resetBall();

    this.io.to(room.code).emit('new_ball', {
      ballNumber: session.ballsFaced + 1,
      score: session.getScore(),
    });
  }

  handleBowlInput(socket, data) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || !room.session) return;

    const session = room.session;
    if (socket.id !== room.players[session.bowlerIndex].id) return;

    const { line, length, speed } = data;
    const seed = Math.random() * 2147483647 | 0;

    const delivery = session.processDelivery(line, length, speed);

    this.io.to(room.code).emit('ball_launched', {
      delivery,
      seed,
      bowlerName: room.players[session.bowlerIndex].name,
    });
  }

  handleShotInput(socket, data) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || !room.session) return;

    const session = room.session;
    if (socket.id !== room.players[session.batterIndex].id) return;

    const { shot, lofted, batsmanX, batsmanZ, hitVelocity } = data;

    this.io.to(room.code).emit('shot_played', {
      shot,
      lofted,
      batsmanX,
      batsmanZ,
      hitVelocity,
      batterName: room.players[session.batterIndex].name,
    });
  }

  handleBallResultFromClient(socket, data) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room || !room.session) return;
    if (room._ballResultPending) return;
    room._ballResultPending = true;
    this.handleBallResult(room, data);
  }

  handleBallResult(room, resultData) {
    const session = room.session;
    const { runs, wicket, wicketType, isBoundary, isWide } = resultData;

    if (isWide) {
      session.addWide();
    } else if (wicket) {
      session.addWicket(wicketType);
      session.addBallOnly();
    } else {
      session.addBall(runs, isBoundary);
    }

    const score = session.getScore();
    const inningsOver = session.isInningsOver();

    this.io.to(room.code).emit('ball_result', {
      runs,
      wicket,
      wicketType,
      isBoundary,
      isWide,
      score,
      inningsOver,
    });

    if (inningsOver) {
      this._handleInningsEnd(room);
    } else {
      const delay = isWide ? 1500 : 2500;
      setTimeout(() => this._requestNewBall(room), delay);
    }
  }

  _handleInningsEnd(room) {
    const session = room.session;

    if (session.currentInnings === 1) {
      const summary = session.getInningsSummary();
      session.startSecondInnings();

      const batter = room.players[session.batterIndex];
      const bowlerP = room.players[session.bowlerIndex];

      this.io.to(room.code).emit('innings_break', {
        summary,
        target: summary.runs + 1,
        nextBatterName: batter.name,
        nextBatterId: batter.id,
        nextBowlerName: bowlerP.name,
        nextBowlerId: bowlerP.id,
      });

      setTimeout(() => {
        this.io.to(room.code).emit('innings_start', {
          innings: 2,
          batterName: batter.name,
          batterId: batter.id,
          bowlerName: bowlerP.name,
          bowlerId: bowlerP.id,
          overs: room.overs,
          target: summary.runs + 1,
        });
        this._requestNewBall(room);
      }, 5000);

      console.log(`[match] Room ${room.code}: innings break. Target: ${summary.runs + 1}`);
    } else {
      const result = session.getMatchResult(
        room.players[0].name,
        room.players[1].name
      );
      room.state = 'finished';

      this.io.to(room.code).emit('match_result', result);
      console.log(`[match] Room ${room.code}: match over. ${result.headline}`);

      setTimeout(() => this._cleanupRoom(room.code), 60_000);
    }
  }

  leaveRoom(socket) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    this._removePlayerFromRoom(socket, room);
  }

  handleDisconnect(socket) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (room.state === 'playing') {
      this.disconnectedPlayers.set(socket.id, {
        code,
        playerName: player.name,
        slot: player.slot,
        disconnectedAt: Date.now(),
      });

      this.io.to(code).emit('opponent_disconnected', {
        playerName: player.name,
      });

      setTimeout(() => {
        if (this.disconnectedPlayers.has(socket.id)) {
          this.disconnectedPlayers.delete(socket.id);
          this._removePlayerFromRoom(socket, room);
        }
      }, RECONNECT_WINDOW_MS);
    } else {
      this._removePlayerFromRoom(socket, room);
    }
  }

  _removePlayerFromRoom(socket, room) {
    const playerIdx = room.players.findIndex((p) => p.id === socket.id);
    if (playerIdx === -1) return;

    const player = room.players[playerIdx];
    room.players.splice(playerIdx, 1);
    this.socketToRoom.delete(socket.id);
    socket.leave(room.code);

    this.io.to(room.code).emit('opponent_left', {
      playerName: player.name,
    });

    if (room.players.length === 0) {
      this._cleanupRoom(room.code);
    } else {
      room.state = 'waiting';
      room.session = null;
      room.players.forEach((p) => { p.ready = false; });
    }
  }

  _cleanupRoom(code) {
    const room = this.rooms.get(code);
    if (!room) return;

    room.players.forEach((p) => {
      this.socketToRoom.delete(p.id);
    });
    this.rooms.delete(code);
    console.log(`[room] Cleaned up room ${code}`);
  }
}
