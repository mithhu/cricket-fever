import { SHOTS } from '../utils/constants.js';

export class InputManager {
  constructor() {
    this._keys = {};
    this._shotDirection = SHOTS.DRIVE;
    this._shotTriggered = false;
    this._lofted = false;
    this._shiftDown = false;

    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));
  }

  _onKeyDown(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const isModifier = e.code === 'ShiftLeft' || e.code === 'ShiftRight';
    if (!isModifier && this._keys[e.code]) return;
    this._keys[e.code] = true;

    // Track shift state directly for reliability on Mac
    if (isModifier) {
      this._shiftDown = true;
      return;
    }

    const lofted = e.shiftKey || this._shiftDown;

    switch (e.code) {
      case 'KeyW':
        this._shotDirection = SHOTS.DRIVE;
        this._shotTriggered = true;
        this._lofted = lofted;
        e.preventDefault();
        break;
      case 'KeyA':
        this._shotDirection = SHOTS.CUT;
        this._shotTriggered = true;
        this._lofted = lofted;
        e.preventDefault();
        break;
      case 'KeyD':
        this._shotDirection = SHOTS.PULL;
        this._shotTriggered = true;
        this._lofted = lofted;
        e.preventDefault();
        break;
      case 'KeyS':
        this._shotDirection = SHOTS.BLOCK;
        this._shotTriggered = true;
        this._lofted = lofted;
        e.preventDefault();
        break;
      case 'Space':
        this._shotTriggered = true;
        this._lofted = lofted;
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault();
        break;
    }
  }

  _onKeyUp(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    this._keys[e.code] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this._shiftDown = false;
    }
  }

  getShotDirection() {
    return this._shotDirection;
  }

  consumeShotTrigger() {
    if (this._shotTriggered) {
      this._shotTriggered = false;
      return { shot: this._shotDirection, lofted: this._lofted };
    }
    return null;
  }

  isKeyDown(code) {
    return !!this._keys[code];
  }

  getMovement() {
    let x = 0, z = 0;
    if (this._keys['ArrowLeft'])  x = 1;
    if (this._keys['ArrowRight']) x = -1;
    if (this._keys['ArrowUp'])    z = -1;
    if (this._keys['ArrowDown'])  z = 1;
    return { x, z };
  }

  reset() {
    this._shotTriggered = false;
    this._lofted = false;
  }
}
