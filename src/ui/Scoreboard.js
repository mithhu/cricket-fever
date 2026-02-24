export class Scoreboard {
  constructor() {
    this.el = document.getElementById('scoreboard');
    this.runsEl = document.getElementById('sc-runs');
    this.oversEl = document.getElementById('sc-overs');
    this.rrEl = document.getElementById('sc-rr');
    this.batsmanEl = document.getElementById('sc-batsman');
    this.lastEl = document.getElementById('sc-last');
    this.targetWrap = document.getElementById('sc-target-wrap');
    this.targetEl = document.getElementById('sc-target');
    this.bowlerWrap = document.getElementById('sc-bowler-wrap');
    this.bowlerEl = document.getElementById('sc-bowler');
    this._playerName = '';
    this._isBowling = false;
  }

  setPlayerName(name) {
    this._playerName = name || '';
  }

  setTarget(target) {
    if (target !== null && target !== undefined) {
      this.targetWrap.style.display = '';
      this.targetEl.textContent = target;
    } else {
      this.targetWrap.style.display = 'none';
    }
  }

  show() {
    this.el.style.display = 'flex';
  }

  setBowling(isBowling) {
    this._isBowling = isBowling;
    if (this.bowlerWrap) {
      this.bowlerWrap.style.display = isBowling ? '' : 'none';
    }
  }

  hide() {
    this.el.style.display = 'none';
    this.setTarget(null);
    this.setBowling(false);
  }

  update(scoreManager) {
    this.runsEl.textContent = `${scoreManager.runs}/${scoreManager.wickets}`;
    this.oversEl.textContent = scoreManager.getOversString();
    this.rrEl.textContent = scoreManager.getRunRate();
    const prefix = this._playerName ? `${this._playerName} ` : '';
    this.batsmanEl.textContent = `${prefix}${scoreManager.batsmanRuns} (${scoreManager.batsmanBalls})`;
    this.lastEl.textContent = scoreManager.lastBallResult;

    const needed = scoreManager.getRunsNeeded();
    if (needed !== null) {
      this.targetEl.textContent = `${needed} needed`;
    }

    if (this._isBowling && this.bowlerEl) {
      this.bowlerEl.textContent = `${scoreManager.getBowlerFigures()} (${scoreManager.getBowlerOversString()})`;
    }
  }
}
