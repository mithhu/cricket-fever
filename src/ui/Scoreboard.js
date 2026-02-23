export class Scoreboard {
  constructor() {
    this.el = document.getElementById('scoreboard');
    this.runsEl = document.getElementById('sc-runs');
    this.oversEl = document.getElementById('sc-overs');
    this.rrEl = document.getElementById('sc-rr');
    this.batsmanEl = document.getElementById('sc-batsman');
    this.lastEl = document.getElementById('sc-last');
    this._playerName = '';
  }

  setPlayerName(name) {
    this._playerName = name || '';
  }

  show() {
    this.el.style.display = 'flex';
  }

  hide() {
    this.el.style.display = 'none';
  }

  update(scoreManager) {
    this.runsEl.textContent = `${scoreManager.runs}/${scoreManager.wickets}`;
    this.oversEl.textContent = scoreManager.getOversString();
    this.rrEl.textContent = scoreManager.getRunRate();
    const prefix = this._playerName ? `${this._playerName} ` : '';
    this.batsmanEl.textContent = `${prefix}${scoreManager.batsmanRuns} (${scoreManager.batsmanBalls})`;
    this.lastEl.textContent = scoreManager.lastBallResult;
  }
}
