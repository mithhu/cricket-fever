import { SHOTS } from '../utils/constants.js';

const SHOT_NAMES = {
  [SHOTS.DRIVE]: 'Straight Drive',
  [SHOTS.PULL]: 'Pull / Hook',
  [SHOTS.CUT]: 'Cut / Cover Drive',
  [SHOTS.BLOCK]: 'Defensive Block',
};

export class ShotSelector {
  constructor() {
    this.el = document.getElementById('shot-indicator');
    this.textEl = document.getElementById('shot-text');
    this.hintEl = document.getElementById('controls-hint');
  }

  show() {
    this.el.style.display = 'block';
    this.hintEl.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
    this.hintEl.style.display = 'none';
  }

  update(shotType) {
    this.textEl.textContent = SHOT_NAMES[shotType] || 'Unknown';
  }
}
