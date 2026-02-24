import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export class NetworkManager {
  constructor() {
    this.socket = null;
    this._connected = false;
    this._listeners = new Map();
    this._roomCode = null;
    this._slot = null;
    this._opponentName = null;
    this._myName = null;
  }

  get connected() { return this._connected; }
  get roomCode() { return this._roomCode; }
  get slot() { return this._slot; }
  get opponentName() { return this._opponentName; }
  get myName() { return this._myName; }

  connect() {
    if (this.socket) return;

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this._connected = true;
      this._emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      this._connected = false;
      this._emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (err) => {
      this._emit('connect_error', { message: err.message });
    });

    const serverEvents = [
      'room_joined', 'opponent_joined', 'player_ready_update',
      'toss_result', 'innings_start', 'new_ball', 'ball_launched',
      'shot_played', 'ball_result', 'innings_break', 'match_result',
      'opponent_disconnected', 'opponent_left',
    ];

    serverEvents.forEach((event) => {
      this.socket.on(event, (data) => this._emit(event, data));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._connected = false;
    this._roomCode = null;
    this._slot = null;
    this._opponentName = null;
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(callback);
  }

  off(event, callback) {
    const arr = this._listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(callback);
    if (idx !== -1) arr.splice(idx, 1);
  }

  _emit(event, data) {
    const arr = this._listeners.get(event);
    if (!arr) return;
    arr.forEach((cb) => cb(data));
  }

  async createRoom(playerName, overs) {
    this._myName = playerName;
    return new Promise((resolve) => {
      this.socket.emit('create_room', { playerName, overs }, (result) => {
        if (result.ok) {
          this._roomCode = result.code;
          this._slot = result.slot;
        }
        resolve(result);
      });
    });
  }

  async joinRoom(playerName, code) {
    this._myName = playerName;
    return new Promise((resolve) => {
      this.socket.emit('join_room', { playerName, code }, (result) => {
        if (result.ok) {
          this._roomCode = result.code;
          this._slot = result.slot;
          this._opponentName = result.opponent;
        }
        resolve(result);
      });
    });
  }

  sendReady() {
    this.socket.emit('player_ready');
  }

  sendTossChoice(choice) {
    this.socket.emit('toss_choice', { choice });
  }

  sendBowlInput(line, length, speed) {
    this.socket.emit('bowl_input', { line, length, speed });
  }

  sendShotInput(shot, lofted, batsmanX, batsmanZ) {
    this.socket.emit('shot_input', { shot, lofted, batsmanX, batsmanZ });
  }

  sendBallResult(data) {
    this.socket.emit('ball_result_from_client', data);
  }

  leaveRoom() {
    this.socket.emit('leave_room');
    this._roomCode = null;
    this._slot = null;
    this._opponentName = null;
  }
}
