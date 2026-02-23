import { SHOTS } from '../utils/constants.js';

const SHOT_MAP = {
  drive: SHOTS.DRIVE,
  pull: SHOTS.PULL,
  cut: SHOTS.CUT,
  block: SHOTS.BLOCK,
};

export class TouchController {
  constructor(inputManager) {
    this.input = inputManager;
    this._lofted = false;
    this._activeDirections = new Set();

    this.controlsEl = document.getElementById('touch-controls');
    this.loftedBtn = document.getElementById('touch-lofted');

    this._isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!this._isTouchDevice) return;

    this._bindDpad();
    this._bindShots();
    this._bindLofted();

    // Swap keyboard instructions for touch instructions on main menu
    const menuInfo = document.getElementById('menu-controls-info');
    if (menuInfo) {
      menuInfo.innerHTML =
        'D-Pad — Move in Crease &nbsp;|&nbsp; Shot buttons — Play shots<br>' +
        'Tap LOFT to toggle lofted shots';
    }

    document.addEventListener('touchstart', () => {}, { passive: true });
  }

  get isTouchDevice() {
    return this._isTouchDevice;
  }

  show() {
    if (!this._isTouchDevice) return;
    this.controlsEl.style.display = 'block';
  }

  hide() {
    this.controlsEl.style.display = 'none';
    this._activeDirections.clear();
    this._lofted = false;
    this.loftedBtn.classList.remove('active');
  }

  _bindDpad() {
    const btns = this.controlsEl.querySelectorAll('.dpad-btn');
    btns.forEach((btn) => {
      const dir = btn.dataset.dir;

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        this._activeDirections.add(dir);
        this._syncMovement();
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
        this._activeDirections.delete(dir);
        this._syncMovement();
      }, { passive: false });

      btn.addEventListener('touchcancel', () => {
        btn.classList.remove('pressed');
        this._activeDirections.delete(dir);
        this._syncMovement();
      });
    });
  }

  _syncMovement() {
    // Simulate arrow key states on InputManager
    this.input._keys['ArrowUp'] = this._activeDirections.has('up');
    this.input._keys['ArrowDown'] = this._activeDirections.has('down');
    this.input._keys['ArrowLeft'] = this._activeDirections.has('left');
    this.input._keys['ArrowRight'] = this._activeDirections.has('right');
  }

  _bindShots() {
    const btns = this.controlsEl.querySelectorAll('.shot-btn');
    btns.forEach((btn) => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        const shot = SHOT_MAP[btn.dataset.shot];
        if (shot) {
          this.input._shotDirection = shot;
          this.input._shotTriggered = true;
          this.input._lofted = this._lofted;
        }
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.classList.remove('pressed');
      }, { passive: false });

      btn.addEventListener('touchcancel', () => {
        btn.classList.remove('pressed');
      });
    });
  }

  _bindLofted() {
    this.loftedBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this._lofted = !this._lofted;
      this.loftedBtn.classList.toggle('active', this._lofted);
    }, { passive: false });
  }
}
