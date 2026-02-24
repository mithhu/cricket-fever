import { SHOTS } from '../utils/constants.js';

const SHOT_NAMES = {
  [SHOTS.DRIVE]: 'Straight Drive',
  [SHOTS.PULL]: 'Pull / Hook',
  [SHOTS.CUT]: 'Cut / Cover Drive',
  [SHOTS.BLOCK]: 'Defensive Block',
  [SHOTS.SWEEP]: 'Sweep Shot',
  [SHOTS.LOFTED_DRIVE]: 'Lofted Drive',
};

const DISPLAY_DURATION = 1.2;

export class ShotSelector {
  constructor() {
    this.el = document.getElementById('shot-indicator');
    this.textEl = document.getElementById('shot-text');
    this.hintEl = document.getElementById('controls-hint');
    this._lastShot = null;
    this._timer = 0;
    this._visible = false;
  }

  show() {
    this.hintEl.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
    this.hintEl.style.display = 'none';
    this._lastShot = null;
    this._timer = 0;
    this._visible = false;
  }

  update(shotType, dt) {
    if (shotType !== this._lastShot) {
      this._lastShot = shotType;
      this.textEl.textContent = SHOT_NAMES[shotType] || 'Unknown';
      this.el.style.display = 'block';
      this._visible = true;
      this._timer = DISPLAY_DURATION;
    }

    if (this._visible && dt) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this.el.style.display = 'none';
        this._visible = false;
      }
    }
  }
}
