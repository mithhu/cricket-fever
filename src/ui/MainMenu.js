const PLAYERS_KEY = 'cricket-fever-players';
const LAST_PLAYER_KEY = 'cricket-fever-last-player';

export class MainMenu {
  constructor() {
    this.el = document.getElementById('main-menu');
    this.btn5 = document.getElementById('btn-start-5');
    this.btn10 = document.getElementById('btn-start-10');
    this.cardsContainer = document.getElementById('player-cards');
    this.newPlayerBtn = document.getElementById('btn-new-player');
    this.newPlayerForm = document.getElementById('new-player-form');
    this.newPlayerInput = document.getElementById('new-player-input');
    this.addPlayerBtn = document.getElementById('btn-add-player');
    this.cancelPlayerBtn = document.getElementById('btn-cancel-player');
    this.nameHint = document.getElementById('name-hint');

    this._onStart = null;
    this._on2PlayerStart = null;
    this._selectedName = null;
    this._selectedDifficulty = 'medium';
    this._players = this._loadPlayers();
    this._bestScores = {};

    // Two-player state
    this._tpPlayer1 = null;
    this._tpPlayer2 = null;
    this._tpActiveSlot = 1;
    this._tpDifficulty = 'medium';

    this._diffBtns = document.querySelectorAll('#difficulty-select .diff-btn');
    this._diffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this._selectedDifficulty = btn.dataset.diff;
        this._diffBtns.forEach((b) => b.classList.toggle('selected', b === btn));
      });
    });

    // Two-player difficulty buttons
    this._tpDiffBtns = document.querySelectorAll('#difficulty-btns-tp .diff-btn');
    this._tpDiffBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this._tpDifficulty = btn.dataset.diff;
        this._tpDiffBtns.forEach((b) => b.classList.toggle('selected', b === btn));
      });
    });

    this.newPlayerBtn.addEventListener('click', () => this._showNewPlayerForm());
    this.addPlayerBtn.addEventListener('click', () => this._addPlayer());
    this.cancelPlayerBtn.addEventListener('click', () => this._hideNewPlayerForm());
    this.newPlayerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addPlayer();
      if (e.key === 'Escape') this._hideNewPlayerForm();
    });
    this.newPlayerInput.addEventListener('input', () => {
      this.newPlayerInput.classList.remove('shake');
      this.nameHint.innerHTML = '&nbsp;';
    });

    // Two-player UI elements
    this._tpSelectEl = document.getElementById('two-player-select');
    this._tpCardsEl = document.getElementById('tp-player-cards');
    this._tpHint = document.getElementById('tp-hint');
    this._tpName1El = document.getElementById('tp-name-1');
    this._tpName2El = document.getElementById('tp-name-2');
    this._tpSlot1 = document.getElementById('tp-slot-1');
    this._tpSlot2 = document.getElementById('tp-slot-2');
    this._soloElements = [
      document.getElementById('player-select'),
      document.getElementById('difficulty-select'),
      this.btn5, this.btn10,
    ];

    this._tpSlot1.addEventListener('click', () => {
      this._tpActiveSlot = 1;
      this._renderTwoPlayerUI();
    });
    this._tpSlot2.addEventListener('click', () => {
      this._tpActiveSlot = 2;
      this._renderTwoPlayerUI();
    });

    document.getElementById('btn-two-player').addEventListener('click', () => this._showTwoPlayerMode());
    document.getElementById('btn-back-solo').addEventListener('click', () => this._showSoloMode());
    document.getElementById('btn-tp-start-5').addEventListener('click', () => this._validateAndStart2P(5));
    document.getElementById('btn-tp-start-10').addEventListener('click', () => this._validateAndStart2P(10));
  }

  _loadPlayers() {
    try {
      const data = localStorage.getItem(PLAYERS_KEY);
      if (data) return JSON.parse(data);
    } catch (_) { /* ignore */ }
    return [];
  }

  _savePlayers() {
    try {
      localStorage.setItem(PLAYERS_KEY, JSON.stringify(this._players));
    } catch (_) { /* ignore */ }
  }

  _saveLastPlayer(name) {
    try { localStorage.setItem(LAST_PLAYER_KEY, name); } catch (_) { /* ignore */ }
  }

  _getLastPlayer() {
    try { return localStorage.getItem(LAST_PLAYER_KEY) || null; } catch (_) { return null; }
  }

  setBestScores(bestMap) {
    this._bestScores = bestMap || {};
  }

  renderCards() {
    this.cardsContainer.innerHTML = '';
    const lastPlayer = this._getLastPlayer();

    if (this._players.length === 0) {
      this._selectedName = null;
      return;
    }

    if (!this._selectedName) {
      this._selectedName = lastPlayer && this._players.includes(lastPlayer) ? lastPlayer : this._players[0];
    }

    this._players.forEach((name) => {
      const card = document.createElement('div');
      card.className = 'player-card' + (name === this._selectedName ? ' selected' : '');

      const avatar = document.createElement('span');
      avatar.className = 'card-avatar';
      avatar.textContent = name.charAt(0);

      const label = document.createElement('span');
      label.textContent = name;

      card.appendChild(avatar);
      card.appendChild(label);

      const best = this._bestScores[name];
      if (best !== undefined) {
        const bestEl = document.createElement('span');
        bestEl.className = 'card-best';
        bestEl.textContent = `(${best})`;
        card.appendChild(bestEl);
      }

      const del = document.createElement('button');
      del.className = 'card-delete';
      del.textContent = '\u00d7';
      del.title = `Remove ${name}`;
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        this._removePlayer(name);
      });
      card.appendChild(del);

      card.addEventListener('click', () => {
        this._selectedName = name;
        this.nameHint.innerHTML = '&nbsp;';
        this.renderCards();
      });

      this.cardsContainer.appendChild(card);
    });
  }

  _showNewPlayerForm() {
    this.newPlayerForm.style.display = 'flex';
    this.newPlayerBtn.style.display = 'none';
    this.newPlayerInput.value = '';
    this.newPlayerInput.focus();
  }

  _hideNewPlayerForm() {
    this.newPlayerForm.style.display = 'none';
    this.newPlayerBtn.style.display = '';
    this.newPlayerInput.classList.remove('shake');
    this.nameHint.innerHTML = '&nbsp;';
  }

  _addPlayer() {
    const name = this.newPlayerInput.value.trim();
    if (!name) {
      this.newPlayerInput.classList.remove('shake');
      void this.newPlayerInput.offsetWidth;
      this.newPlayerInput.classList.add('shake');
      this.nameHint.textContent = 'Please enter a name';
      this.newPlayerInput.focus();
      return;
    }

    if (this._players.some((p) => p.toLowerCase() === name.toLowerCase())) {
      this.newPlayerInput.classList.remove('shake');
      void this.newPlayerInput.offsetWidth;
      this.newPlayerInput.classList.add('shake');
      this.nameHint.textContent = 'Player already exists';
      this.newPlayerInput.focus();
      return;
    }

    this._players.push(name);
    this._savePlayers();
    this._selectedName = name;
    this._hideNewPlayerForm();
    this.renderCards();
  }

  _removePlayer(name) {
    this._players = this._players.filter((p) => p !== name);
    this._savePlayers();
    if (this._selectedName === name) {
      this._selectedName = this._players.length > 0 ? this._players[0] : null;
    }
    this.renderCards();
  }

  _validateAndStart(overs) {
    if (!this._selectedName) {
      this.nameHint.textContent = 'Select or create a player first';
      return;
    }

    this._saveLastPlayer(this._selectedName);
    if (this._onStart) this._onStart(overs, this._selectedName, this._selectedDifficulty);
  }

  onStart(callback) {
    this._onStart = callback;
    this.btn5.addEventListener('click', () => this._validateAndStart(5));
    this.btn10.addEventListener('click', () => this._validateAndStart(10));
  }

  on2PlayerStart(callback) {
    this._on2PlayerStart = callback;
  }

  getPlayerName() {
    return this._selectedName || '';
  }

  getDifficulty() {
    return this._selectedDifficulty;
  }

  show() {
    this.el.style.display = 'flex';
    this._showSoloMode();
  }

  hide() {
    this.el.style.display = 'none';
  }

  _showTwoPlayerMode() {
    this._soloElements.forEach((el) => { if (el) el.style.display = 'none'; });
    document.getElementById('btn-two-player').style.display = 'none';
    this._tpSelectEl.style.display = 'flex';
    this._tpPlayer1 = null;
    this._tpPlayer2 = null;
    this._tpActiveSlot = 1;
    this._renderTwoPlayerUI();
  }

  _showSoloMode() {
    this._tpSelectEl.style.display = 'none';
    this._soloElements.forEach((el) => {
      if (el) el.style.display = el.tagName === 'BUTTON' ? '' : 'flex';
    });
    document.getElementById('btn-two-player').style.display = '';
  }

  _renderTwoPlayerUI() {
    this._tpName1El.textContent = this._tpPlayer1 || '—';
    this._tpName1El.className = 'tp-slot-name' + (this._tpPlayer1 ? ' filled' : '');
    this._tpName2El.textContent = this._tpPlayer2 || '—';
    this._tpName2El.className = 'tp-slot-name' + (this._tpPlayer2 ? ' filled' : '');
    this._tpSlot1.className = 'tp-slot' + (this._tpActiveSlot === 1 ? ' active' : '');
    this._tpSlot2.className = 'tp-slot' + (this._tpActiveSlot === 2 ? ' active' : '');

    this._tpCardsEl.innerHTML = '';
    this._players.forEach((name) => {
      const card = document.createElement('div');
      const isP1 = name === this._tpPlayer1;
      const isP2 = name === this._tpPlayer2;
      card.className = 'player-card' + (isP1 || isP2 ? ' selected' : '');

      const avatar = document.createElement('span');
      avatar.className = 'card-avatar';
      avatar.textContent = name.charAt(0);
      card.appendChild(avatar);

      const label = document.createElement('span');
      label.textContent = name;
      card.appendChild(label);

      if (isP1) {
        const tag = document.createElement('span');
        tag.className = 'card-best';
        tag.textContent = '(P1)';
        card.appendChild(tag);
      } else if (isP2) {
        const tag = document.createElement('span');
        tag.className = 'card-best';
        tag.textContent = '(P2)';
        card.appendChild(tag);
      }

      card.addEventListener('click', () => this._tpSelectPlayer(name));
      this._tpCardsEl.appendChild(card);
    });

    this._tpHint.innerHTML = '&nbsp;';
  }

  _tpSelectPlayer(name) {
    if (this._tpActiveSlot === 1) {
      if (name === this._tpPlayer2) {
        this._tpPlayer2 = null;
      }
      this._tpPlayer1 = name;
      this._tpActiveSlot = 2;
    } else {
      if (name === this._tpPlayer1) {
        this._tpHint.textContent = 'Player already selected as P1';
        return;
      }
      this._tpPlayer2 = name;
    }
    this._renderTwoPlayerUI();
  }

  _validateAndStart2P(overs) {
    if (!this._tpPlayer1 || !this._tpPlayer2) {
      this._tpHint.textContent = 'Select two different players';
      return;
    }
    if (this._on2PlayerStart) {
      this._on2PlayerStart(overs, this._tpPlayer1, this._tpPlayer2, this._tpDifficulty);
    }
  }
}
