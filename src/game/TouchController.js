import { SHOTS } from '../utils/constants.js';

const SHOT_MAP = {
  drive: SHOTS.DRIVE,
  pull: SHOTS.PULL,
  cut: SHOTS.CUT,
  block: SHOTS.BLOCK,
  sweep: SHOTS.SWEEP,
  lofted_drive: SHOTS.LOFTED_DRIVE,
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
    this._showBattingControls();
  }

  showBowling() {
    if (!this._isTouchDevice) return;
    this.controlsEl.style.display = 'block';
    this._showBowlingControls();
  }

  hide() {
    this.controlsEl.style.display = 'none';
    this._activeDirections.clear();
    this._lofted = false;
    this.loftedBtn.classList.remove('active');
    this._hideBowlBtn();
  }

  _showBattingControls() {
    const shots = this.controlsEl.querySelectorAll('.shot-btn, .shot-btn-extra');
    shots.forEach((b) => b.style.display = '');
    this.loftedBtn.style.display = '';
    this._hideBowlBtn();
  }

  _showBowlingControls() {
    const shots = this.controlsEl.querySelectorAll('.shot-btn, .shot-btn-extra');
    shots.forEach((b) => b.style.display = 'none');
    this.loftedBtn.style.display = 'none';
    this._showBowlBtn();
  }

  _showBowlBtn() {
    if (!this._bowlBtn) {
      this._bowlBtn = document.createElement('button');
      this._bowlBtn.className = 'shot-btn bowl-btn';
      this._bowlBtn.textContent = 'BOWL';
      this._bowlBtn.style.cssText = 'position:absolute;bottom:30px;right:20px;width:80px;height:80px;border-radius:50%;font-size:16px;font-weight:700;background:rgba(64,144,240,0.7);color:#fff;border:2px solid rgba(255,255,255,0.4);z-index:20;';
      this._bowlBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.input._bowlTriggered = true;
        this._bowlBtn.classList.add('pressed');
      }, { passive: false });
      this._bowlBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this._bowlBtn.classList.remove('pressed');
      }, { passive: false });
      this.controlsEl.appendChild(this._bowlBtn);
    }
    this._bowlBtn.style.display = 'block';
  }

  _hideBowlBtn() {
    if (this._bowlBtn) this._bowlBtn.style.display = 'none';
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
    const allBtns = this.controlsEl.querySelectorAll('.shot-btn, .shot-btn-extra');
    allBtns.forEach((btn) => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.classList.add('pressed');
        const shot = SHOT_MAP[btn.dataset.shot];
        if (shot) {
          this.input._shotDirection = shot;
          this.input._shotTriggered = true;
          this.input._lofted = shot === SHOTS.LOFTED_DRIVE ? true : this._lofted;
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
