/**
 * OnlineMatch bridges the NetworkManager with GameEngine + Lobby UI.
 * It listens for server events and drives the game through its online flow.
 */
export class OnlineMatch {
  constructor(networkManager, gameEngine) {
    this.net = networkManager;
    this.engine = gameEngine;
    this._active = false;
    this._myRole = null;   // 'batter' | 'bowler'
    this._mySocketId = null;
    this._innings = 0;
    this._overs = 5;

    this._lobbyStatusEl = document.getElementById('lobby-status');
    this._lobbyCodeEl = document.getElementById('lobby-code-display');
    this._lobbyOpponentEl = document.getElementById('lobby-opponent');
    this._lobbyReadyBtn = document.getElementById('btn-lobby-ready');
    this._lobbyScreen = document.getElementById('online-lobby');
    this._lobbyError = document.getElementById('lobby-error');

    this._bindServerEvents();
    this._bindUIEvents();
  }

  get active() { return this._active; }
  get myRole() { return this._myRole; }

  _bindUIEvents() {
    if (this._lobbyReadyBtn) {
      this._lobbyReadyBtn.addEventListener('click', () => {
        this.net.sendReady();
        this._lobbyReadyBtn.disabled = true;
        this._lobbyReadyBtn.textContent = 'Waiting...';
      });
    }
  }

  _bindServerEvents() {
    this.net.on('opponent_joined', (data) => {
      this.net._opponentName = data.opponent;
      if (this._lobbyOpponentEl) {
        this._lobbyOpponentEl.textContent = data.opponent;
      }
      this._setLobbyStatus('Opponent joined! Press Ready when ready.');
      if (this._lobbyReadyBtn) {
        this._lobbyReadyBtn.disabled = false;
        this._lobbyReadyBtn.style.display = '';
      }
    });

    this.net.on('player_ready_update', (data) => {
      if (data.allReady) {
        this._setLobbyStatus('Both ready! Starting toss...');
      } else {
        this._setLobbyStatus(`${data.playerName} is ready`);
      }
    });

    this.net.on('toss_result', (data) => {
      this._hideLobby();
      this._mySocketId = this.net.socket.id;
      const iWon = data.winnerId === this._mySocketId;

      if (iWon) {
        this._showOnlineToss(data.winner, true);
      } else {
        this._showOnlineToss(data.winner, false);
      }
    });

    this.net.on('innings_start', (data) => {
      this._active = true;
      this._innings = data.innings;
      this._overs = data.overs;
      this._mySocketId = this.net.socket.id;

      // Hide toss and innings break screens
      document.getElementById('toss-screen').style.display = 'none';
      document.getElementById('innings-break').style.display = 'none';

      const iAmBatter = data.batterId === this._mySocketId;
      this._myRole = iAmBatter ? 'batter' : 'bowler';

      this.engine.startOnlineInnings({
        innings: data.innings,
        overs: data.overs,
        target: data.target || null,
        iAmBatter,
        batterName: data.batterName,
        bowlerName: data.bowlerName,
        opponentName: iAmBatter ? data.bowlerName : data.batterName,
      });
    });

    this.net.on('new_ball', (data) => {
      this.engine.onlineNewBall(data);
    });

    this.net.on('ball_launched', (data) => {
      this.engine.onlineBallLaunched(data);
    });

    this.net.on('shot_played', (data) => {
      this.engine.onlineShotPlayed(data);
    });

    this.net.on('ball_result', (data) => {
      this.engine.onlineBallResult(data);
    });

    this.net.on('innings_break', (data) => {
      this.engine.onlineInningsBreak(data);
    });

    this.net.on('match_result', (data) => {
      this._active = false;
      this.engine.onlineMatchResult(data);
    });

    this.net.on('opponent_disconnected', (data) => {
      this.engine.showOnlineNotice(`${data.playerName} disconnected. Waiting for reconnect...`);
    });

    this.net.on('opponent_left', (data) => {
      this._active = false;
      this.engine.showOnlineNotice(`${data.playerName} left the match.`);
      setTimeout(() => {
        this.engine._showMenu();
      }, 3000);
    });
  }

  showLobby(code, isHost) {
    if (this._lobbyScreen) this._lobbyScreen.style.display = 'flex';
    if (this._lobbyCodeEl) this._lobbyCodeEl.textContent = code || '';
    if (this._lobbyOpponentEl) this._lobbyOpponentEl.textContent = '—';
    if (this._lobbyError) this._lobbyError.textContent = '';

    if (isHost) {
      this._setLobbyStatus('Waiting for opponent to join...');
      if (this._lobbyReadyBtn) {
        this._lobbyReadyBtn.style.display = 'none';
      }
    } else {
      this._setLobbyStatus('Connected! Press Ready when ready.');
      if (this._lobbyReadyBtn) {
        this._lobbyReadyBtn.disabled = false;
        this._lobbyReadyBtn.style.display = '';
        this._lobbyReadyBtn.textContent = 'Ready';
      }
    }
  }

  showLobbyError(msg) {
    if (this._lobbyError) this._lobbyError.textContent = msg;
  }

  _hideLobby() {
    if (this._lobbyScreen) this._lobbyScreen.style.display = 'none';
  }

  _setLobbyStatus(text) {
    if (this._lobbyStatusEl) this._lobbyStatusEl.textContent = text;
  }

  _showOnlineToss(winnerName, iWon) {
    const tossScreen = document.getElementById('toss-screen');
    const tossTitle = document.getElementById('toss-title');
    const tossDetail = document.getElementById('toss-detail');
    const tossContinue = document.getElementById('btn-toss-continue');
    const tossChoice = document.getElementById('toss-choice');

    tossTitle.textContent = `${winnerName} wins the toss!`;

    if (iWon) {
      tossDetail.textContent = 'Choose to bat or bowl first';
      tossContinue.style.display = 'none';
      tossChoice.style.display = 'flex';

      const batBtn = document.getElementById('btn-bat-first');
      const bowlBtn = document.getElementById('btn-bowl-first');

      const onBat = () => {
        this.net.sendTossChoice('bat');
        tossScreen.style.display = 'none';
        tossChoice.style.display = 'none';
        tossContinue.style.display = '';
        batBtn.removeEventListener('click', onBat);
        bowlBtn.removeEventListener('click', onBowl);
      };
      const onBowl = () => {
        this.net.sendTossChoice('bowl');
        tossScreen.style.display = 'none';
        tossChoice.style.display = 'none';
        tossContinue.style.display = '';
        batBtn.removeEventListener('click', onBat);
        bowlBtn.removeEventListener('click', onBowl);
      };

      batBtn.addEventListener('click', onBat);
      bowlBtn.addEventListener('click', onBowl);
    } else {
      tossDetail.textContent = 'Waiting for opponent to choose...';
      tossContinue.style.display = 'none';
      tossChoice.style.display = 'none';
    }

    tossScreen.style.display = 'flex';
  }

  cleanup() {
    this._active = false;
    this._myRole = null;
    this._hideLobby();
    this.net.leaveRoom();
  }
}
