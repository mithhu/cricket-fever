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
    this._selectedName = null;
    this._players = this._loadPlayers();
    this._bestScores = {};

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
    if (this._onStart) this._onStart(overs, this._selectedName);
  }

  onStart(callback) {
    this._onStart = callback;
    this.btn5.addEventListener('click', () => this._validateAndStart(5));
    this.btn10.addEventListener('click', () => this._validateAndStart(10));
  }

  getPlayerName() {
    return this._selectedName || '';
  }

  show() {
    this.el.style.display = 'flex';
  }

  hide() {
    this.el.style.display = 'none';
  }
}
